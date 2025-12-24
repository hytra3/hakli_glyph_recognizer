// ============================================
// UTILITY FUNCTIONS
// Helper functions used by recognition modules
// ============================================

const Utils = {
    /**
     * Calculate Intersection over Union (IoU) for two bounding boxes
     * @param {Object} box1 - First box {x, y, width, height}
     * @param {Object} box2 - Second box {x, y, width, height}
     * @returns {number} IoU value between 0 and 1
     */
    calculateIoU: (box1, box2) => {
        // Handle both {x, y, width, height} and {bounds: {x, y, width, height}} formats
        const b1 = box1.bounds || box1;
        const b2 = box2.bounds || box2;
        
        const x1 = Math.max(b1.x, b2.x);
        const y1 = Math.max(b1.y, b2.y);
        const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
        const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);
        
        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const area1 = b1.width * b1.height;
        const area2 = b2.width * b2.height;
        const union = area1 + area2 - intersection;
        
        return union > 0 ? intersection / union : 0;
    },
    
    /**
     * Preprocess image for template matching
     * Converts to grayscale, normalizes, and resizes if needed
     * @param {cv.Mat} mat - OpenCV Mat to preprocess
     * @returns {cv.Mat} Preprocessed Mat (caller must delete)
     */
    preprocessImageForMatching: (mat) => {
        let result = new cv.Mat();
        
        // Convert to grayscale if needed
        if (mat.channels() === 4) {
            cv.cvtColor(mat, result, cv.COLOR_RGBA2GRAY);
        } else if (mat.channels() === 3) {
            cv.cvtColor(mat, result, cv.COLOR_RGB2GRAY);
        } else {
            result = mat.clone();
        }
        
        // Normalize for better matching
        cv.normalize(result, result, 0, 255, cv.NORM_MINMAX);
        
        return result;
    },
    
    /**
     * Convert relative GitHub path to full raw URL
     * @param {string} url - URL or relative path
     * @returns {string} Full raw GitHub URL
     */
    convertToGitHubUrl: (url) => {
        if (!url) return null;
        
        // Already a full URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Convert github.com to raw.githubusercontent.com
            if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
                return url
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/');
            }
            return url;
        }
        
        // Data URL - return as-is
        if (url.startsWith('data:')) {
            return url;
        }
        
        // Relative path - prepend repo base URL
        const baseUrl = CONFIG?.REPO?.BASE_URL || 
            'https://raw.githubusercontent.com/hytra3/hakli_glyph_recognizer/main/';
        
        // Remove leading ./ or /
        const cleanPath = url.replace(/^\.?\//, '');
        
        return baseUrl + cleanPath;
    },
    
    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate: (date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleString();
    },
    
    /**
     * Format date for filename (YYYY-MM-DD)
     * @param {Date} date - Date to format (default: now)
     * @returns {string} Formatted date string
     */
    formatDateForFilename: (date = new Date()) => {
        return date.toISOString().slice(0, 10);
    },
    
    /**
     * Download a Blob as a file
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Name for downloaded file
     */
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
    
    /**
     * Create a JSON Blob from data
     * @param {Object} data - Data to convert
     * @returns {Blob} JSON Blob
     */
    createJsonBlob: (data) => {
        return new Blob(
            [JSON.stringify(data, null, CONFIG?.EXPORT?.JSON_INDENT || 2)], 
            { type: 'application/json' }
        );
    },
    
    /**
     * Load image from URL and return as OpenCV Mat
     * @param {string} url - Image URL
     * @returns {Promise<cv.Mat>} OpenCV Mat
     */
    loadImageAsMat: (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const mat = cv.imread(canvas);
                    resolve(mat);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image: ' + url));
            img.src = Utils.convertToGitHubUrl(url);
        });
    },
    
    /**
     * Convert OpenCV Mat to data URL
     * @param {cv.Mat} mat - OpenCV Mat
     * @returns {string} Data URL
     */
    matToDataUrl: (mat) => {
        const canvas = document.createElement('canvas');
        cv.imshow(canvas, mat);
        return canvas.toDataURL('image/png');
    },
    
    /**
     * Extract region from image as data URL
     * @param {string} imageSrc - Source image URL/data URL
     * @param {Object} region - Region bounds {x, y, width, height}
     * @returns {Promise<string>} Data URL of extracted region
     */
    extractRegionThumbnail: (imageSrc, region) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
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
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageSrc;
        });
    },
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce: (func, wait = 300) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateId: (prefix = 'id') => {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Check if OpenCV is ready
     * @returns {boolean} True if OpenCV is loaded and ready
     */
    isOpenCVReady: () => {
        return typeof cv !== 'undefined' && cv.Mat !== undefined;
    },
    
    /**
     * Wait for OpenCV to be ready
     * @param {number} timeout - Timeout in ms (default 10000)
     * @returns {Promise<void>}
     */
    waitForOpenCV: (timeout = 10000) => {
        return new Promise((resolve, reject) => {
            if (Utils.isOpenCVReady()) {
                resolve();
                return;
            }
            
            const startTime = Date.now();
            const check = () => {
                if (Utils.isOpenCVReady()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('OpenCV load timeout'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
};

// Make globally available
window.Utils = Utils;

console.log('✅ Utils loaded');
