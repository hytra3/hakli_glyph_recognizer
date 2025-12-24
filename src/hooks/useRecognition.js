// ============================================
// useRecognition Hook
// Manages the glyph detection workflow
// ============================================

const useRecognition = (appState, setters, refs) => {
    const { useCallback } = React;
    
    /**
     * Get image coordinates from a mouse/touch event
     * @param {Event} event - Mouse or touch event
     * @returns {Object} { x, y } coordinates on the image
     */
    const getImageCoordinates = useCallback((event) => {
        if (!refs.imageRef?.current || !refs.imageContainerRef?.current) return null;
        
        const img = refs.imageRef.current;
        const container = refs.imageContainerRef.current;
        const rect = container.getBoundingClientRect();
        
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;
        
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        return { x, y, scaleX, scaleY };
    }, [refs.imageRef, refs.imageContainerRef]);
    
    /**
     * Extract a thumbnail from the source image for a given region
     * @param {string} inputImage - Base64 image data
     * @param {Object} region - { x, y, width, height }
     * @returns {Promise<string>} Base64 thumbnail
     */
    const extractRegionThumbnail = useCallback((inputImage, region) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = region.width;
                canvas.height = region.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(
                    img,
                    region.x, region.y, region.width, region.height,
                    0, 0, region.width, region.height
                );
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = inputImage;
        });
    }, []);
    
    /**
     * Calculate IoU (Intersection over Union) for two bounding boxes
     * @param {Object} box1 - { x, y, width, height }
     * @param {Object} box2 - { x, y, width, height }
     * @returns {number} IoU value between 0 and 1
     */
    const calculateIoU = useCallback((box1, box2) => {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
        const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
        
        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const area1 = box1.width * box1.height;
        const area2 = box2.width * box2.height;
        const union = area1 + area2 - intersection;
        
        return union > 0 ? intersection / union : 0;
    }, []);
    
    /**
     * Isolate glyph regions from the input image
     * Uses the Isolation module from the backend
     * @param {string} inputImage - Base64 image data
     * @returns {Array} Array of isolated regions
     */
    const isolateGlyphs = useCallback((inputImage) => {
        if (typeof Isolation === 'undefined') {
            console.error('Isolation module not loaded');
            return [];
        }
        
        return Isolation.isolateGlyphs(inputImage);
    }, []);
    
    /**
     * Perform template matching on a region
     * Uses the Matching module from the backend
     * @param {string} inputImage - Base64 image data
     * @param {HTMLImageElement} templateImage - Template image
     * @param {Object} region - Region to match against
     * @param {number} glyphId - ID of the glyph being matched
     * @returns {Object} Match result
     */
    const performTemplateMatching = useCallback((inputImage, templateImage, region, glyphId) => {
        if (typeof Matching === 'undefined') {
            console.error('Matching module not loaded');
            return null;
        }
        
        return Matching.matchTemplate(inputImage, templateImage, region, glyphId);
    }, []);
    
    /**
     * Apply Non-Maximum Suppression to filter overlapping detections
     * @param {Array} detections - Array of detection results
     * @param {number} iouThreshold - IoU threshold for suppression
     * @returns {Array} Filtered detections
     */
    const applyNMS = useCallback((detections, iouThreshold = 0.3) => {
        if (typeof NMS !== 'undefined') {
            return NMS.apply(detections, iouThreshold);
        }
        
        // Fallback implementation
        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const kept = [];
        
        for (const detection of sorted) {
            let shouldKeep = true;
            
            for (const kept_det of kept) {
                const iou = calculateIoU(detection.position, kept_det.position);
                if (iou > iouThreshold) {
                    shouldKeep = false;
                    break;
                }
            }
            
            if (shouldKeep) {
                kept.push(detection);
            }
        }
        
        return kept;
    }, [calculateIoU]);
    
    /**
     * Run the full glyph recognition pipeline
     */
    const recognizeGlyphs = useCallback(async () => {
        const {
            image,
            chart,
            preprocessing
        } = appState;
        
        if (!image?.display || !chart?.data || !chart?.loadedImages) {
            alert('❌ Please load an image and wait for the glyph chart to load');
            return;
        }
        
        if (Object.keys(chart.loadedImages).length === 0) {
            alert('❌ Glyph templates not loaded yet. Please wait...');
            return;
        }
        
        setters.setProcessing(true);
        setters.setRecognitionResults([]);
        setters.setIsolatedGlyphs([]);
        setters.setValidations({});
        
        try {
            console.log('🔍 Starting glyph recognition...');
            
            // Step 1: Isolate glyph regions
            const regions = isolateGlyphs(image.display);
            console.log(`📦 Isolated ${regions.length} potential glyph regions`);
            setters.setIsolatedGlyphs(regions);
            
            if (regions.length === 0) {
                alert('⚠️ No glyph regions detected. Try adjusting preprocessing settings.');
                setters.setProcessing(false);
                return;
            }
            
            // Step 2: Match each region against templates
            const allDetections = [];
            const totalWork = regions.length * Object.keys(chart.loadedImages).length;
            let completed = 0;
            
            for (let regionIdx = 0; regionIdx < regions.length; regionIdx++) {
                const region = regions[regionIdx];
                const regionDetections = [];
                
                for (const [glyphId, templateImg] of Object.entries(chart.loadedImages)) {
                    const glyph = chart.data.glyphs.find(g => g.id === parseInt(glyphId));
                    if (!glyph) continue;
                    
                    const match = performTemplateMatching(
                        image.display,
                        templateImg,
                        region,
                        glyph.id
                    );
                    
                    if (match && match.confidence > 0.3) {
                        regionDetections.push({
                            glyph: glyph,
                            confidence: match.confidence,
                            position: region,
                            regionIndex: regionIdx,
                            matchType: match.matchType || 'template'
                        });
                    }
                    
                    completed++;
                    if (completed % 50 === 0) {
                        setters.setProcessingProgress({
                            current: completed,
                            total: totalWork
                        });
                    }
                }
                
                // Keep best match for this region
                if (regionDetections.length > 0) {
                    regionDetections.sort((a, b) => b.confidence - a.confidence);
                    const best = regionDetections[0];
                    
                    // Extract thumbnail
                    const thumbnail = await extractRegionThumbnail(image.display, region);
                    best.thumbnail = thumbnail;
                    best.topMatches = regionDetections.slice(0, 5);
                    
                    allDetections.push(best);
                }
            }
            
            // Step 3: Apply NMS
            const finalDetections = applyNMS(allDetections, 0.3);
            console.log(`✨ Final detections after NMS: ${finalDetections.length}`);
            
            setters.setRecognitionResults(finalDetections);
            
            // Step 4: Auto-detect reading order
            if (typeof ReadingOrder !== 'undefined' && finalDetections.length > 0) {
                const direction = ReadingOrder.detectDirection(finalDetections);
                const order = ReadingOrder.generateOrder(finalDetections, direction);
                setters.setReadingDirection(direction);
                setters.setReadingOrder(order);
                console.log(`📖 Auto-detected reading direction: ${direction}`);
            }
            
            alert(`✅ Recognition complete!\n\n📊 Found ${finalDetections.length} glyphs from ${regions.length} regions`);
            
        } catch (error) {
            console.error('Recognition error:', error);
            alert('❌ Recognition failed: ' + error.message);
        } finally {
            setters.setProcessing(false);
            setters.setProcessingProgress({ current: 0, total: 0 });
        }
    }, [
        appState,
        setters,
        isolateGlyphs,
        performTemplateMatching,
        applyNMS,
        extractRegionThumbnail
    ]);
    
    /**
     * Validate a detection (mark as correct or incorrect)
     * @param {number} index - Detection index
     * @param {boolean} isCorrect - Whether the detection is correct
     */
    const validateDetection = useCallback((index, isCorrect) => {
        const detection = appState.recognition?.results?.[index];
        if (!detection) return;
        
        setters.setValidation(index, {
            isCorrect,
            timestamp: new Date().toISOString(),
            detectionData: detection
        });
        
        // Save to correction memory if marked incorrect
        if (!isCorrect && typeof CorrectionMemory !== 'undefined') {
            // Will be corrected later, just mark for now
            console.log(`❌ Marked detection ${index} as incorrect`);
        }
        
        console.log(`${isCorrect ? '✅' : '❌'} Validated detection ${index}: ${detection.glyph.name}`);
    }, [appState.recognition?.results, setters]);
    
    /**
     * Delete a detection
     * @param {number} index - Detection index to delete
     */
    const deleteDetection = useCallback((index) => {
        const results = appState.recognition?.results || [];
        if (index < 0 || index >= results.length) return;
        
        const newResults = results.filter((_, i) => i !== index);
        setters.setRecognitionResults(newResults);
        
        // Update validations (shift indices)
        const validations = appState.recognition?.validations || {};
        const newValidations = {};
        Object.entries(validations).forEach(([key, value]) => {
            const oldIndex = parseInt(key);
            if (oldIndex < index) {
                newValidations[oldIndex] = value;
            } else if (oldIndex > index) {
                newValidations[oldIndex - 1] = value;
            }
            // Skip the deleted index
        });
        setters.setValidations(newValidations);
        
        // Update reading order
        const order = appState.reading?.order || [];
        const newOrder = order
            .filter(i => i !== index)
            .map(i => i > index ? i - 1 : i);
        setters.setReadingOrder(newOrder);
        
        console.log(`🗑️ Deleted detection ${index}`);
    }, [appState.recognition, appState.reading, setters]);
    
    /**
     * Correct a detection (change the glyph assignment)
     * @param {number} index - Detection index
     * @param {Object} newGlyph - New glyph to assign
     */
    const correctDetection = useCallback((index, newGlyph) => {
        const detection = appState.recognition?.results?.[index];
        if (!detection || !newGlyph) return;
        
        const originalGlyph = detection.glyph;
        
        // Save to correction memory
        if (typeof CorrectionMemory !== 'undefined') {
            CorrectionMemory.saveCorrection(
                originalGlyph.id,
                newGlyph.id,
                detection.confidence,
                { index, timestamp: new Date().toISOString() }
            );
        }
        
        // Update the detection
        setters.updateDetection(index, {
            glyph: newGlyph,
            corrected: true,
            originalGlyph: originalGlyph,
            correctionTimestamp: new Date().toISOString()
        });
        
        // Also mark as validated (correct after correction)
        setters.setValidation(index, {
            isCorrect: true,
            timestamp: new Date().toISOString(),
            detectionData: { ...detection, glyph: newGlyph }
        });
        
        console.log(`📝 Corrected detection ${index}: ${originalGlyph.name} → ${newGlyph.name}`);
    }, [appState.recognition?.results, setters]);
    
    /**
     * Merge multiple detections into one
     * @param {Array} indices - Array of detection indices to merge
     */
    const mergeDetections = useCallback((indices) => {
        if (!indices || indices.length < 2) return;
        
        const results = appState.recognition?.results || [];
        const detectionsToMerge = indices.map(i => results[i]).filter(Boolean);
        
        if (detectionsToMerge.length < 2) return;
        
        // Calculate merged bounding box
        const minX = Math.min(...detectionsToMerge.map(d => d.position.x));
        const minY = Math.min(...detectionsToMerge.map(d => d.position.y));
        const maxX = Math.max(...detectionsToMerge.map(d => d.position.x + d.position.width));
        const maxY = Math.max(...detectionsToMerge.map(d => d.position.y + d.position.height));
        
        // Use the detection with highest confidence as base
        const baseDetection = detectionsToMerge.reduce((a, b) => 
            a.confidence > b.confidence ? a : b
        );
        
        const mergedDetection = {
            ...baseDetection,
            position: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            },
            isMerged: true,
            mergedFrom: indices,
            confidence: Math.max(...detectionsToMerge.map(d => d.confidence))
        };
        
        // Remove old detections and add merged one
        const sortedIndices = [...indices].sort((a, b) => b - a);
        let newResults = [...results];
        
        sortedIndices.forEach(idx => {
            newResults.splice(idx, 1);
        });
        
        newResults.push(mergedDetection);
        setters.setRecognitionResults(newResults);
        
        console.log(`🔗 Merged ${indices.length} detections`);
    }, [appState.recognition?.results, setters]);
    
    return {
        // Utilities
        getImageCoordinates,
        extractRegionThumbnail,
        calculateIoU,
        
        // Pipeline
        isolateGlyphs,
        performTemplateMatching,
        applyNMS,
        recognizeGlyphs,
        
        // Detection management
        validateDetection,
        deleteDetection,
        correctDetection,
        mergeDetections
    };
};

// Make globally available
window.useRecognition = useRecognition;
