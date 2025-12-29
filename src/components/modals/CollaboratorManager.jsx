// ============================================
// COLLABORATOR MANAGER
// Manage team members and bulk share inscriptions
// ============================================

const CollaboratorManager = ({
    isOpen,
    onClose,
    currentUserEmail,
    myItems = [],
    onUpdate
}) => {
    const { useState, useEffect, useCallback } = React;
    
    const [collaborators, setCollaborators] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedCollaborator, setSelectedCollaborator] = useState(null);
    const [itemSharing, setItemSharing] = useState({}); // { itemId: [email1, email2] }
    const [saving, setSaving] = useState(false);
    const [thumbnails, setThumbnails] = useState({}); // { fileId: thumbnailDataUrl }
    
    // Load thumbnail for a specific file
    const loadThumbnail = useCallback(async (fileId) => {
        if (thumbnails[fileId]) return;
        
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
    
    // Load profile
    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            if (typeof DriveSync !== 'undefined') {
                const profile = await DriveSync.loadProfile(currentUserEmail);
                setCollaborators(profile?.collaborators || []);
                setPendingRequests(profile?.pendingRequests || []);
                
                // Build sharing map from items
                const sharingMap = {};
                myItems.forEach(item => {
                    sharingMap[item.id] = item.collaborators || [];
                });
                setItemSharing(sharingMap);
                
                // Load thumbnails for first 10 items
                myItems.slice(0, 10).forEach(item => {
                    loadThumbnail(item.id);
                });
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUserEmail, myItems, loadThumbnail]);
    
    useEffect(() => {
        if (isOpen) {
            loadProfile();
        }
    }, [isOpen, loadProfile]);
    
    // Add collaborator
    const handleAddCollaborator = async () => {
        const email = newEmail.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        if (collaborators.some(c => c.email === email)) {
            alert('This collaborator is already added');
            return;
        }
        
        const newCollab = {
            email,
            name: email.split('@')[0],
            addedAt: new Date().toISOString()
        };
        
        const updated = [...collaborators, newCollab];
        setCollaborators(updated);
        setNewEmail('');
        
        // Save to profile
        try {
            await DriveSync.saveProfile(currentUserEmail, {
                collaborators: updated,
                pendingRequests
            });
        } catch (err) {
            console.error('Failed to save:', err);
        }
    };
    
    // Remove collaborator
    const handleRemoveCollaborator = async (email) => {
        if (!confirm(`Remove ${email} from your collaborators?`)) return;
        
        const updated = collaborators.filter(c => c.email !== email);
        setCollaborators(updated);
        
        // Also remove from all item sharing
        const updatedSharing = { ...itemSharing };
        Object.keys(updatedSharing).forEach(itemId => {
            updatedSharing[itemId] = updatedSharing[itemId].filter(e => e !== email);
        });
        setItemSharing(updatedSharing);
        
        try {
            await DriveSync.saveProfile(currentUserEmail, {
                collaborators: updated,
                pendingRequests
            });
        } catch (err) {
            console.error('Failed to save:', err);
        }
    };
    
    // Toggle item sharing for a collaborator
    const toggleItemShare = (itemId, email) => {
        setItemSharing(prev => {
            const current = prev[itemId] || [];
            const updated = current.includes(email)
                ? current.filter(e => e !== email)
                : [...current, email];
            return { ...prev, [itemId]: updated };
        });
    };
    
    // Select all items for a collaborator
    const selectAllForCollaborator = (email, filterVisibility = null) => {
        setItemSharing(prev => {
            const updated = { ...prev };
            myItems.forEach(item => {
                if (!filterVisibility || item.visibility === filterVisibility) {
                    const current = updated[item.id] || [];
                    if (!current.includes(email)) {
                        updated[item.id] = [...current, email];
                    }
                }
            });
            return updated;
        });
    };
    
    // Clear all for a collaborator
    const clearAllForCollaborator = (email) => {
        setItemSharing(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(itemId => {
                updated[itemId] = updated[itemId].filter(e => e !== email);
            });
            return updated;
        });
    };
    
    // Save all sharing changes
    const handleSaveSharing = async () => {
        setSaving(true);
        try {
            // Update each item's collaborators
            for (const item of myItems) {
                const newCollaborators = itemSharing[item.id] || [];
                if (JSON.stringify(newCollaborators.sort()) !== JSON.stringify((item.collaborators || []).sort())) {
                    await DriveSync.updateHkiCollaborators(item.id, newCollaborators);
                }
            }
            
            alert('✅ Sharing settings saved!');
            onUpdate && onUpdate();
            onClose();
        } catch (err) {
            console.error('Failed to save sharing:', err);
            alert('❌ Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">👥 Manage Collaborators</h2>
                        <p className="text-sm text-gray-500">Add team members and share inscriptions</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : (
                        <>
                            {/* Add collaborator */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-2">Add Collaborator</div>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="colleague@email.com"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-ancient-purple"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborator()}
                                    />
                                    <button
                                        onClick={handleAddCollaborator}
                                        className="px-4 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a]"
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>
                            
                            {/* Collaborator list with sharing */}
                            {collaborators.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    No collaborators yet. Add team members above.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {collaborators.map(collab => (
                                        <div key={collab.email} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {/* Collaborator header */}
                                            <div className="flex items-center justify-between p-3 bg-gray-50">
                                                <div>
                                                    <div className="font-medium text-gray-800">{collab.name}</div>
                                                    <div className="text-sm text-gray-500">{collab.email}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedCollaborator(
                                                            selectedCollaborator === collab.email ? null : collab.email
                                                        )}
                                                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
                                                    >
                                                        {selectedCollaborator === collab.email ? '▲ Hide' : '▼ Share items'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveCollaborator(collab.email)}
                                                        className="text-red-500 hover:text-red-700 px-2"
                                                        title="Remove collaborator"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Item sharing panel */}
                                            {selectedCollaborator === collab.email && (
                                                <div className="p-3 border-t">
                                                    {/* Quick actions */}
                                                    <div className="flex gap-2 mb-3 text-xs">
                                                        <button
                                                            onClick={() => selectAllForCollaborator(collab.email, 'review')}
                                                            className="px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                                        >
                                                            Select All Review
                                                        </button>
                                                        <button
                                                            onClick={() => selectAllForCollaborator(collab.email)}
                                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            onClick={() => clearAllForCollaborator(collab.email)}
                                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Item grid */}
                                                    {myItems.length === 0 ? (
                                                        <div className="text-sm text-gray-400 text-center py-4">
                                                            No inscriptions to share yet
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                                                            {myItems.map(item => {
                                                                const isShared = (itemSharing[item.id] || []).includes(collab.email);
                                                                const thumbSrc = thumbnails[item.id];
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => toggleItemShare(item.id, collab.email)}
                                                                        className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                                                                            isShared 
                                                                                ? 'border-patina bg-patina/10' 
                                                                                : 'border-gray-200 hover:border-gray-300'
                                                                        }`}
                                                                    >
                                                                        {/* Thumbnail */}
                                                                        <div className="aspect-square bg-gray-100 relative">
                                                                            {thumbSrc ? (
                                                                                <img 
                                                                                    src={thumbSrc}
                                                                                    alt={item.title}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                                    📜
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {/* Checkbox overlay */}
                                                                            <div className={`absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-xs ${
                                                                                isShared ? 'bg-patina text-white' : 'bg-white border border-gray-300'
                                                                            }`}>
                                                                                {isShared && '✓'}
                                                                            </div>
                                                                            
                                                                            {/* Visibility badge */}
                                                                            <div className={`absolute bottom-1 left-1 text-xs px-1 rounded ${
                                                                                item.visibility === 'published' ? 'bg-patina/80 text-white' :
                                                                                item.visibility === 'review' ? 'bg-amber-500/80 text-white' :
                                                                                'bg-gray-500/80 text-white'
                                                                            }`}>
                                                                                {item.visibility === 'published' ? '✅' : 
                                                                                 item.visibility === 'review' ? '👁️' : '📝'}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Title */}
                                                                        <div className="p-1 text-xs text-center truncate text-gray-600">
                                                                            {item.title || item.id}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveSharing}
                        disabled={saving}
                        className="px-4 py-2 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] disabled:bg-gray-300"
                    >
                        {saving ? '⏳ Saving...' : '💾 Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make globally available
window.CollaboratorManager = CollaboratorManager;

console.log('✅ CollaboratorManager loaded');
