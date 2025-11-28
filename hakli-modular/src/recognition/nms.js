// ============================================
// NON-MAXIMUM SUPPRESSION (NMS)
// Remove duplicate detections with significant overlap
// ============================================

const NMS = {
    /**
     * Apply Non-Maximum Suppression to detections
     * @param {Array} detections - Array of detection objects with position and confidence
     * @param {number} iouThreshold - IoU threshold (default 0.3)
     * @returns {Array} Filtered detections
     */
    applyNMS: (detections, iouThreshold = CONFIG.RECOGNITION.IOU_THRESHOLD) => {
        if (!detections || detections.length <= 1) {
            return detections || [];
        }

        console.log(`🔄 Applying NMS to ${detections.length} detections (IoU threshold: ${iouThreshold})`);

        // Sort by confidence (descending)
        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const keep = [];
        const suppressed = [];

        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            let shouldKeep = true;

            // Check against all kept detections
            for (let j = 0; j < keep.length; j++) {
                const iou = Utils.calculateIoU(current.position, keep[j].position);
                
                if (iou > iouThreshold) {
                    shouldKeep = false;
                    suppressed.push({
                        detection: current,
                        suppressedBy: keep[j],
                        iou: iou
                    });
                    break;
                }
            }

            if (shouldKeep) {
                keep.push(current);
            }
        }

        console.log(`   ✅ Kept ${keep.length} detections, suppressed ${suppressed.length}`);
        
        if (suppressed.length > 0) {
            console.log(`   Suppressed examples:`, suppressed.slice(0, 3).map(s => ({
                glyph: s.detection.glyph.name,
                confidence: s.detection.confidence.toFixed(2),
                suppressedBy: s.suppressedBy.glyph.name,
                iou: s.iou.toFixed(2)
            })));
        }

        return keep;
    },

    /**
     * Apply NMS with class-specific suppression
     * Only suppress detections of the same glyph class
     * @param {Array} detections - Array of detections
     * @param {number} iouThreshold - IoU threshold
     * @returns {Array} Filtered detections
     */
    applyClassSpecificNMS: (detections, iouThreshold = CONFIG.RECOGNITION.IOU_THRESHOLD) => {
        if (!detections || detections.length <= 1) {
            return detections || [];
        }

        console.log(`🔄 Applying class-specific NMS to ${detections.length} detections`);

        // Group detections by glyph ID
        const byClass = {};
        detections.forEach(det => {
            const glyphId = det.glyph.id;
            if (!byClass[glyphId]) {
                byClass[glyphId] = [];
            }
            byClass[glyphId].push(det);
        });

        // Apply NMS within each class
        const kept = [];
        Object.entries(byClass).forEach(([glyphId, classDets]) => {
            const filtered = NMS.applyNMS(classDets, iouThreshold);
            kept.push(...filtered);
        });

        console.log(`   ✅ Kept ${kept.length} detections after class-specific NMS`);
        return kept;
    },

    /**
     * Apply soft NMS - reduce confidence instead of removing
     * @param {Array} detections - Array of detections
     * @param {number} iouThreshold - IoU threshold
     * @param {number} sigma - Gaussian sigma for confidence decay
     * @returns {Array} Detections with adjusted confidences
     */
    applySoftNMS: (detections, iouThreshold = 0.3, sigma = 0.5) => {
        if (!detections || detections.length <= 1) {
            return detections || [];
        }

        console.log(`🔄 Applying Soft NMS to ${detections.length} detections`);

        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const result = [];

        for (let i = 0; i < sorted.length; i++) {
            const current = { ...sorted[i] };
            
            // Decay confidence based on overlap with higher-confidence detections
            for (let j = 0; j < result.length; j++) {
                const iou = Utils.calculateIoU(current.position, result[j].position);
                
                if (iou > iouThreshold) {
                    // Gaussian decay: conf = conf * exp(-(iou^2) / sigma)
                    const decay = Math.exp(-(iou * iou) / sigma);
                    current.confidence *= decay;
                }
            }

            // Only keep if confidence is still above threshold
            if (current.confidence >= CONFIG.RECOGNITION.MIN_CONFIDENCE) {
                result.push(current);
            }
        }

        console.log(`   ✅ Kept ${result.length} detections after Soft NMS`);
        return result;
    },

    /**
     * Merge highly overlapping detections into single detection
     * @param {Array} detections - Array of detections
     * @param {number} iouThreshold - IoU threshold for merging
     * @returns {Array} Merged detections
     */
    mergeOverlappingDetections: (detections, iouThreshold = 0.7) => {
        if (!detections || detections.length <= 1) {
            return detections || [];
        }

        console.log(`🔄 Merging overlapping detections (IoU > ${iouThreshold})`);

        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const merged = [];
        const processed = new Set();

        for (let i = 0; i < sorted.length; i++) {
            if (processed.has(i)) continue;

            const group = [sorted[i]];
            processed.add(i);

            // Find all detections that should merge with this one
            for (let j = i + 1; j < sorted.length; j++) {
                if (processed.has(j)) continue;

                const iou = Utils.calculateIoU(sorted[i].position, sorted[j].position);
                if (iou > iouThreshold) {
                    group.push(sorted[j]);
                    processed.add(j);
                }
            }

            // Merge the group
            if (group.length === 1) {
                merged.push(group[0]);
            } else {
                const mergedDetection = NMS.mergeDetectionGroup(group);
                merged.push(mergedDetection);
            }
        }

        console.log(`   ✅ Merged ${detections.length} → ${merged.length} detections`);
        return merged;
    },

    /**
     * Merge a group of overlapping detections
     * @param {Array} group - Group of detections to merge
     * @returns {Object} Merged detection
     */
    mergeDetectionGroup: (group) => {
        // Use highest confidence detection as base
        const base = { ...group[0] };
        
        // Average the positions (weighted by confidence)
        const totalConfidence = group.reduce((sum, det) => sum + det.confidence, 0);
        
        let avgX = 0, avgY = 0, avgWidth = 0, avgHeight = 0;
        group.forEach(det => {
            const weight = det.confidence / totalConfidence;
            avgX += det.position.x * weight;
            avgY += det.position.y * weight;
            avgWidth += det.position.width * weight;
            avgHeight += det.position.height * weight;
        });

        base.position = {
            x: Math.round(avgX),
            y: Math.round(avgY),
            width: Math.round(avgWidth),
            height: Math.round(avgHeight)
        };

        // Average confidence
        base.confidence = totalConfidence / group.length;
        
        // Mark as merged
        base.isMerged = true;
        base.mergedCount = group.length;

        return base;
    },

    /**
     * Filter detections by minimum confidence threshold
     * @param {Array} detections - Array of detections
     * @param {number} threshold - Minimum confidence (default from CONFIG)
     * @returns {Array} Filtered detections
     */
    filterByConfidence: (detections, threshold = CONFIG.RECOGNITION.MIN_CONFIDENCE) => {
        if (!detections) return [];
        
        const filtered = detections.filter(det => det.confidence >= threshold);
        
        if (filtered.length < detections.length) {
            console.log(`   Filtered ${detections.length} → ${filtered.length} by confidence (threshold: ${threshold})`);
        }
        
        return filtered;
    }
};

// Make globally available
window.NMS = NMS;
