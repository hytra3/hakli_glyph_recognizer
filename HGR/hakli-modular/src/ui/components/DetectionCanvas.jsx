/**
 * DetectionCanvas Component
 * 
 * This is THE MOST COMPLEX component in your app. It handles:
 * - Image display with rotation
 * - Detection overlays (boxes, polygons, labels)
 * - Interactive modes (manual detection, trim, exclude, adjust corners)
 * - Template training mode
 * - Drawing rectangles
 * - Coordinate scaling (natural dimensions vs display dimensions)
 * - Multiple z-index layers
 * 
 * WHY THIS CAUSED JSX ERRORS:
 * 
 * 1. DEEPLY NESTED CONDITIONALS:
 *    - {condition1 && (() => { return <div>{condition2 && <nested />}</div> })()}
 *    - One missing } breaks everything
 *    - Hard to track opening/closing brackets
 * 
 * 2. IIFE (Immediately Invoked Function Expressions):
 *    - (() => { ... })() pattern everywhere
 *    - Necessary for complex calculations before rendering
 *    - But adds more brackets to track
 * 
 * 3. MAP FUNCTIONS WITH CONDITIONALS:
 *    - recognitionResults.map((det, idx) => { if (x) { return <A/> } return <B/> })
 *    - Multiple return points
 *    - React.Fragment wrappers
 *    - SVG + div combinations
 * 
 * 4. COORDINATE CALCULATIONS:
 *    - scaleX = imageRect.width / naturalWidth
 *    - Every coordinate multiplied by scale
 *    - Repeated everywhere
 * 
 * Props:
 * @param {string} image - Base64 image data
 * @param {string} displayImage - Rotated/processed image
 * @param {number} imageRotation - Rotation angle
 * @param {Object} rotatedImageDimensions - Width/height after rotation
 * @param {Array} recognitionResults - Detected glyphs
 * @param {Array} isolatedGlyphs - Pre-detected regions
 * @param {Object} interactionState - All interaction modes and handlers
 * @param {Object} displayOptions - What to show (boundaries, labels, etc)
 * @param {Object} refs - Image and container refs
 */

function DetectionCanvas({
    image,
    displayImage,
    imageRotation,
    rotatedImageDimensions,
    recognitionResults,
    isolatedGlyphs,
    interactionState,
    displayOptions,
    refs
}) {
    /**
     * UNPACKING PROPS
     * 
     * This component has LOTS of props because it does a lot.
     * We group them into logical objects to keep it manageable.
     */
    
    const { imageRef, imageContainerRef } = refs;
    
    const {
        // Modes
        manualDetectionMode,
        trimMode,
        excludeMode,
        adjustMode,
        templateTrainingMode,
        
        // Drawing state
        isDrawing,
        drawStart,
        drawCurrent,
        excludeRegions,
        
        // Selection
        selectedRegions,
        selectedIsolatedRegion,
        selectedForTemplate,
        
        // Adjustment
        draggingCorner,
        
        // Indicators
        mergeIndicator,
        
        // Handlers
        onImageMouseDown,
        onImageMouseMove,
        onImageMouseUp,
        onCornerMouseDown,
        onRegionClick,
        onTemplateSelect,
        onSaveTemplate
    } = interactionState;
    
    const {
        showRegionBoundaries,
        showArabicLabels,
        viewMode,
        readingDirection
    } = displayOptions;
    
    /**
     * HELPER: Calculate Coordinate Scaling
     * 
     * This is THE KEY to understanding canvas overlays!
     * 
     * Problem: Image has two sizes:
     * - Natural size: Actual pixel dimensions (e.g., 3000x2000)
     * - Display size: How big it appears on screen (e.g., 800x533)
     * 
     * All detection coordinates are in NATURAL dimensions.
     * But overlays need DISPLAY dimensions.
     * 
     * Solution: Calculate scale factors
     */
    const getScaleFactors = () => {
        if (!imageRef.current) return { scaleX: 1, scaleY: 1 };
        
        const imageRect = imageRef.current.getBoundingClientRect();
        const refWidth = rotatedImageDimensions ? rotatedImageDimensions.width : imageRef.current.naturalWidth;
        const refHeight = rotatedImageDimensions ? rotatedImageDimensions.height : imageRef.current.naturalHeight;
        
        return {
            scaleX: imageRect.width / refWidth,
            scaleY: imageRect.height / refHeight
        };
    };
    
    /**
     * HELPER: Get Reading Order Index
     * Used in reading mode to show numbers
     */
    const getReadingOrderIndex = (detectionIndex) => {
        // This would come from parent, but for now return placeholder
        return detectionIndex + 1;
    };
    
    /**
     * HELPER: Get Box Color Based on Confidence
     */
    const getBoxColor = (confidence) => {
        if (confidence >= 0.9) return '#10b981'; // green
        if (confidence >= 0.7) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };
    
    /**
     * RENDER SECTION 1: Main Image
     */
    const renderMainImage = () => (
        <img
            ref={imageRef}
            src={displayImage || image}
            alt="Uploaded inscription"
            className="max-w-full h-auto border border-gray-300 rounded"
            onMouseDown={onImageMouseDown}
            style={{ 
                cursor: manualDetectionMode ? 'crosshair' : 'default',
                userSelect: 'none',
                pointerEvents: 'auto',
                transform: displayImage ? 'none' : `rotate(${imageRotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease'
            }}
            draggable={false}
        />
    );
    
    /**
     * RENDER SECTION 2: Trim Mode Indicator
     * 
     * Shows which detection is being trimmed
     */
    const renderTrimIndicator = () => {
        if (trimMode === null || !recognitionResults[trimMode]) return null;
        
        const { scaleX, scaleY } = getScaleFactors();
        const det = recognitionResults[trimMode];
        
        return (
            <div
                className="absolute border-4 border-dashed border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
                style={{
                    left: det.position.x * scaleX + 'px',
                    top: det.position.y * scaleY + 'px',
                    width: det.position.width * scaleX + 'px',
                    height: det.position.height * scaleY + 'px',
                    zIndex: 20
                }}
            >
                <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    ✂️ Draw smaller box to trim
                </div>
            </div>
        );
    };
    
    /**
     * RENDER SECTION 3: Exclude Mode Indicator
     * 
     * Shows which detection is being edited for exclusions
     * AND all the exclusion regions drawn by user
     */
    const renderExcludeIndicator = () => {
        if (excludeMode === null || !recognitionResults[excludeMode]) return null;
        
        const { scaleX, scaleY } = getScaleFactors();
        const det = recognitionResults[excludeMode];
        
        return (
            <>
                {/* Highlight the detection being edited */}
                <div
                    className="absolute border-4 border-dashed border-purple-600 pointer-events-none"
                    style={{
                        left: det.position.x * scaleX + 'px',
                        top: det.position.y * scaleY + 'px',
                        width: det.position.width * scaleX + 'px',
                        height: det.position.height * scaleY + 'px',
                        zIndex: 20,
                        backgroundColor: 'rgba(147, 51, 234, 0.1)'
                    }}
                />
                
                {/* Show exclusion regions */}
                {excludeRegions.map((exRegion, idx) => (
                    <div
                        key={`exclude-${idx}`}
                        className="absolute border-4 border-red-600 bg-red-500 pointer-events-none"
                        style={{
                            left: exRegion.x * scaleX + 'px',
                            top: exRegion.y * scaleY + 'px',
                            width: exRegion.width * scaleX + 'px',
                            height: exRegion.height * scaleY + 'px',
                            zIndex: 21,
                            opacity: 0.5
                        }}
                    />
                ))}
            </>
        );
    };
    
    /**
     * RENDER SECTION 4: Isolated Glyph Regions
     * 
     * Shows pre-detected regions before template matching
     */
    const renderIsolatedRegions = () => {
        if (!showRegionBoundaries || isolatedGlyphs.length === 0) return null;
        
        const { scaleX, scaleY } = getScaleFactors();
        
        return isolatedGlyphs.map((region, index) => {
            const isSelected = selectedIsolatedRegion === index;
            
            return (
                <div
                    key={`isolated-${index}`}
                    className="absolute border-2 border-teal-500 pointer-events-auto cursor-pointer"
                    style={{
                        left: region.x * scaleX + 'px',
                        top: region.y * scaleY + 'px',
                        width: region.width * scaleX + 'px',
                        height: region.height * scaleY + 'px',
                        backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                        zIndex: 5
                    }}
                    onClick={() => onRegionClick(index)}
                >
                    <div className="absolute -top-6 left-0 bg-teal-500 text-white text-xs px-2 py-1 rounded">
                        Region {index + 1}
                    </div>
                </div>
            );
        });
    };
    
    /**
     * RENDER SECTION 5: Detection Overlays
     * 
     * This is THE MOST COMPLEX PART - where most JSX errors come from!
     * 
     * For each detection, we render:
     * - Either a polygon (if corners adjusted) OR a rectangle
     * - Label
     * - Reading order number
     * - Corner handles (if adjusting)
     * - Template training menu (if in that mode)
     * 
     * Why so complex?
     * - Two different rendering paths (polygon vs rectangle)
     * - Multiple overlays on same detection
     * - z-index management
     * - Event handlers
     * - Conditional styling based on modes
     */
    const renderDetectionOverlays = () => {
        if (!recognitionResults || recognitionResults.length === 0) return null;
        
        const { scaleX, scaleY } = getScaleFactors();
        
        return recognitionResults.map((detection, index) => {
            // Check if this detection is currently being adjusted
            const isAdjusting = adjustMode === index;
            const isNotAdjusting = adjustMode !== null && adjustMode !== index;
            const isSelected = selectedRegions.has(index);
            
            const boxColor = getBoxColor(detection.confidence);
            
            // Get corners (either adjusted or original rectangle)
            const corners = detection.corners || {
                tl: { x: detection.position.x, y: detection.position.y },
                tr: { x: detection.position.x + detection.position.width, y: detection.position.y },
                bl: { x: detection.position.x, y: detection.position.y + detection.position.height },
                br: { x: detection.position.x + detection.position.width, y: detection.position.y + detection.position.height }
            };
            
            // Check if we should render as polygon (corners have been adjusted)
            const hasAdjustedCorners = detection.corners && (detection.isAdjusted || isAdjusting);
            
            /**
             * PATH A: Render as Polygon (Adjusted Corners)
             * 
             * Uses SVG <polygon> for quadrilateral shapes
             */
            if (hasAdjustedCorners) {
                const points = `${corners.tl.x * scaleX},${corners.tl.y * scaleY} ${corners.tr.x * scaleX},${corners.tr.y * scaleY} ${corners.br.x * scaleX},${corners.br.y * scaleY} ${corners.bl.x * scaleX},${corners.bl.y * scaleY}`;
                
                return (
                    <React.Fragment key={`detection-${index}`}>
                        {/* SVG Polygon */}
                        <svg
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: (templateTrainingMode && selectedForTemplate !== null && selectedForTemplate !== index) ? 'none' : (templateTrainingMode ? 'auto' : 'none'),
                                zIndex: isAdjusting ? 100 : 10,
                                opacity: (isNotAdjusting || (templateTrainingMode && selectedForTemplate !== null && selectedForTemplate !== index)) ? 0.2 : 1
                            }}
                        >
                            <polygon
                                points={points}
                                fill={isAdjusting ? "rgba(251, 146, 60, 0.15)" : `${boxColor}40`}
                                stroke={templateTrainingMode && selectedForTemplate === index ? "#a855f7" : (isAdjusting ? "#fb923c" : boxColor)}
                                strokeWidth={templateTrainingMode && selectedForTemplate === index ? "4" : (isAdjusting ? "3" : "2")}
                                className={templateTrainingMode ? 'cursor-pointer' : ''}
                                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                                onClick={(e) => {
                                    if (templateTrainingMode) {
                                        e.stopPropagation();
                                        onTemplateSelect(selectedForTemplate === index ? null : index);
                                    }
                                }}
                            />
                        </svg>
                        
                        {/* Label */}
                        <div
                            className="absolute px-2 py-1 text-xs font-bold text-white rounded"
                            style={{
                                left: corners.tl.x * scaleX + 'px',
                                top: (corners.tl.y * scaleY - 24) + 'px',
                                backgroundColor: (isAdjusting ? '#fb923c' : boxColor) + 'e6',
                                zIndex: isAdjusting ? 101 : 11,
                                pointerEvents: 'none'
                            }}
                        >
                            {showArabicLabels ? (detection.glyph.arabic || detection.glyph.name) : detection.glyph.name}
                            {detection.corrected && <span className="ml-1">✏️</span>}
                        </div>
                        
                        {/* Reading Order Badge */}
                        {viewMode === 'reading' && (
                            <div 
                                className="absolute w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 text-xs font-bold flex items-center justify-center"
                                style={{
                                    left: corners.tl.x * scaleX + 'px',
                                    top: corners.tl.y * scaleY + 'px',
                                    zIndex: isAdjusting ? 101 : 11
                                }}
                            >
                                {getReadingOrderIndex(index)}
                            </div>
                        )}
                        
                        {/* Corner Handles - only when adjusting */}
                        {isAdjusting && (
                            <>
                                {['tl', 'tr', 'bl', 'br'].map((corner) => (
                                    <div
                                        key={corner}
                                        onMouseDown={(e) => onCornerMouseDown(e, corner)}
                                        className="absolute w-4 h-4 bg-orange-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                        style={{
                                            left: corners[corner].x * scaleX - 8 + 'px',
                                            top: corners[corner].y * scaleY - 8 + 'px',
                                            zIndex: 102
                                        }}
                                    />
                                ))}
                            </>
                        )}
                        
                        {/* Template Training Menu */}
                        {templateTrainingMode && selectedForTemplate === index && (
                            <div
                                className="absolute bg-white rounded-lg shadow-xl border-2 border-purple-400 p-3"
                                style={{ 
                                    minWidth: '200px',
                                    left: corners.tl.x * scaleX + 'px',
                                    top: (corners.br.y * scaleY + 8) + 'px',
                                    zIndex: 1000
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="font-semibold text-sm mb-2 text-purple-900">
                                    Save "{detection.glyph.name}" as:
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => onSaveTemplate(index, 'primary')} className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                                        🎯 Primary Template
                                    </button>
                                    <button onClick={() => onSaveTemplate(index, 'variant')} className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                                        ⭐ Variant
                                    </button>
                                    <button onClick={() => onSaveTemplate(index, 'example')} className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600">
                                        📚 Example
                                    </button>
                                    <button onClick={() => onTemplateSelect(null)} className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400">
                                        ✕ Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            }
            
            /**
             * PATH B: Render as Rectangle (Normal Box)
             * 
             * Uses regular div for rectangular shapes
             */
            return (
                <div
                    key={`detection-${index}`}
                    className={`absolute border-2 ${isSelected ? 'ring-2 ring-blue-400' : ''} ${isAdjusting ? 'ring-4 ring-orange-400' : ''} ${templateTrainingMode ? 'cursor-pointer hover:ring-4 hover:ring-purple-400' : ''}`}
                    style={{
                        left: detection.position.x * scaleX + 'px',
                        top: detection.position.y * scaleY + 'px',
                        width: detection.position.width * scaleX + 'px',
                        height: detection.position.height * scaleY + 'px',
                        borderColor: isAdjusting ? '#fb923c' : boxColor,
                        opacity: (isNotAdjusting || (templateTrainingMode && selectedForTemplate !== null && selectedForTemplate !== index)) ? 0.2 : 1,
                        pointerEvents: (isNotAdjusting && !templateTrainingMode) || (templateTrainingMode && selectedForTemplate !== null && selectedForTemplate !== index) ? 'none' : 'auto',
                        zIndex: isAdjusting ? 100 : 10
                    }}
                    onClick={() => {
                        if (templateTrainingMode) {
                            onTemplateSelect(selectedForTemplate === index ? null : index);
                        }
                    }}
                >
                    {/* Label */}
                    <div 
                        className="absolute -top-6 left-0 px-2 py-1 text-xs font-bold text-white rounded"
                        style={{ backgroundColor: (isAdjusting ? '#fb923c' : boxColor) + 'e6' }}
                    >
                        {showArabicLabels ? (detection.glyph.arabic || detection.glyph.name) : detection.glyph.name}
                        {detection.corrected && <span className="ml-1">✏️</span>}
                    </div>
                    
                    {/* Reading Order Badge */}
                    {viewMode === 'reading' && (
                        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 text-xs font-bold flex items-center justify-center">
                            {getReadingOrderIndex(index)}
                        </div>
                    )}
                    
                    {/* Template Menu (same as polygon path) */}
                    {templateTrainingMode && selectedForTemplate === index && (
                        <div
                            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border-2 border-purple-400 p-3"
                            style={{ minWidth: '200px', zIndex: 1000 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="font-semibold text-sm mb-2 text-purple-900">
                                Save "{detection.glyph.name}" as:
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => onSaveTemplate(index, 'primary')} className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                                    🎯 Primary Template
                                </button>
                                <button onClick={() => onSaveTemplate(index, 'variant')} className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                                    ⭐ Variant
                                </button>
                                <button onClick={() => onSaveTemplate(index, 'example')} className="px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600">
                                    📚 Example
                                </button>
                                <button onClick={() => onTemplateSelect(null)} className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400">
                                    ✕ Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };
    
    /**
     * RENDER SECTION 6: Drawing Rectangle (Manual Detection/Exclude)
     * 
     * Shows the rectangle being drawn in real-time
     */
    const renderDrawingRectangle = () => {
        if (!isDrawing || !drawStart || !drawCurrent || !imageRef.current) return null;
        
        const { scaleX, scaleY } = getScaleFactors();
        
        // Use red for exclude mode, orange for manual mode
        const boxStyle = excludeMode !== null ? {
            border: '3px dashed #dc2626',
            background: 'rgba(220, 38, 38, 0.2)'
        } : {
            border: '3px dashed #f59e0b',
            background: 'rgba(245, 158, 11, 0.2)'
        };
        
        return (
            <div style={{
                position: 'absolute',
                left: Math.min(drawStart.x, drawCurrent.x) * scaleX + 'px',
                top: Math.min(drawStart.y, drawCurrent.y) * scaleY + 'px',
                width: Math.abs(drawCurrent.x - drawStart.x) * scaleX + 'px',
                height: Math.abs(drawCurrent.y - drawStart.y) * scaleY + 'px',
                ...boxStyle,
                pointerEvents: 'none',
                zIndex: 25
            }} />
        );
    };
    
    /**
     * RENDER SECTION 7: Merge Indicator
     * 
     * Shows the merged bounding box when multiple detections are selected
     */
    const renderMergeIndicator = () => {
        if (!mergeIndicator || !imageRef.current) return null;
        
        const { scaleX, scaleY } = getScaleFactors();
        
        return (
            <div 
                className="absolute border-4 border-dashed border-green-500 bg-green-200 bg-opacity-30 pointer-events-none"
                style={{
                    left: mergeIndicator.x * scaleX + 'px',
                    top: mergeIndicator.y * scaleY + 'px',
                    width: mergeIndicator.width * scaleX + 'px',
                    height: mergeIndicator.height * scaleY + 'px',
                    zIndex: 30
                }}
            />
        );
    };
    
    /**
     * MAIN RENDER
     * 
     * Notice how we broke complex rendering into separate functions.
     * This makes it much easier to understand and debug.
     */
    if (!image) return null;
    
    return (
        <div 
            className="canvas-container relative" 
            ref={imageContainerRef}
            onMouseMove={onImageMouseMove}
            onMouseUp={onImageMouseUp}
            onMouseLeave={onImageMouseUp}
        >
            {renderMainImage()}
            {renderTrimIndicator()}
            {renderExcludeIndicator()}
            {renderIsolatedRegions()}
            {renderDetectionOverlays()}
            {renderDrawingRectangle()}
            {renderMergeIndicator()}
        </div>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED ABOUT CANVAS COMPLEXITY
 * ========================================================================
 * 
 * 1. COORDINATE SCALING IS EVERYWHERE:
 *    - Every overlay needs scaleX and scaleY
 *    - Natural dimensions vs Display dimensions
 *    - This calculation repeated hundreds of times
 * 
 * 2. MULTIPLE RENDERING PATHS:
 *    - Polygon path for adjusted corners
 *    - Rectangle path for normal boxes
 *    - Two completely different JSX structures
 *    - Easy to break one while editing the other
 * 
 * 3. DEEPLY NESTED CONDITIONALS:
 *    - if (hasAdjusted) { return <Polygon>...</Polygon> }
 *    - else { return <Rectangle>...</Rectangle> }
 *    - Inside map function
 *    - Inside React.Fragment
 *    - Lots of brackets to track!
 * 
 * 4. z-INDEX MANAGEMENT:
 *    - Different layers: isolated (5), detections (10), adjusting (100), menu (1000)
 *    - If z-index wrong, clicks don't work
 *    - Hard to debug without understanding the full stack
 * 
 * 5. IIFE PATTERN (() => {...})():
 *    - Used when you need to calculate before rendering
 *    - Adds extra brackets and complexity
 *    - But necessary for conditional rendering with calculations
 * 
 * 6. EVENT HANDLER COMPLEXITY:
 *    - onMouseDown, onMouseMove, onMouseUp all need coordination
 *    - Different behavior in different modes
 *    - stopPropagation to prevent bubbling
 * 
 * 7. WHY JSX ERRORS HAPPEN HERE:
 *    - One missing } in renderDetectionOverlays breaks everything
 *    - In monolithic file: error says "line 4356" - which section?
 *    - In modular file: error says "DetectionCanvas.jsx line 234" - exact function!
 * 
 * 8. BREAKING INTO RENDER FUNCTIONS HELPS:
 *    - renderMainImage() - simple, easy to debug
 *    - renderDetectionOverlays() - complex but isolated
 *    - Each function = 20-50 lines, not 500 lines
 *    - Error in one function doesn't break others
 * 
 * 9. PROPS ORGANIZATION:
 *    - Could pass 30 individual props
 *    - Instead: interactionState object, displayOptions object
 *    - Keeps component signature manageable
 * 
 * 10. TESTING STRATEGY:
 *     - Test each render function independently
 *     - Comment out sections to isolate issues
 *     - Much easier in modular component!
 * 
 * ========================================================================
 * THIS IS WHY PHASE 2 MATTERS!
 * ========================================================================
 * 
 * Before: 500 lines of canvas code mixed with 2,000 other lines
 * After: 500 lines of canvas code in ONE file
 * 
 * When canvas breaks:
 * - Before: Search 6,000 lines, unclear where
 * - After: Open DetectionCanvas.jsx, debug one render function
 * 
 * When adding features:
 * - Before: Afraid to touch anything, might break unrelated code
 * - After: Modify DetectionCanvas.jsx, know nothing else affected
 * 
 * This component IS complex - but now it's ISOLATED complexity!
 */

// Export
window.DetectionCanvasComponent = DetectionCanvas;
