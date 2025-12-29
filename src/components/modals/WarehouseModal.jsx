// ============================================
// WAREHOUSE MODAL
// Browse and load HKI files from Google Drive
// Public view (published) + authenticated view (drafts, shared)
// ============================================

const WarehouseModal = ({
    isOpen,
    onClose,
    onLoadHki,
    currentUserEmail,
    onSignIn,
    onSignOut
}) => {
    const { useState, useEffect, useCallback } = React;
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [publishedItems, setPublishedItems] = useState([]);
    const [draftItems, setDraftItems] = useState([]);
    const [sharedItems, setSharedItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showCollaborators, setShowCollaborators] = useState(false);
    const [thumbnails, setThumbnails] = useState({}); // { fileId: thumbnailDataUrl }
    
    // Load thumbnail for a specific file
    const loadThumbnail = useCallback(async (fileId) => {
        if (thumbnails[fileId]) return; // Already loaded
        
        try {
            const hkiData = await DriveSync.loadHki(fileId);
            const thumbSrc = hkiData.displayImage || hkiData.image || 
                            hkiData.images?.preprocessed || hkiData.images?.original;
            if (thumbSrc) {
                setThumbnails(prev => ({ ...prev, [fileId]: thumbSrc }));
            }
        } catch (err) {
            console.warn('Failed to load thumbnail for', fileId, err);
        }
    }, [thumbnails]);
    
    // Load thumbnails for visible items
    const loadThumbnails = useCallback(async (items) => {
        // Load first 10 thumbnails immediately, rest lazily
        const toLoad = items.slice(0, 10);
        for (const item of toLoad) {
            if (!thumbnails[item.id]) {
                loadThumbnail(item.id);
            }
        }
    }, [thumbnails, loadThumbnail]);
    
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
    
    // Load on open
    useEffect(() => {
        if (isOpen) {
            loadWarehouse();
        }
    }, [isOpen, loadWarehouse]);
    
    // Handle item click
    const handleItemClick = (item) => {
        setSelectedItem(item);
        // Load thumbnail if not already loaded
        if (!thumbnails[item.id]) {
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
    
    // Render thumbnail card
    const ThumbnailCard = ({ item, isOwner = false, sharedBy = null }) => {
        const isSelected = selectedItem?.id === item.id;
        const thumbSrc = thumbnails[item.id];
        
        return (
            <div
                onClick={() => handleItemClick(item)}
                className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg ${
                    isSelected 
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
                    
                    {/* Owner badge */}
                    {isOwner && (
                        <div className="absolute top-1 right-1 bg-ancient-purple text-white text-xs px-1.5 py-0.5 rounded">
                            ✏️ Yours
                        </div>
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
        
        return (
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                    <span>{icon}</span>
                    <span>{title}</span>
                    <span className="text-gray-400 font-normal">({items.length})</span>
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
                        {selectedItem ? (
                            <span>
                                Selected: <strong>{selectedItem.title || selectedItem.id}</strong>
                                {selectedItem.owner === currentUserEmail && ' (you can edit)'}
                            </span>
                        ) : (
                            <span>Click an inscription to select it</span>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
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
        </div>
    );
};

// Make globally available
window.WarehouseModal = WarehouseModal;

console.log('✅ WarehouseModal loaded');
