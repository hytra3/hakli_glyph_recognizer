/**
 * ReadingModePanel Component
 * 
 * Controls for switching between detection and reading modes:
 * - View mode toggle (Detection vs Reading)
 * - Language toggle (English vs Arabic labels)
 * - Reading direction selector (LTR, RTL, TTB)
 * - Show transcription button
 * - Help text for each mode
 * 
 * This is a SIMPLE component - just buttons and conditional display
 * Much easier than canvas or validation modals!
 * 
 * Props:
 * @param {boolean} visible - Whether panel should show
 * @param {string} viewMode - 'detection' or 'reading'
 * @param {string} readingDirection - 'detection', 'ltr', 'rtl', or 'ttb'
 * @param {boolean} showArabicLabels - Whether to show Arabic prominently
 * @param {boolean} showTranscription - Whether transcription is visible
 * @param {boolean} isCollapsed - Panel collapse state
 * @param {Object} handlers - Action handlers
 */

function ReadingModePanel({
    visible,
    viewMode,
    readingDirection,
    showArabicLabels,
    showTranscription,
    isCollapsed,
    handlers
}) {
    /**
     * UNPACK HANDLERS
     */
    const {
        onSetViewMode,
        onSetReadingDirection,
        onToggleArabicLabels,
        onShowTranscription,
        onToggleCollapse
    } = handlers;
    
    /**
     * Don't render if not visible (no detections yet)
     */
    if (!visible) return null;
    
    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            {/* Collapsible Header */}
            <button
                onClick={onToggleCollapse}
                className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700 mb-3 w-full text-left"
            >
                <span>{isCollapsed ? '▶' : '▼'}</span>
                <h3>View Mode</h3>
            </button>
            
            {!isCollapsed && (
                <>
                    {/* Main Buttons Row */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2 flex-wrap">
                            {/* Detection View Button */}
                            <button 
                                onClick={() => onSetViewMode('detection')}
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    viewMode === 'detection' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                📷 Detection View
                            </button>
                            
                            {/* Reading Order View Button */}
                            <button 
                                onClick={() => onSetViewMode('reading')}
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    viewMode === 'reading' 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                📖 Reading Order View
                            </button>
                            
                            {/* Language Toggle Button */}
                            <button 
                                onClick={onToggleArabicLabels}
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    showArabicLabels 
                                        ? 'bg-purple-500 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                                title={showArabicLabels ? 'Showing Arabic labels' : 'Showing English labels'}
                            >
                                {showArabicLabels ? '🔤 Arabic' : 'ABC English'}
                            </button>
                            
                            {/* Show Transcription Button (only in reading mode if not already shown) */}
                            {viewMode === 'reading' && !showTranscription && (
                                <button 
                                    onClick={onShowTranscription}
                                    className="px-4 py-2 rounded font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                    title="Show transcription box"
                                >
                                    📝 Show Transcription
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Reading Mode Controls */}
                    {viewMode === 'reading' && (
                        <div className="pt-4 border-t border-gray-300">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <span className="text-sm font-medium text-gray-700">Reading Direction:</span>
                                <div className="flex gap-2 flex-wrap">
                                    {/* Detection Order Button */}
                                    <button 
                                        onClick={() => onSetReadingDirection('detection')}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                            readingDirection === 'detection' 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                        title="Original detection order"
                                    >
                                        🔢 Detection Order
                                    </button>
                                    
                                    {/* LTR Button */}
                                    <button 
                                        onClick={() => onSetReadingDirection('ltr')}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                            readingDirection === 'ltr' 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                        title="Left to Right"
                                    >
                                        → LTR
                                    </button>
                                    
                                    {/* RTL Button */}
                                    <button 
                                        onClick={() => onSetReadingDirection('rtl')}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                            readingDirection === 'rtl' 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                        title="Right to Left"
                                    >
                                        ← RTL
                                    </button>
                                    
                                    {/* TTB Button */}
                                    <button 
                                        onClick={() => onSetReadingDirection('ttb')}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                            readingDirection === 'ttb' 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                        title="Top to Bottom"
                                    >
                                        ↓ TTB
                                    </button>
                                </div>
                            </div>
                            
                            {/* Help Tip for Reading Mode */}
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                💡 Tip: In Reading Order View, you can drag detection cards below to manually reorder them.
                            </div>
                        </div>
                    )}
                    
                    {/* Detection Mode Help Text */}
                    {viewMode === 'detection' && (
                        <div className="pt-4 border-t border-gray-300">
                            <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700">
                                📷 Detection View shows glyphs in the order they were detected (left-to-right on the image). Use this mode for validation and editing.
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM READINGMODEPANEL
 * ========================================================================
 * 
 * 1. SIMPLE COMPONENTS ARE EASY:
 *    - No coordinate scaling
 *    - No IIFE patterns
 *    - No complex state
 *    - Just buttons and conditionals
 *    - 150 lines total
 * 
 * 2. BUTTON GROUP PATTERN:
 *    - Multiple related buttons
 *    - Conditional styling based on state
 *    - Clear active state indication
 *    - Consistent spacing with flexbox
 * 
 * 3. CONDITIONAL SECTIONS:
 *    - {viewMode === 'reading' && <ReadingControls />}
 *    - {viewMode === 'detection' && <HelpText />}
 *    - Clean and readable
 *    - No complex nesting
 * 
 * 4. COLLAPSIBLE PANELS:
 *    - Button to toggle
 *    - Collapse state from parent
 *    - Simple show/hide logic
 *    - No animation complexity needed
 * 
 * 5. HELP TEXT PATTERN:
 *    - Informational boxes
 *    - Different colors for different contexts
 *    - Guide users on what to do
 *    - Contextual based on mode
 * 
 * 6. CONSISTENT STYLING:
 *    - Active button: bg-blue-500 text-white
 *    - Inactive button: bg-gray-200 text-gray-700
 *    - Hover: hover:bg-gray-300
 *    - Easy to maintain
 * 
 * 7. HANDLER SIMPLICITY:
 *    - Component just calls handlers
 *    - No logic here
 *    - Parent updates state
 *    - Clean separation
 * 
 * 8. RESPONSIVE DESIGN:
 *    - flex-wrap on button rows
 *    - Adapts to screen size
 *    - No media queries needed
 *    - Tailwind handles it
 * 
 * ========================================================================
 * COMPARISON TO COMPLEX COMPONENTS
 * ========================================================================
 * 
 * DetectionCanvas (650 lines):
 * - Coordinate scaling
 * - Two rendering paths
 * - Mouse event handling
 * - z-index management
 * - COMPLEX!
 * 
 * ValidationPanel (450 lines):
 * - Three modals
 * - Search functionality
 * - Glyph grid
 * - MEDIUM complexity
 * 
 * ReadingModePanel (150 lines):
 * - Button groups
 * - Conditional display
 * - Help text
 * - SIMPLE!
 * 
 * NOT ALL COMPONENTS ARE HARD!
 * 
 * ========================================================================
 * WHY THIS MATTERS
 * ========================================================================
 * 
 * Before: Reading controls mixed with everything
 * After: Clean component, easy to understand
 * 
 * When mode toggle breaks:
 * - Before: Search 6,000 lines
 * - After: Open ReadingModePanel.jsx, check button handlers
 * 
 * When adding new reading direction:
 * - Before: Find right spot, add button, hope nothing breaks
 * - After: Add button to button group, add handler, done
 * 
 * ========================================================================
 */

// Export
window.ReadingModePanelComponent = ReadingModePanel;
