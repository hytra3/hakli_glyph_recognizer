// ============================================
// CHART VIEWER MODAL
// Modal for browsing and searching the glyph equivalence chart
// ============================================

const ChartViewerModal = ({
    isOpen,
    onClose,
    chartData,
    loadedImages,
    thumbnails,
    onSelectGlyph,
    onEditGlyph,
    onAddGlyph,
    onExportChart
}) => {
    const { useState, useMemo } = React;
    
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('id'); // 'id' | 'name' | 'transliteration'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [selectedGlyph, setSelectedGlyph] = useState(null);
    
    if (!isOpen) return null;
    
    // Filter and sort glyphs
    const filteredGlyphs = useMemo(() => {
        if (!chartData?.glyphs) return [];
        
        let glyphs = [...chartData.glyphs];
        
        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            glyphs = glyphs.filter(g => 
                g.name.toLowerCase().includes(query) ||
                g.transliteration?.toLowerCase().includes(query) ||
                g.arabic?.includes(searchQuery) ||
                g.description?.toLowerCase().includes(query)
            );
        }
        
        // Sort
        glyphs.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'transliteration':
                    return (a.transliteration || '').localeCompare(b.transliteration || '');
                default:
                    return a.id - b.id;
            }
        });
        
        return glyphs;
    }, [chartData, searchQuery, sortBy]);
    
    // Statistics
    const stats = useMemo(() => {
        if (!chartData?.glyphs) return null;
        
        return {
            total: chartData.glyphs.length,
            withVariants: chartData.glyphs.filter(g => g.images?.variants?.length > 0).length,
            withExamples: chartData.glyphs.filter(g => g.images?.examples?.length > 0).length
        };
    }, [chartData]);
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">📜 Glyph Chart</h3>
                        {stats && (
                            <p className="text-sm text-gray-500 mt-1">
                                {stats.total} glyphs • {stats.withVariants} with variants • {stats.withExamples} with examples
                            </p>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                    >
                        &times;
                    </button>
                </div>
                
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="🔍 Search glyphs..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent"
                        />
                    </div>
                    
                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple"
                    >
                        <option value="id">Sort by ID</option>
                        <option value="name">Sort by Name</option>
                        <option value="transliteration">Sort by Transliteration</option>
                    </select>
                    
                    {/* View Mode */}
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-ancient-purple text-white' : 'bg-white text-gray-700'}`}
                        >
                            ▦ Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 ${viewMode === 'list' ? 'bg-ancient-purple text-white' : 'bg-white text-gray-700'}`}
                        >
                            ☰ List
                        </button>
                    </div>
                    
                    {/* Actions */}
                    <button
                        onClick={onAddGlyph}
                        className="px-4 py-2 bg-patina text-white rounded-lg hover:bg-[#5a7d6e] transition-colors"
                    >
                        ➕ Add Glyph
                    </button>
                    
                    <button
                        onClick={onExportChart}
                        className="px-4 py-2 bg-ochre text-white rounded-lg hover:bg-[#a07a5a] transition-colors"
                    >
                        📤 Export
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredGlyphs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <span className="text-4xl mb-2">🔍</span>
                            <p>No glyphs found</p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2 text-ancient-purple hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'grid' ? (
                        // Grid View
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                            {filteredGlyphs.map((glyph) => (
                                <div
                                    key={glyph.id}
                                    onClick={() => setSelectedGlyph(selectedGlyph?.id === glyph.id ? null : glyph)}
                                    className={`group relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                                        selectedGlyph?.id === glyph.id 
                                            ? 'border-ancient-purple ring-2 ring-ancient-purple/30' 
                                            : 'border-gray-200 hover:border-ancient-purple'
                                    }`}
                                >
                                    {/* Image */}
                                    {thumbnails[glyph.id] ? (
                                        <img 
                                            src={thumbnails[glyph.id]} 
                                            alt={glyph.name}
                                            className="w-full h-full object-contain p-1"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <span className="text-2xl">?</span>
                                        </div>
                                    )}
                                    
                                    {/* Overlay with info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1">
                                        <div className="text-white text-xs truncate font-medium">
                                            {glyph.name}
                                        </div>
                                        <div className="text-white/70 text-xs">
                                            {glyph.transliteration}
                                        </div>
                                    </div>
                                    
                                    {/* ID badge */}
                                    <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                                        {glyph.id}
                                    </div>
                                    
                                    {/* Variant indicator */}
                                    {glyph.images?.variants?.length > 0 && (
                                        <div className="absolute top-1 left-1 bg-ochre text-white text-xs px-1 rounded">
                                            +{glyph.images.variants.length}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // List View
                        <div className="space-y-2">
                            {filteredGlyphs.map((glyph) => (
                                <div
                                    key={glyph.id}
                                    onClick={() => setSelectedGlyph(selectedGlyph?.id === glyph.id ? null : glyph)}
                                    className={`flex items-center gap-4 p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow ${
                                        selectedGlyph?.id === glyph.id 
                                            ? 'border-ancient-purple bg-purple-50' 
                                            : 'border-gray-200 hover:border-ancient-purple'
                                    }`}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 border border-gray-200 rounded bg-gray-50 flex-shrink-0">
                                        {thumbnails[glyph.id] ? (
                                            <img 
                                                src={thumbnails[glyph.id]} 
                                                alt={glyph.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">?</div>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">{glyph.name}</span>
                                            <span className="text-xs bg-gray-200 px-1 rounded">#{glyph.id}</span>
                                        </div>
                                        <div className="text-lg text-ancient-purple">
                                            {glyph.arabic || glyph.transliteration}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {glyph.transliteration}
                                            {glyph.description && ` • ${glyph.description}`}
                                        </div>
                                    </div>
                                    
                                    {/* Variant count */}
                                    <div className="text-right text-sm text-gray-500">
                                        {glyph.images?.variants?.length > 0 && (
                                            <div>{glyph.images.variants.length} variants</div>
                                        )}
                                        {glyph.images?.examples?.length > 0 && (
                                            <div>{glyph.images.examples.length} examples</div>
                                        )}
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditGlyph && onEditGlyph(glyph);
                                            }}
                                            className="p-2 text-gray-500 hover:text-ancient-purple hover:bg-gray-100 rounded"
                                            title="Edit glyph"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectGlyph && onSelectGlyph(glyph);
                                            }}
                                            className="p-2 text-gray-500 hover:text-patina hover:bg-gray-100 rounded"
                                            title="Use this glyph"
                                        >
                                            ✓
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Detail Panel (when glyph selected) */}
                {selectedGlyph && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex gap-6">
                            {/* Large preview */}
                            <div className="w-32 h-32 border border-gray-300 rounded-lg bg-white flex-shrink-0">
                                {thumbnails[selectedGlyph.id] ? (
                                    <img 
                                        src={thumbnails[selectedGlyph.id]} 
                                        alt={selectedGlyph.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">?</div>
                                )}
                            </div>
                            
                            {/* Details */}
                            <div className="flex-1">
                                <h4 className="text-xl font-bold text-gray-900">{selectedGlyph.name}</h4>
                                <div className="text-4xl text-ancient-purple my-2">
                                    {selectedGlyph.arabic || selectedGlyph.transliteration}
                                </div>
                                <div className="text-gray-600">
                                    <span className="font-medium">Transliteration:</span> {selectedGlyph.transliteration}
                                </div>
                                {selectedGlyph.description && (
                                    <div className="text-gray-500 text-sm mt-1">
                                        {selectedGlyph.description}
                                    </div>
                                )}
                            </div>
                            
                            {/* Variants */}
                            {selectedGlyph.images?.variants?.length > 0 && (
                                <div>
                                    <div className="text-sm font-medium text-gray-700 mb-2">Variants</div>
                                    <div className="flex gap-2">
                                        {selectedGlyph.images.variants.map((_, idx) => {
                                            const variantKey = `${selectedGlyph.id}_variant_${idx}`;
                                            return (
                                                <div key={idx} className="w-12 h-12 border border-gray-200 rounded bg-white">
                                                    {thumbnails[variantKey] ? (
                                                        <img 
                                                            src={thumbnails[variantKey]} 
                                                            alt={`Variant ${idx + 1}`}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => onSelectGlyph && onSelectGlyph(selectedGlyph)}
                                    className="px-4 py-2 bg-patina text-white rounded-lg hover:bg-[#5a7d6e] transition-colors"
                                >
                                    ✓ Select
                                </button>
                                <button
                                    onClick={() => onEditGlyph && onEditGlyph(selectedGlyph)}
                                    className="px-4 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] transition-colors"
                                >
                                    ✏️ Edit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Showing {filteredGlyphs.length} of {chartData?.glyphs?.length || 0} glyphs
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make globally available
window.ChartViewerModal = ChartViewerModal;
