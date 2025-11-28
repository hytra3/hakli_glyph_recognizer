/**
 * ValidationPanel Component
 * 
 * Handles THREE interactive modals for validating/correcting detections:
 * 
 * 1. CORRECTION MODAL - Select correct glyph from equivalence chart
 *    - Full-screen modal with glyph grid
 *    - Search functionality
 *    - Correction suggestions based on learning
 *    - Shows current detection and thumbnail
 * 
 * 2. EXCLUDE MODAL - Draw boxes to exclude noise from detection
 *    - Side panel modal
 *    - Instructions for drawing exclusion boxes
 *    - Shows excluded regions count
 *    - Apply/cancel buttons
 * 
 * 3. ADJUST MODAL - Drag corners to adjust detection box
 *    - Side panel modal  
 *    - Instructions for dragging corners
 *    - Creates trapezoids/parallelograms for perspective
 *    - Apply/cancel buttons
 * 
 * Props:
 * @param {number|null} correctionMode - Index of detection being corrected, or null
 * @param {number|null} excludeMode - Index of detection in exclude mode, or null
 * @param {number|null} adjustMode - Index of detection in adjust mode, or null
 * @param {Array} recognitionResults - All detections
 * @param {Array} isolatedGlyphs - Isolated glyph regions with thumbnails
 * @param {Object} equivalenceChart - Glyph chart with all possible glyphs
 * @param {Array} excludeRegions - Regions marked for exclusion
 * @param {Object} handlers - All action handlers
 */

function ValidationPanel({
    correctionMode,
    excludeMode,
    adjustMode,
    recognitionResults,
    isolatedGlyphs,
    equivalenceChart,
    excludeRegions,
    handlers
}) {
    /**
     * UNPACK HANDLERS
     */
    const {
        onApplyCorrection,
        onCancelCorrection,
        onApplyExclude,
        onCancelExclude,
        onApplyAdjust,
        onCancelAdjust,
        getCorrectionSuggestion
    } = handlers;
    
    /**
     * RENDER: Correction Modal
     * 
     * Full-screen modal for selecting the correct glyph
     * Shows all glyphs from equivalence chart in grid
     */
    const renderCorrectionModal = () => {
        if (correctionMode === null || !equivalenceChart) return null;
        
        const detection = recognitionResults[correctionMode];
        if (!detection) return null;
        
        const suggestion = getCorrectionSuggestion && getCorrectionSuggestion(detection.glyph.id);
        
        return (
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
                onClick={onCancelCorrection}
            >
                <div 
                    className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-gray-900">Select Correct Glyph</h3>
                        <button 
                            onClick={onCancelCorrection} 
                            className="text-gray-400 hover:text-gray-600 text-3xl leading-none w-8 h-8 flex items-center justify-center"
                            title="Close (Esc)"
                        >
                            &times;
                        </button>
                    </div>
                    
                    {/* Current Detection Info */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <span className="text-sm text-gray-600">Currently detected as:</span>
                                <div className="text-xl font-bold text-gray-900 mt-1">
                                    {detection.glyph.name}
                                    <span className="ml-3 text-base font-normal text-gray-600">
                                        ({detection.glyph.transliteration || detection.glyph.name})
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {Math.round(detection.confidence * 100)}% confidence
                                </div>
                            </div>
                            {detection.regionIndex !== undefined &&
                                isolatedGlyphs[detection.regionIndex]?.thumbnail && (
                                    <div className="flex-shrink-0">
                                        <div className="text-xs text-gray-600 mb-1 text-center">Detected Region:</div>
                                        <img
                                            src={isolatedGlyphs[detection.regionIndex].thumbnail}
                                            alt="Isolated region"
                                            className="w-32 h-auto border-2 border-blue-300 rounded"
                                        />
                                    </div>
                                )}
                        </div>
                    </div>
                    
                    {/* Search Input */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search glyphs by name or transliteration..."
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                            onChange={(e) => {
                                const searchTerm = e.target.value.toLowerCase();
                                const glyphGrid = e.target.parentElement.nextElementSibling;
                                if (suggestion) {
                                    // Skip suggestion box, get grid after it
                                    const buttons = glyphGrid.nextElementSibling.querySelectorAll('button');
                                    buttons.forEach(btn => {
                                        const text = btn.textContent.toLowerCase();
                                        btn.style.display = text.includes(searchTerm) ? '' : 'none';
                                    });
                                } else {
                                    const buttons = glyphGrid.querySelectorAll('button');
                                    buttons.forEach(btn => {
                                        const text = btn.textContent.toLowerCase();
                                        btn.style.display = text.includes(searchTerm) ? '' : 'none';
                                    });
                                }
                            }}
                        />
                    </div>
                    
                    {/* Correction Suggestion (if available) */}
                    {suggestion && (
                        <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-700 font-semibold">💡 Suggestion:</span>
                                    <span className="text-gray-700">
                                        You've corrected this to <strong>{suggestion.to.name}</strong> {suggestion.count} time{suggestion.count > 1 ? 's' : ''} before
                                    </span>
                                </div>
                                <button
                                    onClick={() => onApplyCorrection(correctionMode, suggestion.to)}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                                >
                                    Apply Suggestion
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Glyph Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {equivalenceChart.glyphs.map((glyph, index) => {
                            const isCurrentGlyph = glyph.id === detection.glyph.id;
                            return (
                                <button
                                    key={`glyph-${glyph.id}-${index}`}
                                    onClick={() => onApplyCorrection(correctionMode, glyph)}
                                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-1 transition-all hover:scale-105 ${
                                        isCurrentGlyph 
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' 
                                            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                    }`}
                                    title={`${glyph.name} (${glyph.transliteration || glyph.name})`}
                                >
                                    <div className="font-bold text-xl">{glyph.name}</div>
                                    <div className="text-xs text-gray-600 text-center leading-tight">
                                        {glyph.transliteration || glyph.name}
                                    </div>
                                    {isCurrentGlyph && (
                                        <div className="text-xs text-blue-600 font-semibold mt-1">Current</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Cancel Button */}
                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={onCancelCorrection}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    /**
     * RENDER: Exclude Mode Modal
     * 
     * Side panel for exclude mode with instructions
     */
    const renderExcludeModal = () => {
        if (excludeMode === null) return null;
        
        const detection = recognitionResults[excludeMode];
        if (!detection) return null;
        
        return (
            <div className="fixed right-4 top-20 z-50 w-96 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="bg-white rounded-lg p-6 shadow-2xl border-4 border-purple-400" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <span>🔥</span> Exclude Regions
                        </h3>
                        <button 
                            onClick={onCancelExclude}
                            className="text-gray-400 hover:text-gray-600 text-3xl leading-none w-8 h-8 flex items-center justify-center"
                            title="Close (Esc)"
                        >
                            &times;
                        </button>
                    </div>
                    
                    {/* Current Detection Info */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <span className="text-sm text-gray-600">Cleaning detection:</span>
                                <div className="text-xl font-bold text-gray-900 mt-1">
                                    {detection.glyph.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Remove unwanted portions from this detection
                                </div>
                            </div>
                            {detection.regionIndex !== undefined &&
                                isolatedGlyphs[detection.regionIndex]?.thumbnail && (
                                    <div className="flex-shrink-0">
                                        <div className="text-xs text-gray-600 mb-1 text-center">Current Region:</div>
                                        <img
                                            src={isolatedGlyphs[detection.regionIndex].thumbnail}
                                            alt="Current region"
                                            className="w-24 h-auto border-2 border-purple-300 rounded"
                                        />
                                    </div>
                                )}
                        </div>
                    </div>
                    
                    {/* Instructions */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">📝 How to Exclude Regions:</h4>
                        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                            <li><strong className="text-blue-700">DRAW BOXES on the inscription image</strong> - Click and drag to create red boxes around unwanted portions</li>
                            <li>The <strong>purple dashed border</strong> shows which detection you're editing</li>
                            <li><strong>Draw multiple boxes</strong> if you need to exclude several areas</li>
                            <li>When done drawing, click <strong className="text-green-600">"✓ Apply Exclusions"</strong> below</li>
                        </ol>
                    </div>
                    
                    {/* Status */}
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-sm text-yellow-800">
                            <strong>Status:</strong> {excludeRegions.length === 0 ? 
                                '⚠️ No boxes drawn yet - Draw red boxes on the image above!' : 
                                `✓ ${excludeRegions.length} exclusion region${excludeRegions.length > 1 ? 's' : ''} drawn - Ready to apply!`}
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {excludeRegions.length > 0 && (
                            <button
                                onClick={() => onApplyExclude(excludeMode)}
                                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg"
                            >
                                ✓ Apply Exclusions
                            </button>
                        )}
                        <button
                            onClick={onCancelExclude}
                            className={`${excludeRegions.length > 0 ? 'flex-1' : 'w-full'} px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-lg`}
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    /**
     * RENDER: Adjust Mode Modal
     * 
     * Side panel for adjust mode with instructions
     */
    const renderAdjustModal = () => {
        if (adjustMode === null) return null;
        
        const detection = recognitionResults[adjustMode];
        if (!detection) return null;
        
        return (
            <div className="fixed right-4 top-20 z-50 w-96 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="bg-white rounded-lg p-6 shadow-2xl border-4 border-teal-400" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <span>🔧</span> Adjust Box Corners
                        </h3>
                        <button 
                            onClick={onCancelAdjust}
                            className="text-gray-400 hover:text-gray-600 text-3xl leading-none w-8 h-8 flex items-center justify-center"
                            title="Close (Esc)"
                        >
                            &times;
                        </button>
                    </div>
                    
                    {/* Current Detection Info */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <span className="text-sm text-gray-600">Adjusting detection:</span>
                                <div className="text-xl font-bold text-gray-900 mt-1">
                                    {detection.glyph.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Drag corners to fit the glyph perfectly
                                </div>
                            </div>
                            {detection.regionIndex !== undefined &&
                                isolatedGlyphs[detection.regionIndex]?.thumbnail && (
                                    <div className="flex-shrink-0">
                                        <div className="text-xs text-gray-600 mb-1 text-center">Current Region:</div>
                                        <img
                                            src={isolatedGlyphs[detection.regionIndex].thumbnail}
                                            alt="Current region"
                                            className="w-24 h-auto border-2 border-teal-300 rounded"
                                        />
                                    </div>
                                )}
                        </div>
                    </div>
                    
                    {/* Instructions */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">📝 How to Adjust Corners:</h4>
                        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                            <li><strong className="text-blue-700">DRAG the corner circles</strong> on the detection box to adjust each corner independently</li>
                            <li>The <strong>teal border</strong> shows which detection you're adjusting</li>
                            <li>Create <strong>trapezoids or parallelograms</strong> to handle perspective or angled glyphs</li>
                            <li>When done adjusting, click <strong className="text-green-600">"✓ Apply Adjustment"</strong> below</li>
                        </ol>
                    </div>
                    
                    {/* Status */}
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm">
                        <strong className="text-yellow-800">Status:</strong>
                        <span className="text-gray-700 ml-2">Adjustment mode active - drag the corner handles on the image</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => onApplyAdjust(adjustMode)}
                            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg"
                        >
                            ✓ Apply Adjustment
                        </button>
                        <button
                            onClick={onCancelAdjust}
                            className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-lg"
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    /**
     * MAIN RENDER
     * 
     * Only ONE modal shows at a time (correction OR exclude OR adjust)
     */
    return (
        <>
            {renderCorrectionModal()}
            {renderExcludeModal()}
            {renderAdjustModal()}
        </>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM VALIDATIONPANEL
 * ========================================================================
 * 
 * 1. MULTIPLE MODALS IN ONE COMPONENT:
 *    - Three separate modals
 *    - Only one shows at a time
 *    - Each has its own render function
 *    - Clean separation of concerns
 * 
 * 2. MODAL PATTERNS:
 *    - Full-screen overlay (correction modal)
 *    - Side panel (exclude/adjust modals)
 *    - Backdrop click to close
 *    - stopPropagation on modal content
 * 
 * 3. CONDITIONAL RENDERING:
 *    - if (mode === null) return null;
 *    - Early return pattern
 *    - Clean and readable
 * 
 * 4. RENDER FUNCTION ORGANIZATION:
 *    - renderCorrectionModal()
 *    - renderExcludeModal()
 *    - renderAdjustModal()
 *    - Each function = 80-120 lines
 *    - Much easier than one 300-line render
 * 
 * 5. SEARCH FUNCTIONALITY:
 *    - Filter grid based on search input
 *    - DOM manipulation to show/hide buttons
 *    - Simple and effective
 * 
 * 6. CONSISTENT STRUCTURE:
 *    - Header (title + close button)
 *    - Current detection info
 *    - Instructions/content
 *    - Status
 *    - Action buttons
 *    - Same pattern for all modals
 * 
 * 7. HANDLER SIMPLICITY:
 *    - Component just calls handlers
 *    - No complex logic here
 *    - Parent handles state updates
 *    - Clean separation
 * 
 * 8. NO COORDINATE SCALING:
 *    - These are UI panels
 *    - No canvas math needed
 *    - Much simpler than DetectionCanvas
 * 
 * ========================================================================
 * WHY THIS MATTERS
 * ========================================================================
 * 
 * Before: Three modal types mixed with everything else
 * After: One component handles all validation UI
 * 
 * When correction modal breaks:
 * - Before: Search 6,000 lines for modal code
 * - After: Open ValidationPanel.jsx, check renderCorrectionModal()
 * 
 * When adding new modal:
 * - Before: Find where modals are, add JSX, hope nothing breaks
 * - After: Add renderNewModal() function, call it in main render
 * 
 * ========================================================================
 */

// Export
window.ValidationPanelComponent = ValidationPanel;
