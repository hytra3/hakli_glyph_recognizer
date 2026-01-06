// ============================================
// WAREHOUSE MODAL v251231i
// Browse and load HKI files from Google Drive
// Public view (published) + authenticated view (drafts, shared)
// Fixed: thumbnail blinking due to dependency cycle
// Added: Delete functionality for owned inscriptions
// ============================================

const WarehouseModal = ({
    isOpen,
    onClose,
    onLoadHki,
    currentUserEmail,
    onSignIn,
    onSignOut
}) => {
    const { useState, useEffect, useCallback, useRef } = React;
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [publishedItems, setPublishedItems] = useState([]);
    const [draftItems, setDraftItems] = useState([]);
    const [sharedItems, setSharedItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showCollaborators, setShowCollaborators] = useState(false);
    const [thumbnails, setThumbnails] = useState({}); // { fileId: thumbnailDataUrl }
    
    // Use ref to track which thumbnails are loading to prevent duplicates
    const loadingThumbnailsRef = useRef(new Set());
    const thumbnailsRef = useRef({});
    
    // Keep ref in sync with state
    useEffect(() => {
        thumbnailsRef.current = thumbnails;
    }, [thumbnails]);
    
    // Fetch thumbnail data
    const fetchThumbnail = useCallback(async (fileId) => {
        try {
            const hkiData = await DriveSync.loadHki(fileId);
            const thumbSrc = hkiData.displayImage || hkiData.image || 
                            hkiData.images?.preprocessed || hkiData.images?.original;
            return thumbSrc || null;
        } catch (err) {
            console.warn('Failed to load thumbnail for', fileId, err);
            return null;
        }
    }, []);
    
    // Load single thumbnail on-demand (for click-to-select)
    const loadThumbnail = useCallback(async (fileId) => {
        if (thumbnailsRef.current[fileId] || loadingThumbnailsRef.current.has(fileId)) return;
        
        loadingThumbnailsRef.current.add(fileId);
        const thumbSrc = await fetchThumbnail(fileId);
        loadingThumbnailsRef.current.delete(fileId);
        
        if (thumbSrc) {
            setThumbnails(prev => ({ ...prev, [fileId]: thumbSrc }));
        }
    }, [fetchThumbnail]);
    
    // Load thumbnails for visible items - BATCHED to prevent flashing
    const loadThumbnails = useCallback(async (items) => {
        // Filter to items we don't already have thumbnails for and aren't loading
        const toLoad = items.slice(0, 10).filter(item => 
            !thumbnailsRef.current[item.id] && !loadingThumbnailsRef.current.has(item.id)
        );
        if (toLoad.length === 0) return;
        
        // Mark all as loading
        toLoad.forEach(item => loadingThumbnailsRef.current.add(item.id));
        
        // Fetch all thumbnails in parallel
        const results = await Promise.all(
            toLoad.map(async (item) => ({
                id: item.id,
                thumbSrc: await fetchThumbnail(item.id)
            }))
        );
        
        // Clear loading state
        toLoad.forEach(item => loadingThumbnailsRef.current.delete(item.id));
        
        // Single state update with all thumbnails at once
        const newThumbnails = {};
        results.forEach(({ id, thumbSrc }) => {
            if (thumbSrc) newThumbnails[id] = thumbSrc;
        });
        
        if (Object.keys(newThumbnails).length > 0) {
            setThumbnails(prev => ({ ...prev, ...newThumbnails }));
        }
    }, [fetchThumbnail]);
    
    // Load warehouse contents
    const loadWarehouse = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            if (typeof DriveSync === 'undefined') {
                throw new Error('Drive sync not available');
            }
            
            // Always load published (public access)
            const published = await DriveSync.listPublished();
            setPublishedItems(published || []);
            
            // If signed in, also load drafts and shared
            if (currentUserEmail) {
                const drafts = await DriveSync.listDrafts(currentUserEmail);
                setDraftItems(drafts || []);
                
                const shared = await DriveSync.listSharedWithMe(currentUserEmail);
                setSharedItems(shared || []);
                
                // Load thumbnails for drafts first (user's own files)
                loadThumbnails(drafts || []);
            } else {
                setDraftItems([]);
                setSharedItems([]);
            }
            
            // Load thumbnails for published
            loadThumbnails(published || []);
            
        } catch (err) {
            console.error('Failed to load warehouse:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentUserEmail, loadThumbnails]);
    
    // Load on open - only when isOpen changes to true
    useEffect(() => {
        if (isOpen) {
            // Clear old thumbnails when reopening to get fresh data
            setThumbnails({});
            thumbnailsRef.current = {};
            loadingThumbnailsRef.current.clear();
            loadWarehouse();
        }
    }, [isOpen]); // Intentionally exclude loadWarehouse to prevent re-fetch loop
    
    // Handle item click
    const handleItemClick = (item) => {
        setSelectedItem(item);
        // Load thumbnail if not already loaded (using ref to avoid stale closure)
        if (!thumbnailsRef.current[item.id]) {
            loadThumbnail(item.id);
        }
    };
    
    // Handle load
    const handleLoad = async () => {
        if (!selectedItem) return;
        
        try {
            setLoading(true);
            const hkiData = await DriveSync.loadHki(selectedItem.id);
            onLoadHki(hkiData, selectedItem);
            onClose();
        } catch (err) {
            console.error('Failed to load HKI:', err);
            alert('❌ Failed to load: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Toggle booklet selection for an item
    const toggleBookletSelect = async (item, e) => {
        e.stopPropagation();
        
        if (bookletSelection[item.id]) {
            // Remove from selection
            setBookletSelection(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
        } else {
            // Add to selection - need to load HKI data
            try {
                const hkiData = await DriveSync.loadHki(item.id);
                setBookletSelection(prev => ({
                    ...prev,
                    [item.id]: {
                        id: item.id,
                        title: item.title || hkiData.title || item.id,
                        hkiData
                    }
                }));
            } catch (err) {
                console.warn('Failed to load item for booklet:', err);
            }
        }
    };
    
    // Select all items in a category for booklet
    const selectAllForBooklet = async (items) => {
        setLoadingBookletData(true);
        const newSelections = {};
        
        for (const item of items) {
            if (!bookletSelection[item.id]) {
                try {
                    const hkiData = await DriveSync.loadHki(item.id);
                    newSelections[item.id] = {
                        id: item.id,
                        title: item.title || hkiData.title || item.id,
                        hkiData
                    };
                } catch (err) {
                    console.warn('Failed to load item:', item.id, err);
                }
            }
        }
        
        setBookletSelection(prev => ({ ...prev, ...newSelections }));
        setLoadingBookletData(false);
    };
    
    // Clear booklet selection
    const clearBookletSelection = () => {
        setBookletSelection({});
    };
    
                className={`group cursor-pointer rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg ${
                    isInBooklet
                        ? 'border-ochre ring-2 ring-ochre/30'
                        : isSelected 
                            ? 'border-ancient-purple ring-2 ring-ancient-purple/30' 
                            : 'border-gray-200 hover:border-gray-300'
                }`}
            >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100 relative">
                    {thumbSrc ? (
                        <img 
                            src={thumbSrc} 
                            alt={item.title || 'Inscription'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-3xl">📜</span>
                        </div>
                    )}
                    
                    {/* Booklet checkbox */}
                    {bookletMode && (
                        <div 
                            onClick={(e) => toggleBookletSelect(item, e)}
                            className={`absolute top-1 left-1 w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                                isInBooklet 
                                    ? 'bg-ochre border-ochre text-white' 
                                    : 'bg-white/80 border-gray-400 hover:border-ochre'
                            }`}
                        >
                            {isInBooklet && <span className="text-sm">✓</span>}
                        </div>
                    )}
                    
                    {/* Owner badge */}
                    {isOwner && !bookletMode && (
                        <div className="absolute top-1 right-1 bg-ancient-purple text-white text-xs px-1.5 py-0.5 rounded">
                            ✏️ Yours
                        </div>
                    )}
                    
                    {/* Delete button (appears on hover for owner items) */}
                    {isOwner && !bookletMode && (
                        <button
                            onClick={(e) => handleDeleteClick(item, e)}
                            className="absolute top-1 left-1 w-6 h-6 rounded bg-rust/80 text-white opacity-0 hover:opacity-100 group-hover:opacity-70 transition-opacity flex items-center justify-center text-sm hover:bg-rust"
                            title="Delete inscription"
                        >
                            🗑️
                        </button>
                    )}
                    
                    {/* Visibility badge */}
                    <div className={`absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded ${
                        item.visibility === 'published' ? 'bg-patina text-white' :
                        item.visibility === 'review' ? 'bg-amber-500 text-white' :
                        'bg-gray-500 text-white'
                    }`}>
                        {item.visibility === 'published' ? '✅' : 
                         item.visibility === 'review' ? '👁️' : '📝'}
                    </div>
                </div>
                
                {/* Info */}
                <div className="p-2">
                    <div className="font-medium text-sm text-gray-800 truncate">
                        {item.title || item.id || 'Untitled'}
                    </div>
                    {sharedBy && (
                        <div className="text-xs text-gray-500 truncate">
                            from: {sharedBy}
                        </div>
                    )}
                    {item.glyphCount !== undefined && (
                        <div className="text-xs text-gray-400">
                            {item.glyphCount} glyphs
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    // Section component
    const Section = ({ title, icon, items, emptyText, isOwner = false, showSharedBy = false }) => {
        if (items.length === 0 && !emptyText) return null;
        
        const allSelected = items.length > 0 && items.every(item => bookletSelection[item.id]);
        
        return (
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                    <span>{icon}</span>
                    <span>{title}</span>
                    <span className="text-gray-400 font-normal">({items.length})</span>
                    
                    {/* Select All button in booklet mode */}
                    {bookletMode && items.length > 0 && (
                        <button
                            onClick={() => allSelected 
                                ? items.forEach(item => setBookletSelection(prev => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                }))
                                : selectAllForBooklet(items)
                            }
                            disabled={loadingBookletData}
                            className={`ml-auto text-xs px-2 py-1 rounded transition-colors ${
                                allSelected 
                                    ? 'bg-ochre/20 text-ochre hover:bg-ochre/30' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {loadingBookletData ? '⏳' : allSelected ? '✓ All Selected' : 'Select All'}
                        </button>
                    )}
                </h3>
                
                {items.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {items.map(item => (
                            <ThumbnailCard 
                                key={item.id} 
                                item={item} 
                                isOwner={isOwner || item.owner === currentUserEmail}
                                sharedBy={showSharedBy ? item.owner : null}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg">
                        {emptyText}
                    </div>
                )}
            </div>
        );
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-ancient-purple to-ochre text-white rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            📚 Hakli Warehouse
                        </h2>
                        <p className="text-sm text-white/80">
                            Browse and load inscription files
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {currentUserEmail ? (
                            <>
                                <button
                                    onClick={() => setShowCollaborators(true)}
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm"
                                >
                                    👥 Team
                                </button>
                                <div className="text-sm">
                                    <div className="font-medium">{currentUserEmail}</div>
                                    <button 
                                        onClick={onSignOut}
                                        className="text-white/70 hover:text-white text-xs"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={onSignIn}
                                className="px-4 py-2 bg-white text-ancient-purple rounded-lg font-medium hover:bg-gray-100"
                            >
                                Sign in with Google
                            </button>
                        )}
                        
                        <button 
                            onClick={onClose}
                            className="text-white/70 hover:text-white text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="text-4xl mb-2">⏳</div>
                                <div className="text-gray-500">Loading warehouse...</div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="text-4xl mb-2">❌</div>
                                <div className="text-red-500">{error}</div>
                                <button 
                                    onClick={loadWarehouse}
                                    className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Sign in prompt for non-authenticated users */}
                            {!currentUserEmail && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-blue-800">🔒 Sign in to access more</div>
                                        <div className="text-sm text-blue-600">See your drafts, shared inscriptions, and save edits</div>
                                    </div>
                                    <button
                                        onClick={onSignIn}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                        Sign in
                                    </button>
                                </div>
                            )}
                            
                            {/* Drafts - only when signed in */}
                            {currentUserEmail && (
                                <Section
                                    title="My Drafts"
                                    icon="📝"
                                    items={draftItems}
                                    emptyText="No drafts yet. Upload an image to start!"
                                    isOwner={true}
                                />
                            )}
                            
                            {/* Shared with me - only when signed in */}
                            {currentUserEmail && (
                                <Section
                                    title="Shared with Me"
                                    icon="👁️"
                                    items={sharedItems}
                                    emptyText="No inscriptions shared with you yet"
                                    showSharedBy={true}
                                />
                            )}
                            
                            {/* Published - always visible */}
                            <Section
                                title="Published"
                                icon="✅"
                                items={publishedItems}
                                emptyText="No published inscriptions yet"
                            />
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        {bookletMode ? (
                            <span>
                                {Object.keys(bookletSelection).length} selected for booklet
                                {Object.keys(bookletSelection).length > 0 && (
                                    <button 
                                        onClick={clearBookletSelection}
                                        className="ml-2 text-rust hover:underline"
                                    >
                                        Clear
                                    </button>
                                )}
                            </span>
                        ) : selectedItem ? (
                            <span>
                                Selected: <strong>{selectedItem.title || selectedItem.id}</strong>
                                {selectedItem.owner === currentUserEmail && ' (you can edit)'}
                            </span>
                        ) : (
                            <span>Click an inscription to select it</span>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Booklet mode toggle */}
                        <button
                            onClick={() => {
                                setBookletMode(!bookletMode);
                                if (bookletMode) clearBookletSelection();
                            }}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                                bookletMode 
                                    ? 'bg-ochre text-white hover:bg-ochre/90' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            📖 {bookletMode ? 'Exit Booklet Mode' : 'Create Booklet'}
                        </button>
                        
                        {bookletMode ? (
                            <button
                                onClick={() => setShowBookletGenerator(true)}
                                disabled={Object.keys(bookletSelection).length === 0}
                                className="px-4 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                📄 Generate PDF ({Object.keys(bookletSelection).length})
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLoad}
                                    disabled={!selectedItem}
                                    className="px-4 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    📂 Load Selected
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Collaborator Manager Modal */}
            {showCollaborators && (
                <CollaboratorManager
                    isOpen={showCollaborators}
                    onClose={() => setShowCollaborators(false)}
                    currentUserEmail={currentUserEmail}
                    myItems={[...draftItems, ...publishedItems.filter(i => i.owner === currentUserEmail)]}
                    onUpdate={loadWarehouse}
                />
            )}
            
            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🗑️</div>
                            <h3 className="font-semibold text-lg text-gray-800">Delete Inscription?</h3>
                        </div>
                        
                        <p className="text-gray-600 text-center mb-4">
                            Are you sure you want to delete<br/>
                            <span className="font-medium text-gray-800">"{deleteConfirm.title}"</span>?
                        </p>
                        
                        <p className="text-sm text-rust text-center mb-6">
                            This cannot be undone.
                        </p>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 bg-rust text-white rounded-lg hover:bg-rust/90 transition-colors flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>🗑️ Delete</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Booklet Generator Modal */}
            {showBookletGenerator && window.BookletGenerator && (
                <window.BookletGenerator
                    isOpen={showBookletGenerator}
                    onClose={() => setShowBookletGenerator(false)}
                    selectedItems={getBookletItems()}
                    currentUserEmail={currentUserEmail}
                    equivalenceChart={window.equivalenceChart}
                />
            )}
        </div>
    );
};

// Make globally available
window.WarehouseModal = WarehouseModal;

console.log('✅ WarehouseModal loaded');
