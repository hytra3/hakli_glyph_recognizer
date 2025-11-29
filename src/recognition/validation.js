// ============================================
// VALIDATION & REGION EDITING
// Validate detections, edit polygon regions
// ============================================

const Validation = {
    /**
     * Validate a detection as correct or incorrect
     */
    validateDetection: (validations, detectionIndex, isCorrect, detectionData = null) => {
        const newValidations = { ...validations };
        newValidations[detectionIndex] = {
            isCorrect,
            timestamp: new Date().toISOString(),
            detectionData: detectionData
        };
        return newValidations;
    },

    /**
     * Remove validation from a detection
     */
    removeValidation: (validations, detectionIndex) => {
        const newValidations = { ...validations };
        delete newValidations[detectionIndex];
        return newValidations;
    },

    /**
     * Get validation status for a detection
     */
    getValidationStatus: (validations, detectionIndex) => {
        const v = validations[detectionIndex];
        if (!v) return 'unvalidated';
        return v.isCorrect ? 'correct' : 'incorrect';
    },

    /**
     * Count validations by status
     */
    countValidations: (validations, detections) => {
        const correct = Object.values(validations).filter(v => v.isCorrect).length;
        const incorrect = Object.values(validations).filter(v => !v.isCorrect).length;
        const total = detections?.length || 0;
        
        return {
            correct,
            incorrect,
            unvalidated: total - correct - incorrect,
            total,
            percentComplete: total > 0 ? Math.round((correct + incorrect) / total * 100) : 0
        };
    }
};

// ============================================
// POLYGON REGION
// Handle non-rectangular glyph boundaries
// ============================================

const PolygonRegion = {
    /**
     * Convert rectangle to polygon (4 corners)
     */
    rectToPolygon: (position) => {
        const { x, y, width, height } = position;
        return [
            { x: x, y: y },                      // top-left
            { x: x + width, y: y },              // top-right
            { x: x + width, y: y + height },    // bottom-right
            { x: x, y: y + height }              // bottom-left
        ];
    },

    /**
     * Convert polygon back to bounding rectangle
     */
    polygonToRect: (corners) => {
        if (!corners || corners.length < 3) return null;
        
        const xs = corners.map(c => c.x);
        const ys = corners.map(c => c.y);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    },

    /**
     * Initialize corners for a detection if not present
     */
    initializeCorners: (detection) => {
        if (detection.corners && detection.corners.length >= 3) {
            return detection.corners;
        }
        return PolygonRegion.rectToPolygon(detection.position);
    },

    /**
     * Move a single corner point
     */
    moveCorner: (corners, cornerIndex, newX, newY) => {
        const newCorners = [...corners];
        newCorners[cornerIndex] = { x: newX, y: newY };
        return newCorners;
    },

    /**
     * Add a corner point between two existing corners
     */
    addCorner: (corners, afterIndex, x, y) => {
        const newCorners = [...corners];
        newCorners.splice(afterIndex + 1, 0, { x, y });
        return newCorners;
    },

    /**
     * Remove a corner point (minimum 3 corners required)
     */
    removeCorner: (corners, cornerIndex) => {
        if (corners.length <= 3) {
            console.warn('Cannot remove corner: minimum 3 corners required');
            return corners;
        }
        const newCorners = [...corners];
        newCorners.splice(cornerIndex, 1);
        return newCorners;
    },

    /**
     * Move entire polygon by offset
     */
    movePolygon: (corners, deltaX, deltaY) => {
        return corners.map(c => ({
            x: c.x + deltaX,
            y: c.y + deltaY
        }));
    },

    /**
     * Scale polygon from center
     */
    scalePolygon: (corners, scaleFactor) => {
        const center = PolygonRegion.getCenter(corners);
        return corners.map(c => ({
            x: center.x + (c.x - center.x) * scaleFactor,
            y: center.y + (c.y - center.y) * scaleFactor
        }));
    },

    /**
     * Rotate polygon around center
     */
    rotatePolygon: (corners, angleDegrees) => {
        const center = PolygonRegion.getCenter(corners);
        const angleRad = angleDegrees * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        return corners.map(c => {
            const dx = c.x - center.x;
            const dy = c.y - center.y;
            return {
                x: center.x + dx * cos - dy * sin,
                y: center.y + dx * sin + dy * cos
            };
        });
    },

    /**
     * Get polygon center (centroid)
     */
    getCenter: (corners) => {
        const sum = corners.reduce((acc, c) => ({
            x: acc.x + c.x,
            y: acc.y + c.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / corners.length,
            y: sum.y / corners.length
        };
    },

    /**
     * Calculate polygon area (for sorting/filtering)
     */
    getArea: (corners) => {
        let area = 0;
        const n = corners.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += corners[i].x * corners[j].y;
            area -= corners[j].x * corners[i].y;
        }
        
        return Math.abs(area) / 2;
    },

    /**
     * Check if point is inside polygon
     */
    containsPoint: (corners, px, py) => {
        let inside = false;
        const n = corners.length;
        
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = corners[i].x, yi = corners[i].y;
            const xj = corners[j].x, yj = corners[j].y;
            
            if (((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    },

    /**
     * Find nearest corner to a point
     */
    findNearestCorner: (corners, px, py, threshold = 10) => {
        let nearestIndex = -1;
        let nearestDist = threshold;
        
        corners.forEach((c, i) => {
            const dist = Math.sqrt(Math.pow(c.x - px, 2) + Math.pow(c.y - py, 2));
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIndex = i;
            }
        });
        
        return nearestIndex;
    },

    /**
     * Find nearest edge to a point (for adding corners)
     */
    findNearestEdge: (corners, px, py, threshold = 15) => {
        let nearestIndex = -1;
        let nearestDist = threshold;
        let nearestPoint = null;
        
        const n = corners.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const result = PolygonRegion._pointToSegmentDistance(
                px, py,
                corners[i].x, corners[i].y,
                corners[j].x, corners[j].y
            );
            
            if (result.distance < nearestDist) {
                nearestDist = result.distance;
                nearestIndex = i;
                nearestPoint = result.point;
            }
        }
        
        return { edgeIndex: nearestIndex, distance: nearestDist, point: nearestPoint };
    },

    /**
     * Calculate distance from point to line segment
     */
    _pointToSegmentDistance: (px, py, x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        let t = 0;
        if (lengthSquared !== 0) {
            t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        }
        
        const nearestX = x1 + t * dx;
        const nearestY = y1 + t * dy;
        
        return {
            distance: Math.sqrt(Math.pow(px - nearestX, 2) + Math.pow(py - nearestY, 2)),
            point: { x: nearestX, y: nearestY }
        };
    },

    /**
     * Generate SVG path string from corners
     */
    toSVGPath: (corners) => {
        if (!corners || corners.length < 3) return '';
        
        let path = `M ${corners[0].x} ${corners[0].y}`;
        for (let i = 1; i < corners.length; i++) {
            path += ` L ${corners[i].x} ${corners[i].y}`;
        }
        path += ' Z';
        
        return path;
    },

    /**
     * Generate CSS clip-path polygon string
     */
    toClipPath: (corners, containerWidth, containerHeight) => {
        if (!corners || corners.length < 3) return 'none';
        
        const points = corners.map(c => {
            const xPercent = (c.x / containerWidth * 100).toFixed(2);
            const yPercent = (c.y / containerHeight * 100).toFixed(2);
            return `${xPercent}% ${yPercent}%`;
        });
        
        return `polygon(${points.join(', ')})`;
    }
};

// Make globally available
window.Validation = Validation;
window.PolygonRegion = PolygonRegion;
