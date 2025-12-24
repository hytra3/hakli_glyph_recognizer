// ============================================
// GLYPH EDITOR MODAL
// Modal for adding/editing glyphs in the equivalence chart
// ============================================

const GlyphEditorModal = ({ 
    mode, // 'add' | 'edit'
    glyph = null,
    equivalenceChart,
    setEquivalenceChart,
    loadedGlyphImages,
    setLoadedGlyphImages,
    glyphThumbnails,
    setGlyphThumbnails,
    onClose 
}) => {
    const { useState, useRef } = React;
    
    const [formData, setFormData] = useState({
        name: glyph?.name || '',
        arabic: glyph?.arabic || '',
        transliteration: glyph?.transliteration || '',
        description: glyph?.description || ''
    });
    const [primaryImage, setPrimaryImage] = useState(null);
    const [primaryImagePreview, setPrimaryImagePreview] = useState(glyph?.images?.primary || null);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }
        
        if (mode === 'add' && !primaryImage && !primaryImagePreview) {
            newErrors.primaryImage = 'Primary template image is required for new glyphs';
        }
        
        // Check for duplicate names (case-insensitive)
        if (equivalenceChart?.glyphs) {
            const existingGlyph = equivalenceChart.glyphs.find(
                g => g.name.toLowerCase() === formData.name.trim().toLowerCase() && 
                     (mode === 'add' || g.id !== glyph?.id)
            );
            if (existingGlyph) {
                newErrors.name = 'A glyph with this name already exists';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            setErrors(prev => ({ ...prev, primaryImage: 'Please select an image file' }));
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, primaryImage: 'Image must be smaller than 5MB' }));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            setPrimaryImage(dataUrl);
            setPrimaryImagePreview(dataUrl);
            setErrors(prev => {
                const { primaryImage, ...rest } = prev;
                return rest;
            });
        };
        reader.onerror = () => {
            setErrors(prev => ({ ...prev, primaryImage: 'Failed to read image file' }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        
        setIsSaving(true);
        
        try {
            const updatedChart = { ...equivalenceChart };
            
            if (mode === 'add') {
                // Find next available ID
                const maxId = Math.max(...updatedChart.glyphs.map(g => g.id), 0);
                const newGlyph = {
                    id: maxId + 1,
                    name: formData.name.trim(),
                    arabic: formData.arabic.trim() || 'x',
                    transliteration: formData.transliteration.trim() || formData.name.trim(),
                    description: formData.description.trim() || 'description',
                    images: {
                        primary: primaryImage,
                        variants: [],
                        examples: []
                    }
                };
                
                updatedChart.glyphs.push(newGlyph);
                
                // Load the image into cache
                const img = new Image();
                img.onload = () => {
                    setLoadedGlyphImages(prev => ({
                        ...prev,
                        [newGlyph.id]: img
                    }));
                    setGlyphThumbnails(prev => ({
                        ...prev,
                        [newGlyph.id]: img.src
                    }));
                };
                img.src = primaryImage;
                
                alert(`✅ Added new glyph "${newGlyph.name}" with ID ${newGlyph.id}`);
                
            } else if (mode === 'edit') {
                // Update existing glyph
                const glyphIndex = updatedChart.glyphs.findIndex(g => g.id === glyph.id);
                
                if (glyphIndex !== -1) {
                    updatedChart.glyphs[glyphIndex] = {
                        ...updatedChart.glyphs[glyphIndex],
                        name: formData.name.trim(),
                        arabic: formData.arabic.trim() || 'x',
                        transliteration: formData.transliteration.trim() || formData.name.trim(),
                        description: formData.description.trim() || 'description'
                    };
                    
                    // If primary image changed, update it
                    if (primaryImage) {
                        updatedChart.glyphs[glyphIndex].images.primary = primaryImage;
                        
                        const img = new Image();
                        img.onload = () => {
                            setLoadedGlyphImages(prev => ({
                                ...prev,
                                [glyph.id]: img
                            }));
                            setGlyphThumbnails(prev => ({
                                ...prev,
                                [glyph.id]: img.src
                            }));
                        };
                        img.src = primaryImage;
                    }
                    
                    alert(`✅ Updated glyph "${formData.name}"`);
                }
            }
            
            setEquivalenceChart(updatedChart);
            onClose();
            
        } catch (error) {
            console.error('Save error:', error);
            setErrors(prev => ({ ...prev, general: 'Failed to save: ' + error.message }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!glyph) return;
        
        if (!confirm(`⚠️ Are you sure you want to delete glyph "${glyph.name}"?\n\nThis cannot be undone.`)) {
            return;
        }
        
        const updatedChart = { ...equivalenceChart };
        updatedChart.glyphs = updatedChart.glyphs.filter(g => g.id !== glyph.id);
        
        // Remove from image caches
        const newLoadedImages = { ...loadedGlyphImages };
        const newThumbnails = { ...glyphThumbnails };
        delete newLoadedImages[glyph.id];
        delete newThumbnails[glyph.id];
        
        // Remove variants and examples too
        if (glyph.images?.variants) {
            glyph.images.variants.forEach((_, idx) => {
                delete newLoadedImages[`${glyph.id}_variant_${idx}`];
                delete newThumbnails[`${glyph.id}_variant_${idx}`];
            });
        }
        if (glyph.images?.examples) {
            glyph.images.examples.forEach((_, idx) => {
                delete newLoadedImages[`${glyph.id}_example_${idx}`];
                delete newThumbnails[`${glyph.id}_example_${idx}`];
            });
        }
        
        setLoadedGlyphImages(newLoadedImages);
        setGlyphThumbnails(newThumbnails);
        setEquivalenceChart(updatedChart);
        
        alert(`🗑️ Deleted glyph "${glyph.name}"`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-900">
                        {mode === 'add' ? '➕ Add New Glyph' : '✏️ Edit Glyph'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                    >
                        &times;
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* General error */}
                    {errors.general && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {errors.general}
                        </div>
                    )}
                    
                    {/* Name field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent ${
                                errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g., aleph, beth"
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>
                    
                    {/* Arabic field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Arabic Character
                        </label>
                        <input
                            type="text"
                            value={formData.arabic}
                            onChange={(e) => setFormData(prev => ({ ...prev, arabic: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent text-2xl text-center"
                            placeholder="ا"
                            dir="rtl"
                        />
                    </div>
                    
                    {/* Transliteration field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Transliteration
                        </label>
                        <input
                            type="text"
                            value={formData.transliteration}
                            onChange={(e) => setFormData(prev => ({ ...prev, transliteration: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent"
                            placeholder="e.g., ʾ, b, g"
                        />
                    </div>
                    
                    {/* Description field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ancient-purple focus:border-transparent"
                            rows={2}
                            placeholder="Optional description or notes"
                        />
                    </div>
                    
                    {/* Primary image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Primary Template Image {mode === 'add' && <span className="text-red-500">*</span>}
                        </label>
                        
                        <div className="flex items-start gap-4">
                            {/* Preview */}
                            {primaryImagePreview && (
                                <div className="w-24 h-24 border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                    <img 
                                        src={primaryImagePreview} 
                                        alt="Preview"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            )}
                            
                            {/* Upload button */}
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                >
                                    📷 {primaryImagePreview ? 'Change Image' : 'Upload Image'}
                                </button>
                                <p className="mt-1 text-xs text-gray-500">
                                    PNG or JPG, max 5MB. Use a clear, isolated glyph image.
                                </p>
                            </div>
                        </div>
                        
                        {errors.primaryImage && (
                            <p className="mt-1 text-sm text-red-500">{errors.primaryImage}</p>
                        )}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-6 pt-4 border-t border-gray-200 flex justify-between">
                    {/* Delete button (edit mode only) */}
                    {mode === 'edit' && glyph && (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                            🗑️ Delete
                        </button>
                    )}
                    
                    {/* Spacer */}
                    {mode === 'add' && <div />}
                    
                    {/* Save/Cancel buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-ancient-purple hover:bg-[#4a3d5a] text-white rounded-lg transition-colors disabled:bg-gray-300"
                        >
                            {isSaving ? 'Saving...' : (mode === 'add' ? 'Add Glyph' : 'Save Changes')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Make globally available
window.GlyphEditorModal = GlyphEditorModal;
