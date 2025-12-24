// ============================================
// useChartLoader Hook
// Manages loading the glyph equivalence chart and template images
// ============================================

const useChartLoader = (setters) => {
    const { useState, useCallback, useRef } = React;
    
    const [chartData, setChartData] = useState(null);
    const [loadStatus, setLoadStatus] = useState('not-loaded'); // 'not-loaded' | 'loading' | 'loaded' | 'error'
    const [loadedImages, setLoadedImages] = useState({});
    const [thumbnails, setThumbnails] = useState({});
    const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
    const [error, setError] = useState(null);
    
    // Track loading to prevent duplicate loads
    const isLoadingRef = useRef(false);
    
    /**
     * Convert GitHub URL to raw content URL
     */
    const convertToGitHubRawUrl = useCallback((url) => {
        if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
            return url
                .replace('github.com', 'raw.githubusercontent.com')
                .replace('/blob/', '/');
        }
        return url;
    }, []);
    
    /**
     * Load a single image and return a promise
     */
    const loadImage = useCallback((url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load: ${url}`));
            
            // Handle GitHub URLs
            img.src = convertToGitHubRawUrl(url);
        });
    }, [convertToGitHubRawUrl]);
    
    /**
     * Load all glyph template images from the chart
     */
    const loadGlyphImages = useCallback(async (glyphs) => {
        const newLoadedImages = {};
        const newThumbnails = {};
        let loaded = 0;
        const total = glyphs.length;
        
        setLoadProgress({ loaded: 0, total });
        
        // Load images in parallel batches to avoid overwhelming the browser
        const batchSize = 10;
        
        for (let i = 0; i < glyphs.length; i += batchSize) {
            const batch = glyphs.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (glyph) => {
                try {
                    // Load primary image
                    if (glyph.images?.primary) {
                        const img = await loadImage(glyph.images.primary);
                        newLoadedImages[glyph.id] = img;
                        newThumbnails[glyph.id] = img.src;
                    }
                    
                    // Load variants
                    if (glyph.images?.variants) {
                        for (let v = 0; v < glyph.images.variants.length; v++) {
                            try {
                                const variantImg = await loadImage(glyph.images.variants[v]);
                                newLoadedImages[`${glyph.id}_variant_${v}`] = variantImg;
                                newThumbnails[`${glyph.id}_variant_${v}`] = variantImg.src;
                            } catch (e) {
                                console.warn(`Failed to load variant ${v} for glyph ${glyph.id}`);
                            }
                        }
                    }
                    
                    // Load examples
                    if (glyph.images?.examples) {
                        for (let e = 0; e < glyph.images.examples.length; e++) {
                            try {
                                const exampleImg = await loadImage(glyph.images.examples[e]);
                                newLoadedImages[`${glyph.id}_example_${e}`] = exampleImg;
                                newThumbnails[`${glyph.id}_example_${e}`] = exampleImg.src;
                            } catch (err) {
                                console.warn(`Failed to load example ${e} for glyph ${glyph.id}`);
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to load images for glyph ${glyph.id}:`, e);
                }
                
                loaded++;
                setLoadProgress({ loaded, total });
            }));
        }
        
        setLoadedImages(newLoadedImages);
        setThumbnails(newThumbnails);
        
        console.log(`✅ Loaded ${Object.keys(newLoadedImages).length} glyph images`);
        return { loadedImages: newLoadedImages, thumbnails: newThumbnails };
    }, [loadImage]);
    
    /**
     * Load the equivalence chart from a URL
     */
    const loadChartFromUrl = useCallback(async (url) => {
        if (isLoadingRef.current) {
            console.log('Already loading chart, skipping...');
            return null;
        }
        
        isLoadingRef.current = true;
        setLoadStatus('loading');
        setError(null);
        
        try {
            const response = await fetch(convertToGitHubRawUrl(url));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Validate chart structure
            if (!data.glyphs || !Array.isArray(data.glyphs)) {
                throw new Error('Invalid chart format: missing glyphs array');
            }
            
            setChartData(data);
            console.log(`📜 Loaded chart with ${data.glyphs.length} glyphs`);
            
            // Load glyph images
            await loadGlyphImages(data.glyphs);
            
            setLoadStatus('loaded');
            isLoadingRef.current = false;
            
            return data;
        } catch (e) {
            console.error('Failed to load chart:', e);
            setError(e.message);
            setLoadStatus('error');
            isLoadingRef.current = false;
            return null;
        }
    }, [convertToGitHubRawUrl, loadGlyphImages]);
    
    /**
     * Load the default local chart
     */
    const loadDefaultChart = useCallback(async () => {
        return loadChartFromUrl('Hakli_glyphs.JSON');
    }, [loadChartFromUrl]);
    
    /**
     * Load chart from a File object
     */
    const loadChartFromFile = useCallback(async (file) => {
        if (isLoadingRef.current) return null;
        
        isLoadingRef.current = true;
        setLoadStatus('loading');
        setError(null);
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.glyphs || !Array.isArray(data.glyphs)) {
                throw new Error('Invalid chart format: missing glyphs array');
            }
            
            setChartData(data);
            await loadGlyphImages(data.glyphs);
            
            setLoadStatus('loaded');
            isLoadingRef.current = false;
            
            return data;
        } catch (e) {
            console.error('Failed to load chart from file:', e);
            setError(e.message);
            setLoadStatus('error');
            isLoadingRef.current = false;
            return null;
        }
    }, [loadGlyphImages]);
    
    /**
     * Add a new glyph to the chart
     */
    const addGlyph = useCallback((newGlyph) => {
        if (!chartData) return null;
        
        const maxId = Math.max(...chartData.glyphs.map(g => g.id), 0);
        const glyphWithId = {
            ...newGlyph,
            id: newGlyph.id || maxId + 1
        };
        
        const updatedChart = {
            ...chartData,
            glyphs: [...chartData.glyphs, glyphWithId]
        };
        
        setChartData(updatedChart);
        
        // Load the new glyph's image if provided
        if (glyphWithId.images?.primary) {
            loadImage(glyphWithId.images.primary).then(img => {
                setLoadedImages(prev => ({ ...prev, [glyphWithId.id]: img }));
                setThumbnails(prev => ({ ...prev, [glyphWithId.id]: img.src }));
            }).catch(console.warn);
        }
        
        return glyphWithId;
    }, [chartData, loadImage]);
    
    /**
     * Update an existing glyph
     */
    const updateGlyph = useCallback((glyphId, updates) => {
        if (!chartData) return false;
        
        const glyphIndex = chartData.glyphs.findIndex(g => g.id === glyphId);
        if (glyphIndex === -1) return false;
        
        const updatedGlyphs = [...chartData.glyphs];
        updatedGlyphs[glyphIndex] = { ...updatedGlyphs[glyphIndex], ...updates };
        
        setChartData({ ...chartData, glyphs: updatedGlyphs });
        
        // Reload image if it changed
        if (updates.images?.primary) {
            loadImage(updates.images.primary).then(img => {
                setLoadedImages(prev => ({ ...prev, [glyphId]: img }));
                setThumbnails(prev => ({ ...prev, [glyphId]: img.src }));
            }).catch(console.warn);
        }
        
        return true;
    }, [chartData, loadImage]);
    
    /**
     * Delete a glyph from the chart
     */
    const deleteGlyph = useCallback((glyphId) => {
        if (!chartData) return false;
        
        const updatedGlyphs = chartData.glyphs.filter(g => g.id !== glyphId);
        setChartData({ ...chartData, glyphs: updatedGlyphs });
        
        // Remove from image caches
        setLoadedImages(prev => {
            const updated = { ...prev };
            delete updated[glyphId];
            // Also delete variants and examples
            Object.keys(updated).forEach(key => {
                if (key.startsWith(`${glyphId}_`)) {
                    delete updated[key];
                }
            });
            return updated;
        });
        
        setThumbnails(prev => {
            const updated = { ...prev };
            delete updated[glyphId];
            Object.keys(updated).forEach(key => {
                if (key.startsWith(`${glyphId}_`)) {
                    delete updated[key];
                }
            });
            return updated;
        });
        
        return true;
    }, [chartData]);
    
    /**
     * Export the current chart as JSON
     */
    const exportChart = useCallback(() => {
        if (!chartData) return null;
        
        const exportData = {
            ...chartData,
            exportDate: new Date().toISOString(),
            glyphCount: chartData.glyphs.length
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hakli_glyphs_${new Date().toISOString().slice(0, 10)}.JSON`;
        a.click();
        URL.revokeObjectURL(url);
        
        return exportData;
    }, [chartData]);
    
    /**
     * Get a glyph by ID
     */
    const getGlyphById = useCallback((id) => {
        return chartData?.glyphs?.find(g => g.id === id) || null;
    }, [chartData]);
    
    /**
     * Get a glyph by name (case-insensitive)
     */
    const getGlyphByName = useCallback((name) => {
        return chartData?.glyphs?.find(
            g => g.name.toLowerCase() === name.toLowerCase()
        ) || null;
    }, [chartData]);
    
    /**
     * Search glyphs by name or transliteration
     */
    const searchGlyphs = useCallback((query) => {
        if (!chartData || !query) return [];
        
        const lowerQuery = query.toLowerCase();
        return chartData.glyphs.filter(g => 
            g.name.toLowerCase().includes(lowerQuery) ||
            g.transliteration?.toLowerCase().includes(lowerQuery) ||
            g.arabic?.includes(query)
        );
    }, [chartData]);
    
    return {
        // State
        chartData,
        loadStatus,
        loadedImages,
        thumbnails,
        loadProgress,
        error,
        
        // Computed
        glyphCount: chartData?.glyphs?.length || 0,
        isLoaded: loadStatus === 'loaded',
        isLoading: loadStatus === 'loading',
        hasError: loadStatus === 'error',
        
        // Loaders
        loadDefaultChart,
        loadChartFromUrl,
        loadChartFromFile,
        
        // CRUD
        addGlyph,
        updateGlyph,
        deleteGlyph,
        
        // Export
        exportChart,
        
        // Queries
        getGlyphById,
        getGlyphByName,
        searchGlyphs
    };
};

// Make globally available
window.useChartLoader = useChartLoader;
