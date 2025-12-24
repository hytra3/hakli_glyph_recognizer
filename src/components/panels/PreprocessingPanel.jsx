// ============================================
// PREPROCESSING PANEL
// Controls for image preprocessing before recognition
// ============================================

const PreprocessingPanel = ({
    preprocessing,
    onUpdate,
    onReset,
    onApply,
    isCollapsed,
    onToggleCollapse,
    showPreview,
    onTogglePreview,
    originalMat,
    preprocessedMat,
    preprocessCanvasRef,
    originalCanvasRef,
    isProcessing = false
}) => {
    const { useState, useEffect, useCallback } = React;
    
    // Eraser state for preprocessing canvas
    const [eraserMode, setEraserMode] = useState(false);
    const [brushSize, setBrushSize] = useState(15);
    const [isErasing, setIsErasing] = useState(false);
    const [eraserHistory, setEraserHistory] = useState([]);
    
    /**
     * Handle slider change
     */
    const handleSliderChange = (key, value) => {
        onUpdate(key, value);
    };
    
    /**
     * Handle checkbox change
     */
    const handleCheckboxChange = (key, checked) => {
        onUpdate(key, checked);
    };
    
    /**
     * Handle select change
     */
    const handleSelectChange = (key, value) => {
        onUpdate(key, value);
    };
    
    /**
     * Eraser mouse down handler
     */
    const handleEraserMouseDown = useCallback((e) => {
        if (!eraserMode || !preprocessCanvasRef?.current) return;
        
        setIsErasing(true);
        
        // Save current state for undo
        const canvas = preprocessCanvasRef.current;
        const ctx = canvas.getContext('2d');
        setEraserHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        
        // Start erasing
        drawEraser(e);
    }, [eraserMode, preprocessCanvasRef]);
    
    /**
     * Eraser mouse move handler
     */
    const handleEraserMouseMove = useCallback((e) => {
        if (!isErasing || !eraserMode) return;
        drawEraser(e);
    }, [isErasing, eraserMode]);
    
    /**
     * Eraser mouse up handler
     */
    const handleEraserMouseUp = useCallback(() => {
        setIsErasing(false);
    }, []);
    
    /**
     * Draw eraser on canvas
     */
    const drawEraser = useCallback((e) => {
        if (!preprocessCanvasRef?.current) return;
        
        const canvas = preprocessCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Erase by drawing white
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fill();
    }, [preprocessCanvasRef, brushSize]);
    
    /**
     * Undo last eraser stroke
     */
    const undoLastStroke = useCallback(() => {
        if (eraserHistory.length === 0 || !preprocessCanvasRef?.current) return;
        
        const canvas = preprocessCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const lastState = eraserHistory[eraserHistory.length - 1];
        
        ctx.putImageData(lastState, 0, 0);
        setEraserHistory(prev => prev.slice(0, -1));
    }, [eraserHistory, preprocessCanvasRef]);
    
    /**
     * Clear all eraser strokes
     */
    const clearAllEraser = useCallback(() => {
        if (!preprocessCanvasRef?.current || !originalMat) return;
        
        // Reset to original preprocessed image
        const canvas = preprocessCanvasRef.current;
        cv.imshow(canvas, preprocessedMat);
        setEraserHistory([]);
    }, [preprocessCanvasRef, originalMat, preprocessedMat]);
    
    /**
     * Export preprocessing settings
     */
    const exportSettings = () => {
        const settings = {
            ...preprocessing,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `preprocessing-settings-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    /**
     * Import preprocessing settings
     */
    const importSettings = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const settings = JSON.parse(event.target.result);
                    Object.entries(settings).forEach(([key, value]) => {
                        if (key !== 'exportDate') {
                            onUpdate(key, value);
                        }
                    });
                    alert('✅ Settings imported successfully');
                } catch (err) {
                    alert('❌ Failed to import settings: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };
    
    // Cursor style for eraser mode
    const canvasCursor = eraserMode 
        ? `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize*2}" height="${brushSize*2}" viewBox="0 0 ${brushSize*2} ${brushSize*2}"><circle cx="${brushSize}" cy="${brushSize}" r="${brushSize-1}" fill="none" stroke="black" stroke-width="2"/></svg>') ${brushSize} ${brushSize}, crosshair`
        : 'default';

    return (
        <CollapsibleSection
            title="🔧 Preprocessing"
            isCollapsed={isCollapsed}
            onToggle={onToggleCollapse}
            badge={preprocessing.useAdaptiveThreshold ? 'Active' : null}
            actions={
                <div className="flex gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePreview();
                        }}
                        className={`px-2 py-1 text-xs rounded ${showPreview ? 'bg-ancient-purple text-white' : 'bg-gray-200'}`}
                        title="Toggle preview"
                    >
                        👁️
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Preview toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Show Preview</span>
                    <button
                        onClick={onTogglePreview}
                        className={`w-12 h-6 rounded-full transition-colors ${
                            showPreview ? 'bg-ancient-purple' : 'bg-gray-300'
                        }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                            showPreview ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
                
                {/* Rotation */}
                <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>🔄 Rotation</span>
                        <span className="text-gray-500">{preprocessing.rotation}°</span>
                    </label>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        value={preprocessing.rotation}
                        onChange={(e) => handleSliderChange('rotation', parseInt(e.target.value))}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>-180°</span>
                        <span>0°</span>
                        <span>180°</span>
                    </div>
                </div>
                
                {/* Gaussian Blur */}
                <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>🌫️ Gaussian Blur</span>
                        <span className="text-gray-500">{preprocessing.gaussianBlur}</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="15"
                        step="2"
                        value={preprocessing.gaussianBlur}
                        onChange={(e) => handleSliderChange('gaussianBlur', parseInt(e.target.value))}
                        className="w-full"
                    />
                </div>
                
                {/* Adaptive Threshold */}
                <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">📊 Adaptive Threshold</span>
                        <button
                            onClick={() => handleCheckboxChange('useAdaptiveThreshold', !preprocessing.useAdaptiveThreshold)}
                            className={`w-12 h-6 rounded-full transition-colors ${
                                preprocessing.useAdaptiveThreshold ? 'bg-ancient-purple' : 'bg-gray-300'
                            }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                preprocessing.useAdaptiveThreshold ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                    
                    {preprocessing.useAdaptiveThreshold && (
                        <>
                            <div>
                                <label className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Block Size</span>
                                    <span>{preprocessing.blockSize}</span>
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="51"
                                    step="2"
                                    value={preprocessing.blockSize}
                                    onChange={(e) => handleSliderChange('blockSize', parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            
                            <div>
                                <label className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Constant Offset</span>
                                    <span>{preprocessing.constantOffset}</span>
                                </label>
                                <input
                                    type="range"
                                    min="-20"
                                    max="20"
                                    value={preprocessing.constantOffset}
                                    onChange={(e) => handleSliderChange('constantOffset', parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </>
                    )}
                </div>
                
                {/* Morphology Operations */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔲 Morphology Operation
                    </label>
                    <select
                        value={preprocessing.morphologyOperation}
                        onChange={(e) => handleSelectChange('morphologyOperation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent"
                    >
                        <option value="none">None</option>
                        <option value="erode">Erode (thin lines)</option>
                        <option value="dilate">Dilate (thicken lines)</option>
                        <option value="open">Open (remove noise)</option>
                        <option value="close">Close (fill gaps)</option>
                    </select>
                </div>
                
                {/* Invert Colors */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">🔄 Invert Colors</span>
                    <button
                        onClick={() => handleCheckboxChange('invertColors', !preprocessing.invertColors)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                            preprocessing.invertColors ? 'bg-ancient-purple' : 'bg-gray-300'
                        }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                            preprocessing.invertColors ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
                
                {/* Eraser Controls */}
                {showPreview && preprocessCanvasRef?.current && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">🧹 Eraser Tool</span>
                            <button
                                onClick={() => setEraserMode(!eraserMode)}
                                className={`px-3 py-1 rounded text-sm ${
                                    eraserMode 
                                        ? 'bg-yellow-500 text-white' 
                                        : 'bg-gray-200 text-gray-700'
                                }`}
                            >
                                {eraserMode ? 'Erasing...' : 'Enable'}
                            </button>
                        </div>
                        
                        {eraserMode && (
                            <>
                                <div>
                                    <label className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                        <span>Brush Size</span>
                                        <span>{brushSize}px</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={undoLastStroke}
                                        disabled={eraserHistory.length === 0}
                                        className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded text-sm"
                                    >
                                        ↩️ Undo
                                    </button>
                                    <button
                                        onClick={clearAllEraser}
                                        className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                                    >
                                        🔄 Reset
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onReset}
                        className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                    >
                        🔄 Reset
                    </button>
                    <button
                        onClick={onApply}
                        disabled={isProcessing}
                        className="flex-1 px-3 py-2 bg-ancient-purple hover:bg-[#4a3d5a] text-white rounded-lg transition-colors text-sm disabled:bg-gray-300"
                    >
                        {isProcessing ? '⏳ Processing...' : '✨ Apply'}
                    </button>
                </div>
                
                {/* Import/Export */}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={importSettings}
                        className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs"
                    >
                        📥 Import
                    </button>
                    <button
                        onClick={exportSettings}
                        className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs"
                    >
                        📤 Export
                    </button>
                </div>
            </div>
        </CollapsibleSection>
    );
};

// Make globally available
window.PreprocessingPanel = PreprocessingPanel;
