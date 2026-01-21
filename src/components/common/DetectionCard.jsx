/**
 * DetectionCard Component
 * 
 * Displays a single detection result with validation controls, alternatives, and boundaries.
 * Used in both mobile and desktop detection panels.
 */

const DetectionCard = ({ 
    // Data
    result,
    idx,
    displayIdx,
    validation,
    isExpanded,
    
    // Display settings
    viewMode,
    showArabicLabels,
    isMobile = false,
    
    // State Sets
    selectedRegions,
    excludedDetections,
    wordBoundaries,
    columnBreaks,
    lineBreaks,
    glyphThumbnails,
    
    // Action handlers
    setSelectedRegions,
    validateDetection,
    toggleExcludeDetection,
    toggleCardExpansion,
    deleteDetection,
    changeGlyphAssignment,
    toggleWordBoundary,
    toggleColumnBreak,
    toggleLineBreak
}) => {
    const conf = Math.round(result.confidence * 100);
    
    return (
        <div key={`${isMobile ? 'm' : 'd'}-card-${idx}-${result.position.x}-${result.position.y}`} 
            className="bg-gray-50 rounded border">
            
            {/* Main card */}
            <div className="flex items-center gap-2 p-2">
                {/* Both thumbnails side by side */}
                <div className="flex gap-1 flex-shrink-0">
                    {result.thumbnail && (
                        <img src={result.thumbnail} alt="det" 
                            className="w-10 h-10 object-contain bg-white rounded border" 
                            title="Detected" />
                    )}
                    {glyphThumbnails[result.glyph.id] && (
                        <img src={glyphThumbnails[result.glyph.id]} alt="chart" 
                            className="w-10 h-10 object-contain bg-white rounded border-2 border-ancient-purple" 
                            title="Chart" />
                    )}
                </div>
                
                <div 
                    className={`flex-1 min-w-0 ${isMobile && result.topMatches && result.topMatches.length > 1 ? 'cursor-pointer active:bg-gray-100' : ''}`}
                    onClick={() => {
                        if (isMobile && result.topMatches && result.topMatches.length > 1) {
                            toggleCardExpansion(idx);
                        }
                    }}
                >
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-gray-500">
                            #{viewMode === 'reading' ? displayIdx + 1 : idx + 1}
                        </span>
                        <span className={`text-xs ${conf >= 70 ? 'text-patina' : conf >= 50 ? 'text-ochre' : 'text-rust'}`}>
                            {conf}%
                        </span>
                        {isMobile && result.topMatches && result.topMatches.length > 1 && (
                            <span className="text-xs text-gray-400">({result.topMatches.length - 1} alts)</span>
                        )}
                    </div>
                    <div className="font-semibold text-sm truncate">
                        {showArabicLabels && result.glyph.arabic ? result.glyph.arabic : result.glyph.name}
                    </div>
                    <div className="text-xs text-gray-500">
                        {result.glyph.transliteration || result.glyph.name}
                    </div>
                </div>
                
                <button 
                    onClick={() => setSelectedRegions(prev => {
                        const n = new Set(prev); 
                        n.has(idx) ? n.delete(idx) : n.add(idx); 
                        return n;
                    })} 
                    className={`px-2 py-1 rounded text-xs ${selectedRegions.has(idx) ? 'bg-ochre text-white' : 'bg-gray-200'}`}>
                    {selectedRegions.has(idx) ? '✓' : 'Select'}
                </button>
            </div>
            
            {/* Action buttons row */}
            <div className="px-2 pb-2 flex gap-1 flex-wrap">
                {/* Validation buttons */}
                <button 
                    onClick={() => validateDetection(idx, true)}
                    className={`px-2 py-1 rounded text-xs ${validation?.isCorrect ? 'bg-patina text-white' : 'bg-gray-100'}`}
                    title="Mark correct">
                    ✓
                </button>
                <button 
                    onClick={() => validateDetection(idx, false)}
                    className={`px-2 py-1 rounded text-xs ${validation && !validation.isCorrect ? 'bg-rust text-white' : 'bg-gray-100'}`}
                    title="Mark incorrect">
                    ✗
                </button>
                
                {/* Exclude button */}
                <button 
                    onClick={() => toggleExcludeDetection(idx)}
                    className={`px-2 py-1 rounded text-xs ${excludedDetections.has(idx) ? 'bg-patina text-white' : 'bg-gray-100'}`}
                    title={excludedDetections.has(idx) ? 'Include in reading' : 'Exclude from reading'}>
                    {excludedDetections.has(idx) ? '👁' : '🚫'}
                </button>
                
                {/* Alts button */}
                {result.topMatches && result.topMatches.length > 1 && (
                    <button 
                        onClick={() => toggleCardExpansion(idx)}
                        className={`px-2 py-1 rounded text-xs ${isExpanded ? 'bg-ancient-purple text-white' : 'bg-gray-100'}`}>
                        {isExpanded ? '▼' : '▶'} Alts ({result.topMatches.length - 1})
                    </button>
                )}
                
                {/* Delete button */}
                <button 
                    onClick={() => { if (confirm('Delete this detection?')) deleteDetection(idx); }}
                    className="ml-auto px-2 py-1 bg-red-100 text-red-600 rounded text-xs">
                    🗑
                </button>
            </div>
            
            {/* Boundary controls - only in reading mode */}
            {viewMode === 'reading' && (
                <div className="px-2 pb-2 flex items-center gap-1 border-t border-gray-100 pt-1">
                    <span className="text-xs text-gray-400 mr-1">After:</span>
                    <button 
                        onClick={() => toggleWordBoundary(idx)}
                        className={`px-2 py-1 rounded text-xs font-bold ${wordBoundaries.has(idx) ? 'bg-stone text-white' : 'bg-gray-100 text-gray-500'}`}
                        title="Word boundary">
                        | Word
                    </button>
                    <button 
                        onClick={() => toggleColumnBreak(idx)}
                        className={`px-2 py-1 rounded text-xs font-bold ${columnBreaks.has(idx) ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'}`}
                        title="Column break">
                        ‖ Col
                    </button>
                    <button 
                        onClick={() => toggleLineBreak(idx)}
                        className={`px-2 py-1 rounded text-xs font-bold ${lineBreaks.has(idx) ? 'bg-ancient-purple text-white' : 'bg-gray-100 text-gray-500'}`}
                        title="Line break">
                        ⏎ Line
                    </button>
                </div>
            )}
            
            {/* Expanded: Alternative matches */}
            {isExpanded && result.topMatches && result.topMatches.length > 1 && (
                <div className={`px-2 pb-2 border-t border-gray-200 ${isMobile ? 'bg-amber-50' : 'bg-gray-100'} pt-2`}>
                    <div className={`text-xs ${isMobile ? 'text-amber-700 font-semibold' : 'text-gray-500'} mb-2`}>
                        {isMobile ? '👆 Tap to switch glyph:' : 'Alternative matches:'}
                    </div>
                    <div className={`flex flex-wrap gap-${isMobile ? '2' : '1'}`}>
                        {result.topMatches.slice(1, 6).map((alt, altIdx) => (
                            <button 
                                key={altIdx}
                                onClick={() => {
                                    changeGlyphAssignment(idx, alt.glyph);
                                    if (isMobile) toggleCardExpansion(idx); // Auto-close on mobile after selection
                                }}
                                className={`flex items-center gap-2 ${isMobile ? 'px-4 py-3' : 'px-2 py-1'} bg-white border-2 border-gray-300 hover:border-ancient-purple rounded ${isMobile ? 'text-sm' : 'text-xs'} active:scale-95 transition-transform`}
                                title={`Switch to ${alt.glyph.name} (${Math.round(alt.confidence * 100)}%)`}>
                                {glyphThumbnails[alt.glyph.id] && (
                                    <img src={glyphThumbnails[alt.glyph.id]} alt="" className={`${isMobile ? 'w-8 h-8' : 'w-5 h-5'} object-contain`} />
                                )}
                                <span className="font-medium">{alt.glyph.transliteration || alt.glyph.name}</span>
                                <span className="text-gray-400">{Math.round(alt.confidence * 100)}%</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
