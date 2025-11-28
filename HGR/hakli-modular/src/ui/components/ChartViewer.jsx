/**
 * ChartViewer Component
 * 
 * FINAL COMPONENT! 🎉
 * 
 * Full-screen modal displaying the glyph equivalence chart:
 * - Shows all glyphs in the chart
 * - For each glyph:
 *   - Arabic character and name
 *   - Primary template image
 *   - Variant images
 *   - Example images
 * - Indicates which images are loaded
 * - Scrollable list with sticky header/footer
 * 
 * Props:
 * @param {boolean} visible - Whether modal is shown
 * @param {Object} equivalenceChart - Glyph chart data
 * @param {Object} loadedImages - Map of loaded image elements
 * @param {Function} onClose - Close handler
 */

function ChartViewer({
    visible,
    equivalenceChart,
    loadedImages,
    onClose
}) {
    /**
     * Don't render if not visible or no chart
     */
    if (!visible || !equivalenceChart) return null;
    
    /**
     * HELPER: Get image counts
     */
    const getImageCounts = (glyph) => {
        const primaryLoaded = loadedImages[glyph.id];
        const variantCount = glyph.images.variants?.length || 0;
        const exampleCount = glyph.images.examples?.length || 0;
        
        const variantsLoaded = glyph.images.variants?.filter((_, idx) => 
            loadedImages[`${glyph.id}_variant_${idx}`]
        ).length || 0;
        
        const examplesLoaded = glyph.images.examples?.filter((_, idx) => 
            loadedImages[`${glyph.id}_example_${idx}`]
        ).length || 0;
        
        return {
            primaryLoaded,
            variantCount,
            exampleCount,
            variantsLoaded,
            examplesLoaded
        };
    };
    
    /**
     * RENDER: Image with placeholder
     */
    const renderImage = (imageData, alt, placeholder) => {
        if (imageData) {
            return (
                <div className="relative group">
                    <img 
                        src={imageData.src} 
                        alt={alt}
                        className="h-16 border-2 border-gray-300 rounded hover:border-purple-500 transition-colors bg-white p-1"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded"></div>
                </div>
            );
        } else {
            return (
                <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                    {placeholder}
                </div>
            );
        }
    };
    
    /**
     * RENDER: Single Glyph Card
     */
    const renderGlyphCard = (glyph) => {
        const counts = getImageCounts(glyph);
        
        return (
            <div 
                key={glyph.id} 
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
                <div className="flex items-start gap-4">
                    {/* Glyph Info */}
                    <div className="flex-shrink-0 text-center">
                        <div className="text-4xl font-bold text-purple-600 mb-1">
                            {glyph.arabic || '?'}
                        </div>
                        <div className="text-sm font-mono text-gray-600">
                            {glyph.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            ID: {glyph.id}
                        </div>
                    </div>
                    
                    {/* Images Grid */}
                    <div className="flex-1">
                        {/* Primary Image */}
                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-gray-700">Primary</h4>
                                {counts.primaryLoaded ? (
                                    <span className="text-xs text-green-600">✅ Loaded</span>
                                ) : (
                                    <span className="text-xs text-red-600">❌ Not loaded</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {renderImage(counts.primaryLoaded, `Primary: ${glyph.name}`, 'No image')}
                            </div>
                        </div>
                        
                        {/* Variants */}
                        {counts.variantCount > 0 && (
                            <div className="mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Variants ({counts.variantsLoaded}/{counts.variantCount})
                                    </h4>
                                    {counts.variantsLoaded === counts.variantCount ? (
                                        <span className="text-xs text-green-600">✅ All loaded</span>
                                    ) : (
                                        <span className="text-xs text-orange-600">
                                            ⚠️ {counts.variantCount - counts.variantsLoaded} missing
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {glyph.images.variants.map((_, idx) => {
                                        const variantImg = loadedImages[`${glyph.id}_variant_${idx}`];
                                        return (
                                            <div key={idx}>
                                                {renderImage(
                                                    variantImg,
                                                    `Variant ${idx + 1}: ${glyph.name}`,
                                                    `V${idx + 1}`
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Examples */}
                        {counts.exampleCount > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Examples ({counts.examplesLoaded}/{counts.exampleCount})
                                    </h4>
                                    {counts.examplesLoaded === counts.exampleCount ? (
                                        <span className="text-xs text-green-600">✅ All loaded</span>
                                    ) : (
                                        <span className="text-xs text-orange-600">
                                            ⚠️ {counts.exampleCount - counts.examplesLoaded} missing
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {glyph.images.examples.map((_, idx) => {
                                        const exampleImg = loadedImages[`${glyph.id}_example_${idx}`];
                                        return (
                                            <div key={idx}>
                                                {renderImage(
                                                    exampleImg,
                                                    `Example ${idx + 1}: ${glyph.name}`,
                                                    `E${idx + 1}`
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    /**
     * MAIN RENDER
     */
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sticky Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-2xl font-bold text-gray-900">
                        📊 Glyph Equivalence Chart
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                        title="Close"
                    >
                        &times;
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 pt-4 flex-1">
                    {/* Stats */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-700">
                            <strong>{equivalenceChart.glyphs.length}</strong> glyphs loaded with{' '}
                            <strong>{Object.keys(loadedImages).length}</strong> total images
                        </div>
                    </div>
                    
                    {/* Glyph Cards */}
                    <div className="space-y-6">
                        {equivalenceChart.glyphs.map(glyph => renderGlyphCard(glyph))}
                    </div>
                </div>
                
                {/* Sticky Footer */}
                <div className="p-6 pt-4 border-t border-gray-200 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
                    >
                        Close Chart Viewer
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM CHARTVIEWER - THE FINAL COMPONENT! 🎉
 * ========================================================================
 * 
 * 1. SCROLLABLE MODAL LAYOUT:
 *    - Sticky header (flex-shrink-0)
 *    - Scrollable content (flex-1, overflow-y-auto)
 *    - Sticky footer (flex-shrink-0)
 *    - Professional and functional
 * 
 * 2. HELPER FUNCTIONS FOR CALCULATIONS:
 *    - getImageCounts() consolidates logic
 *    - Returns object with all counts
 *    - Keeps render function clean
 *    - Reusable pattern
 * 
 * 3. RENDER FUNCTIONS FOR REPEATED ELEMENTS:
 *    - renderImage() handles image vs placeholder
 *    - renderGlyphCard() for each glyph
 *    - DRY principle
 *    - Easy to maintain
 * 
 * 4. CONDITIONAL DISPLAY:
 *    - Show counts only if variants/examples exist
 *    - {variantCount > 0 && <VariantSection />}
 *    - Clean conditional rendering
 * 
 * 5. STATUS INDICATORS:
 *    - ✅ All loaded (green)
 *    - ⚠️ Missing (orange)
 *    - ❌ Not loaded (red)
 *    - Visual feedback
 * 
 * 6. IMAGE GRID PATTERN:
 *    - flex flex-wrap gap-2
 *    - Images flow naturally
 *    - Responsive automatically
 *    - Clean layout
 * 
 * 7. HOVER EFFECTS:
 *    - group and group-hover classes
 *    - Darkens image on hover
 *    - Smooth transitions
 *    - Professional polish
 * 
 * 8. SIMPLE PROPS:
 *    - visible, equivalenceChart, loadedImages, onClose
 *    - That's it!
 *    - Component just displays data
 *    - Parent handles everything else
 * 
 * ========================================================================
 * FINAL COMPONENT COMPLETE!
 * ========================================================================
 * 
 * This is the 11th and FINAL component!
 * 
 * All 11 components follow the same patterns:
 * - Clear props contract
 * - Separation of concerns (UI vs logic)
 * - Helper functions for clarity
 * - Render functions for organization
 * - Conditional rendering
 * - Responsive design
 * - No complex state management
 * - Parent owns the logic
 * 
 * YOU'VE COMPLETED PHASE 2 EXTRACTION! 🎊🎉🚀
 * 
 * ========================================================================
 */

// Export
window.ChartViewerComponent = ChartViewer;
