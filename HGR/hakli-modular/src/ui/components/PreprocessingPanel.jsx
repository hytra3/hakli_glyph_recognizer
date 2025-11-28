/**
 * PreprocessingPanel Component
 * 
 * Complex panel for image preprocessing with multiple controls:
 * - Rotation
 * - Gaussian Blur
 * - Adaptive Threshold
 * - Color Inversion
 * - Morphological Operations
 * - Manual Eraser Tool
 * - Preview Canvases
 * 
 * This is a LARGE component (~300 lines) but still manageable because:
 * - It's focused on ONE concern: preprocessing
 * - All related controls are together
 * - Clear sections with comments
 * 
 * Props:
 * @param {boolean} visible - Whether panel should be shown
 * @param {Object} preprocessing - All preprocessing settings
 * @param {Function} onUpdateSetting - Handler for setting changes
 * @param {Function} onReset - Handler to reset all settings
 * @param {Function} onExport - Handler to export settings
 * @param {Function} onApply - Handler to apply adjustments to main image
 * @param {boolean} adjustmentsApplied - Whether adjustments are currently applied
 * @param {boolean} isCollapsed - Collapse state
 * @param {Function} onToggleCollapse - Toggle collapse handler
 * @param {Object} previewState - Preview canvases state
 * @param {Object} eraserState - Eraser mode state and handlers
 * @param {Object} refs - Canvas refs (original, preprocessed, eraser)
 */

function PreprocessingPanel({
    visible,
    preprocessing,
    onUpdateSetting,
    onReset,
    onExport,
    onApply,
    adjustmentsApplied,
    isCollapsed,
    onToggleCollapse,
    previewState,
    eraserState,
    refs
}) {
    // Unpack preview state
    const { showPreview, setShowPreview } = previewState;
    
    // Unpack eraser state
    const {
        eraserMode,
        brushSize,
        setBrushSize,
        onToggleEraser,
        onUndoStroke,
        onClearEraser,
        eraserHandlers,
        canUndo
    } = eraserState;
    
    // Unpack refs
    const { originalCanvasRef, preprocessCanvasRef, eraserCanvasRef } = refs;
    
    /**
     * WHY THIS COMPONENT IS LARGE BUT STILL GOOD:
     * 
     * 1. SINGLE RESPONSIBILITY: All about preprocessing
     * 2. CLEAR SECTIONS: Each control is well-organized
     * 3. ISOLATED: If preprocessing breaks, check this file
     * 4. STILL BETTER than being in 6,000-line monolith
     */
    
    // Don't render if not visible
    if (!visible) return null;
    
    return (
        <div className="mb-6 border-2 border-gray-300 rounded-lg bg-gray-50">
            {/* Header with collapse toggle */}
            <div 
                className="p-4 bg-gray-200 cursor-pointer flex justify-between items-center rounded-t-lg hover:bg-gray-300"
                onClick={onToggleCollapse}
            >
                <h3 className="font-semibold text-gray-900 text-lg">
                    {isCollapsed ? '▶' : '▼'} 🔧 Image Preprocessing
                    {isCollapsed && preprocessing.useAdaptiveThreshold && (
                        <span className="text-sm text-blue-600 ml-2">(Active)</span>
                    )}
                </h3>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={onReset}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={onExport}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                    >
                        Export
                    </button>
                </div>
            </div>
            
            {!isCollapsed && (
                <div className="p-5">
                    {/* === SECTION 1: Preview Canvases === */}
                    {showPreview && (
                        <div className="mb-5 border border-gray-300 rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-sm">Image Comparison</span>
                                <button 
                                    onClick={() => setShowPreview(false)}
                                    className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                                >
                                    Hide Preview
                                </button>
                            </div>
                            <div className="flex gap-5 justify-center flex-wrap">
                                <div className="flex-1 min-w-[300px] max-w-[500px]">
                                    <div className="font-semibold text-sm text-gray-600 mb-2">Original</div>
                                    <canvas ref={originalCanvasRef} className="max-w-full border-2 border-gray-300 rounded bg-gray-100" />
                                </div>
                                <div className="flex-1 min-w-[300px] max-w-[500px]">
                                    <div className="font-semibold text-sm text-gray-600 mb-2">Preprocessed</div>
                                    <canvas ref={preprocessCanvasRef} className="max-w-full border-2 border-gray-300 rounded bg-gray-100" />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!showPreview && (
                        <button 
                            onClick={() => setShowPreview(true)}
                            className="mb-5 px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Show Preview
                        </button>
                    )}
                    
                    {/* === SECTION 2: Rotation Control === */}
                    <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                        <label className="block font-semibold mb-2">
                            Rotation: {preprocessing.rotation}°
                        </label>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            value={preprocessing.rotation}
                            onChange={(e) => onUpdateSetting('rotation', parseFloat(e.target.value))}
                            className="w-full mb-2"
                        />
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onUpdateSetting('rotation', preprocessing.rotation - 90)} 
                                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                            >
                                -90°
                            </button>
                            <button 
                                onClick={() => onUpdateSetting('rotation', 0)} 
                                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                            >
                                0°
                            </button>
                            <button 
                                onClick={() => onUpdateSetting('rotation', preprocessing.rotation + 90)} 
                                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                            >
                                +90°
                            </button>
                        </div>
                    </div>
                    
                    {/* === SECTION 3: Gaussian Blur === */}
                    <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                        <label className="block font-semibold mb-2">
                            <input
                                type="checkbox"
                                checked={preprocessing.gaussianBlur > 0}
                                onChange={(e) => onUpdateSetting('gaussianBlur', e.target.checked ? 5 : 0)}
                                className="mr-2"
                            />
                            Gaussian Blur (Noise Reduction)
                        </label>
                        {preprocessing.gaussianBlur > 0 && (
                            <select
                                value={preprocessing.gaussianBlur}
                                onChange={(e) => onUpdateSetting('gaussianBlur', parseInt(e.target.value))}
                                className="w-full p-2 text-sm border border-gray-300 rounded mt-2"
                            >
                                <option value="3">Light (3×3)</option>
                                <option value="5">Medium (5×5)</option>
                                <option value="7">Strong (7×7)</option>
                                <option value="9">Very Strong (9×9)</option>
                            </select>
                        )}
                    </div>
                    
                    {/* === SECTION 4: Adaptive Threshold === */}
                    <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                        <label className="block font-semibold mb-2">
                            <input
                                type="checkbox"
                                checked={preprocessing.useAdaptiveThreshold}
                                onChange={(e) => onUpdateSetting('useAdaptiveThreshold', e.target.checked)}
                                className="mr-2"
                            />
                            Adaptive Threshold (Convert to Black & White)
                        </label>
                        
                        {preprocessing.useAdaptiveThreshold && (
                            <>
                                <label className="block font-semibold text-sm text-gray-700 mt-3 mb-1">
                                    Block Size: {preprocessing.blockSize}
                                    <span className="font-normal text-xs text-gray-500 ml-2">(larger = smoother)</span>
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="99"
                                    step="2"
                                    value={preprocessing.blockSize}
                                    onChange={(e) => onUpdateSetting('blockSize', parseInt(e.target.value))}
                                    className="w-full mb-3"
                                />

                                <label className="block font-semibold text-sm text-gray-700 mb-1">
                                    Constant Offset: {preprocessing.constantOffset}
                                    <span className="font-normal text-xs text-gray-500 ml-2">(higher = more white)</span>
                                </label>
                                <input
                                    type="range"
                                    min="-20"
                                    max="20"
                                    value={preprocessing.constantOffset}
                                    onChange={(e) => onUpdateSetting('constantOffset', parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </>
                        )}
                    </div>
                    
                    {/* === SECTION 5: Invert Colors === */}
                    <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                        <label className="block font-semibold">
                            <input
                                type="checkbox"
                                checked={preprocessing.invertColors}
                                onChange={(e) => onUpdateSetting('invertColors', e.target.checked)}
                                className="mr-2"
                            />
                            Invert Colors
                            <span className="font-normal text-xs text-gray-500 ml-2">(for light inscriptions on dark stone)</span>
                        </label>
                    </div>
                    
                    {/* === SECTION 6: Morphology === */}
                    <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                        <label className="block font-semibold mb-2">
                            Morphological Operations
                            <span className="font-normal text-xs text-gray-500 ml-2">(clean up noise/gaps)</span>
                        </label>
                        <select
                            value={preprocessing.morphologyOperation}
                            onChange={(e) => onUpdateSetting('morphologyOperation', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                        >
                            <option value="none">None</option>
                            <option value="close">Close (fill small gaps)</option>
                            <option value="open">Open (remove small noise)</option>
                            <option value="both">Both (clean thoroughly)</option>
                        </select>
                    </div>
                    
                    {/* === SECTION 7: Manual Eraser === */}
                    <div className="mb-5 p-4 bg-white rounded-lg border border-gray-200">
                        <label className="block font-semibold mb-3">
                            🖌️ Manual Eraser
                            <span className="font-normal text-xs text-gray-500 ml-2">(remove noise manually)</span>
                        </label>
                        
                        {!eraserMode ? (
                            <button
                                onClick={onToggleEraser}
                                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold transition-colors"
                            >
                                🖌️ Enable Eraser Mode
                            </button>
                        ) : (
                            <div>
                                {/* Eraser Canvas */}
                                <div className="mb-3 border-2 border-purple-500 rounded-lg overflow-hidden bg-gray-100" style={{cursor: 'crosshair'}}>
                                    <canvas
                                        ref={eraserCanvasRef}
                                        onMouseDown={eraserHandlers.onMouseDown}
                                        onMouseMove={eraserHandlers.onMouseMove}
                                        onMouseUp={eraserHandlers.onMouseUp}
                                        onMouseLeave={eraserHandlers.onMouseUp}
                                        className="max-w-full"
                                        style={{cursor: 'crosshair'}}
                                    />
                                </div>
                                
                                {/* Brush Size Control */}
                                <div className="mb-3">
                                    <label className="block text-sm font-semibold mb-2">
                                        Brush Size: {brushSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Fine (5px)</span>
                                        <span>Large (50px)</span>
                                    </div>
                                </div>
                                
                                {/* Eraser Controls */}
                                <div className="flex gap-2 mb-2">
                                    <button
                                        onClick={onUndoStroke}
                                        disabled={!canUndo}
                                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                                    >
                                        ↶ Undo
                                    </button>
                                    <button
                                        onClick={onClearEraser}
                                        className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-semibold"
                                    >
                                        🔄 Reset
                                    </button>
                                </div>
                                <button
                                    onClick={onToggleEraser}
                                    className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-semibold"
                                >
                                    ✓ Done Erasing
                                </button>
                                
                                <p className="mt-2 text-xs text-gray-600">
                                    Click and drag to erase noise. Use Undo to remove last stroke.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* === SECTION 8: Active Settings Summary === */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <strong className="block mb-2">Active Settings:</strong>
                        <ul className="list-disc ml-5 text-sm">
                            {preprocessing.rotation !== 0 && <li>Rotation: {preprocessing.rotation}°</li>}
                            {preprocessing.gaussianBlur > 0 && <li>Gaussian Blur: {preprocessing.gaussianBlur}×{preprocessing.gaussianBlur}</li>}
                            {preprocessing.useAdaptiveThreshold && <li>Adaptive Threshold (Block: {preprocessing.blockSize}, Offset: {preprocessing.constantOffset})</li>}
                            {preprocessing.invertColors && <li>Colors Inverted</li>}
                            {preprocessing.morphologyOperation !== 'none' && <li>Morphology: {preprocessing.morphologyOperation}</li>}
                            {preprocessing.rotation === 0 && 
                             !preprocessing.useAdaptiveThreshold && 
                             preprocessing.gaussianBlur === 0 && 
                             preprocessing.morphologyOperation === 'none' && 
                             !preprocessing.invertColors && (
                                <li className="italic text-gray-600">No preprocessing active</li>
                            )}
                        </ul>
                    </div>
                    
                    {/* === SECTION 9: Apply Button === */}
                    <div className="mt-4 p-4 bg-white border-2 rounded-lg" style={{borderColor: adjustmentsApplied ? '#10b981' : '#f59e0b'}}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {adjustmentsApplied ? (
                                    <>
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="font-semibold text-green-700">✓ Adjustments Applied</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                                        <span className="font-semibold text-amber-700">Adjustments Ready</span>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={onApply}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors"
                            >
                                {adjustmentsApplied ? '🔄 Reapply Adjustments' : '✨ Apply Adjustments'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-600">
                            {adjustmentsApplied 
                                ? 'The preprocessed image is ready for recognition.'
                                : 'Click "Apply Adjustments" to update the main image before recognition.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * WHAT YOU LEARNED FROM THIS BIG COMPONENT:
 * 
 * 1. ORGANIZATION IS KEY:
 *    - Clear sections with comments (=== SECTION N: Name ===)
 *    - Each control gets its own div
 *    - Related logic grouped together
 * 
 * 2. COMPLEX STATE GROUPED INTO OBJECTS:
 *    - preprocessing: All settings in one object
 *    - previewState: Preview-related state
 *    - eraserState: Eraser-related state
 *    - This keeps props manageable
 * 
 * 3. STILL BETTER THAN MONOLITH:
 *    - Yes, 300 lines is big
 *    - But it's ALL about preprocessing
 *    - If preprocessing breaks? Check this file
 *    - Not scattered across 6,000 lines
 * 
 * 4. COULD BE SPLIT FURTHER (Optional):
 *    - Could extract EraserTool as sub-component
 *    - Could extract RotationControl as sub-component
 *    - But for now, this is already MUCH better
 * 
 * 5. PROPS MANAGEMENT:
 *    - Complex components need careful prop design
 *    - Group related props into objects
 *    - Use destructuring to unpack them
 *    - Keeps component signature clean
 * 
 * 6. CONDITIONAL RENDERING:
 *    - if (!visible) return null;
 *    - Early return pattern
 *    - Avoids deep nesting
 */

// Export for use in main app
window.PreprocessingPanelComponent = PreprocessingPanel;
