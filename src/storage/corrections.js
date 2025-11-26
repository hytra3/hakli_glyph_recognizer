// ============================================
// CORRECTION MEMORY
// Store and retrieve user corrections for learning
// ============================================

const CorrectionMemory = {
    /**
     * Save a correction to memory
     * @param {string} originalGlyphId - Original detected glyph ID
     * @param {string} correctedGlyphId - Corrected glyph ID
     * @param {number} originalConfidence - Original detection confidence
     * @param {Object} context - Additional context (optional)
     * @returns {boolean} Success status
     */
    saveCorrection: (originalGlyphId, correctedGlyphId, originalConfidence, context = {}) => {
        try {
            const corrections = CorrectionMemory.getAllCorrections();
            const key = `${originalGlyphId}->${correctedGlyphId}`;
            
            if (!corrections[key]) {
                corrections[key] = {
                    originalGlyph: originalGlyphId,
                    correctedGlyph: correctedGlyphId,
                    count: 0,
                    confidences: [],
                    contexts: [],
                    firstSeen: new Date().toISOString(),
                    lastSeen: null
                };
            }

            corrections[key].count++;
            corrections[key].confidences.push(originalConfidence);
            corrections[key].contexts.push({
                ...context,
                timestamp: new Date().toISOString()
            });
            corrections[key].lastSeen = new Date().toISOString();

            // Keep only last 10 contexts
            if (corrections[key].contexts.length > 10) {
                corrections[key].contexts = corrections[key].contexts.slice(-10);
            }

            localStorage.setItem(CONFIG.STORAGE.CORRECTIONS_KEY, JSON.stringify(corrections));
            
            console.log(`💡 Saved correction: ${originalGlyphId} → ${correctedGlyphId} (count: ${corrections[key].count})`);
            return true;
        } catch (error) {
            console.error('Failed to save correction:', error);
            return false;
        }
    },

    /**
     * Get all corrections from memory
     * @returns {Object} All corrections
     */
    getAllCorrections: () => {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE.CORRECTIONS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to load corrections:', error);
            return {};
        }
    },

    /**
     * Get correction suggestion for a glyph
     * @param {string} glyphId - Detected glyph ID
     * @param {number} confidence - Detection confidence
     * @returns {Object|null} Correction suggestion or null
     */
    getSuggestion: (glyphId, confidence = 0) => {
        const corrections = CorrectionMemory.getAllCorrections();
        const suggestions = [];

        // Find all corrections from this glyph
        Object.values(corrections).forEach(correction => {
            if (correction.originalGlyph === glyphId) {
                const avgConfidence = correction.confidences.reduce((a, b) => a + b, 0) / correction.confidences.length;
                
                suggestions.push({
                    correctedGlyph: correction.correctedGlyph,
                    frequency: correction.count,
                    avgOriginalConfidence: avgConfidence,
                    lastSeen: correction.lastSeen,
                    score: correction.count * (1 - Math.abs(confidence - avgConfidence))
                });
            }
        });

        // Sort by score (frequency weighted by confidence similarity)
        suggestions.sort((a, b) => b.score - a.score);

        return suggestions.length > 0 ? suggestions[0] : null;
    },

    /**
     * Get correction statistics
     * @returns {Object} Statistics
     */
    getStatistics: () => {
        const corrections = CorrectionMemory.getAllCorrections();
        const entries = Object.values(corrections);

        if (entries.length === 0) {
            return {
                totalCorrections: 0,
                uniquePairs: 0,
                mostFrequent: [],
                recentCorrections: []
            };
        }

        const totalCorrections = entries.reduce((sum, c) => sum + c.count, 0);
        const mostFrequent = entries
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(c => ({
                from: c.originalGlyph,
                to: c.correctedGlyph,
                count: c.count
            }));

        const recentCorrections = entries
            .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
            .slice(0, 10)
            .map(c => ({
                from: c.originalGlyph,
                to: c.correctedGlyph,
                count: c.count,
                lastSeen: c.lastSeen
            }));

        return {
            totalCorrections,
            uniquePairs: entries.length,
            mostFrequent,
            recentCorrections,
            averageCorrectionsPerPair: (totalCorrections / entries.length).toFixed(1)
        };
    },

    /**
     * Export corrections to JSON file
     * @returns {boolean} Success status
     */
    exportCorrections: () => {
        try {
            const corrections = CorrectionMemory.getAllCorrections();
            const stats = CorrectionMemory.getStatistics();
            
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: CONFIG.APP_VERSION,
                    statistics: stats
                },
                corrections: corrections
            };

            const filename = `hakli-corrections-${Utils.formatDateForFilename()}.json`;
            Utils.downloadBlob(Utils.createJsonBlob(exportData), filename);
            
            console.log(`📥 Exported ${stats.uniquePairs} correction pairs`);
            alert(`✅ Exported ${stats.uniquePairs} correction patterns`);
            return true;
        } catch (error) {
            console.error('Failed to export corrections:', error);
            alert('❌ Failed to export corrections');
            return false;
        }
    },

    /**
     * Import corrections from JSON file
     * @param {Object} data - Imported correction data
     * @param {boolean} merge - Whether to merge with existing corrections
     * @returns {boolean} Success status
     */
    importCorrections: (data, merge = true) => {
        try {
            let corrections = merge ? CorrectionMemory.getAllCorrections() : {};
            
            // Merge imported corrections
            Object.entries(data.corrections || data).forEach(([key, correction]) => {
                if (corrections[key] && merge) {
                    // Merge with existing
                    corrections[key].count += correction.count;
                    corrections[key].confidences.push(...correction.confidences);
                    corrections[key].contexts.push(...correction.contexts);
                    corrections[key].lastSeen = correction.lastSeen;
                } else {
                    // Add new
                    corrections[key] = correction;
                }
            });

            localStorage.setItem(CONFIG.STORAGE.CORRECTIONS_KEY, JSON.stringify(corrections));
            
            const imported = Object.keys(data.corrections || data).length;
            console.log(`📤 Imported ${imported} correction patterns`);
            alert(`✅ Imported ${imported} correction patterns`);
            return true;
        } catch (error) {
            console.error('Failed to import corrections:', error);
            alert('❌ Failed to import corrections: ' + error.message);
            return false;
        }
    },

    /**
     * Clear all corrections
     * @param {boolean} confirm - Whether to show confirmation
     * @returns {boolean} Success status
     */
    clearAll: (confirm = true) => {
        if (confirm && !window.confirm('⚠️ Clear all correction memory? This cannot be undone.')) {
            return false;
        }

        try {
            localStorage.removeItem(CONFIG.STORAGE.CORRECTIONS_KEY);
            console.log('🗑️ Cleared all corrections');
            alert('✅ Correction memory cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear corrections:', error);
            return false;
        }
    },

    /**
     * Get corrections for a specific glyph
     * @param {string} glyphId - Glyph ID
     * @returns {Array} Array of corrections
     */
    getCorrectionsForGlyph: (glyphId) => {
        const corrections = CorrectionMemory.getAllCorrections();
        return Object.values(corrections)
            .filter(c => c.originalGlyph === glyphId || c.correctedGlyph === glyphId)
            .map(c => ({
                originalGlyph: c.originalGlyph,
                correctedGlyph: c.correctedGlyph,
                count: c.count,
                lastSeen: c.lastSeen
            }));
    },

    /**
     * Show correction statistics in console
     */
    showStatistics: () => {
        const stats = CorrectionMemory.getStatistics();
        console.log('📊 Correction Memory Statistics:');
        console.log(`   Total corrections: ${stats.totalCorrections}`);
        console.log(`   Unique patterns: ${stats.uniquePairs}`);
        console.log(`   Average per pattern: ${stats.averageCorrectionsPerPair}`);
        console.log('   Most frequent:');
        stats.mostFrequent.slice(0, 5).forEach(c => {
            console.log(`   - ${c.from} → ${c.to}: ${c.count}x`);
        });
    },

    /**
     * Apply correction learning to recognition results
     * @param {Array} results - Recognition results
     * @returns {Array} Results with correction suggestions
     */
    applyLearning: (results) => {
        return results.map(result => {
            const suggestion = CorrectionMemory.getSuggestion(result.glyph.id, result.confidence);
            
            if (suggestion && suggestion.frequency >= 3) { // Only suggest if seen 3+ times
                return {
                    ...result,
                    correctionSuggestion: suggestion.correctedGlyph,
                    suggestionConfidence: suggestion.frequency / 10, // Max 1.0 at 10+ occurrences
                    originalDetection: result.glyph.id
                };
            }
            
            return result;
        });
    }
};

// Make globally available
window.CorrectionMemory = CorrectionMemory;
