/**
 * TranscriptionDisplay Component
 * 
 * Displays transcription output with TWO modes:
 * 
 * 1. BASIC TRANSCRIPTION BOX (draggable):
 *    - Shows formatted transcription with break markers
 *    - Draggable to reposition on screen
 *    - Copy and export buttons
 *    - Arabic or English display
 * 
 * 2. ENHANCED TRANSCRIPTION DISPLAY (collapsible):
 *    - Script selection (English/Arabic)
 *    - Direction selection (LTR/RTL/Vertical)
 *    - Formatted with proper layout
 *    - Respects line/column/word breaks
 * 
 * Props:
 * @param {boolean} visible - Show basic transcription box
 * @param {boolean} viewMode - 'detection' or 'reading'
 * @param {boolean} showArabicLabels - Display in Arabic or English
 * @param {Array} results - Ordered recognition results
 * @param {Set} wordBoundaries - Word boundary markers
 * @param {Set} lineBreaks - Line break markers
 * @param {Set} columnBreaks - Column break markers
 * @param {Object} dragState - Dragging state (position, isDragging, etc.)
 * @param {Object} enhancedState - Enhanced transcription state
 * @param {Object} handlers - All action handlers
 * @param {Object} refs - React refs for dragging
 */

function TranscriptionDisplay({
    visible,
    viewMode,
    showArabicLabels,
    results,
    wordBoundaries,
    lineBreaks,
    columnBreaks,
    dragState,
    enhancedState,
    handlers,
    refs
}) {
    /**
     * UNPACK DRAG STATE
     */
    const { position, isDragging } = dragState;
    
    /**
     * UNPACK ENHANCED STATE
     */
    const { 
        showEnhanced, 
        script, // 'english' or 'arabic'
        format  // 'english-ltr', 'arabic-rtl', 'vertical-rl', 'vertical-lr'
    } = enhancedState;
    
    /**
     * UNPACK HANDLERS
     */
    const {
        onMouseDown,
        onResetPosition,
        onCopy,
        onExport,
        onClose,
        onToggleEnhanced,
        onSetScript,
        onSetFormat,
        getEnhancedTranscription
    } = handlers;
    
    /**
     * HELPER: Check if transcription should be floating
     */
    const isFloating = position.x !== 0 || position.y !== 0;
    
    /**
     * RENDER: Basic Transcription Box
     * 
     * Draggable box showing formatted transcription
     */
    const renderBasicTranscription = () => {
        if (!visible || viewMode !== 'reading' || results.length === 0) return null;
        
        return (
            <div
                ref={refs.transcriptionRef}
                className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200"
                style={{
                    position: isFloating ? 'fixed' : 'relative',
                    left: isFloating ? `${position.x}px` : 'auto',
                    top: isFloating ? `${position.y}px` : 'auto',
                    zIndex: isDragging ? 1000 : (isFloating ? 100 : 'auto'),
                    cursor: isDragging ? 'grabbing' : 'auto',
                    maxWidth: isFloating ? '600px' : 'none',
                    boxShadow: isFloating ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                }}
            >
                {/* Draggable Header */}
                <div 
                    className="flex items-center justify-between mb-3 transcription-drag-handle"
                    onMouseDown={onMouseDown}
                    style={{ cursor: 'grab' }}
                    title="Drag to reposition transcription box"
                >
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span style={{ cursor: 'grab' }}>⋮⋮</span> Transcription
                    </h3>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {/* Reset Position Button (only when floating) */}
                        {isFloating && (
                            <button 
                                onClick={onResetPosition}
                                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                                title="Reset position"
                            >
                                ↺ Reset
                            </button>
                        )}
                        
                        {/* Copy Button */}
                        <button 
                            onClick={onCopy}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 flex items-center gap-1"
                            title="Copy transcription to clipboard"
                        >
                            📋 Copy
                        </button>
                        
                        {/* Export Button */}
                        <button 
                            onClick={onExport}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 flex items-center gap-1"
                            title="Download transcription as text file"
                        >
                            💾 Export TXT
                        </button>
                        
                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 font-bold"
                            title="Close transcription box"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                
                {/* Transcription Content */}
                <div className="p-4 bg-white rounded border-2 border-blue-300 shadow-inner">
                    <div 
                        className="font-mono text-lg leading-relaxed"
                        style={{
                            fontFamily: showArabicLabels 
                                ? '"Traditional Arabic", "Arabic Typesetting", "Scheherazade", serif' 
                                : '"Courier New", monospace'
                        }}
                    >
                        {results.map((result, index) => (
                            <span key={index}>
                                <span className="text-gray-900">
                                    {showArabicLabels 
                                        ? (result.glyph.arabic || result.glyph.name)
                                        : (result.glyph.transliteration || result.glyph.name)
                                    }
                                </span>
                                {/* Break markers */}
                                {lineBreaks.has(index) && <span className="text-purple-600 font-bold mx-2">---</span>}
                                {!lineBreaks.has(index) && columnBreaks.has(index) && <span className="text-indigo-600 font-bold mx-1">||</span>}
                                {!lineBreaks.has(index) && !columnBreaks.has(index) && wordBoundaries.has(index) && <span className="text-blue-600 font-bold mx-1">|</span>}
                                {!lineBreaks.has(index) && !columnBreaks.has(index) && !wordBoundaries.has(index) && index < results.length - 1 && <span className="text-gray-400">·</span>}
                            </span>
                        ))}
                    </div>
                </div>
                
                {/* Legend */}
                <div className="mt-3 text-xs text-gray-600">
                    <span className="text-purple-600 font-bold">---</span> = line break · 
                    <span className="text-indigo-600 font-bold">||</span> = column break · 
                    <span className="text-blue-600 font-bold">|</span> = word boundary · 
                    <span className="text-gray-400">·</span> = glyph separator
                </div>
            </div>
        );
    };
    
    /**
     * RENDER: Enhanced Transcription Display
     * 
     * Formatted display with script and direction options
     */
    const renderEnhancedTranscription = () => {
        if (viewMode !== 'reading' || results.length === 0) return null;
        
        return (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                {/* Collapsible Header */}
                <button
                    onClick={onToggleEnhanced}
                    className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700 mb-3"
                >
                    <span>{showEnhanced ? '▼' : '▶'}</span>
                    <h3>📜 Enhanced Transcription Display</h3>
                </button>
                
                {showEnhanced && (
                    <>
                        {/* Help Text */}
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                            <div className="font-semibold mb-1">💡 How to use breaks:</div>
                            <div className="text-xs">
                                Use the break buttons on each glyph card (in reading mode) to mark the layout:
                                <span className="ml-2 text-blue-600 font-bold">|</span> Word boundary
                                <span className="ml-2 text-indigo-600 font-bold">||</span> End of column
                                <span className="ml-2 text-purple-600 font-bold">---</span> End of line
                                <br/>
                                The <span className="inline-block w-4 h-4 rounded-full bg-yellow-400 border border-yellow-600 text-xs text-center">N</span> numbers show reading order.
                            </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="mb-4 p-4 bg-white rounded-lg border border-purple-200">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Script Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Script:</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onSetScript('english')}
                                            className={`px-4 py-2 rounded text-sm font-medium ${
                                                script === 'english' 
                                                    ? 'bg-purple-500 text-white' 
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            English (abc)
                                        </button>
                                        <button
                                            onClick={() => onSetScript('arabic')}
                                            className={`px-4 py-2 rounded text-sm font-medium ${
                                                script === 'arabic' 
                                                    ? 'bg-purple-500 text-white' 
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Arabic (ع ب ت)
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Direction Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Direction:</label>
                                    <select
                                        value={format}
                                        onChange={(e) => onSetFormat(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="english-ltr">→ Left to Right</option>
                                        <option value="arabic-rtl">← Right to Left</option>
                                        <option value="vertical-rl">↓ Top to Bottom (columns →)</option>
                                        <option value="vertical-lr">↓ Top to Bottom (columns ←)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Formatted Transcription Display */}
                        <div className="p-6 bg-white rounded-lg border-2 border-purple-300 shadow-inner">
                            {format.startsWith('vertical') ? (
                                // VERTICAL LAYOUT
                                <div className="flex flex-col gap-8">
                                    {getEnhancedTranscription().map((line, lineIndex) => (
                                        <div 
                                            key={lineIndex} 
                                            className={`flex gap-8 justify-center ${format === 'vertical-rl' ? 'flex-row-reverse' : ''}`}
                                        >
                                            {line.map((columnText, colIndex) => (
                                                <div 
                                                    key={colIndex}
                                                    className="font-mono leading-relaxed"
                                                    style={{
                                                        writingMode: format === 'vertical-rl' ? 'vertical-rl' : 'vertical-lr',
                                                        textOrientation: 'upright',
                                                        minHeight: '200px',
                                                        fontSize: script === 'arabic' ? '2rem' : '1.5rem',
                                                        fontFamily: script === 'arabic' 
                                                            ? '"Traditional Arabic", "Arabic Typesetting", "Scheherazade", serif' 
                                                            : '"Courier New", monospace'
                                                    }}
                                                >
                                                    {columnText}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // HORIZONTAL LAYOUT (LTR or RTL)
                                <div className="flex flex-col gap-4">
                                    {getEnhancedTranscription().map((line, lineIndex) => (
                                        <div 
                                            key={lineIndex}
                                            className="flex gap-6"
                                            style={{
                                                direction: format === 'arabic-rtl' ? 'rtl' : 'ltr',
                                                justifyContent: format === 'arabic-rtl' ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            {line.map((columnText, colIndex) => (
                                                <div 
                                                    key={colIndex}
                                                    className="font-mono text-2xl leading-relaxed"
                                                    style={{
                                                        fontFamily: script === 'arabic' 
                                                            ? '"Traditional Arabic", "Arabic Typesetting", "Scheherazade", serif' 
                                                            : '"Courier New", monospace'
                                                    }}
                                                >
                                                    {columnText}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };
    
    /**
     * MAIN RENDER
     */
    return (
        <>
            {renderBasicTranscription()}
            {renderEnhancedTranscription()}
        </>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM TRANSCRIPTIONDISPLAY
 * ========================================================================
 * 
 * 1. DRAGGABLE ELEMENTS:
 *    - position: fixed when dragged
 *    - Track position state (x, y)
 *    - onMouseDown handler on drag handle
 *    - Change cursor during drag
 *    - Reset position button
 * 
 * 2. CONDITIONAL POSITIONING:
 *    - isFloating = position !== 0
 *    - Switch between relative and fixed
 *    - Add shadow when floating
 *    - Constrain width when floating
 * 
 * 3. TWO DISPLAY MODES:
 *    - Basic: Simple draggable box
 *    - Enhanced: Formatted with layout options
 *    - Separate render functions
 *    - Clean organization
 * 
 * 4. FORMATTED TEXT DISPLAY:
 *    - Vertical writing modes (vertical-rl, vertical-lr)
 *    - Horizontal directions (LTR, RTL)
 *    - Dynamic font families
 *    - Text orientation control
 * 
 * 5. BREAK MARKERS:
 *    - Line breaks: ---
 *    - Column breaks: ||
 *    - Word boundaries: |
 *    - Glyph separator: ·
 *    - Conditional rendering based on break type
 * 
 * 6. SCRIPT SELECTION:
 *    - English vs Arabic
 *    - Different fonts for each
 *    - Different font sizes
 *    - Consistent button pattern
 * 
 * 7. NO COMPLEX LOGIC HERE:
 *    - Component displays data
 *    - Handler functions do the work
 *    - getEnhancedTranscription() from parent
 *    - Clean separation
 * 
 * 8. REFS FOR DRAGGING:
 *    - transcriptionRef from parent
 *    - Used to track element position
 *    - Parent handles mouse events
 * 
 * ========================================================================
 * SIMPLICITY DESPITE FEATURES
 * ========================================================================
 * 
 * This component has:
 * - Draggable positioning
 * - Two display modes
 * - Vertical and horizontal layouts
 * - Script selection
 * - Direction selection
 * - Multiple break types
 * 
 * But it's STILL simple because:
 * - All logic is in handlers
 * - Clear render function organization
 * - No coordinate calculations
 * - No complex state management
 * - Just displays what it's given
 * 
 * ========================================================================
 */

// Export
window.TranscriptionDisplayComponent = TranscriptionDisplay;
