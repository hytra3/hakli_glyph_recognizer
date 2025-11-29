// ============================================
// TEMPLATE LEARNING
// Learn new glyph variants from validated corrections
// ============================================

const TemplateLearning = {
    STORAGE_KEY: 'hakli_learned_variants',
    
    // Threshold: require this many occurrences before using as variant
    OCCURRENCE_THRESHOLD: 2,

    /**
     * Get all learned variants
     * @returns {Object} Learned variants by glyph ID
     */
    getAllVariants: () => {
        try {
            const stored = localStorage.getItem(TemplateLearning.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to load learned variants:', error);
            return {};
        }
    },

    /**
     * Save learned variants
     * @param {Object} variants - Variants to save
     */
    _saveVariants: (variants) => {
        try {
            localStorage.setItem(TemplateLearning.STORAGE_KEY, JSON.stringify(variants));
        } catch (error) {
            console.error('Failed to save learned variants:', error);
        }
    },

    /**
     * Record a validated correction for learning
     * @param {Object} detection - The detection that was corrected
     * @param {Object} correctedGlyph - The correct glyph
     * @param {string} thumbnail - Base64 thumbnail of the region
     * @param {string} inscriptionId - Source inscription ID
     * @returns {boolean} Whether this correction should become a variant
     */
    recordCorrection: (detection, correctedGlyph, thumbnail, inscriptionId) => {
        if (!detection || !correctedGlyph || !thumbnail) return false;

        const variants = TemplateLearning.getAllVariants();
        const glyphId = correctedGlyph.id || correctedGlyph.name;

        if (!variants[glyphId]) {
            variants[glyphId] = {
                glyphName: correctedGlyph.name,
                glyphArabic: correctedGlyph.arabic,
                learnedExamples: []
            };
        }

        // Check if we already have a similar thumbnail (avoid duplicates)
        const isDuplicate = variants[glyphId].learnedExamples.some(ex => 
            ex.inscriptionId === inscriptionId && 
            Math.abs(ex.confidence - detection.confidence) < 0.05
        );

        if (isDuplicate) {
            console.log('📚 Duplicate example, skipping');
            return false;
        }

        // Add new example
        variants[glyphId].learnedExamples.push({
            thumbnail,
            originalGlyph: detection.glyph?.name || 'unknown',
            confidence: detection.confidence,
            inscriptionId,
            position: detection.position,
            timestamp: new Date().toISOString()
        });

        TemplateLearning._saveVariants(variants);

        const count = variants[glyphId].learnedExamples.length;
        console.log(`📚 Recorded correction for ${glyphId} (${count} examples)`);

        // Return true if we've hit the threshold
        return count >= TemplateLearning.OCCURRENCE_THRESHOLD;
    },

    /**
     * Get learned variants for a specific glyph
     * @param {string} glyphId - Glyph ID or name
     * @returns {Array} Array of learned examples
     */
    getVariantsForGlyph: (glyphId) => {
        const variants = TemplateLearning.getAllVariants();
        return variants[glyphId]?.learnedExamples || [];
    },

    /**
     * Get variant thumbnails that meet the occurrence threshold
     * @param {string} glyphId - Glyph ID or name
     * @returns {Array} Array of thumbnail data URLs
     */
    getActiveVariants: (glyphId) => {
        const examples = TemplateLearning.getVariantsForGlyph(glyphId);
        
        if (examples.length < TemplateLearning.OCCURRENCE_THRESHOLD) {
            return [];
        }

        // Return unique thumbnails (deduplicated by inscription)
        const seen = new Set();
        return examples
            .filter(ex => {
                if (seen.has(ex.inscriptionId)) return false;
                seen.add(ex.inscriptionId);
                return true;
            })
            .map(ex => ex.thumbnail)
            .slice(0, 5); // Limit to 5 variants
    },

    /**
     * Analyze corrections to find glyph confusion patterns
     * @returns {Array} Array of confusion patterns
     */
    analyzeConfusionPatterns: () => {
        const variants = TemplateLearning.getAllVariants();
        const patterns = [];

        for (const [glyphId, data] of Object.entries(variants)) {
            // Group by original (confused) glyph
            const confusedWith = {};
            data.learnedExamples.forEach(ex => {
                const orig = ex.originalGlyph;
                if (!confusedWith[orig]) {
                    confusedWith[orig] = { count: 0, avgConfidence: 0 };
                }
                confusedWith[orig].count++;
                confusedWith[orig].avgConfidence += ex.confidence;
            });

            // Calculate averages
            for (const orig of Object.keys(confusedWith)) {
                confusedWith[orig].avgConfidence /= confusedWith[orig].count;
            }

            // Add to patterns if there are confusions
            if (Object.keys(confusedWith).length > 0) {
                patterns.push({
                    correctGlyph: glyphId,
                    glyphName: data.glyphName,
                    totalExamples: data.learnedExamples.length,
                    confusedWith: Object.entries(confusedWith)
                        .map(([orig, stats]) => ({
                            originalGlyph: orig,
                            count: stats.count,
                            avgConfidence: stats.avgConfidence.toFixed(2)
                        }))
                        .sort((a, b) => b.count - a.count)
                });
            }
        }

        return patterns.sort((a, b) => b.totalExamples - a.totalExamples);
    },

    /**
     * Export learned variants for sharing
     * @returns {Object} Export data
     */
    exportVariants: () => {
        const variants = TemplateLearning.getAllVariants();
        const stats = TemplateLearning.getStatistics();

        return {
            metadata: {
                exportDate: new Date().toISOString(),
                version: CONFIG?.APP_VERSION || 'unknown',
                statistics: stats
            },
            variants
        };
    },

    /**
     * Import learned variants
     * @param {Object} data - Import data
     * @param {boolean} merge - Whether to merge with existing
     * @returns {boolean} Success status
     */
    importVariants: (data, merge = true) => {
        try {
            let variants = merge ? TemplateLearning.getAllVariants() : {};
            const imported = data.variants || data;

            for (const [glyphId, glyphData] of Object.entries(imported)) {
                if (!variants[glyphId]) {
                    variants[glyphId] = glyphData;
                } else if (merge) {
                    // Merge examples, avoiding duplicates by timestamp
                    const existing = new Set(
                        variants[glyphId].learnedExamples.map(e => e.timestamp)
                    );
                    
                    glyphData.learnedExamples.forEach(ex => {
                        if (!existing.has(ex.timestamp)) {
                            variants[glyphId].learnedExamples.push(ex);
                        }
                    });
                }
            }

            TemplateLearning._saveVariants(variants);
            console.log('📚 Imported learned variants');
            return true;
        } catch (error) {
            console.error('Import variants error:', error);
            return false;
        }
    },

    /**
     * Get learning statistics
     * @returns {Object} Statistics
     */
    getStatistics: () => {
        const variants = TemplateLearning.getAllVariants();
        const glyphIds = Object.keys(variants);
        
        let totalExamples = 0;
        let activeVariants = 0;

        glyphIds.forEach(id => {
            const count = variants[id].learnedExamples.length;
            totalExamples += count;
            if (count >= TemplateLearning.OCCURRENCE_THRESHOLD) {
                activeVariants++;
            }
        });

        return {
            totalGlyphs: glyphIds.length,
            totalExamples,
            activeVariants,
            occurrenceThreshold: TemplateLearning.OCCURRENCE_THRESHOLD
        };
    },

    /**
     * Clear all learned variants
     * @param {boolean} confirm - Show confirmation
     * @returns {boolean} Success status
     */
    clearAll: (confirm = true) => {
        if (confirm && !window.confirm('⚠️ Clear all learned variants? This cannot be undone.')) {
            return false;
        }

        try {
            localStorage.removeItem(TemplateLearning.STORAGE_KEY);
            console.log('📚 Cleared all learned variants');
            return true;
        } catch (error) {
            console.error('Clear variants error:', error);
            return false;
        }
    },

    /**
     * Remove specific variant example
     * @param {string} glyphId - Glyph ID
     * @param {number} exampleIndex - Index of example to remove
     */
    removeExample: (glyphId, exampleIndex) => {
        const variants = TemplateLearning.getAllVariants();
        
        if (variants[glyphId]?.learnedExamples[exampleIndex]) {
            variants[glyphId].learnedExamples.splice(exampleIndex, 1);
            
            // Remove glyph entry if no examples left
            if (variants[glyphId].learnedExamples.length === 0) {
                delete variants[glyphId];
            }
            
            TemplateLearning._saveVariants(variants);
            console.log(`📚 Removed example ${exampleIndex} from ${glyphId}`);
        }
    },

    /**
     * Enhance glyph chart with learned variants
     * Called before recognition to add learned thumbnails to templates
     * @param {Array} glyphs - Original glyph chart
     * @returns {Array} Enhanced glyph chart
     */
    enhanceGlyphChart: (glyphs) => {
        if (!glyphs || !Array.isArray(glyphs)) return glyphs;

        return glyphs.map(glyph => {
            const activeVariants = TemplateLearning.getActiveVariants(glyph.id || glyph.name);
            
            if (activeVariants.length === 0) return glyph;

            // Add learned variants to the glyph's examples
            return {
                ...glyph,
                images: {
                    ...glyph.images,
                    learned: activeVariants
                }
            };
        });
    }
};

// Make globally available
window.TemplateLearning = TemplateLearning;
