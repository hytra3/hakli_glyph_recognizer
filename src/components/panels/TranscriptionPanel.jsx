// ============================================
// TRANSCRIPTION PANEL
// Display and controls for transcription/reading view
// ============================================

const TranscriptionPanel = ({
    recognitionResults,
    readingOrder,
    readingDirection,
    wordBoundaries,
    lineBreaks,
    columnBreaks,
    translationEnglish,
    translationArabic,
    showArabicLabels,
    onDirectionChange,
    onTranslationEnglishChange,
    onTranslationArabicChange,
    onAutoDetectOrder,
    onCopyToClipboard,
    onSpeak,
    isCollapsed,
    onToggleCollapse,
    className = ''
}) => {
    const { useMemo, useState } = React;
    
    // Generate transcription text from results
    const transcription = useMemo(() => {
        if (!recognitionResults || recognitionResults.length === 0) {
            return { transliteration: '', arabic: '' };
        }
        
        // Use reading order if available, otherwise use original order
        const orderedIndices = readingOrder.length > 0 
            ? readingOrder 
            : recognitionResults.map((_, i) => i);
        
        let translitParts = [];
        let arabicParts = [];
        let currentTranslitWord = [];
        let currentArabicWord = [];
        let currentTranslitLine = [];
        let currentArabicLine = [];
        
        orderedIndices.forEach((idx, displayIdx) => {
            const result = recognitionResults[idx];
            if (!result) return;
            
            currentTranslitWord.push(result.glyph.transliteration || result.glyph.name);
            currentArabicWord.push(result.glyph.arabic || result.glyph.transliteration || result.glyph.name);
            
            // Check for word boundary
            if (wordBoundaries.has(idx)) {
                currentTranslitLine.push(currentTranslitWord.join(''));
                currentArabicLine.push(currentArabicWord.join(''));
                currentTranslitWord = [];
                currentArabicWord = [];
            }
            
            // Check for line break
            if (lineBreaks.has(idx)) {
                if (currentTranslitWord.length > 0) {
                    currentTranslitLine.push(currentTranslitWord.join(''));
                    currentArabicLine.push(currentArabicWord.join(''));
                    currentTranslitWord = [];
                    currentArabicWord = [];
                }
                translitParts.push(currentTranslitLine.join(' '));
                arabicParts.push(currentArabicLine.join(' '));
                currentTranslitLine = [];
                currentArabicLine = [];
            }
            
            // Check for column break (add separator)
            if (columnBreaks.has(idx)) {
                if (currentTranslitWord.length > 0) {
                    currentTranslitLine.push(currentTranslitWord.join(''));
                    currentArabicLine.push(currentArabicWord.join(''));
                    currentTranslitWord = [];
                    currentArabicWord = [];
                }
                currentTranslitLine.push('|');
                currentArabicLine.push('|');
            }
        });
        
        // Add remaining content
        if (currentTranslitWord.length > 0) {
            currentTranslitLine.push(currentTranslitWord.join(''));
            currentArabicLine.push(currentArabicWord.join(''));
        }
        if (currentTranslitLine.length > 0) {
            translitParts.push(currentTranslitLine.join(' '));
            arabicParts.push(currentArabicLine.join(' '));
        }
        
        return {
            transliteration: translitParts.join('\n'),
            arabic: arabicParts.join('\n')
        };
    }, [recognitionResults, readingOrder, wordBoundaries, lineBreaks, columnBreaks]);
    
    // Statistics
    const stats = useMemo(() => {
        const wordCount = Array.from(wordBoundaries).length + 1;
        const lineCount = Array.from(lineBreaks).length + 1;
        const uniqueGlyphs = new Set(recognitionResults.map(r => r.glyph.name)).size;
        
        return {
            totalGlyphs: recognitionResults.length,
            uniqueGlyphs,
            wordCount,
            lineCount
        };
    }, [recognitionResults, wordBoundaries, lineBreaks]);
    
    return (
        <CollapsibleSection
            title="📝 Transcription"
            icon="📜"
            isCollapsed={isCollapsed}
            onToggle={onToggleCollapse}
            badge={stats.totalGlyphs > 0 ? `${stats.totalGlyphs} glyphs` : null}
            className={className}
        >
            <div className="space-y-4">
                {/* Statistics */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-gray-100 rounded">
                        <div className="text-lg font-bold text-ancient-purple">{stats.totalGlyphs}</div>
                        <div className="text-xs text-gray-500">Glyphs</div>
                    </div>
                    <div className="p-2 bg-gray-100 rounded">
                        <div className="text-lg font-bold text-ancient-purple">{stats.uniqueGlyphs}</div>
                        <div className="text-xs text-gray-500">Unique</div>
                    </div>
                    <div className="p-2 bg-gray-100 rounded">
                        <div className="text-lg font-bold text-ancient-purple">{stats.wordCount}</div>
                        <div className="text-xs text-gray-500">Words</div>
                    </div>
                    <div className="p-2 bg-gray-100 rounded">
                        <div className="text-lg font-bold text-ancient-purple">{stats.lineCount}</div>
                        <div className="text-xs text-gray-500">Lines</div>
                    </div>
                </div>
                
                {/* Reading Direction */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        📖 Reading Direction
                    </label>
                    <div className="flex gap-2">
                        {[
                            { value: 'detection', label: 'Auto', icon: '🔍' },
                            { value: 'ltr', label: 'L→R', icon: '➡️' },
                            { value: 'rtl', label: 'R→L', icon: '⬅️' },
                            { value: 'ttb', label: 'T→B', icon: '⬇️' }
                        ].map(({ value, label, icon }) => (
                            <button
                                key={value}
                                onClick={() => onDirectionChange(value)}
                                className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    readingDirection === value
                                        ? 'bg-ancient-purple text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Auto-detect button */}
                <button
                    onClick={onAutoDetectOrder}
                    className="w-full px-3 py-2 bg-ochre hover:bg-[#a07a5a] text-white rounded-lg transition-colors text-sm font-medium"
                >
                    🔮 Auto-Detect Reading Order
                </button>
                
                {/* Transcription Display */}
                {transcription.transliteration && (
                    <div className="space-y-3">
                        {/* Transliteration */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-gray-700">Transliteration</label>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onCopyToClipboard(transcription.transliteration)}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                    <button
                                        onClick={() => onSpeak(transcription.transliteration, 'en')}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                        title="Speak"
                                    >
                                        🔊
                                    </button>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-lg font-mono text-lg whitespace-pre-wrap">
                                {transcription.transliteration}
                            </div>
                        </div>
                        
                        {/* Arabic */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-gray-700">Arabic Script</label>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onCopyToClipboard(transcription.arabic)}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                    <button
                                        onClick={() => onSpeak(transcription.arabic, 'ar')}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                        title="Speak"
                                    >
                                        🔊
                                    </button>
                                </div>
                            </div>
                            <div 
                                className="p-3 bg-gray-100 rounded-lg text-2xl whitespace-pre-wrap"
                                dir="rtl"
                                style={{ fontFamily: "'Noto Sans Arabic', 'Arial', sans-serif" }}
                            >
                                {transcription.arabic}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Translations */}
                <div className="space-y-3 pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700">🌍 Translations</h4>
                    
                    {/* English Translation */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">English</label>
                        <textarea
                            value={translationEnglish}
                            onChange={(e) => onTranslationEnglishChange(e.target.value)}
                            placeholder="Enter English translation..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent resize-none"
                            rows={2}
                        />
                    </div>
                    
                    {/* Arabic Translation */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Arabic Translation</label>
                        <textarea
                            value={translationArabic}
                            onChange={(e) => onTranslationArabicChange(e.target.value)}
                            placeholder="أدخل الترجمة العربية..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent resize-none text-right"
                            dir="rtl"
                            rows={2}
                        />
                    </div>
                </div>
                
                {/* Tips */}
                {recognitionResults.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        💡 Run glyph recognition first, then switch to Reading mode to see the transcription.
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
};

// Make globally available
window.TranscriptionPanel = TranscriptionPanel;
