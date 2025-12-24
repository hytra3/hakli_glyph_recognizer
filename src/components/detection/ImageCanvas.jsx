// ============================================
// IMAGE CANVAS COMPONENT
// Main canvas for displaying inscription image with detection overlays
// ============================================

const ImageCanvas = ({
    image,
    displayImage,
    rotation = 0,
    detections = [],
    validations = {},
    selectedRegions = new Set(),
    isolatedGlyphs = [],
    showRegionBoundaries = false,
    showArabicLabels = false,
    viewMode = 'detection',
    readingOrder = [],
    manualDetectionMode = false,
    trimMode = null,
    excludeMode = null,
    adjustMode = null,
    mergeIndicator = null,
    onDetectionClick,
    onDetectionDoubleClick,
    onCanvasClick,
    onManualSelection,
    onTrimApply,
    onAdjustApply,
    imageRef,
    containerRef,
    className = ''
}) => {
    const { useState, useCallback, useEffect, useRef } = React;
    
    // Drawing state for manual selection
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState(null);
    const [drawCurrent, setDrawCurrent] = useState(null);
    
    // Trim mode state
    const [trimBounds, setTrimBounds] = useState(null);
    
    // Adjust mode state
    const [adjustCorners, setAdjustCorners] = useState(null);
    const [draggingCorner, setDraggingCorner] = useState(null);
    
    // Scale tracking
    const [scale, setScale] = useState({ x: 1, y: 1 });
    
    // Update scale when image loads or container resizes
    useEffect(() => {
        const updateScale = () => {
            if (imageRef?.current && containerRef?.current) {
                const img = imageRef.current;
                const container = containerRef.current;
                const rect = container.getBoundingClientRect();
                
                setScale({
                    x: img.naturalWidth / rect.width,
                    y: img.naturalHeight / rect.height
                });
            }
        };
        
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [imageRef, containerRef, image]);
    
    /**
     * Get coordinates relative to the image
     */
    const getImageCoordinates = useCallback((event) => {
        if (!containerRef?.current) return null;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) * scale.x;
        const y = (event.clientY - rect.top) * scale.y;
        
        return { x, y };
    }, [containerRef, scale]);
    
    /**
     * Handle mouse down for manual detection
     */
    const handleMouseDown = useCallback((event) => {
        if (!manualDetectionMode && trimMode === null && adjustMode === null) return;
        
        const coords = getImageCoordinates(event);
        if (!coords) return;
        
        if (manualDetectionMode) {
            setIsDrawing(true);
            setDrawStart(coords);
            setDrawCurrent(coords);
        } else if (trimMode !== null) {
            // Initialize trim bounds from detection
            const detection = detections[trimMode];
            if (detection) {
                setTrimBounds({
                    x: detection.position.x,
                    y: detection.position.y,
                    width: detection.position.width,
                    height: detection.position.height
                });
            }
        }
    }, [manualDetectionMode, trimMode, adjustMode, getImageCoordinates, detections]);
    
    /**
     * Handle mouse move for drawing
     */
    const handleMouseMove = useCallback((event) => {
        const coords = getImageCoordinates(event);
        if (!coords) return;
        
        if (isDrawing && manualDetectionMode) {
            setDrawCurrent(coords);
        } else if (draggingCorner && adjustMode !== null) {
            // Update corner position
            setAdjustCorners(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [draggingCorner]: coords
                };
            });
        }
    }, [isDrawing, manualDetectionMode, draggingCorner, adjustMode, getImageCoordinates]);
    
    /**
     * Handle mouse up
     */
    const handleMouseUp = useCallback(() => {
        if (isDrawing && manualDetectionMode && drawStart && drawCurrent) {
            // Calculate selection rectangle
            const x = Math.min(drawStart.x, drawCurrent.x);
            const y = Math.min(drawStart.y, drawCurrent.y);
            const width = Math.abs(drawCurrent.x - drawStart.x);
            const height = Math.abs(drawCurrent.y - drawStart.y);
            
            // Only create if selection is large enough
            if (width > 10 && height > 10) {
                onManualSelection && onManualSelection({ x, y, width, height });
            }
        }
        
        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
        setDraggingCorner(null);
    }, [isDrawing, manualDetectionMode, drawStart, drawCurrent, onManualSelection]);
    
    /**
     * Handle canvas click
     */
    const handleCanvasClick = useCallback((event) => {
        // Don't trigger if clicking on a detection box
        if (event.target !== containerRef?.current && event.target !== imageRef?.current) {
            return;
        }
        
        onCanvasClick && onCanvasClick(event);
    }, [containerRef, imageRef, onCanvasClick]);
    
    /**
     * Initialize adjust mode corners
     */
    useEffect(() => {
        if (adjustMode !== null && detections[adjustMode]) {
            const pos = detections[adjustMode].position;
            setAdjustCorners({
                tl: { x: pos.x, y: pos.y },
                tr: { x: pos.x + pos.width, y: pos.y },
                bl: { x: pos.x, y: pos.y + pos.height },
                br: { x: pos.x + pos.width, y: pos.y + pos.height }
            });
        } else {
            setAdjustCorners(null);
        }
    }, [adjustMode, detections]);
    
    /**
     * Calculate selection rectangle for display
     */
    const selectionRect = isDrawing && drawStart && drawCurrent ? {
        left: Math.min(drawStart.x, drawCurrent.x) / scale.x,
        top: Math.min(drawStart.y, drawCurrent.y) / scale.y,
        width: Math.abs(drawCurrent.x - drawStart.x) / scale.x,
        height: Math.abs(drawCurrent.y - drawStart.y) / scale.y
    } : null;
    
    return (
        <div
            ref={containerRef}
            className={`canvas-container relative ${className}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            style={{
                cursor: manualDetectionMode ? 'crosshair' : 
                        adjustMode !== null ? 'move' : 'default'
            }}
        >
            {/* Main Image */}
            <img
                ref={imageRef}
                src={displayImage || image}
                alt="Inscription"
                className="max-w-full h-auto"
                style={{
                    transform: rotation ? `rotate(${rotation}deg)` : undefined,
                    transformOrigin: 'center center'
                }}
                onLoad={() => {
                    // Recalculate scale on image load
                    if (imageRef?.current && containerRef?.current) {
                        const img = imageRef.current;
                        const rect = containerRef.current.getBoundingClientRect();
                        setScale({
                            x: img.naturalWidth / rect.width,
                            y: img.naturalHeight / rect.height
                        });
                    }
                }}
            />
            
            {/* Region Boundaries (isolated glyphs) */}
            {showRegionBoundaries && isolatedGlyphs.map((region, idx) => (
                <div
                    key={`region-${idx}`}
                    className="region-boundary"
                    style={{
                        left: region.x / scale.x,
                        top: region.y / scale.y,
                        width: region.width / scale.x,
                        height: region.height / scale.y
                    }}
                />
            ))}
            
            {/* Detection Boxes */}
            {detections.map((detection, index) => {
                // Skip if in certain modes
                if (trimMode === index || excludeMode === index || adjustMode === index) {
                    return null;
                }
                
                const readingIndex = viewMode === 'reading' 
                    ? readingOrder.indexOf(index)
                    : null;
                
                return (
                    <DetectionBox
                        key={`detection-${index}`}
                        detection={detection}
                        index={index}
                        isSelected={selectedRegions.has(index)}
                        isValidated={!!validations[index]}
                        validationResult={validations[index]?.isCorrect}
                        isUncertain={detection.confidence < 0.6}
                        showLabel={true}
                        showArabicLabel={showArabicLabels}
                        viewMode={viewMode}
                        readingOrderIndex={readingIndex >= 0 ? readingIndex : null}
                        scale={scale}
                        onClick={onDetectionClick}
                        onDoubleClick={onDetectionDoubleClick}
                    />
                );
            })}
            
            {/* Manual Selection Rectangle */}
            {selectionRect && (
                <div
                    className="manual-selection-box"
                    style={{
                        left: selectionRect.left,
                        top: selectionRect.top,
                        width: selectionRect.width,
                        height: selectionRect.height
                    }}
                />
            )}
            
            {/* Merge Indicator */}
            {mergeIndicator && (
                <div
                    className="merge-indicator"
                    style={{
                        left: mergeIndicator.x / scale.x,
                        top: mergeIndicator.y / scale.y,
                        width: mergeIndicator.width / scale.x,
                        height: mergeIndicator.height / scale.y
                    }}
                />
            )}
            
            {/* Trim Mode Overlay */}
            {trimMode !== null && trimBounds && (
                <div
                    className="absolute border-4 border-dashed border-yellow-500 bg-yellow-200/20"
                    style={{
                        left: trimBounds.x / scale.x,
                        top: trimBounds.y / scale.y,
                        width: trimBounds.width / scale.x,
                        height: trimBounds.height / scale.y
                    }}
                >
                    {/* Trim handles */}
                    {['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].map(handle => (
                        <div
                            key={handle}
                            className="absolute w-3 h-3 bg-yellow-500 border border-white rounded-full cursor-pointer"
                            style={{
                                top: handle.includes('n') ? -6 : handle.includes('s') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                                left: handle.includes('w') ? -6 : handle.includes('e') ? 'calc(100% - 6px)' : 'calc(50% - 6px)'
                            }}
                        />
                    ))}
                </div>
            )}
            
            {/* Adjust Mode Corners */}
            {adjustMode !== null && adjustCorners && (
                <>
                    {/* Lines connecting corners */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        style={{ width: '100%', height: '100%' }}
                    >
                        <polygon
                            points={`
                                ${adjustCorners.tl.x / scale.x},${adjustCorners.tl.y / scale.y}
                                ${adjustCorners.tr.x / scale.x},${adjustCorners.tr.y / scale.y}
                                ${adjustCorners.br.x / scale.x},${adjustCorners.br.y / scale.y}
                                ${adjustCorners.bl.x / scale.x},${adjustCorners.bl.y / scale.y}
                            `}
                            fill="rgba(139, 92, 246, 0.2)"
                            stroke="#8b5cf6"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                        />
                    </svg>
                    
                    {/* Corner handles */}
                    {Object.entries(adjustCorners).map(([corner, pos]) => (
                        <div
                            key={corner}
                            className={`absolute w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-move transform -translate-x-1/2 -translate-y-1/2 ${
                                draggingCorner === corner ? 'scale-125' : ''
                            }`}
                            style={{
                                left: pos.x / scale.x,
                                top: pos.y / scale.y
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingCorner(corner);
                            }}
                        />
                    ))}
                </>
            )}
            
            {/* Manual Detection Mode Indicator */}
            {manualDetectionMode && (
                <div className="absolute top-2 left-2 px-3 py-1 bg-ochre text-white rounded-full text-sm font-medium shadow">
                    ✏️ Draw to select region
                </div>
            )}
        </div>
    );
};

// Make globally available
window.ImageCanvas = ImageCanvas;
