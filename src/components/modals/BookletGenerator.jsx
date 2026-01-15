// ============================================
// BOOKLET GENERATOR v260115c
// Generate PDF and HTML booklets from HKI inscriptions
// For tribal elders and review discussions
// HTML: Full Arabic support with proper rendering
// PDF: Transliteration only (no Arabic - use HTML for Arabic)
// Fixed: Image aspect ratio, chart layout (2-column)
// ============================================

const BookletGenerator = ({
    isOpen,
    onClose,
    selectedItems,      // Array of { id, title, hkiData } objects
    currentUserEmail,
    equivalenceChart    // For glyph reference page
}) => {
    const { useState, useEffect, useCallback } = React;
    
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState('');
    const [options, setOptions] = useState({
        showDetectionBoxes: false,
        author: currentUserEmail || '',
        subtitle: '',
        title: 'Hakli Inscriptions'
    });
    
    // Update author when email changes
    useEffect(() => {
        if (currentUserEmail && !options.author) {
            setOptions(prev => ({ ...prev, author: currentUserEmail }));
        }
    }, [currentUserEmail]);
    
    // Helper: Draw detection boxes on an image
    const drawDetectionBoxes = (imageSrc, recognitionResults) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Handle CORS
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw base image
                    ctx.drawImage(img, 0, 0);
                    
                    console.log(`Drawing ${recognitionResults.length} detection boxes`);
                    
                    // Draw detection boxes
                    recognitionResults.forEach((result, i) => {
                        if (result.excluded) return;
                        
                        // Try both 'position' and 'bounds' property names
                        const pos = result.position || result.bounds;
                        if (!pos) {
                            console.warn(`Result ${i} has no position/bounds`);
                            return;
                        }
                        
                        // Determine box color based on validation status
                        let strokeColor = '#8b7d6b'; // stone - unvalidated
                        if (result.validated === true) {
                            strokeColor = '#6b8e7f'; // patina - correct
                        } else if (result.validated === false) {
                            strokeColor = '#a0674f'; // rust - incorrect
                        }
                        
                        ctx.strokeStyle = strokeColor;
                        ctx.lineWidth = 3;
                        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                        
                        // Draw label background
                        const label = result.glyph?.arabic || result.glyph?.name || result.glyph?.transliteration || '?';
                        ctx.font = 'bold 14px sans-serif';
                        const labelWidth = ctx.measureText(label).width + 8;
                        ctx.fillStyle = strokeColor;
                        ctx.fillRect(pos.x, pos.y - 20, labelWidth, 18);
                        
                        // Draw label text
                        ctx.fillStyle = 'white';
                        ctx.fillText(label, pos.x + 4, pos.y - 6);
                    });
                    
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                } catch (err) {
                    console.error('Error drawing boxes:', err);
                    // Return original image if drawing fails
                    resolve(imageSrc);
                }
            };
            
            img.onerror = (err) => {
                console.error('Failed to load image for annotation:', err);
                // Return original image if load fails
                resolve(imageSrc);
            };
            
            img.src = imageSrc;
        });
    };
    
    // Generate the PDF booklet
    const generateBooklet = async () => {
        console.log('generateBooklet called with options:', options);
        console.log('showDetectionBoxes:', options.showDetectionBoxes);
        
        if (!selectedItems || selectedItems.length === 0) {
            alert('No inscriptions selected');
            return;
        }
        
        setGenerating(true);
        setProgress('Initializing PDF...');
        
        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded');
            }
            
            const { jsPDF } = window.jspdf;
            
            // Create PDF in landscape for 2-up layout
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();   // 297mm
            const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
            const margin = 15;
            const halfWidth = pageWidth / 2;
            const contentWidth = halfWidth - margin * 1.5;
            
            // ========== COVER PAGE ==========
            setProgress('Creating cover page...');
            
            // Background gradient effect (light tan)
            doc.setFillColor(245, 240, 230);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Decorative border
            doc.setDrawColor(139, 125, 107); // stone color
            doc.setLineWidth(1);
            doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
            
            // Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(32);
            doc.setTextColor(93, 78, 109); // ancient-purple
            doc.text(options.title, pageWidth / 2, 60, { align: 'center' });
            
            // Subtitle (if provided)
            if (options.subtitle) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(18);
                doc.setTextColor(139, 125, 107);
                doc.text(options.subtitle, pageWidth / 2, 75, { align: 'center' });
            }
            
            // Location
            doc.setFontSize(16);
            doc.setTextColor(107, 142, 127); // patina
            doc.text('Dhofar Region, Oman', pageWidth / 2, 95, { align: 'center' });
            
            // Decorative line
            doc.setDrawColor(184, 149, 106); // ochre
            doc.setLineWidth(0.5);
            doc.line(pageWidth / 2 - 50, 105, pageWidth / 2 + 50, 105);
            
            // Item count
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            const itemText = selectedItems.length === 1 
                ? '1 Inscription' 
                : `${selectedItems.length} Inscriptions`;
            doc.text(itemText, pageWidth / 2, 120, { align: 'center' });
            
            // Author
            doc.setFontSize(12);
            doc.text(`Prepared by: ${options.author}`, pageWidth / 2, 160, { align: 'center' });
            
            // Date
            const dateStr = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            doc.text(dateStr, pageWidth / 2, 172, { align: 'center' });
            
            // ========== INSCRIPTION PAGES (2-up) ==========
            setProgress('Adding inscriptions...');
            
            for (let i = 0; i < selectedItems.length; i += 2) {
                doc.addPage();
                
                // Left inscription
                await renderInscription(doc, selectedItems[i], i + 1, {
                    x: margin,
                    y: margin,
                    width: contentWidth,
                    height: pageHeight - margin * 2,
                    showBoxes: options.showDetectionBoxes
                });
                
                // Right inscription (if exists)
                if (i + 1 < selectedItems.length) {
                    await renderInscription(doc, selectedItems[i + 1], i + 2, {
                        x: halfWidth + margin / 2,
                        y: margin,
                        width: contentWidth,
                        height: pageHeight - margin * 2,
                        showBoxes: options.showDetectionBoxes
                    });
                }
                
                // Vertical divider
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.line(halfWidth, margin + 10, halfWidth, pageHeight - margin - 10);
                
                setProgress(`Processing inscription ${Math.min(i + 2, selectedItems.length)} of ${selectedItems.length}...`);
            }
            
            // ========== GLYPH REFERENCE CHART ==========
            if (equivalenceChart && equivalenceChart.glyphs) {
                setProgress('Adding glyph reference chart...');
                doc.addPage();
                await renderGlyphChart(doc, equivalenceChart, {
                    pageWidth,
                    pageHeight,
                    margin
                });
            }
            
            // ========== SAVE ==========
            setProgress('Saving PDF...');
            
            const filename = `${options.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            
            setProgress('');
            setGenerating(false);
            onClose();
            
        } catch (err) {
            console.error('Booklet generation failed:', err);
            alert('❌ Failed to generate booklet: ' + err.message);
            setGenerating(false);
            setProgress('');
        }
    };
    
    // Generate HTML booklet (for better Arabic rendering)
    const generateHtmlBooklet = async () => {
        try {
            setGenerating(true);
            setProgress('Generating HTML booklet...');
            
            if (!selectedItems || selectedItems.length === 0) {
                throw new Error('No items selected');
            }
            
            // Build HTML content
            let inscriptionsHtml = '';
            
            for (let i = 0; i < selectedItems.length; i++) {
                const item = selectedItems[i];
                const hki = item.hkiData;
                
                if (!hki) continue;
                
                setProgress(`Processing inscription ${i + 1} of ${selectedItems.length}...`);
                
                // Get transliteration and Arabic
                const { translit, arabic } = getTranscriptionParts(hki);
                
                // Prepare image (with boxes if requested)
                let imageSrc = hki.originalImage || '';
                if (options.showDetectionBoxes && hki.recognitionResults?.length > 0) {
                    imageSrc = await drawDetectionBoxes(imageSrc, hki.recognitionResults);
                }
                
                inscriptionsHtml += `
                    <div class="inscription-page">
                        <div class="inscription-header">
                            <span class="seq-number">${i + 1}</span>
                            <h2 class="inscription-title">${item.title || 'Untitled'}</h2>
                        </div>
                        
                        ${imageSrc ? `<img src="${imageSrc}" alt="Inscription ${i + 1}" class="inscription-image" />` : ''}
                        
                        <div class="transcription-section">
                            <div class="translit-box">
                                <div class="label">Transliteration:</div>
                                <div class="translit-text">${translit || '—'}</div>
                            </div>
                            
                            <div class="arabic-box">
                                <div class="label">Arabic:</div>
                                <div class="arabic-text">${arabic || '—'}</div>
                            </div>
                        </div>
                        
                        ${hki.notes ? `
                            <div class="notes-section">
                                <div class="label">Notes:</div>
                                <div class="notes-text">${hki.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            // Build glyph chart if provided
            let glyphChartHtml = '';
            if (equivalenceChart && equivalenceChart.glyphs) {
                setProgress('Adding glyph reference chart...');
                
                // Split glyphs into 2 columns
                const glyphs = equivalenceChart.glyphs;
                const midpoint = Math.ceil(glyphs.length / 2);
                const leftColumn = glyphs.slice(0, midpoint);
                const rightColumn = glyphs.slice(midpoint);
                
                const renderGlyphRow = (glyph) => {
                    const imgSrc = glyph.images?.primary || '';
                    const translit = glyph.transliteration || glyph.name || '';
                    const arabic = glyph.arabic || '';
                    
                    return `
                        <tr>
                            <td class="glyph-cell">${imgSrc ? `<img src="${imgSrc}" class="glyph-img" alt="${glyph.name}">` : '—'}</td>
                            <td class="translit-cell">${translit}</td>
                            <td class="arabic-cell">${arabic}</td>
                        </tr>
                    `;
                };
                
                glyphChartHtml = `
                    <div class="chart-page">
                        <h2 class="chart-title">Glyph Reference Chart</h2>
                        <p class="chart-subtitle">Based on Ahmad Al-Jallad (2025), <em>The Decipherment of the Dhofari Script</em></p>
                        <div class="chart-columns">
                            <table class="glyph-table">
                                <thead>
                                    <tr>
                                        <th>Glyph</th>
                                        <th>Trans.</th>
                                        <th>Arabic</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${leftColumn.map(renderGlyphRow).join('')}
                                </tbody>
                            </table>
                            <table class="glyph-table">
                                <thead>
                                    <tr>
                                        <th>Glyph</th>
                                        <th>Trans.</th>
                                        <th>Arabic</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rightColumn.map(renderGlyphRow).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
            
            // Complete HTML document
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .cover-page { page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #f5f0e6, #e8dcc8); border: 2px solid #8b7d6b; padding: 40px; text-align: center; }
        .cover-title { font-size: 48px; font-weight: bold; color: #5d4e6d; margin-bottom: 20px; }
        .cover-subtitle { font-size: 24px; color: #8b7d6b; margin-bottom: 30px; }
        .cover-location { font-size: 20px; color: #6b8e7f; margin-bottom: 40px; }
        .cover-meta { font-size: 16px; color: #666; margin-top: 40px; }
        .inscription-page { page-break-after: always; background: white; padding: 30px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .inscription-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; border-bottom: 2px solid #5d4e6d; padding-bottom: 10px; }
        .seq-number { background: #8b7d6b; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; }
        .inscription-title { font-size: 24px; font-weight: bold; color: #5d4e6d; margin: 0; }
        .inscription-image { width: 100%; max-height: 400px; object-fit: contain; margin: 20px 0; border: 1px solid #ddd; border-radius: 4px; }
        .transcription-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .translit-box, .arabic-box { background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #6b8e7f; }
        .label { font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 8px; }
        .translit-text { font-size: 20px; font-weight: bold; color: #2d5a3d; line-height: 1.6; }
        .arabic-text { font-size: 24px; font-family: 'Traditional Arabic', 'Arabic Typesetting', 'Scheherazade', 'Amiri', sans-serif; direction: rtl; text-align: right; color: #b87333; line-height: 1.8; }
        .notes-section { background: #fff9e6; padding: 15px; border-radius: 6px; border-left: 4px solid #b8956a; margin-top: 15px; }
        .notes-text { color: #666; line-height: 1.6; }
        .chart-page { page-break-before: always; background: white; padding: 30px; margin-bottom: 20px; border-radius: 8px; }
        .chart-title { font-size: 28px; font-weight: bold; color: #5d4e6d; text-align: center; margin-bottom: 10px; }
        .chart-subtitle { text-align: center; color: #666; margin-bottom: 30px; }
        .chart-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .glyph-table { width: 100%; border-collapse: collapse; }
        .glyph-table th { background: #5d4e6d; color: white; padding: 8px 6px; text-align: left; font-weight: bold; font-size: 12px; }
        .glyph-table td { padding: 6px; border-bottom: 1px solid #ddd; vertical-align: middle; }
        .glyph-table tr:hover { background: #f5f5f5; }
        .glyph-cell { width: 50px; text-align: center; }
        .glyph-img { max-width: 40px; max-height: 40px; }
        .translit-cell { font-weight: bold; color: #2d5a3d; font-size: 16px; padding-left: 8px; }
        .arabic-cell { font-size: 22px; font-family: 'Traditional Arabic', 'Arabic Typesetting', 'Scheherazade', 'Amiri', sans-serif; direction: rtl; text-align: center; color: #b87333; width: 50px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
        @media print { body { background: white; } .print-button { display: none; } }
    </style>
</head>
<body>
    <div class="cover-page">
        <div class="cover-title">${options.title}</div>
        ${options.subtitle ? `<div class="cover-subtitle">${options.subtitle}</div>` : ''}
        <div class="cover-location">Dhofar Region, Oman</div>
        <div style="width: 100px; height: 2px; background: #b8956a; margin: 20px 0;"></div>
        <div class="cover-meta">
            <p><strong>${selectedItems.length}</strong> ${selectedItems.length === 1 ? 'Inscription' : 'Inscriptions'}</p>
            <p>Prepared by: ${options.author}</p>
            <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
    </div>
    ${inscriptionsHtml}
    ${glyphChartHtml}
    <div class="footer"><p>© hoopoe holdings · Hakli Glyph Recognizer · ${new Date().getFullYear()}</p></div>
    <div style="position: fixed; bottom: 20px; right: 20px;" class="print-button">
        <button onclick="window.print()" style="padding: 15px 30px; background: #5d4e6d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">🖨️ Print Booklet</button>
    </div>
</body>
</html>`;
            
            const bookletWindow = window.open('', '_blank');
            bookletWindow.document.write(htmlContent);
            bookletWindow.document.close();
            
            setProgress('');
            setGenerating(false);
            onClose();
            
        } catch (err) {
            console.error('HTML booklet generation failed:', err);
            alert('❌ Failed to generate HTML booklet: ' + err.message);
            setGenerating(false);
            setProgress('');
        }
    };
    
    // Render a single inscription in the given area
    const renderInscription = async (doc, item, seqNum, bounds) => {
        const { x, y, width, height, showBoxes } = bounds;
        const hki = item.hkiData;
        
        if (!hki) {
            doc.setFontSize(12);
            doc.setTextColor(150, 150, 150);
            doc.text('(No data)', x + width / 2, y + height / 2, { align: 'center' });
            return;
        }
        
        let currentY = y + 5;
        
        // Sequential number (muted, small)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        doc.text(`${seqNum}`, x + 3, currentY + 3);
        
        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(93, 78, 109);
        const title = item.title || hki.title || hki.id || 'Untitled';
        doc.text(title, x + 12, currentY + 3, { maxWidth: width - 15 });
        currentY += 10;
        
        // Get base image - prefer displayImage since recognition coordinates are based on it
        // Fall back to preprocessed, then original
        const baseImageSrc = hki.displayImage || hki.images?.preprocessed || hki.images?.original || hki.image;
        
        if (baseImageSrc) {
            try {
                // Load image to get actual dimensions for proper aspect ratio
                const imgDimensions = await new Promise((resolve, reject) => {
                    const tempImg = new Image();
                    tempImg.crossOrigin = 'anonymous';
                    tempImg.onload = () => resolve({ width: tempImg.naturalWidth, height: tempImg.naturalHeight });
                    tempImg.onerror = () => resolve({ width: 4, height: 3 }); // Default fallback ratio
                    tempImg.src = baseImageSrc;
                });
                
                // Calculate dimensions that preserve aspect ratio
                const maxImgHeight = Math.min(height * 0.5, 80);
                const maxImgWidth = width - 10;
                const imgAspectRatio = imgDimensions.width / imgDimensions.height;
                
                let imgWidth, imgHeight;
                
                // Fit within bounds while preserving aspect ratio
                if (maxImgWidth / maxImgHeight > imgAspectRatio) {
                    // Height-constrained
                    imgHeight = maxImgHeight;
                    imgWidth = imgHeight * imgAspectRatio;
                } else {
                    // Width-constrained
                    imgWidth = maxImgWidth;
                    imgHeight = imgWidth / imgAspectRatio;
                }
                
                // Center the image horizontally within the available space
                const imgX = x + 5 + (maxImgWidth - imgWidth) / 2;
                
                // If showBoxes and we have recognition results, draw boxes on the image
                let finalImageSrc = baseImageSrc;
                
                console.log(`renderInscription #${seqNum}: showBoxes=${showBoxes}, results=${hki.recognitionResults?.length || 0}`);
                if (hki.recognitionResults && hki.recognitionResults.length > 0) {
                    console.log(`First result sample:`, JSON.stringify(hki.recognitionResults[0]).substring(0, 200));
                }
                
                if (showBoxes && hki.recognitionResults && hki.recognitionResults.length > 0) {
                    console.log(`Drawing boxes for inscription #${seqNum}`);
                    finalImageSrc = await drawDetectionBoxes(baseImageSrc, hki.recognitionResults);
                    console.log(`Boxes drawn, new image length: ${finalImageSrc?.length || 0}`);
                }
                
                // Add image (centered, with proper aspect ratio)
                doc.addImage(finalImageSrc, 'JPEG', imgX, currentY, imgWidth, imgHeight, undefined, 'MEDIUM');
                currentY += imgHeight + 5;
            } catch (imgErr) {
                console.warn('Failed to add image:', imgErr);
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text('[Image unavailable]', x + width / 2, currentY + 20, { align: 'center' });
                currentY += 45;
            }
        } else {
            currentY += 10;
        }
        
        // Transliteration only in PDF (Arabic renders as gibberish - use HTML for Arabic)
        const transliteration = extractTransliteration(hki);
        if (transliteration) {
            // Label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(139, 125, 107);
            doc.text('Transliteration:', x + 5, currentY);
            currentY += 5;
            
            // Content
            doc.setFont('courier', 'normal');
            doc.setFontSize(12);
            doc.setTextColor(45, 90, 61);  // dark green
            
            const lines = doc.splitTextToSize(transliteration, width - 10);
            lines.forEach(line => {
                doc.text(line, x + 5, currentY);
                currentY += 6;
            });
            currentY += 5;
        }
        
        // Notes
        const notes = hki.notes || hki.metadata?.notes || '';
        if (notes) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            const noteLines = doc.splitTextToSize(`Notes: ${notes}`, width - 10);
            noteLines.slice(0, 3).forEach(line => {  // Max 3 lines of notes
                doc.text(line, x + 5, currentY);
                currentY += 4;
            });
        }
        
        // Location/metadata footer
        const location = hki.metadata?.location || hki.location || '';
        const date = hki.metadata?.date || '';
        if (location || date) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            const metaText = [location, date].filter(Boolean).join(' • ');
            doc.text(metaText, x + 5, y + height - 5, { maxWidth: width - 10 });
        }
    };
    
    // Extract Arabic transcription from HKI data
    const extractArabicTranscription = (hki) => {
        // Try different possible locations for transcription
        if (hki.transcription?.arabic && typeof hki.transcription.arabic === 'string') {
            return hki.transcription.arabic;
        }
        if (typeof hki.transcription === 'string') {
            return hki.transcription;
        }
        
        // Build from recognition results
        if (hki.recognitionResults && Array.isArray(hki.recognitionResults)) {
            const arabicChars = hki.recognitionResults
                .filter(r => r.validated !== false && !r.excluded)
                .sort((a, b) => {
                    // Sort by reading order if available, otherwise by position
                    if (a.readingOrder !== undefined && b.readingOrder !== undefined) {
                        return a.readingOrder - b.readingOrder;
                    }
                    // Default: right-to-left, top-to-bottom
                    const rowA = Math.floor((a.bounds?.y || 0) / 30);
                    const rowB = Math.floor((b.bounds?.y || 0) / 30);
                    if (rowA !== rowB) return rowA - rowB;
                    return (b.bounds?.x || 0) - (a.bounds?.x || 0);
                })
                .map(r => {
                    // Extract arabic text, handling both direct properties and nested glyph object
                    if (typeof r.arabic === 'string') return r.arabic;
                    if (r.glyph?.arabic && typeof r.glyph.arabic === 'string') return r.glyph.arabic;
                    if (r.glyph?.name && typeof r.glyph.name === 'string') return r.glyph.name;
                    return '';
                })
                .filter(Boolean);
            
            if (arabicChars.length > 0) {
                // Get word boundaries from HKI
                const wordBoundaries = new Set(hki.wordBoundaries || hki.readingData?.wordBoundaries || []);
                const readingOrder = hki.readingOrder || hki.readingData?.order || [];
                
                // Build text with word breaks
                if (wordBoundaries.size > 0 && readingOrder.length > 0) {
                    let result = '';
                    readingOrder.forEach((idx, i) => {
                        const r = hki.recognitionResults[idx];
                        if (!r || r.excluded) return;
                        const char = r.glyph?.arabic || r.arabic || r.glyph?.name || '';
                        result += char;
                        if (wordBoundaries.has(idx)) {
                            result += ' ';
                        }
                    });
                    return result.trim();
                }
                
                return arabicChars.join('');
            }
        }
        
        return '';
    };
    
    // Extract transliteration from HKI data  
    const extractTransliteration = (hki) => {
        // Try direct property first
        if (hki.transcription?.transliteration && typeof hki.transcription.transliteration === 'string') {
            return hki.transcription.transliteration;
        }
        
        // Build from recognition results
        if (hki.recognitionResults && Array.isArray(hki.recognitionResults)) {
            const wordBoundaries = new Set(hki.wordBoundaries || hki.readingData?.wordBoundaries || []);
            const readingOrder = hki.readingOrder || hki.readingData?.order || 
                hki.recognitionResults.map((_, i) => i);
            
            let result = '';
            readingOrder.forEach((idx, i) => {
                const r = hki.recognitionResults[idx];
                if (!r || r.excluded || r.validated === false) return;
                
                // Get transliteration - prefer glyph.name for Latin script
                const char = r.glyph?.name || r.transliteration || '';
                if (char) {
                    result += char;
                    // Add space after word boundaries
                    if (wordBoundaries.has(idx)) {
                        result += ' ';
                    }
                }
            });
            return result.trim();
        }
        
        return '';
    };
    
    // Get both transcription parts for HTML booklet
    const getTranscriptionParts = (hki) => {
        return {
            translit: extractTransliteration(hki),
            arabic: extractArabicTranscription(hki)
        };
    };
    
    // Render glyph reference chart
    const renderGlyphChart = async (doc, chart, { pageWidth, pageHeight, margin }) => {
        // Title
        doc.setFillColor(245, 240, 230);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(93, 78, 109);
        doc.text('Glyph Reference Chart', pageWidth / 2, margin + 10, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(139, 125, 107);
        doc.text('Hakli Script ↔ Arabic Equivalents', pageWidth / 2, margin + 18, { align: 'center' });
        
        const glyphs = chart.glyphs || [];
        if (glyphs.length === 0) return;
        
        // Layout: 4 columns across the page
        const cols = 4;
        const rows = Math.ceil(glyphs.length / cols);
        const cellWidth = (pageWidth - margin * 2) / cols;
        const cellHeight = 20;
        const startY = margin + 30;
        
        doc.setFontSize(12);
        
        glyphs.forEach((glyph, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cellX = margin + col * cellWidth;
            const cellY = startY + row * cellHeight;
            
            // Cell background (alternating)
            if (row % 2 === 0) {
                doc.setFillColor(250, 248, 245);
            } else {
                doc.setFillColor(255, 255, 255);
            }
            doc.rect(cellX, cellY, cellWidth, cellHeight, 'F');
            
            // Cell border
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.2);
            doc.rect(cellX, cellY, cellWidth, cellHeight);
            
            // Glyph name/transliteration
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(93, 78, 109);
            doc.text(glyph.name || glyph.transliteration || '?', cellX + 5, cellY + 8);
            
            // Arabic equivalent (right side of cell)
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(14);
            const arabic = glyph.arabic || '';
            doc.text(arabic, cellX + cellWidth - 10, cellY + 12, { align: 'right' });
            
            // Description (smaller, below)
            if (glyph.description) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                const desc = glyph.description.slice(0, 25) + (glyph.description.length > 25 ? '...' : '');
                doc.text(desc, cellX + 5, cellY + 16);
            }
            
            doc.setFontSize(12);
        });
        
        // Footer note
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
            'Based on decipherment research by Ahmad Al-Jallad',
            pageWidth / 2,
            pageHeight - margin,
            { align: 'center' }
        );
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="p-4 border-b bg-gradient-to-r from-ancient-purple to-ochre text-white rounded-t-xl">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        📖 Create Booklet
                    </h2>
                    <p className="text-sm text-white/80">
                        Generate PDF for {selectedItems?.length || 0} inscription{selectedItems?.length !== 1 ? 's' : ''}
                    </p>
                </div>
                
                {/* Options */}
                <div className="p-4 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={options.title}
                            onChange={(e) => setOptions(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-ancient-purple/30 focus:border-ancient-purple"
                            placeholder="Hakli Inscriptions"
                        />
                    </div>
                    
                    {/* Subtitle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subtitle <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={options.subtitle}
                            onChange={(e) => setOptions(prev => ({ ...prev, subtitle: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-ancient-purple/30 focus:border-ancient-purple"
                            placeholder="e.g., Cave Inscriptions - Dhofar Mountains"
                        />
                    </div>
                    
                    {/* Author */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Author / Source
                        </label>
                        <input
                            type="text"
                            value={options.author}
                            onChange={(e) => setOptions(prev => ({ ...prev, author: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-ancient-purple/30 focus:border-ancient-purple"
                            placeholder="Your name or email"
                        />
                    </div>
                    
                    {/* Detection boxes toggle */}
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="font-medium text-gray-700">Show detection boxes</div>
                            <div className="text-sm text-gray-500">Include glyph annotations on images</div>
                        </div>
                        <button
                            onClick={() => setOptions(prev => ({ ...prev, showDetectionBoxes: !prev.showDetectionBoxes }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                options.showDetectionBoxes ? 'bg-ancient-purple' : 'bg-gray-300'
                            }`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                                options.showDetectionBoxes ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>
                    
                    {/* Progress */}
                    {generating && progress && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="animate-spin">⏳</span>
                                <span className="text-blue-700">{progress}</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={generating}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={generateHtmlBooklet}
                        disabled={generating || !selectedItems?.length}
                        className="px-4 py-2 bg-patina text-white rounded-lg hover:bg-[#5a7d6e] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Arabic + Transliteration - Opens in new tab"
                    >
                        {generating ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Generating...
                            </>
                        ) : (
                            <>
                                🌐 HTML (Arabic)
                            </>
                        )}
                    </button>
                    <button
                        onClick={generateBooklet}
                        disabled={generating || !selectedItems?.length}
                        className="px-4 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Transliteration only - Downloads PDF"
                    >
                        {generating ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Generating...
                            </>
                        ) : (
                            <>
                                📄 PDF (English)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make globally available
window.BookletGenerator = BookletGenerator;

console.log('✅ BookletGenerator loaded');
