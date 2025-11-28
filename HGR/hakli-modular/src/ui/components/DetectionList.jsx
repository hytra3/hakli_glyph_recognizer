/**
 * DetectionList Component
 * 
 * Displays a grid of detected glyphs with:
 * - Thumbnail images
 * - Glyph names (English/Arabic switchable)
 * - Confidence scores
 * - Validation buttons (Correct/Incorrect)
 * - Action buttons (Correct, Trim, Exclude, Adjust, Delete)
 * - Reading mode features (drag to reorder, word/line/column breaks)
 * - Validation statistics
 * 
 * This component handles the "what was detected" display.
 * The DetectionCanvas shows "where on the image" - this shows "what each detection is"
 * 
 * Props:
 * @param {Array} results - Recognition results to display
 * @param {Object} validations - Validation status for each detection
 * @param {Set} selectedRegions - Which regions are selected for merging
 * @param {string} viewMode - 'detection' or 'reading'
 * @param {boolean} showArabicLabels - Whether to show Arabic prominently
 * @param {Object} readingMode - Reading mode state (wordBoundaries, lineBreaks, columnBreaks)
 * @param {Object} handlers - All action handlers
 */

function DetectionList({
    results,
    validations,
    selectedRegions,
    viewMode,
    showArabicLabels,
    readingMode,
    handlers
}) {
    /**
     * UNPACK HANDLERS
     * 
     * This component has lots of actions, so we group handlers into an object
     */
    const {
        onValidate,
        onCorrect,
        onTrim,
        onExclude,
        onAdjust,
        onDelete,
        onToggleSelection,
        onDragStart,
        onDragOver,
        onDrop,
        onToggleWordBoundary,
        onToggleLineBreak,
        onToggleColumnBreak
    } = handlers;
    
    /**
     * UNPACK READING MODE STATE
     */
    const {
        wordBoundaries,
        lineBreaks,
        columnBreaks
    } = readingMode || { wordBoundaries: new Set(), lineBreaks: new Set(), columnBreaks: new Set() };
    
    /**
     * HELPER: Calculate Validation Statistics
     */
    const getStats = () => {
        const total = results.length;
        const validatedCorrect = Object.values(validations).filter(v => v.isCorrect).length;
        const validatedIncorrect = Object.values(validations).filter(v => !v.isCorrect).length;
        const corrected = results.filter(r => r.corrected).length;
        const unvalidated = total - Object.keys(validations).length;
        
        return { total, validatedCorrect, validatedIncorrect, corrected, unvalidated };
    };
    
    /**
     * HELPER: Get Border Color Based on Validation
     */
    const getBorderClass = (index) => {
        if (selectedRegions.has(index)) {
            return 'ring-2 ring-amber-400';
        }
        if (validations[index]) {
            return validations[index].isCorrect ? 'border-green-300' : 'border-red-300';
        }
        return 'border-gray-200';
    };
    
    /**
     * RENDER: Validation Statistics Bar
     */
    const renderStats = () => {
        const stats = getStats();
        
        return (
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">{stats.total}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-green-600">✓ Validated Correct:</span>
                    <span className="font-semibold text-green-700">{stats.validatedCorrect}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-red-600">✗ Validated Incorrect:</span>
                    <span className="font-semibold text-red-700">{stats.validatedIncorrect}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-orange-600">✏️ Corrected:</span>
                    <span className="font-semibold text-orange-700">{stats.corrected}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-600">Unvalidated:</span>
                    <span className="font-semibold text-gray-700">{stats.unvalidated}</span>
                </div>
            </div>
        );
    };
    
    /**
     * RENDER: Single Detection Card
     * 
     * Each card shows:
     * - Thumbnail image
     * - Glyph name (English and/or Arabic)
     * - Confidence score
     * - Action buttons
     * - Validation buttons
     * - Reading mode controls (if in reading mode)
     */
    const renderDetectionCard = (result, displayIndex, originalIndex) => {
        const readingOrderNum = viewMode === 'reading' ? displayIndex + 1 : null;
        
        return (
            <div 
                key={`result-${originalIndex}`} 
                className={`p-3 bg-white rounded border ${getBorderClass(originalIndex)} ${viewMode === 'reading' ? 'cursor-move' : ''}`}
                draggable={viewMode === 'reading'}
                onDragStart={(e) => viewMode === 'reading' && onDragStart(e, displayIndex)}
                onDragOver={(e) => viewMode === 'reading' && onDragOver(e, displayIndex)}
                onDrop={(e) => viewMode === 'reading' && onDrop(e, displayIndex)}
            >
                {/* Header: Name and badges */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {/* Reading order badge */}
                            {viewMode === 'reading' && (
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 text-xs font-bold flex items-center justify-center">
                                    {readingOrderNum}
                                </div>
                            )}
                            
                            <div className="flex-1">
                                {/* Primary name (Arabic or English based on toggle) */}
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                    {showArabicLabels ? (
                                        <span className="text-2xl" style={{ fontFamily: '"Traditional Arabic", "Arabic Typesetting", "Scheherazade", serif' }}>
                                            {result.glyph.arabic || result.glyph.name}
                                        </span>
                                    ) : (
                                        <span>{result.glyph.name}</span>
                                    )}
                                    
                                    {/* Badges */}
                                    {result.corrected && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-300">
                                            ✏️ Corrected
                                        </span>
                                    )}
                                    {result.isMerged && <span className="text-xs text-gray-500">(merged)</span>}
                                    {result.isManual && <span className="text-xs text-gray-500">(manual)</span>}
                                </div>
                                
                                {/* Secondary name (opposite of primary) */}
                                <div className="text-sm text-gray-600 mt-1">
                                    {showArabicLabels ? (
                                        <span>{result.glyph.name} ({result.glyph.transliteration || result.glyph.name})</span>
                                    ) : (
                                        result.glyph.arabic && (
                                            <span style={{ fontFamily: '"Traditional Arabic", "Arabic Typesetting", "Scheherazade", serif' }}>
                                                {result.glyph.arabic}
                                            </span>
                                        )
                                    )}
                                </div>
                                
                                {/* Show original if corrected */}
                                {result.corrected && result.originalGlyph && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        Originally: <span className="line-through">{result.originalGlyph.name}</span>
                                    </div>
                                )}
                                
                                {/* Confidence score */}
                                <div className="text-xs text-gray-500 mt-1">
                                    Confidence: {(result.confidence * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Thumbnail image */}
                    <img 
                        src={result.thumbnail} 
                        alt={result.glyph.name} 
                        className="w-16 h-16 object-contain border border-gray-200 rounded ml-2"
                    />
                </div>
                
                {/* Action buttons row */}
                <div className="flex items-center justify-between mb-2 text-xl">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onCorrect(originalIndex)} 
                            className="text-blue-500 hover:text-blue-700"
                            title="Correct this detection"
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={() => onTrim(originalIndex)} 
                            className="text-green-500 hover:text-green-700"
                            title="Trim to smaller region"
                        >
                            ✂️
                        </button>
                        <button 
                            onClick={() => onExclude(originalIndex)} 
                            className="text-purple-500 hover:text-purple-700 text-sm"
                            title="Exclude regions from this detection"
                        >
                            🔥
                        </button>
                        <button 
                            onClick={() => onAdjust(originalIndex)} 
                            className="text-teal-500 hover:text-teal-700 text-sm"
                            title="Adjust box corners independently"
                        >
                            🔧
                        </button>
                        <button 
                            onClick={() => onToggleSelection(originalIndex)} 
                            className={`text-sm ${selectedRegions.has(originalIndex) ? 'text-blue-600' : 'text-blue-400 hover:text-blue-600'}`}
                            title="Select for merging (select 2+ then click Merge)"
                        >
                            ⚡
                        </button>
                        <button 
                            onClick={() => onDelete(originalIndex)} 
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Delete detection"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                
                {/* Validation and reading mode buttons */}
                <div className="flex gap-2 flex-wrap">
                    {/* Validation buttons */}
                    <button 
                        onClick={() => onValidate(originalIndex, true)} 
                        className={`px-3 py-1 text-xs rounded ${validations[originalIndex]?.isCorrect ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                        ✓ Correct
                    </button>
                    <button 
                        onClick={() => onValidate(originalIndex, false)} 
                        className={`px-3 py-1 text-xs rounded ${validations[originalIndex] && !validations[originalIndex].isCorrect ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                        ✗ Incorrect
                    </button>
                    
                    {/* Reading mode buttons */}
                    {viewMode === 'reading' && (
                        <>
                            <button 
                                onClick={() => onToggleWordBoundary(displayIndex)} 
                                className={`px-3 py-1 text-xs rounded ${wordBoundaries.has(displayIndex) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                title="Mark word boundary after this glyph"
                            >
                                | Word Break
                            </button>
                            <button 
                                onClick={() => onToggleColumnBreak(displayIndex)} 
                                className={`px-3 py-1 text-xs rounded ${columnBreaks.has(displayIndex) ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                title="Mark column break after this glyph"
                            >
                                || Column Break
                            </button>
                            <button 
                                onClick={() => onToggleLineBreak(displayIndex)} 
                                className={`px-3 py-1 text-xs rounded ${lineBreaks.has(displayIndex) ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                title="Mark line break after this glyph"
                            >
                                --- Line Break
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };
    
    /**
     * MAIN RENDER
     */
    if (!results || results.length === 0) return null;
    
    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            {/* Title */}
            <h3 className="font-semibold text-gray-900 mb-3">
                {viewMode === 'detection' ? 'Detection Results' : 'Reading Order Results'}
                {viewMode === 'reading' && <span className="ml-2 text-sm text-gray-600">(drag cards to reorder)</span>}
            </h3>
            
            {/* Statistics */}
            {renderStats()}
            
            {/* Grid of detection cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((result, displayIndex) => {
                    // In reading mode, displayIndex is the reading order position
                    // In detection mode, displayIndex is the original array index
                    const originalIndex = displayIndex; // Parent handles reordering
                    return renderDetectionCard(result, displayIndex, originalIndex);
                })}
            </div>
        </div>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM DETECTIONLIST
 * ========================================================================
 * 
 * 1. GRID LAYOUT PATTERN:
 *    - Use CSS Grid for responsive layouts
 *    - grid-cols-1 md:grid-cols-2 lg:grid-cols-3
 *    - Automatically adapts to screen size
 * 
 * 2. CARD COMPONENT PATTERN:
 *    - Each item in grid is a "card"
 *    - Card = self-contained UI element
 *    - Consistent structure across all cards
 * 
 * 3. CONDITIONAL STYLING:
 *    - Border color changes based on validation
 *    - Background color for selected items
 *    - Active button states
 *    - Helper function: getBorderClass()
 * 
 * 4. DRAG AND DROP:
 *    - draggable={viewMode === 'reading'}
 *    - onDragStart, onDragOver, onDrop handlers
 *    - Parent component handles actual reordering
 *    - This component just calls handlers
 * 
 * 5. BILINGUAL DISPLAY:
 *    - Primary language (large)
 *    - Secondary language (small below)
 *    - Switches based on showArabicLabels
 *    - Uses appropriate fonts for Arabic
 * 
 * 6. STATISTICS CALCULATION:
 *    - getStats() helper function
 *    - Derives counts from validations object
 *    - Displays at top of list
 *    - Updates automatically when validations change
 * 
 * 7. MODE-SPECIFIC FEATURES:
 *    - Reading mode: drag, reorder, break markers
 *    - Detection mode: just validation and actions
 *    - Conditional rendering: {viewMode === 'reading' && ...}
 * 
 * 8. LOTS OF BUTTONS, BUT ORGANIZED:
 *    - Action buttons row (edit, trim, exclude, etc.)
 *    - Validation buttons row (correct/incorrect)
 *    - Reading mode buttons row (word/line/column breaks)
 *    - Each row has clear purpose
 * 
 * 9. HANDLER GROUPING:
 *    - Instead of 12 individual prop handlers
 *    - Group into handlers object
 *    - Keeps component signature clean
 *    - Easy to pass through parent
 * 
 * 10. SIMPLICITY VS CANVAS:
 *     - No coordinate scaling needed!
 *     - No IIFE patterns!
 *     - No complex z-index management!
 *     - Just straightforward React rendering
 *     - Much easier to understand and debug
 * 
 * ========================================================================
 * COMPARISON TO CANVAS
 * ========================================================================
 * 
 * DetectionCanvas (650 lines):
 * - Coordinate scaling everywhere
 * - Two rendering paths (polygon vs rectangle)
 * - Complex mouse event handling
 * - z-index layer management
 * - IIFE patterns for calculations
 * 
 * DetectionList (300 lines):
 * - Simple grid layout
 * - One rendering path (cards)
 * - Straightforward click handlers
 * - No z-index issues
 * - No IIFE needed
 * 
 * BOTH are important, but DetectionList is MUCH simpler!
 * 
 * ========================================================================
 * WHY THIS HELPS
 * ========================================================================
 * 
 * Before: Detection list JSX mixed with canvas, validation, reading mode
 * After: Clear component that just shows detection cards
 * 
 * When grid layout breaks:
 * - Before: Search 6,000 lines for grid classes
 * - After: Open DetectionList.jsx, check renderDetectionCard
 * 
 * When adding new button:
 * - Before: Find the right map function, add button, hope nothing breaks
 * - After: Add button to renderDetectionCard, add handler prop, done
 * 
 * ========================================================================
 */

// Export
window.DetectionListComponent = DetectionList;
