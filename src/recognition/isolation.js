// ============================================
// GLYPH ISOLATION
// Detects and isolates individual glyphs from inscription image
// ============================================

const Isolation = {
    /**
     * Isolate potential glyph regions from preprocessed image
     * @param {cv.Mat} inputImage - Preprocessed OpenCV Mat
     * @returns {Array} Array of isolated regions with bounds and thumbnails
     */
    isolateGlyphs: (inputImage) => {
        if (!inputImage || inputImage.empty()) {
            throw new Error('Invalid input image for glyph isolation');
        }

        const imageArea = inputImage.rows * inputImage.cols;
        const minArea = imageArea * CONFIG.ISOLATION.MIN_AREA_RATIO;
        const maxArea = imageArea * CONFIG.ISOLATION.MAX_AREA_RATIO;
        
        console.log(`🔍 Isolating glyphs from ${inputImage.cols}x${inputImage.rows} image`);
        console.log(`   Area range: ${minArea.toFixed(0)} - ${maxArea.toFixed(0)} pixels`);

        // Convert to grayscale if needed
        let gray = new cv.Mat();
        if (inputImage.channels() === 1) {
            gray = inputImage.clone();
        } else {
            cv.cvtColor(inputImage, gray, cv.COLOR_RGBA2GRAY);
        }

        // Apply binary threshold
        const binary = new cv.Mat();
        cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

        // Clean up noise with morphological operations
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
        const cleaned = new cv.Mat();
        cv.morphologyEx(binary, cleaned, cv.MORPH_CLOSE, kernel);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(cleaned, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        console.log(`   Found ${contours.size()} contours`);

        // Process each contour
        const regions = [];
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            
            // Filter by area
            if (area < minArea || area > maxArea) {
                contour.delete();
                continue;
            }

            // Get bounding rectangle
            const rect = cv.boundingRect(contour);
            const aspectRatio = rect.width / rect.height;

            // Filter by aspect ratio
            if (aspectRatio < CONFIG.ISOLATION.MIN_ASPECT_RATIO || 
                aspectRatio > CONFIG.ISOLATION.MAX_ASPECT_RATIO) {
                contour.delete();
                continue;
            }

            // Calculate solidity (contour area / bounding box area)
            const boundingArea = rect.width * rect.height;
            const solidity = area / boundingArea;

            // Filter by solidity
            if (solidity < CONFIG.ISOLATION.MIN_SOLIDITY) {
                contour.delete();
                continue;
            }

            // Add padding to bounds
            const padding = CONFIG.ISOLATION.PADDING;
            const bounds = {
                x: Math.max(0, rect.x - padding),
                y: Math.max(0, rect.y - padding),
                width: Math.min(inputImage.cols - rect.x + padding, rect.width + 2 * padding),
                height: Math.min(inputImage.rows - rect.y + padding, rect.height + 2 * padding)
            };

            // Extract region
            const region = inputImage.roi(new cv.Rect(bounds.x, bounds.y, bounds.width, bounds.height));
            
            // Create thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = bounds.width;
            canvas.height = bounds.height;
            cv.imshow(canvas, region);
            const thumbnail = canvas.toDataURL();

            regions.push({
                bounds: bounds,
                area: area,
                aspectRatio: aspectRatio,
                solidity: solidity,
                thumbnail: thumbnail,
                contour: contour
            });

            region.delete();
        }

        console.log(`   ✅ Isolated ${regions.length} potential glyphs`);

        // Cleanup
        gray.delete();
        binary.delete();
        cleaned.delete();
        kernel.delete();
        contours.delete();
        hierarchy.delete();

        return regions;
    },

    /**
     * Filter overlapping regions using Non-Maximum Suppression
     * @param {Array} regions - Array of isolated regions
     * @param {number} iouThreshold - IoU threshold for overlap
     * @returns {Array} Filtered regions
     */
    filterOverlappingRegions: (regions, iouThreshold = 0.3) => {
        if (regions.length <= 1) return regions;

        // Sort by area (descending)
        const sortedRegions = regions.sort((a, b) => b.area - a.area);
        const keep = [];

        for (let i = 0; i < sortedRegions.length; i++) {
            const current = sortedRegions[i];
            let shouldKeep = true;

            for (let j = 0; j < keep.length; j++) {
                const iou = Utils.calculateIoU(current.bounds, keep[j].bounds);
                if (iou > iouThreshold) {
                    shouldKeep = false;
                    break;
                }
            }

            if (shouldKeep) {
                keep.push(current);
            }
        }

        console.log(`   Filtered ${regions.length} → ${keep.length} regions (IoU threshold: ${iouThreshold})`);
        return keep;
    },

    /**
     * Sort regions by position (for natural reading order)
     * @param {Array} regions - Array of regions
     * @param {string} direction - 'ltr' or 'rtl'
     * @returns {Array} Sorted regions
     */
    sortRegionsByPosition: (regions, direction = 'ltr') => {
        const sorted = [...regions].sort((a, b) => {
            // First sort by row (top to bottom)
            const rowDiff = a.bounds.y - b.bounds.y;
            if (Math.abs(rowDiff) > 20) { // If vertical gap > 20px, different rows
                return rowDiff;
            }
            // Same row: sort by column
            if (direction === 'rtl') {
                return b.bounds.x - a.bounds.x; // Right to left
            } else {
                return a.bounds.x - b.bounds.x; // Left to right
            }
        });
        return sorted;
    }
};

// Make globally available
window.Isolation = Isolation;
