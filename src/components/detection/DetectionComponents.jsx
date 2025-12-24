// ============================================
// DETECTION DISPLAY COMPONENTS
// Components for showing glyph detections
// ============================================

/**
 * DetectionBox - Overlay box shown on the image for each detection
 */
const DetectionBox = ({
    detection,
    index,
    isSelected,
    isValidated,
    validationResult,
    isUncertain,
    showLabel = true,
    showArabicLabel = false,
    viewMode = 'detection',
    readingOrderIndex = null,
    scale = { x: 1, y: 1 },
    onClick,
    onDoubleClick,
    className = ''
}) => {
    const { position, glyph, confidence } = detection;
    
    // Calculate display position based on scale
    const style = {
        left: position.x / scale.x,
        top: position.y / scale.y,
        width: position.width / scale.x,
        height: position.height / scale.y
    };
    
    // Determine box styling based on state
    let boxClass = 'detection-box unvalidated';
    let labelBg = 'bg-stone';
    
    if (isSelected) {
        boxClass = 'detection-box selected';
        labelBg = 'bg-ochre';
    } else if (isValidated) {
        if (validationResult) {
            boxClass = 'detection-box validated-correct';
            labelBg = 'bg-patina';
        } else {
            boxClass = 'detection-box validated-incorrect';
            labelBg = 'bg-rust';
        }
    }
    
    if (isUncertain) {
        boxClass += ' uncertain';
    }
    
    return (
        <div
            className={`${boxClass} ${className}`}
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                onClick && onClick(index, e);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick && onDoubleClick(index, e);
            }}
            title={`${glyph.name} (${Math.round(confidence * 100)}%)`}
        >
            {/* Label */}
            {showLabel && (
                <div className={`detection-label ${labelBg}`}>
                    {showArabicLabel ? glyph.arabic : glyph.transliteration}
                </div>
            )}
            
            {/* Reading order badge */}
            {viewMode === 'reading' && readingOrderIndex !== null && (
                <div className="reading-order-badge">
                    {readingOrderIndex + 1}
                </div>
            )}
        </div>
    );
};

/**
 * DetectionCard - Card component showing detection details
 */
const DetectionCard = ({
    detection,
    index,
    isSelected,
    isValidated,
    validationResult,
    viewMode = 'detection',
    readingOrderIndex = null,
    showTopMatches = false,
    wordBoundaries = new Set(),
    lineBreaks = new Set(),
    columnBreaks = new Set(),
    glyphThumbnails = {},
    onSelect,
    onValidate,
    onCorrect,
    onDelete,
    onTrim,
    onExclude,
    onAdjust,
    onSaveTemplate,
    onToggleWordBoundary,
    onToggleLineBreak,
    onToggleColumnBreak,
    className = ''
}) => {
    const { glyph, confidence, thumbnail, topMatches, corrected, originalGlyph } = detection;
    const percentage = Math.round(confidence * 100);
    
    // Determine card styling
    let borderColor = 'border-stone';
    let bgColor = 'bg-white';
    
    if (isSelected) {
        borderColor = 'border-ochre';
        bgColor = 'bg-yellow-50';
    } else if (isValidated) {
        if (validationResult) {
            borderColor = 'border-patina';
            bgColor = 'bg-green-50';
        } else {
            borderColor = 'border-rust';
            bgColor = 'bg-red-50';
        }
    }
    
    // Confidence color
    let confidenceColor = 'text-rust';
    if (percentage >= 80) confidenceColor = 'text-patina';
    else if (percentage >= 60) confidenceColor = 'text-ochre';
    
    return (
        <div
            className={`rounded-lg border-2 ${borderColor} ${bgColor} overflow-hidden transition-all hover:shadow-md ${className}`}
            onClick={() => onSelect && onSelect(index)}
        >
            {/* Header with index */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b">
                <span className="font-bold text-gray-700">
                    #{viewMode === 'reading' && readingOrderIndex !== null ? readingOrderIndex + 1 : index + 1}
                </span>
                <span className={`font-bold ${confidenceColor}`}>
                    {percentage}%
                </span>
            </div>
            
            {/* Thumbnail and glyph info */}
            <div className="p-3">
                <div className="flex gap-3">
                    {/* Thumbnail */}
                    {thumbnail && (
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                            <img 
                                src={thumbnail} 
                                alt={glyph.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                    
                    {/* Glyph info */}
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-lg text-gray-900 truncate">
                            {glyph.name}
                        </div>
                        <div className="text-2xl text-ancient-purple">
                            {glyph.arabic || glyph.transliteration}
                        </div>
                        <div className="text-sm text-gray-500">
                            {glyph.transliteration}
                        </div>
                        
                        {/* Correction indicator */}
                        {corrected && originalGlyph && (
                            <div className="text-xs text-orange-600 mt-1">
                                📝 Corrected from: {originalGlyph.name}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Top matches (alternative candidates) */}
                {showTopMatches && topMatches && topMatches.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">Alternative matches:</div>
                        <div className="flex flex-wrap gap-1">
                            {topMatches.slice(1, 4).map((match, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCorrect && onCorrect(index, match.glyph);
                                    }}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                                    title={`${match.glyph.name} (${Math.round(match.confidence * 100)}%)`}
                                >
                                    {match.glyph.transliteration} ({Math.round(match.confidence * 100)}%)
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Actions */}
            <div className="px-3 py-2 bg-gray-50 border-t flex flex-wrap gap-1">
                {/* Validation buttons */}
                {!isValidated && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onValidate && onValidate(index, true);
                            }}
                            className="p-1.5 bg-patina text-white rounded hover:bg-[#5a7d6e] transition-colors"
                            title="Mark as correct"
                        >
                            ✓
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onValidate && onValidate(index, false);
                            }}
                            className="p-1.5 bg-rust text-white rounded hover:bg-[#8a574a] transition-colors"
                            title="Mark as incorrect"
                        >
                            ✗
                        </button>
                    </>
                )}
                
                {/* Edit button (for correction) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCorrect && onCorrect(index);
                    }}
                    className="p-1.5 bg-ancient-purple text-white rounded hover:bg-[#4a3d5a] transition-colors"
                    title="Correct glyph"
                >
                    ✏️
                </button>
                
                {/* Trim button */}
                {onTrim && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTrim(index);
                        }}
                        className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        title="Trim detection box"
                    >
                        ✂️
                    </button>
                )}
                
                {/* Adjust button */}
                {onAdjust && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdjust(index);
                        }}
                        className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        title="Adjust corners"
                    >
                        ◇
                    </button>
                )}
                
                {/* Delete button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this detection?')) {
                            onDelete && onDelete(index);
                        }
                    }}
                    className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    title="Delete detection"
                >
                    🗑️
                </button>
                
                {/* Save as template */}
                {onSaveTemplate && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSaveTemplate(index);
                        }}
                        className="p-1.5 bg-ochre text-white rounded hover:bg-[#a07a5a] transition-colors"
                        title="Save as template"
                    >
                        📌
                    </button>
                )}
            </div>
            
            {/* Reading mode controls */}
            {viewMode === 'reading' && (
                <div className="px-3 py-2 bg-gray-100 border-t flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleWordBoundary && onToggleWordBoundary(index);
                        }}
                        className={`px-2 py-1 rounded text-xs ${
                            wordBoundaries.has(index) 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Toggle word boundary after this glyph"
                    >
                        | Word
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleLineBreak && onToggleLineBreak(index);
                        }}
                        className={`px-2 py-1 rounded text-xs ${
                            lineBreaks.has(index) 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Toggle line break after this glyph"
                    >
                        ↵ Line
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleColumnBreak && onToggleColumnBreak(index);
                        }}
                        className={`px-2 py-1 rounded text-xs ${
                            columnBreaks.has(index) 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Toggle column break after this glyph"
                    >
                        ⫿ Col
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * DetectionList - A list/grid of detection cards
 */
const DetectionList = ({
    detections,
    validations = {},
    selectedRegions = new Set(),
    viewMode = 'detection',
    readingOrder = [],
    showTopMatches = false,
    wordBoundaries = new Set(),
    lineBreaks = new Set(),
    columnBreaks = new Set(),
    glyphThumbnails = {},
    layout = 'grid', // 'grid' | 'list'
    onSelect,
    onValidate,
    onCorrect,
    onDelete,
    onTrim,
    onExclude,
    onAdjust,
    onSaveTemplate,
    onToggleWordBoundary,
    onToggleLineBreak,
    onToggleColumnBreak,
    className = ''
}) => {
    // Get indices in correct order
    const indices = viewMode === 'reading' && readingOrder.length > 0
        ? readingOrder
        : detections.map((_, i) => i);
    
    const layoutClasses = {
        grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3',
        list: 'flex flex-col gap-2'
    };
    
    return (
        <div className={`${layoutClasses[layout]} ${className}`}>
            {indices.map((originalIndex, displayIndex) => {
                const detection = detections[originalIndex];
                if (!detection) return null;
                
                return (
                    <DetectionCard
                        key={originalIndex}
                        detection={detection}
                        index={originalIndex}
                        isSelected={selectedRegions.has(originalIndex)}
                        isValidated={!!validations[originalIndex]}
                        validationResult={validations[originalIndex]?.isCorrect}
                        viewMode={viewMode}
                        readingOrderIndex={viewMode === 'reading' ? displayIndex : null}
                        showTopMatches={showTopMatches}
                        wordBoundaries={wordBoundaries}
                        lineBreaks={lineBreaks}
                        columnBreaks={columnBreaks}
                        glyphThumbnails={glyphThumbnails}
                        onSelect={onSelect}
                        onValidate={onValidate}
                        onCorrect={onCorrect}
                        onDelete={onDelete}
                        onTrim={onTrim}
                        onExclude={onExclude}
                        onAdjust={onAdjust}
                        onSaveTemplate={onSaveTemplate}
                        onToggleWordBoundary={onToggleWordBoundary}
                        onToggleLineBreak={onToggleLineBreak}
                        onToggleColumnBreak={onToggleColumnBreak}
                    />
                );
            })}
        </div>
    );
};

// Make components globally available
window.DetectionBox = DetectionBox;
window.DetectionCard = DetectionCard;
window.DetectionList = DetectionList;
