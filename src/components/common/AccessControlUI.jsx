// ============================================
// ACCESS CONTROL UI COMPONENTS
// Unlock modal, user management, sync status
// ============================================

/**
 * Unlock Modal - Prompts for keyword to unlock editing
 */
const UnlockModal = ({ 
    isOpen, 
    onClose, 
    onUnlock, 
    inscriptionTitle = 'Inscription'
}) => {
    const { useState } = React;
    const [keyword, setKeyword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await onUnlock(keyword);
            if (result.success) {
                setKeyword('');
                onClose();
            } else {
                setError(result.error || 'Invalid keyword');
            }
        } catch (err) {
            setError('Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-ancient-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🔒</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                            Unlock Editing
                        </h3>
                        <p className="text-gray-600 mt-2">
                            Enter your keyword to edit<br />
                            <span className="font-medium text-ancient-purple">{inscriptionTitle}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <input
                                type="password"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Enter your keyword"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-ancient-purple focus:ring-2 focus:ring-ancient-purple/20 outline-none text-center text-lg"
                                autoFocus
                                disabled={isLoading}
                            />
                            {error && (
                                <p className="text-red-500 text-sm mt-2 text-center">
                                    ❌ {error}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                                disabled={isLoading}
                            >
                                View Only
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-ancient-purple text-white rounded-lg hover:bg-[#4a3d5a] font-medium disabled:opacity-50"
                                disabled={!keyword || isLoading}
                            >
                                {isLoading ? '⏳ Checking...' : '🔓 Unlock'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                        💡 Don't have a keyword? Contact the inscription owner to request edit access.
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * User Management Panel - For owners to manage access
 */
const UserManagementPanel = ({
    accessControl,
    onAddUser,
    onRemoveUser,
    onUpdateRole,
    isCollapsed,
    onToggleCollapse
}) => {
    const { useState } = React;
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('editor');
    const [generatedKeyword, setGeneratedKeyword] = useState('');

    const currentUser = AccessControl.getCurrentUser();
    const canManage = AccessControl.canManageUsers();
    const users = AccessControl.listUsers(accessControl);

    const handleGenerateKeyword = () => {
        setGeneratedKeyword(AccessControl.generateKeyword());
    };

    const handleAddUser = () => {
        if (!newUserName || !generatedKeyword) return;
        
        onAddUser(generatedKeyword, newUserName, newUserRole);
        
        // Show the keyword to copy
        alert(`✅ User added!\n\n👤 Name: ${newUserName}\n🔑 Keyword: ${generatedKeyword}\n📋 Role: ${newUserRole}\n\nShare this keyword securely with ${newUserName}.`);
        
        setNewUserName('');
        setGeneratedKeyword('');
        setShowAddForm(false);
    };

    if (!canManage) return null;

    return (
        <CollapsibleSection
            title="👥 Access Control"
            isCollapsed={isCollapsed}
            onToggle={onToggleCollapse}
            badge={`${users.length} users`}
            className="bg-amber-50 border-2 border-amber-200"
            headerClassName="bg-amber-100"
        >
            <div className="space-y-4">
                {/* Current user info */}
                <div className="p-3 bg-white rounded-lg border border-amber-200">
                    <div className="text-sm text-gray-600">Signed in as:</div>
                    <div className="font-medium text-gray-900">
                        {currentUser?.name} 
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                            {currentUser?.role}
                        </span>
                    </div>
                </div>

                {/* User list */}
                <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Users with access:</div>
                    {users.map((user) => (
                        <div 
                            key={user.id}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                        >
                            <div>
                                <span className="font-medium text-gray-900">{user.name}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                    user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                                    user.role === 'commenter' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {user.role}
                                </span>
                                {user.lastAccess && (
                                    <span className="ml-2 text-xs text-gray-400">
                                        Last: {new Date(user.lastAccess).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            {user.role !== 'owner' && (
                                <div className="flex gap-1">
                                    <select
                                        value={user.role}
                                        onChange={(e) => onUpdateRole(user.id, e.target.value)}
                                        className="text-xs px-2 py-1 border rounded"
                                    >
                                        <option value="editor">Editor</option>
                                        <option value="commenter">Commenter</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Remove ${user.name}'s access?`)) {
                                                onRemoveUser(user.id);
                                            }
                                        }}
                                        className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-xs"
                                        title="Remove access"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add user form */}
                {showAddForm ? (
                    <div className="p-3 bg-white rounded-lg border-2 border-dashed border-amber-300 space-y-3">
                        <div className="text-sm font-medium text-gray-700">Add New User</div>
                        
                        <input
                            type="text"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="User's name"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        
                        <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="editor">Editor - Can edit detections & translations</option>
                            <option value="commenter">Commenter - Can add comments only</option>
                            <option value="viewer">Viewer - Read-only access</option>
                        </select>
                        
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={generatedKeyword}
                                readOnly
                                placeholder="Click Generate"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono"
                            />
                            <button
                                onClick={handleGenerateKeyword}
                                className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
                            >
                                🎲 Generate
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={!newUserName || !generatedKeyword}
                                className="flex-1 px-3 py-2 bg-ancient-purple text-white rounded-lg text-sm disabled:opacity-50"
                            >
                                ✅ Add User
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full px-3 py-2 border-2 border-dashed border-amber-300 rounded-lg text-amber-600 hover:bg-amber-50 text-sm"
                    >
                        + Add User
                    </button>
                )}

                {/* Access log */}
                {accessControl?.accessLog?.length > 0 && (
                    <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            📋 Access Log ({accessControl.accessLog.length} events)
                        </summary>
                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                            {accessControl.accessLog.slice(-10).reverse().map((entry, i) => (
                                <div key={i} className="p-1 bg-gray-50 rounded text-gray-600">
                                    <span className="text-gray-400">
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </span>
                                    {' - '}
                                    {entry.action.replace('_', ' ')}
                                    {entry.user && ` by ${entry.user}`}
                                    {entry.targetUser && ` (${entry.targetUser})`}
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </CollapsibleSection>
    );
};

/**
 * Sync Status Indicator - Shows sync state in header or panel
 */
const SyncStatusIndicator = ({ 
    inscriptionId = null, 
    showDetails = false,
    onRetry = null,
    onSignIn = null
}) => {
    const { useState, useEffect } = React;
    const [status, setStatus] = useState(null);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        // Get initial status
        if (inscriptionId) {
            setStatus(SyncManager.getStatus(inscriptionId));
        } else {
            setSummary(SyncManager.getSummary());
        }

        // Listen for sync events
        const unsubscribe = SyncManager.addListener((event) => {
            if (inscriptionId) {
                setStatus(SyncManager.getStatus(inscriptionId));
            } else {
                setSummary(SyncManager.getSummary());
            }
        });

        return unsubscribe;
    }, [inscriptionId]);

    // Individual file status
    if (inscriptionId && status) {
        const statusConfig = {
            synced: { icon: '☁️', text: 'Synced', color: 'text-green-600', bg: 'bg-green-50' },
            pending: { icon: '⏳', text: 'Pending sync', color: 'text-amber-600', bg: 'bg-amber-50' },
            syncing: { icon: '🔄', text: 'Syncing...', color: 'text-blue-600', bg: 'bg-blue-50' },
            error: { icon: '⚠️', text: 'Sync failed', color: 'text-red-600', bg: 'bg-red-50' },
            offline: { icon: '📴', text: 'Offline', color: 'text-gray-600', bg: 'bg-gray-50' }
        };

        const effectiveStatus = !status.isOnline ? 'offline' : status.status;
        const config = statusConfig[effectiveStatus] || statusConfig.pending;

        if (!showDetails) {
            return (
                <span 
                    className={`px-2 py-1 rounded text-xs font-medium ${config.color} ${config.bg}`}
                    title={`Last synced: ${status.lastSynced ? new Date(status.lastSynced).toLocaleString() : 'Never'}`}
                >
                    {config.icon} {config.text}
                </span>
            );
        }

        return (
            <div className={`p-3 rounded-lg ${config.bg} border border-${config.color.replace('text-', '')}/20`}>
                <div className="flex items-center justify-between">
                    <span className={`font-medium ${config.color}`}>
                        {config.icon} {config.text}
                    </span>
                    {status.status === 'error' && onRetry && (
                        <button
                            onClick={() => onRetry(inscriptionId)}
                            className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-100"
                        >
                            🔄 Retry
                        </button>
                    )}
                </div>
                {status.lastSynced && (
                    <div className="text-xs text-gray-500 mt-1">
                        Last synced: {new Date(status.lastSynced).toLocaleString()}
                    </div>
                )}
                {status.lastError && (
                    <div className="text-xs text-red-500 mt-1">
                        Error: {status.lastError}
                    </div>
                )}
            </div>
        );
    }

    // Summary status (for header)
    if (summary) {
        if (!summary.isSignedIn) {
            return (
                <button
                    onClick={onSignIn}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600"
                    title="Sign in to sync to Google Drive"
                >
                    ☁️ Sign in to sync
                </button>
            );
        }

        if (!summary.isOnline) {
            return (
                <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                    📴 Offline {summary.pending > 0 && `(${summary.pending} pending)`}
                </span>
            );
        }

        if (summary.isSyncing) {
            return (
                <span className="px-2 py-1 bg-blue-50 rounded text-xs text-blue-600 animate-pulse">
                    🔄 Syncing...
                </span>
            );
        }

        if (summary.pending > 0) {
            return (
                <button
                    onClick={() => SyncManager.syncPending()}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 rounded text-xs text-amber-600"
                >
                    ⏳ {summary.pending} pending
                </button>
            );
        }

        if (summary.errors > 0) {
            return (
                <button
                    onClick={() => SyncManager.syncPending()}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-xs text-red-600"
                >
                    ⚠️ {summary.errors} failed
                </button>
            );
        }

        return (
            <span className="px-2 py-1 bg-green-50 rounded text-xs text-green-600">
                ☁️ All synced
            </span>
        );
    }

    return null;
};

/**
 * Read-Only Banner - Shows when viewing in read-only mode
 */
const ReadOnlyBanner = ({ 
    isVisible, 
    onUnlockClick,
    userName = null
}) => {
    if (!isVisible) return null;

    return (
        <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-amber-600">👁️</span>
                <span className="text-sm text-amber-800">
                    {userName 
                        ? `Viewing as ${userName} (read-only)` 
                        : 'You are viewing this inscription in read-only mode'
                    }
                </span>
            </div>
            <button
                onClick={onUnlockClick}
                className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-sm font-medium"
            >
                🔓 Unlock Editing
            </button>
        </div>
    );
};

/**
 * Edit Mode Indicator - Shows current user when editing
 */
const EditModeIndicator = ({ user, onLogout }) => {
    if (!user) return null;

    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
            <span className="text-green-600">✏️</span>
            <span className="text-sm text-green-800 font-medium">{user.name}</span>
            <span className="text-xs text-green-600 px-1.5 py-0.5 bg-green-100 rounded">
                {user.role}
            </span>
            <button
                onClick={onLogout}
                className="text-green-500 hover:text-green-700 text-sm ml-1"
                title="Switch to view-only"
            >
                ✕
            </button>
        </div>
    );
};

// Make components globally available
window.UnlockModal = UnlockModal;
window.UserManagementPanel = UserManagementPanel;
window.SyncStatusIndicator = SyncStatusIndicator;
window.ReadOnlyBanner = ReadOnlyBanner;
window.EditModeIndicator = EditModeIndicator;

console.log('✅ AccessControlUI components loaded');
