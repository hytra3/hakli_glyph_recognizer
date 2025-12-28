// ============================================
// EXPORT PANEL (Simplified with Thumbnail)
// HKI save/load with visibility control and image preview
// ============================================

const ExportPanel = ({
    recognitionResults,
    validations,
    image,
    displayImage,
    preprocessing,
    readingDirection,
    readingOrder,
    wordBoundaries,
    lineBreaks,
    columnBreaks,
    translationEnglish,
    translationArabic,
    currentInscriptionId,
    inscriptionTitle,
    inscriptionNotes,
    inscriptionComplete,
    isCollapsed,
    onToggleCollapse,
    onSaveHki,
    onSaveAsNew,
    onOpenWarehouse,
    onLoadHki,
    visibility = 'draft',
    onVisibilityChange,
    syncStatus = null,
    driveSignedIn = false,
    driveUserEmail = null,
    currentFileId = null,
    fileOwner = null,
    imageRef,
    className = ''
}) => {
    const { useState, useRef } = React;
    
    const [isExporting, setIsExporting] = useState(false);
    const [showExportFormats, setShowExportFormats] = useState(false);
    const fileInputRef = useRef(null);
    
    const hasData = recognitionResults && recognitionResults.length > 0;
    
    // Visibility options
    const visibilityOptions = [
        { value: 'draft', label: '📝 Draft', desc: 'Only you can see this' },
        { value: 'review', label: '👁️ Review', desc: 'Colleagues with keywords can view' },
        { value: 'published', label: '✅ Published', desc: 'Finalized and shared' }
    ];
    
    const currentVisibility = visibilityOptions.find(v => v.value === visibility) || visibilityOptions[0];
    
    // Get sync status text safely
    const getSyncStatusText = () => {
        if (!driveSignedIn) {
            return '☁️ Sign in to Drive to enable sync';
        }
        if (!syncStatus || typeof syncStatus !== 'object') {
            return '☁️ Auto-syncs to Drive';
        }
        if (syncStatus.isOnline === false) {
            return '📴 Offline - will sync when connected';
        }
        if (syncStatus.pending > 0) {
            return '⏳ ' + syncStatus.pending + ' pending sync';
        }
        return '☁️ Auto-syncs to Drive';
    };
    
    const getSyncStatusClass = () => {
        if (!driveSignedIn) {
            return 'text-gray-400';
        }
        if (!syncStatus || typeof syncStatus !== 'object') {
            return 'text-patina';
        }
        if (syncStatus.isOnline === false) {
            return 'text-gray-500';
        }
        if (syncStatus.pending > 0) {
            return 'text-amber-600';
        }
        return 'text-patina';
    };
    
    /**
     * Export transcription as text file
     */
    const exportTranscription = () => {
        if (!hasData) return;
        
        try {
            const orderedIndices = readingOrder && readingOrder.length > 0 
                ? readingOrder 
                : recognitionResults.map((_, i) => i);
            
            let translitParts = [];
            let arabicParts = [];
            let currentWord = [];
            let currentArabicWord = [];
            
            orderedIndices.forEach((idx) => {
                const result = recognitionResults[idx];
                if (!result) return;
                
                currentWord.push(result.glyph.transliteration || result.glyph.name);
                currentArabicWord.push(result.glyph.arabic || result.glyph.transliteration);
                
                if (wordBoundaries && wordBoundaries.has(idx)) {
                    translitParts.push(currentWord.join(''));
                    arabicParts.push(currentArabicWord.join(''));
                    currentWord = [];
                    currentArabicWord = [];
                }
                
                if (lineBreaks && lineBreaks.has(idx)) {
                    if (currentWord.length > 0) {
                        translitParts.push(currentWord.join(''));
                        arabicParts.push(currentArabicWord.join(''));
                        currentWord = [];
                        currentArabicWord = [];
                    }
                    translitParts.push('\n');
                    arabicParts.push('\n');
                }
            });
            
            if (currentWord.length > 0) {
                translitParts.push(currentWord.join(''));
                arabicParts.push(currentArabicWord.join(''));
            }
            
            const content = [
                '='.repeat(60),
                'HAKLI INSCRIPTION TRANSCRIPTION',
                'ID: ' + (currentInscriptionId || 'Unknown'),
                'Title: ' + (inscriptionTitle || 'Untitled'),
                'Date: ' + new Date().toLocaleString(),
                '='.repeat(60),
                '',
                'TRANSLITERATION:',
                translitParts.join(' ').replace(/ \n /g, '\n'),
                '',
                'ARABIC:',
                arabicParts.join(' ').replace(/ \n /g, '\n') || '(not provided)',
                '',
                'ENGLISH TRANSLATION:',
                translationEnglish || '(not provided)',
                '',
                '='.repeat(60),
                'Total glyphs: ' + recognitionResults.length,
                'Reading direction: ' + readingDirection,
                'Words: ' + (wordBoundaries ? Array.from(wordBoundaries).length + 1 : 1),
                'Lines: ' + (lineBreaks ? Array.from(lineBreaks).length + 1 : 1),
                '='.repeat(60)
            ].join('\n');
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (currentInscriptionId || 'inscription') + '-transcription.txt';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ Export failed: ' + error.message);
        }
    };
    
    /**
     * Export detection data as JSON
     */
    const exportJson = () => {
        if (!hasData) return;
        
        try {
            const exportData = {
                metadata: {
                    inscriptionId: currentInscriptionId,
                    title: inscriptionTitle,
                    exportDate: new Date().toISOString(),
                    totalGlyphs: recognitionResults.length,
                    preprocessing: preprocessing
                },
                detections: recognitionResults.map((result, index) => ({
                    index,
                    glyph: {
                        id: result.glyph.id,
                        name: result.glyph.name,
                        transliteration: result.glyph.transliteration,
                        arabic: result.glyph.arabic
                    },
                    confidence: result.confidence,
                    position: result.position,
                    validated: validations ? validations[index] : null,
                    corrected: result.corrected || false
                })),
                reading: {
                    direction: readingDirection,
                    order: readingOrder || [],
                    wordBoundaries: wordBoundaries ? Array.from(wordBoundaries) : [],
                    lineBreaks: lineBreaks ? Array.from(lineBreaks) : [],
                    columnBreaks: columnBreaks ? Array.from(columnBreaks) : []
                },
                translations: {
                    english: translationEnglish,
                    arabic: translationArabic
                }
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (currentInscriptionId || 'inscription') + '-data.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ Export failed: ' + error.message);
        }
    };
    
    /**
     * Export as CSV
     */
    const exportCsv = () => {
        if (!hasData) return;
        
        try {
            const headers = ['Index', 'Glyph ID', 'Name', 'Transliteration', 'Arabic', 'Confidence', 'Validated', 'Correct', 'X', 'Y', 'Width', 'Height'];
            
            const rows = recognitionResults.map((result, index) => [
                index,
                result.glyph.id,
                result.glyph.name,
                result.glyph.transliteration,
                result.glyph.arabic || '',
                (result.confidence * 100).toFixed(1) + '%',
                validations && validations[index] ? 'Yes' : 'No',
                validations && validations[index] && validations[index].isCorrect ? 'Yes' : (validations && validations[index] ? 'No' : ''),
                result.position.x,
                result.position.y,
                result.position.width,
                result.position.height
            ]);
            
            const csv = [headers.join(','), ...rows.map(r => r.map(cell => '"' + cell + '"').join(','))].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (currentInscriptionId || 'inscription') + '-data.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ Export failed: ' + error.message);
        }
    };
    
    /**
     * Export annotated image
     */
    const exportAnnotatedImage = () => {
        if (!hasData || !imageRef || !imageRef.current) return;
        
        try {
            const img = imageRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(img, 0, 0);
            
            recognitionResults.forEach((result, index) => {
                const pos = result.position;
                const validation = validations ? validations[index] : null;
                
                if (validation && validation.isCorrect) {
                    ctx.strokeStyle = '#6b8e7f';
                    ctx.fillStyle = 'rgba(107, 142, 127, 0.3)';
                } else if (validation && !validation.isCorrect) {
                    ctx.strokeStyle = '#a0674f';
                    ctx.fillStyle = 'rgba(160, 103, 79, 0.3)';
                } else {
                    ctx.strokeStyle = '#8b7d6b';
                    ctx.fillStyle = 'rgba(139, 125, 107, 0.3)';
                }
                
                ctx.lineWidth = 3;
                ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
                ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = 'bold 14px Arial';
                ctx.fillText(result.glyph.transliteration, pos.x, pos.y - 5);
            });
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (currentInscriptionId || 'inscription') + '-annotated.png';
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (error) {
            console.error('Export error:', error);
            alert('❌ Export failed: ' + error.message);
        }
    };
    
    /**
     * Export HTML report
     */
    const exportHtmlReport = () => {
        if (!hasData) return;
        
        setIsExporting(true);
        
        try {
            if (typeof ExportUtils !== 'undefined' && ExportUtils.exportHtmlReport) {
                ExportUtils.exportHtmlReport({
                    recognitionResults,
                    validations,
                    image,
                    displayImage,
                    readingDirection,
                    wordBoundaries,
                    translationEnglish,
                    translationArabic,
                    currentInscriptionId
                });
            } else {
                alert('HTML report export not available');
            }
        } finally {
            setIsExporting(false);
        }
    };
    
    return (
        <CollapsibleSection
            title="📤 Export"
            isCollapsed={isCollapsed}
            onToggle={onToggleCollapse}
            className={className}
        >
            <div className="space-y-3">
                {/* Status */}
                <div className="text-sm text-gray-600">
                    {hasData ? (
                        <span className="text-patina">✅ {recognitionResults.length} glyphs ready to export</span>
                    ) : (
                        <span className="text-gray-400">No recognition data to export</span>
                    )}
                </div>
                
                {/* HKI Package - with thumbnail */}
                <div className="p-3 bg-ancient-purple/10 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                        {/* Thumbnail */}
                        {(displayImage || image) && (
                            <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border-2 border-ancient-purple/30 bg-gray-100">
                                <img 
                                    src={displayImage || image} 
                                    alt="Inscription thumbnail" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        
                        {/* Header with title and visibility */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-700 truncate">
                                    📦 {inscriptionTitle || 'Untitled'}
                                </span>
                                
                                {/* Visibility Dropdown */}
                                <div className="relative flex-shrink-0">
                                    <select
                                        value={visibility || 'draft'}
                                        onChange={(e) => onVisibilityChange && onVisibilityChange(e.target.value)}
                                        className={'text-xs px-2 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 ' + (
                                            visibility === 'draft' ? 'bg-gray-200 text-gray-700' :
                                            visibility === 'review' ? 'bg-amber-100 text-amber-700' :
                                            'bg-patina/20 text-patina'
                                        )}
                                        title={currentVisibility.desc}
                                    >
                                        {visibilityOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs">▼</span>
                                </div>
                            </div>
                            
                            {/* ID if exists */}
                            {currentInscriptionId && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                    {currentInscriptionId}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Save / Load buttons */}
                    <div className="space-y-2 mb-2">
                        {/* Save buttons - only when signed in */}
                        {driveSignedIn ? (
                            <div className="flex gap-2">
                                {/* Save (update existing) - only if owner or collaborator */}
                                {currentFileId && (fileOwner === driveUserEmail || 
                                    (typeof fileOwner === 'undefined')) ? (
                                    <button
                                        onClick={() => onSaveHki && onSaveHki()}
                                        disabled={!hasData}
                                        className="flex-1 px-3 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                    >
                                        💾 Save
                                    </button>
                                ) : null}
                                
                                {/* Save As New - always available when signed in */}
                                <button
                                    onClick={() => onSaveAsNew && onSaveAsNew()}
                                    disabled={!hasData}
                                    className={'px-3 py-2 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium ' + 
                                        (currentFileId && fileOwner === driveUserEmail 
                                            ? 'bg-stone hover:bg-stone/80 flex-1' 
                                            : 'bg-ancient-purple hover:bg-[#4a3d5a] flex-1')}
                                >
                                    {currentFileId && fileOwner === driveUserEmail ? '📄 Save As New' : '💾 Save to Drive'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-xs text-center text-gray-500 py-2 bg-gray-50 rounded">
                                🔒 Sign in to save to cloud
                            </div>
                        )}
                        
                        {/* Load buttons */}
                        <div className="flex gap-2">
                            {/* Load from Warehouse */}
                            <button
                                onClick={() => onOpenWarehouse && onOpenWarehouse()}
                                className="flex-1 px-3 py-2 bg-ochre text-white rounded-lg hover:bg-ochre/80 transition-colors text-sm font-medium"
                            >
                                📚 Browse Warehouse
                            </button>
                            
                            {/* Load from local file */}
                            <label className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer transition-colors text-sm text-center font-medium">
                                📂
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".hki,.json"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (onLoadHki && e.target.files && e.target.files[0]) {
                                            onLoadHki(e);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    
                    {/* Sync status - rendered as text only */}
                    <div className={'text-xs text-center ' + getSyncStatusClass()}>
                        {getSyncStatusText()}
                    </div>
                </div>
                
                {/* Export Formats - Collapsible */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowExportFormats(!showExportFormats)}
                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-600"
                    >
                        <span>📋 Export formats</span>
                        <span className={'transition-transform ' + (showExportFormats ? 'rotate-180' : '')}>▼</span>
                    </button>
                    
                    {showExportFormats && (
                        <div className="p-3 space-y-2 bg-white">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={exportTranscription}
                                    disabled={!hasData}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors text-sm"
                                >
                                    📝 Text
                                </button>
                                <button
                                    onClick={exportJson}
                                    disabled={!hasData}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors text-sm"
                                >
                                    📋 JSON
                                </button>
                                <button
                                    onClick={exportCsv}
                                    disabled={!hasData}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors text-sm"
                                >
                                    📊 CSV
                                </button>
                                <button
                                    onClick={exportAnnotatedImage}
                                    disabled={!hasData || !imageRef || !imageRef.current}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors text-sm"
                                >
                                    🖼️ Image
                                </button>
                            </div>
                            
                            <button
                                onClick={exportHtmlReport}
                                disabled={!hasData || isExporting}
                                className="w-full px-3 py-2 bg-ochre text-white rounded-lg hover:bg-[#a07a5a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                {isExporting ? '⏳ Generating...' : '📄 Full HTML Report'}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Tips - only show when export formats visible */}
                {showExportFormats && (
                    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                        💡 <strong>HKI files</strong> contain everything needed to resume work later.
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
};

// Make globally available
window.ExportPanel = ExportPanel;

console.log('✅ ExportPanel (simplified with thumbnail) loaded');
