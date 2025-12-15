// ============================================
// EXPORT UTILITIES
// Export recognition data in various formats
// ============================================

const ExportUtils = {
    /**
     * Export transcription as text file
     * @param {Object} state - Application state
     * @returns {boolean} Success status
     */
    exportTranscription: (state) => {
        try {
            const {
                recognitionResults, readingDirection, readingOrder, wordBoundaries,
                lineBreaks, columnBreaks, translationEnglish, translationArabic,
                currentInscriptionId
            } = state;

            if (!recognitionResults || recognitionResults.length === 0) {
                alert('❌ No glyphs to export');
                return false;
            }

            const transcription = Reading.getEnhancedTranscription(state);
            const inscId = currentInscriptionId || 'inscription';
            
            const content = [
                '='.repeat(60),
                `HAKLI INSCRIPTION TRANSCRIPTION`,
                `ID: ${inscId}`,
                `Date: ${new Date().toLocaleString()}`,
                '='.repeat(60),
                '',
                'TRANSLITERATION:',
                transcription.transliteration,
                '',
                'ARABIC:',
                transcription.arabic || '(not provided)',
                '',
                'ENGLISH TRANSLATION:',
                translationEnglish || '(not provided)',
                '',
                '='.repeat(60),
                `Total glyphs: ${recognitionResults.length}`,
                `Reading direction: ${readingDirection}`,
                `Words: ${Array.from(wordBoundaries).length + 1}`,
                `Lines: ${Array.from(lineBreaks || []).length + 1}`,
                '='.repeat(60)
            ].join('\n');

            const filename = `${inscId}-transcription.txt`;
            const blob = new Blob([content], { type: 'text/plain' });
            Utils.downloadBlob(blob, filename);

            console.log(`📥 Exported transcription: ${filename}`);
            CacheStorage.addRecentExport({ type: 'transcription', filename, inscriptionId: inscId });
            return true;
        } catch (error) {
            console.error('Export transcription error:', error);
            alert('❌ Failed to export transcription');
            return false;
        }
    },

    /**
     * Export detection data as JSON
     * @param {Object} state - Application state
     * @returns {boolean} Success status
     */
    exportDetectionData: (state) => {
        try {
            const {
                recognitionResults, validations, image, displayImage, preprocessing,
                readingDirection, readingOrder, wordBoundaries, lineBreaks, columnBreaks,
                translationEnglish, translationArabic, currentInscriptionId
            } = state;

            if (!recognitionResults || recognitionResults.length === 0) {
                alert('❌ No data to export');
                return false;
            }

            const exportData = {
                metadata: {
                    inscriptionId: currentInscriptionId || null,
                    exportDate: new Date().toISOString(),
                    version: CONFIG.APP_VERSION,
                    totalGlyphs: recognitionResults.length,
                    preprocessing: preprocessing
                },
                detections: recognitionResults.map((result, index) => ({
                    index: index,
                    glyph: {
                        id: result.glyph.id,
                        name: result.glyph.name,
                        transliteration: result.glyph.transliteration,
                        arabic: result.glyph.arabic || result.glyph.transliteration
                    },
                    confidence: result.confidence,
                    position: result.position,
                    validated: validations[index] ? {
                        isCorrect: validations[index].isCorrect,
                        timestamp: validations[index].timestamp
                    } : null,
                    corrected: result.corrected || false,
                    originalGlyph: result.originalGlyph || null
                })),
                reading: {
                    direction: readingDirection,
                    order: readingOrder,
                    wordBoundaries: Array.from(wordBoundaries),
                    lineBreaks: Array.from(lineBreaks || []),
                    columnBreaks: Array.from(columnBreaks || [])
                },
                translations: {
                    english: translationEnglish || '',
                    arabic: translationArabic || ''
                }
            };

            const inscId = currentInscriptionId || 'inscription';
            const filename = `${inscId}-data.json`;
            Utils.downloadBlob(Utils.createJsonBlob(exportData), filename);

            console.log(`📥 Exported detection data: ${filename}`);
            CacheStorage.addRecentExport({ type: 'json', filename, inscriptionId: inscId });
            return true;
        } catch (error) {
            console.error('Export data error:', error);
            alert('❌ Failed to export data');
            return false;
        }
    },

    /**
     * Export annotated image with detection boxes
     * @param {Object} state - Application state
     * @param {HTMLImageElement} imageElement - Image element to annotate
     * @returns {boolean} Success status
     */
    exportAnnotatedImage: (state, imageElement) => {
        try {
            const { recognitionResults, readingDirection, currentInscriptionId } = state;

            if (!recognitionResults || recognitionResults.length === 0 || !imageElement) {
                alert('❌ No image or detections to export');
                return false;
            }

            const canvas = document.createElement('canvas');
            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;
            const ctx = canvas.getContext('2d');

            // Draw image
            ctx.drawImage(imageElement, 0, 0);

            // Draw detection boxes
            recognitionResults.forEach((result, index) => {
                const pos = result.position;
                
                // Draw box
                ctx.strokeStyle = result.corrected ? '#f59e0b' : '#10b981';
                ctx.lineWidth = 3;
                ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

                // Draw label background
                const label = result.glyph.name;
                ctx.font = 'bold 20px Arial';
                const textWidth = ctx.measureText(label).width;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(pos.x, pos.y - 25, textWidth + 10, 25);

                // Draw label text
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, pos.x + 5, pos.y - 5);

                // Draw confidence
                const confText = `${(result.confidence * 100).toFixed(0)}%`;
                ctx.font = '14px Arial';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(pos.x + pos.width - 45, pos.y, 45, 20);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(confText, pos.x + pos.width - 40, pos.y + 15);
            });

            // Add title
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(
                `Hakli Glyph Recognition - ${currentInscriptionId || 'Inscription'} - ${recognitionResults.length} glyphs`,
                10, 28
            );

            const inscId = currentInscriptionId || 'inscription';
            const filename = `${inscId}-annotated.png`;
            
            canvas.toBlob(blob => {
                Utils.downloadBlob(blob, filename);
                console.log(`📥 Exported annotated image: ${filename}`);
                CacheStorage.addRecentExport({ type: 'image', filename, inscriptionId: inscId });
            }, 'image/png');

            return true;
        } catch (error) {
            console.error('Export annotated image error:', error);
            alert('❌ Failed to export annotated image');
            return false;
        }
    },

    /**
     * Export HTML report
     * NOTE: This is a simplified version. The main index.html has an enhanced version
     * with source images grid (original + preprocessed thumbnails), collapsible sections,
     * and better styling. Consider using that version or updating this to match.
     * 
     * @param {Object} state - Application state
     * @returns {boolean} Success status
     */
    exportHtmlReport: (state) => {
        try {
            const {
                recognitionResults, validations, image, displayImage,
                translationEnglish, translationArabic, currentInscriptionId,
                preprocessCanvasRef, preprocessedMat, originalCanvasRef, originalMat
            } = state;

            if (!recognitionResults || recognitionResults.length === 0) {
                alert('❌ No data to export');
                return false;
            }
            
            // Capture original canvas (colored) image if available
            let originalCanvasImageUrl = image; // fallback to image state
            if (originalCanvasRef && originalCanvasRef.current && originalMat && !originalMat.isDeleted()) {
                try {
                    originalCanvasImageUrl = originalCanvasRef.current.toDataURL('image/png');
                } catch (err) {
                    console.warn('Could not capture original canvas image:', err);
                }
            }
            
            // Capture preprocessed image if available
            let preprocessedImageDataUrl = null;
            if (preprocessCanvasRef && preprocessCanvasRef.current && preprocessedMat && !preprocessedMat.isDeleted()) {
                try {
                    preprocessedImageDataUrl = preprocessCanvasRef.current.toDataURL('image/png');
                } catch (err) {
                    console.warn('Could not capture preprocessed image:', err);
                }
            }

            const transcription = Reading.getEnhancedTranscription(state);
            const stats = {
                total: recognitionResults.length,
                validated: Object.keys(validations).length,
                correct: Object.values(validations).filter(v => v.isCorrect).length,
                avgConfidence: (recognitionResults.reduce((sum, r) => sum + r.confidence, 0) / recognitionResults.length * 100).toFixed(1)
            };
            
            // Build source images grid HTML
            let sourceImagesHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
                        <img src="${originalCanvasImageUrl}" alt="Original" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                        <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-align: center; margin-top: 8px;">📷 Original Image</div>
                    </div>`;
            
            if (preprocessedImageDataUrl) {
                sourceImagesHtml += `
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
                        <img src="${preprocessedImageDataUrl}" alt="Preprocessed" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                        <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-align: center; margin-top: 8px;">⚙️ Preprocessed Image</div>
                    </div>`;
            }
            
            sourceImagesHtml += '</div>';

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hakli Inscription Report - ${currentInscriptionId || 'Inscription'}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%235d4e6d'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='white' font-family='serif'>𐩠</text></svg>">
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-box { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; color: #1f2937; }
        .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
        .transcription { font-size: 18px; line-height: 1.8; padding: 15px; background: #f9fafb; border-radius: 8px; direction: rtl; text-align: right; }
        .detection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
        .detection-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
        .detection-card img { max-width: 100%; height: auto; border-radius: 4px; }
        .detection-label { font-weight: bold; margin-top: 8px; }
        .confidence { color: #6b7280; font-size: 14px; }
        img.preview { max-width: 100%; height: auto; border-radius: 8px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📜 Hakli Inscription Report</h1>
        <p><strong>Inscription ID:</strong> ${currentInscriptionId || 'Unknown'}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Tool:</strong> Hakli Glyph Recognizer ${CONFIG.APP_VERSION}</p>
    </div>

    <div class="section">
        <h2>📊 Statistics</h2>
        <div class="stats">
            <div class="stat-box">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Glyphs</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.validated}</div>
                <div class="stat-label">Validated</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.correct}</div>
                <div class="stat-label">Correct</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.avgConfidence}%</div>
                <div class="stat-label">Avg Confidence</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>🖼️ Source Images</h2>
        ${sourceImagesHtml}
    </div>

    <div class="section">
        <h2>📝 Transcription</h2>
        <div class="transcription">${transcription.arabic || transcription.transliteration}</div>
        <p><strong>Transliteration:</strong> ${transcription.transliteration}</p>
    </div>

    <div class="section">
        <h2>🌍 Translation</h2>
        <p><strong>English:</strong> ${translationEnglish || '(not provided)'}</p>
        <p><strong>Arabic:</strong> ${translationArabic || '(not provided)'}</p>
    </div>

    <div class="section">
        <h2>🖼️ Inscription Image</h2>
        <img src="${displayImage || image}" alt="Inscription" class="preview">
    </div>

    <div class="section">
        <h2>🔍 Detected Glyphs</h2>
        <div class="detection-grid">
            ${recognitionResults.map((result, index) => `
                <div class="detection-card">
                    ${result.thumbnail ? `<img src="${result.thumbnail}" alt="${result.glyph.name}">` : ''}
                    <div class="detection-label">${result.glyph.name}</div>
                    <div class="confidence">${(result.confidence * 100).toFixed(0)}% confidence</div>
                    ${validations[index] ? `<div style="color: ${validations[index].isCorrect ? '#10b981' : '#ef4444'};">
                        ${validations[index].isCorrect ? '✓ Validated' : '✗ Incorrect'}
                    </div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section" style="text-align: center; color: #6b7280;">
        <p>Generated by Hakli Glyph Recognizer ${CONFIG.APP_VERSION}</p>
        <p>${CONFIG.APP_AUTHOR}</p>
    </div>
</body>
</html>`;

            const inscId = currentInscriptionId || 'inscription';
            const filename = `${inscId}-report.html`;
            const blob = new Blob([html], { type: 'text/html' });
            Utils.downloadBlob(blob, filename);

            console.log(`📥 Exported HTML report: ${filename}`);
            CacheStorage.addRecentExport({ type: 'html', filename, inscriptionId: inscId });
            return true;
        } catch (error) {
            console.error('Export HTML report error:', error);
            alert('❌ Failed to export HTML report');
            return false;
        }
    },

    /**
     * Export as CSV (for spreadsheet analysis)
     * @param {Object} state - Application state
     * @returns {boolean} Success status
     */
    exportCsv: (state) => {
        try {
            const { recognitionResults, validations, currentInscriptionId } = state;

            if (!recognitionResults || recognitionResults.length === 0) {
                alert('❌ No data to export');
                return false;
            }

            const headers = ['Index', 'Glyph ID', 'Name', 'Transliteration', 'Arabic', 'Confidence', 'Validated', 'Is Correct', 'Corrected', 'X', 'Y', 'Width', 'Height'];
            
            const rows = recognitionResults.map((result, index) => [
                index,
                result.glyph.id,
                result.glyph.name,
                result.glyph.transliteration,
                result.glyph.arabic || '',
                (result.confidence * 100).toFixed(1),
                validations[index] ? 'Yes' : 'No',
                validations[index] ? (validations[index].isCorrect ? 'Yes' : 'No') : '',
                result.corrected ? 'Yes' : 'No',
                result.position.x,
                result.position.y,
                result.position.width,
                result.position.height
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            const inscId = currentInscriptionId || 'inscription';
            const filename = `${inscId}-data.csv`;
            const blob = new Blob([csv], { type: 'text/csv' });
            Utils.downloadBlob(blob, filename);

            console.log(`📥 Exported CSV: ${filename}`);
            CacheStorage.addRecentExport({ type: 'csv', filename, inscriptionId: inscId });
            return true;
        } catch (error) {
            console.error('Export CSV error:', error);
            alert('❌ Failed to export CSV');
            return false;
        }
    }
};

// Make globally available
window.ExportUtils = ExportUtils;
