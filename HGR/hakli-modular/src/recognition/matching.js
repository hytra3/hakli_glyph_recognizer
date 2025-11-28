// ============================================
// TEMPLATE MATCHING
// Match isolated regions against glyph templates
// ============================================

const Matching = {
    /**
     * Perform template matching for a single region against a glyph template
     * @param {cv.Mat} regionMat - Region to match
     * @param {cv.Mat} templateMat - Template to match against
     * @param {Object} glyph - Glyph metadata
     * @param {string} matchType - Type of match (primary/variant/example)
     * @returns {Object} Match result with confidence and details
     */
    performTemplateMatching: (regionMat, templateMat, glyph, matchType = 'primary') => {
        try {
            // Preprocess both images
            const regionProcessed = Utils.preprocessImageForMatching(regionMat);
            const templateProcessed = Utils.preprocessImageForMatching(templateMat);

            let bestMatch = {
                confidence: 0,
                scale: 1.0,
                rotation: 0,
                method: null
            };

            // Try different scales and rotations
            for (const scale of CONFIG.RECOGNITION.SCALES) {
                // Skip if scaled template would be invalid
                const scaledWidth = Math.round(templateProcessed.cols * scale);
                const scaledHeight = Math.round(templateProcessed.rows * scale);
                
                if (scaledWidth < 5 || scaledHeight < 5 || 
                    scaledWidth > regionProcessed.cols || 
                    scaledHeight > regionProcessed.rows) {
                    continue;
                }

                // Scale template
                const scaledTemplate = new cv.Mat();
                cv.resize(templateProcessed, scaledTemplate, new cv.Size(scaledWidth, scaledHeight));

                for (const rotation of CONFIG.RECOGNITION.ROTATIONS) {
                    let rotatedTemplate = scaledTemplate;
                    
                    // Rotate if needed
                    if (rotation !== 0) {
                        rotatedTemplate = Matching.rotateImage(scaledTemplate, rotation);
                    }

                    // Skip if rotated template is larger than region
                    if (rotatedTemplate.cols > regionProcessed.cols || 
                        rotatedTemplate.rows > regionProcessed.rows) {
                        if (rotation !== 0) rotatedTemplate.delete();
                        continue;
                    }

                    // Perform template matching with multiple methods
                    const methods = [
                        cv.TM_CCOEFF_NORMED,
                        cv.TM_CCORR_NORMED,
                        cv.TM_SQDIFF_NORMED
                    ];

                    for (const method of methods) {
                        const result = new cv.Mat();
                        cv.matchTemplate(regionProcessed, rotatedTemplate, result, method);

                        const minMax = cv.minMaxLoc(result);
                        let confidence = method === cv.TM_SQDIFF_NORMED 
                            ? 1 - minMax.minVal 
                            : minMax.maxVal;

                        // Apply match type weight
                        const matchWeight = CONFIG.RECOGNITION.CONFIDENCE_WEIGHTS[matchType.toUpperCase()] || 1.0;
                        confidence *= matchWeight;

                        if (confidence > bestMatch.confidence) {
                            bestMatch = {
                                confidence: confidence,
                                scale: scale,
                                rotation: rotation,
                                method: method,
                                matchType: matchType
                            };
                        }

                        result.delete();
                    }

                    if (rotation !== 0) {
                        rotatedTemplate.delete();
                    }
                }

                scaledTemplate.delete();
            }

            // Cleanup
            regionProcessed.delete();
            templateProcessed.delete();

            return bestMatch;

        } catch (error) {
            console.error('Template matching error:', error);
            return { confidence: 0, scale: 1.0, rotation: 0, method: null };
        }
    },

    /**
     * Rotate an image by a given angle
     * @param {cv.Mat} image - Image to rotate
     * @param {number} angle - Angle in degrees
     * @returns {cv.Mat} Rotated image
     */
    rotateImage: (image, angle) => {
        const center = new cv.Point(image.cols / 2, image.rows / 2);
        const rotationMatrix = cv.getRotationMatrix2D(center, angle, 1.0);
        
        const rotated = new cv.Mat();
        cv.warpAffine(image, rotated, rotationMatrix, image.size());
        
        rotationMatrix.delete();
        return rotated;
    },

    /**
     * Match a region against all available templates for a glyph
     * @param {cv.Mat} regionMat - Region to match
     * @param {Object} glyph - Glyph with templates
     * @returns {Object} Best match across all templates
     */
    matchAllTemplates: async (regionMat, glyph) => {
        let bestOverallMatch = {
            confidence: 0,
            templateType: null,
            matchDetails: null
        };

        // Try primary template
        if (glyph.primary_template_url) {
            const primaryTemplate = await Matching.loadTemplateImage(glyph.primary_template_url);
            if (primaryTemplate) {
                const match = Matching.performTemplateMatching(regionMat, primaryTemplate, glyph, 'primary');
                if (match.confidence > bestOverallMatch.confidence) {
                    bestOverallMatch = {
                        confidence: match.confidence,
                        templateType: 'primary',
                        matchDetails: match
                    };
                }
                primaryTemplate.delete();
            }
        }

        // Try variant templates
        if (glyph.variant_template_urls && Array.isArray(glyph.variant_template_urls)) {
            for (const variantUrl of glyph.variant_template_urls.slice(0, 3)) { // Limit to 3 variants
                const variantTemplate = await Matching.loadTemplateImage(variantUrl);
                if (variantTemplate) {
                    const match = Matching.performTemplateMatching(regionMat, variantTemplate, glyph, 'variant');
                    if (match.confidence > bestOverallMatch.confidence) {
                        bestOverallMatch = {
                            confidence: match.confidence,
                            templateType: 'variant',
                            matchDetails: match
                        };
                    }
                    variantTemplate.delete();
                }
            }
        }

        // Try example templates
        if (glyph.example_template_urls && Array.isArray(glyph.example_template_urls)) {
            for (const exampleUrl of glyph.example_template_urls.slice(0, 2)) { // Limit to 2 examples
                const exampleTemplate = await Matching.loadTemplateImage(exampleUrl);
                if (exampleTemplate) {
                    const match = Matching.performTemplateMatching(regionMat, exampleTemplate, glyph, 'example');
                    if (match.confidence > bestOverallMatch.confidence) {
                        bestOverallMatch = {
                            confidence: match.confidence,
                            templateType: 'example',
                            matchDetails: match
                        };
                    }
                    exampleTemplate.delete();
                }
            }
        }

        return bestOverallMatch;
    },

    /**
     * Load template image from URL
     * @param {string} url - URL or GitHub path to template
     * @returns {Promise<cv.Mat>} OpenCV Mat of template
     */
    loadTemplateImage: (url) => {
        return new Promise((resolve) => {
            const fullUrl = Utils.convertToGitHubUrl(url);
            if (!fullUrl) {
                resolve(null);
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const imageMat = cv.imread(canvas);
                    resolve(imageMat);
                } catch (error) {
                    console.error('Failed to load template:', fullUrl, error);
                    resolve(null);
                }
            };
            
            img.onerror = () => {
                console.error('Failed to load template image:', fullUrl);
                resolve(null);
            };
            
            img.src = fullUrl;
        });
    },

    /**
     * Calculate shape-based confidence boost
     * @param {Object} region - Region bounds and properties
     * @param {Object} glyph - Glyph metadata
     * @returns {number} Confidence boost (0-1)
     */
    calculateShapeBoost: (region, glyph) => {
        let boost = 0;

        // Aspect ratio similarity
        if (glyph.expected_aspect_ratio) {
            const aspectDiff = Math.abs(region.aspectRatio - glyph.expected_aspect_ratio);
            const aspectScore = Math.max(0, 1 - aspectDiff);
            boost += aspectScore * CONFIG.RECOGNITION.SHAPE_WEIGHTS.ASPECT;
        }

        // Solidity similarity
        if (glyph.expected_solidity) {
            const solidityDiff = Math.abs(region.solidity - glyph.expected_solidity);
            const solidityScore = Math.max(0, 1 - solidityDiff);
            boost += solidityScore * CONFIG.RECOGNITION.SHAPE_WEIGHTS.SHAPE;
        }

        return boost;
    }
};

// Make globally available
window.Matching = Matching;
