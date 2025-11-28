// ============================================
// UTILITY FUNCTIONS
// Common helper functions used across modules
// ============================================

const Utils = {
    // Convert GitHub URLs to raw format
    convertToGitHubUrl: (githubUrl) => {
        if (!githubUrl) return null;
        if (githubUrl.indexOf('http') === 0) {
            if (githubUrl.indexOf('github.com') !== -1 && githubUrl.indexOf('/blob/') !== -1) {
                return githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            }
            return githubUrl;
        }
        if (typeof githubUrl === 'string' && githubUrl.length > 0) {
            const cleanPath = githubUrl.indexOf('/') === 0 ? githubUrl.substring(1) : githubUrl;
            return CONFIG.GITHUB_BASE_URL + cleanPath;
        }
        return null;
    },

    // Get image coordinates from mouse event
    getImageCoordinates: (event, imageRef) => {
        if (!imageRef.current) return null;
        const rect = imageRef.current.getBoundingClientRect();
        const scaleX = imageRef.current.naturalWidth / rect.width;
        const scaleY = imageRef.current.naturalHeight / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    },

    // Extract thumbnail from region
    extractRegionThumbnail: (inputImage, region) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = region.bounds.width;
            canvas.height = region.bounds.height;

            ctx.drawImage(
                inputImage,
                region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height,
                0, 0, region.bounds.width, region.bounds.height
            );

            return canvas.toDataURL();
        } catch (error) {
            console.error('Thumbnail extraction error:', error);
            return null;
        }
    },

    // Extract thumbnail with exclusion masks
    extractRegionThumbnailWithExclusions: (inputImage, region, exclusions) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = region.bounds.width;
            canvas.height = region.bounds.height;

            ctx.drawImage(
                inputImage,
                region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height,
                0, 0, region.bounds.width, region.bounds.height
            );

            ctx.fillStyle = 'white';
            exclusions.forEach(exRegion => {
                const thumbX = exRegion.x - region.bounds.x;
                const thumbY = exRegion.y - region.bounds.y;
                const thumbWidth = exRegion.width;
                const thumbHeight = exRegion.height;

                if (thumbX < region.bounds.width && thumbY < region.bounds.height &&
                    thumbX + thumbWidth > 0 && thumbY + thumbHeight > 0) {
                    
                    const drawX = Math.max(0, thumbX);
                    const drawY = Math.max(0, thumbY);
                    const drawWidth = Math.min(region.bounds.width - drawX, thumbX + thumbWidth - drawX);
                    const drawHeight = Math.min(region.bounds.height - drawY, thumbY + thumbHeight - drawY);

                    ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
                }
            });

            return canvas.toDataURL();
        } catch (error) {
            console.error('Thumbnail extraction with exclusions error:', error);
            return null;
        }
    },

    // Calculate Intersection over Union
    calculateIoU: (box1, box2) => {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
        const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

        const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const box1Area = box1.width * box1.height;
        const box2Area = box2.width * box2.height;
        const unionArea = box1Area + box2Area - intersectionArea;

        return unionArea > 0 ? intersectionArea / unionArea : 0;
    },

    // Preprocess image for template matching
    preprocessImageForMatching: (img) => {
        let gray = new cv.Mat();
        const binary = new cv.Mat();
        const processed = new cv.Mat();

        if (img.channels() > 1) {
            cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
        } else {
            img.copyTo(gray);
        }

        cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 3);

        const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
        cv.morphologyEx(binary, processed, cv.MORPH_CLOSE, kernel);

        kernel.delete();
        gray.delete();
        binary.delete();

        return processed;
    },

    // Format date for display
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleString();
    },

    // Format date for filename
    formatDateForFilename: (date = new Date()) => {
        return date.toISOString().slice(0, 19).replace(/:/g, '-');
    },

    // Download blob as file
    downloadBlob: (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Create JSON blob
    createJsonBlob: (data) => {
        const jsonString = JSON.stringify(data, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
    },

    // Deep clone object
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    }
};

// Make globally available
window.Utils = Utils;
