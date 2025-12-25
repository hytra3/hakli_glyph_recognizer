// ============================================
// usePreprocessing Hook
// Handles OpenCV-based image preprocessing
// ============================================

const usePreprocessing = () => {
    const { useState, useCallback, useRef, useEffect } = React;
    
    // OpenCV Mat references
    const originalMatRef = useRef(null);
    const preprocessedMatRef = useRef(null);
    const displayMatRef = useRef(null);
    
    // State
    const [isReady, setIsReady] = useState(false);
    const [settings, setSettings] = useState({
        rotation: 0,
        useAdaptiveThreshold: false,
        blockSize: 11,
        constantOffset: 2,
        gaussianBlur: 0,
        morphologyOperation: 'none',
        invertColors: false
    });
    const [previewDataUrl, setPreviewDataUrl] = useState(null);
    
    // Check if OpenCV is ready
    useEffect(() => {
        const checkOpenCV = () => {
            if (typeof cv !== 'undefined' && cv.Mat) {
                setIsReady(true);
                console.log('✅ usePreprocessing: OpenCV ready');
            } else {
                setTimeout(checkOpenCV, 100);
            }
        };
        checkOpenCV();
    }, []);
    
    /**
     * Load an image into OpenCV Mat
     * @param {string} imageSource - Base64 data URL or image URL
     * @returns {Promise<cv.Mat>}
     */
    const loadImageToMat = useCallback((imageSource) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // Create canvas and draw image
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert to OpenCV Mat
                    const mat = cv.imread(canvas);
                    resolve(mat);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageSource;
        });
    }, []);
    
    /**
     * Convert OpenCV Mat to base64 data URL
     * @param {cv.Mat} mat 
     * @returns {string}
     */
    const matToDataUrl = useCallback((mat) => {
        const canvas = document.createElement('canvas');
        cv.imshow(canvas, mat);
        return canvas.toDataURL('image/png');
    }, []);
    
    /**
     * Set the source image for preprocessing
     * @param {string} imageSource - Base64 data URL
     */
    const setSourceImage = useCallback(async (imageSource) => {
        if (!isReady) {
            console.warn('OpenCV not ready');
            return false;
        }
        
        try {
            // Clean up old mats
            if (originalMatRef.current && !originalMatRef.current.isDeleted()) {
                originalMatRef.current.delete();
            }
            if (preprocessedMatRef.current && !preprocessedMatRef.current.isDeleted()) {
                preprocessedMatRef.current.delete();
            }
            
            // Load new image
            const mat = await loadImageToMat(imageSource);
            originalMatRef.current = mat;
            
            // Apply current settings
            await applyPreprocessing(settings);
            
            console.log('✅ Source image loaded:', mat.cols, 'x', mat.rows);
            return true;
        } catch (error) {
            console.error('Failed to set source image:', error);
            return false;
        }
    }, [isReady, settings, loadImageToMat]);
    
    /**
     * Apply preprocessing with current or new settings
     * @param {Object} newSettings - Optional new settings to apply
     */
    const applyPreprocessing = useCallback(async (newSettings = null) => {
        if (!originalMatRef.current || originalMatRef.current.isDeleted()) {
            console.warn('No source image loaded');
            return null;
        }
        
        const currentSettings = newSettings || settings;
        
        try {
            // Clean up old preprocessed mat
            if (preprocessedMatRef.current && !preprocessedMatRef.current.isDeleted()) {
                preprocessedMatRef.current.delete();
            }
            
            let result = originalMatRef.current.clone();
            
            // 1. Apply rotation
            if (currentSettings.rotation !== 0) {
                const center = new cv.Point(result.cols / 2, result.rows / 2);
                const rotMatrix = cv.getRotationMatrix2D(center, -currentSettings.rotation, 1.0);
                
                // Calculate new bounds
                const cos = Math.abs(rotMatrix.doubleAt(0, 0));
                const sin = Math.abs(rotMatrix.doubleAt(0, 1));
                const newWidth = Math.floor(result.rows * sin + result.cols * cos);
                const newHeight = Math.floor(result.rows * cos + result.cols * sin);
                
                // Adjust rotation matrix
                rotMatrix.doublePtr(0, 2)[0] += (newWidth - result.cols) / 2;
                rotMatrix.doublePtr(1, 2)[0] += (newHeight - result.rows) / 2;
                
                const rotated = new cv.Mat();
                const dsize = new cv.Size(newWidth, newHeight);
                cv.warpAffine(result, rotated, rotMatrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
                
                result.delete();
                rotMatrix.delete();
                result = rotated;
            }
            
            // 2. Convert to grayscale for further processing
            let gray = new cv.Mat();
            if (result.channels() === 4) {
                cv.cvtColor(result, gray, cv.COLOR_RGBA2GRAY);
            } else if (result.channels() === 3) {
                cv.cvtColor(result, gray, cv.COLOR_RGB2GRAY);
            } else {
                gray = result.clone();
            }
            
            // 3. Apply Gaussian blur
            if (currentSettings.gaussianBlur > 0) {
                const ksize = currentSettings.gaussianBlur % 2 === 0 
                    ? currentSettings.gaussianBlur + 1 
                    : currentSettings.gaussianBlur;
                cv.GaussianBlur(gray, gray, new cv.Size(ksize, ksize), 0);
            }
            
            // 4. Apply adaptive threshold
            if (currentSettings.useAdaptiveThreshold) {
                const blockSize = currentSettings.blockSize % 2 === 0 
                    ? currentSettings.blockSize + 1 
                    : currentSettings.blockSize;
                cv.adaptiveThreshold(
                    gray, gray, 255,
                    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                    cv.THRESH_BINARY,
                    blockSize,
                    currentSettings.constantOffset
                );
            }
            
            // 5. Apply morphology operation
            if (currentSettings.morphologyOperation !== 'none') {
                const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
                const morphed = new cv.Mat();
                
                switch (currentSettings.morphologyOperation) {
                    case 'erode':
                        cv.erode(gray, morphed, kernel);
                        break;
                    case 'dilate':
                        cv.dilate(gray, morphed, kernel);
                        break;
                    case 'open':
                        cv.morphologyEx(gray, morphed, cv.MORPH_OPEN, kernel);
                        break;
                    case 'close':
                        cv.morphologyEx(gray, morphed, cv.MORPH_CLOSE, kernel);
                        break;
                    default:
                        gray.copyTo(morphed);
                }
                
                gray.delete();
                kernel.delete();
                gray = morphed;
            }
            
            // 6. Invert colors
            if (currentSettings.invertColors) {
                cv.bitwise_not(gray, gray);
            }
            
            // Clean up and store result
            result.delete();
            preprocessedMatRef.current = gray;
            
            // Generate preview
            const dataUrl = matToDataUrl(gray);
            setPreviewDataUrl(dataUrl);
            
            // Update settings if new ones provided
            if (newSettings) {
                setSettings(newSettings);
            }
            
            console.log('✅ Preprocessing applied');
            return dataUrl;
            
        } catch (error) {
            console.error('Preprocessing error:', error);
            return null;
        }
    }, [settings, matToDataUrl]);
    
    /**
     * Update a single setting and reapply
     */
    const updateSetting = useCallback((key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        applyPreprocessing(newSettings);
    }, [settings, applyPreprocessing]);
    
    /**
     * Reset to defaults
     */
    const resetSettings = useCallback(() => {
        const defaults = {
            rotation: 0,
            useAdaptiveThreshold: false,
            blockSize: 11,
            constantOffset: 2,
            gaussianBlur: 0,
            morphologyOperation: 'none',
            invertColors: false
        };
        setSettings(defaults);
        applyPreprocessing(defaults);
    }, [applyPreprocessing]);
    
    /**
     * Get the preprocessed Mat for recognition
     * Returns a clone so the original is preserved
     */
    const getPreprocessedMat = useCallback(() => {
        if (preprocessedMatRef.current && !preprocessedMatRef.current.isDeleted()) {
            return preprocessedMatRef.current.clone();
        }
        if (originalMatRef.current && !originalMatRef.current.isDeleted()) {
            return originalMatRef.current.clone();
        }
        return null;
    }, []);
    
    /**
     * Get the original Mat
     */
    const getOriginalMat = useCallback(() => {
        if (originalMatRef.current && !originalMatRef.current.isDeleted()) {
            return originalMatRef.current.clone();
        }
        return null;
    }, []);
    
    /**
     * Render preprocessed image to a canvas
     */
    const renderToCanvas = useCallback((canvas) => {
        if (!canvas) return false;
        
        const mat = preprocessedMatRef.current || originalMatRef.current;
        if (!mat || mat.isDeleted()) return false;
        
        try {
            cv.imshow(canvas, mat);
            return true;
        } catch (error) {
            console.error('Failed to render to canvas:', error);
            return false;
        }
    }, []);
    
    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            if (originalMatRef.current && !originalMatRef.current.isDeleted()) {
                originalMatRef.current.delete();
            }
            if (preprocessedMatRef.current && !preprocessedMatRef.current.isDeleted()) {
                preprocessedMatRef.current.delete();
            }
            if (displayMatRef.current && !displayMatRef.current.isDeleted()) {
                displayMatRef.current.delete();
            }
        };
    }, []);
    
    return {
        // State
        isReady,
        settings,
        previewDataUrl,
        
        // Actions
        setSourceImage,
        applyPreprocessing,
        updateSetting,
        resetSettings,
        
        // Getters
        getPreprocessedMat,
        getOriginalMat,
        renderToCanvas,
        
        // Direct Mat access (use carefully!)
        originalMat: originalMatRef.current,
        preprocessedMat: preprocessedMatRef.current
    };
};

// Make globally available
window.usePreprocessing = usePreprocessing;
