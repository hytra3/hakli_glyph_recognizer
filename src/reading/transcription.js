// ============================================
// TRANSCRIPTION
// Generate text from ordered glyph detections
// ============================================

const Transcription = {
    /**
     * Generate transcription from detections in reading order
     * @param {Array} detections - Array of detection objects
     * @param {Array} readingOrder - Array of indices in reading sequence
     * @param {Set} wordBoundaries - Set of indices where words end
     * @param {Set} lineBreaks - Set of indices where lines end
     * @param {Set} columnBreaks - Set of indices where columns end
     * @param {Object} options - Output options
     * @returns {Object} Transcription in multiple formats
     */
    generate: (detections, readingOrder, wordBoundaries, lineBreaks, columnBreaks, options = {}) => {
        const {
            includeUncertain = true,
            uncertainThreshold = 0.5,
            format = 'all' // 'transliteration', 'arabic', 'both', 'all'
        } = options;

        if (!detections || !readingOrder || readingOrder.length === 0) {
            return { transliteration: '', arabic: '', formatted: '' };
        }

        const result = {
            transliteration: [],
            arabic: [],
            words: [],
            lines: [],
            columns: []
        };

        let currentWord = { transliteration: [], arabic: [], glyphs: [] };
        let currentLine = [];
        let currentColumn = [];

        readingOrder.forEach((detectionIndex, orderIndex) => {
            const detection = detections[detectionIndex];
            if (!detection || !detection.glyph) return;

            const isUncertain = detection.confidence < uncertainThreshold;
            
            // Get glyph text
            let translit = detection.glyph.transliteration || detection.glyph.name || '?';
            let arabic = detection.glyph.arabic || detection.glyph.transliteration || '?';

            // Mark uncertain readings
            if (isUncertain && includeUncertain) {
                translit = `[${translit}]`;
                arabic = `[${arabic}]`;
            }

            // Skip if excluding uncertain and this is uncertain
            if (!includeUncertain && isUncertain) {
                translit = '·';
                arabic = '·';
            }

            currentWord.transliteration.push(translit);
            currentWord.arabic.push(arabic);
            currentWord.glyphs.push({
                index: detectionIndex,
                glyph: detection.glyph,
                confidence: detection.confidence
            });

            // Check for word boundary
            if (wordBoundaries.has(orderIndex)) {
                result.words.push({ ...currentWord });
                currentLine.push({ ...currentWord });
                currentWord = { transliteration: [], arabic: [], glyphs: [] };
            }

            // Check for line break
            if (lineBreaks.has(orderIndex)) {
                // Finish current word if not empty
                if (currentWord.transliteration.length > 0) {
                    result.words.push({ ...currentWord });
                    currentLine.push({ ...currentWord });
                    currentWord = { transliteration: [], arabic: [], glyphs: [] };
                }
                result.lines.push([...currentLine]);
                currentColumn.push([...currentLine]);
                currentLine = [];
            }

            // Check for column break
            if (columnBreaks.has(orderIndex)) {
                if (currentLine.length > 0) {
                    result.lines.push([...currentLine]);
                    currentColumn.push([...currentLine]);
                    currentLine = [];
                }
                result.columns.push([...currentColumn]);
                currentColumn = [];
            }
        });

        // Finish remaining content
        if (currentWord.transliteration.length > 0) {
            result.words.push({ ...currentWord });
            currentLine.push({ ...currentWord });
        }
        if (currentLine.length > 0) {
            result.lines.push([...currentLine]);
            currentColumn.push([...currentLine]);
        }
        if (currentColumn.length > 0) {
            result.columns.push([...currentColumn]);
        }

        // Generate string outputs
        result.transliteration = Transcription._wordsToString(result.words, 'transliteration');
        result.arabic = Transcription._wordsToString(result.words, 'arabic');
        result.formatted = Transcription._formatWithBreaks(result, options);

        return result;
    },

    /**
     * Convert words array to string
     */
    _wordsToString: (words, field) => {
        return words.map(w => w[field].join('')).join(' ');
    },

    /**
     * Format transcription with line/column breaks
     */
    _formatWithBreaks: (result, options = {}) => {
        const { lineBreakChar = '\n', columnBreakChar = '\n\n---\n\n' } = options;
        
        let output = '';
        
        result.columns.forEach((column, colIndex) => {
            column.forEach((line, lineIndex) => {
                const lineText = line.map(w => w.transliteration.join('')).join(' ');
                output += lineText;
                if (lineIndex < column.length - 1) {
                    output += lineBreakChar;
                }
            });
            if (colIndex < result.columns.length - 1) {
                output += columnBreakChar;
            }
        });

        return output;
    },

    /**
     * Generate HTML representation with annotations
     */
    toHTML: (detections, readingOrder, wordBoundaries, lineBreaks, options = {}) => {
        const { showConfidence = true, showArabic = true } = options;
        
        let html = '<div class="transcription">';
        let inWord = true;
        
        readingOrder.forEach((detectionIndex, orderIndex) => {
            const d = detections[detectionIndex];
            if (!d || !d.glyph) return;
            
            const confidence = Math.round(d.confidence * 100);
            const confidenceClass = confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low';
            
            html += `<span class="glyph ${confidenceClass}" data-index="${detectionIndex}" data-confidence="${confidence}">`;
            html += `<span class="transliteration">${d.glyph.transliteration || d.glyph.name}</span>`;
            
            if (showArabic && d.glyph.arabic) {
                html += `<span class="arabic">${d.glyph.arabic}</span>`;
            }
            
            if (showConfidence) {
                html += `<span class="confidence">${confidence}%</span>`;
            }
            
            html += '</span>';
            
            if (wordBoundaries.has(orderIndex)) {
                html += '<span class="word-break"> </span>';
            }
            
            if (lineBreaks.has(orderIndex)) {
                html += '<br class="line-break">';
            }
        });
        
        html += '</div>';
        return html;
    },

    /**
     * Generate plain text for export
     */
    toPlainText: (detections, readingOrder, wordBoundaries, lineBreaks, columnBreaks) => {
        const result = Transcription.generate(
            detections, readingOrder, wordBoundaries, lineBreaks, columnBreaks
        );
        
        let text = '';
        text += '=== TRANSLITERATION ===\n';
        text += result.formatted + '\n\n';
        text += '=== ARABIC ===\n';
        text += result.arabic + '\n\n';
        text += '=== STATISTICS ===\n';
        text += `Total glyphs: ${readingOrder.length}\n`;
        text += `Words: ${result.words.length}\n`;
        text += `Lines: ${result.lines.length}\n`;
        text += `Columns: ${result.columns.length}\n`;
        
        return text;
    },

    /**
     * Calculate transcription statistics
     */
    getStatistics: (detections, readingOrder, wordBoundaries, lineBreaks, columnBreaks) => {
        const result = Transcription.generate(
            detections, readingOrder, wordBoundaries, lineBreaks, columnBreaks
        );

        const confidences = readingOrder
            .map(i => detections[i]?.confidence || 0)
            .filter(c => c > 0);

        const avgConfidence = confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : 0;

        const uniqueGlyphs = new Set(
            readingOrder.map(i => detections[i]?.glyph?.name).filter(Boolean)
        );

        return {
            totalGlyphs: readingOrder.length,
            uniqueGlyphs: uniqueGlyphs.size,
            words: result.words.length,
            lines: result.lines.length,
            columns: result.columns.length,
            averageConfidence: (avgConfidence * 100).toFixed(1),
            highConfidence: confidences.filter(c => c >= 0.7).length,
            mediumConfidence: confidences.filter(c => c >= 0.5 && c < 0.7).length,
            lowConfidence: confidences.filter(c => c < 0.5).length
        };
    }
};

// Make globally available
window.Transcription = Transcription;
