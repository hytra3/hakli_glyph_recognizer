/**
 * Header Component
 * 
 * Top bar of the application with title, version info, and main controls
 * 
 * Props:
 * @param {Object} chartStatus - Chart loading status and controls
 * @param {Function} onRecognize - Handler for main recognize button
 * @param {boolean} canRecognize - Whether recognition can be triggered
 * @param {Object} hkiProps - HKI library controls
 */

function Header({ 
    chartStatus, 
    onRecognize, 
    canRecognize,
    hkiProps 
}) {
    const { 
        status, 
        isCollapsed, 
        setIsCollapsed, 
        glyphCount, 
        imageCount,
        onViewChart,
        onReload 
    } = chartStatus;
    
    const { currentId, onShowLibrary } = hkiProps;

    return (
        <div className="mb-8">
            {/* Title Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            📜 Hakli Glyph Recognizer
                        </h1>
                        <p className="text-sm text-gray-500">
                            Based on Ahmad Al-Jallad (2025), <em>The Decipherment of the Dhofari Script</em>
                        </p>
                        <p className="text-sm text-gray-500">
                            beta v251126 ©marty heaton
                        </p>
                    </div>
                    
                    {/* Main Actions */}
                    <div className="flex gap-2">
                        {currentId && (
                            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                {currentId}
                            </div>
                        )}
                        <button
                            onClick={onShowLibrary}
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                        >
                            📚 Library
                        </button>
                        <button
                            onClick={onRecognize}
                            disabled={!canRecognize}
                            className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            🔍 Recognize Glyphs
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart Status Panel */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700 transition-colors"
                    >
                        <span>{isCollapsed ? '▶' : '▼'}</span>
                        <h3>Equivalence Chart Status</h3>
                    </button>
                    {status === 'loaded' && (
                        <span className="text-sm text-green-600 font-medium">
                            ✅ {glyphCount} glyphs loaded
                        </span>
                    )}
                </div>
                
                {!isCollapsed && (
                    <div>
                        <div className="mt-2">
                            {status === 'loading' && (
                                <div className="text-blue-600">
                                    <span className="animate-pulse">Loading glyphs...</span>
                                </div>
                            )}
                            {status === 'loaded' && (
                                <span className="text-green-600">
                                    ✅ Loaded {glyphCount} glyphs, {imageCount} images
                                </span>
                            )}
                            {status === 'error' && (
                                <span className="text-red-600">
                                    ❌ Error loading chart
                                </span>
                            )}
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                            <button 
                                onClick={onViewChart}
                                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors" 
                                disabled={status !== 'loaded'}
                            >
                                📊 View Chart
                            </button>
                            <button 
                                onClick={onReload}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" 
                                disabled={status === 'loading'}
                            >
                                🔄 Reload Chart
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Export for use in main app
window.HeaderComponent = Header;
