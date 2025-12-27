// ============================================
// ACCESS CONTROL
// Keyword-based authentication and user tracking
// ============================================

const AccessControl = {
    // Permission levels
    PERMISSIONS: {
        VIEW: 'view',
        COMMENT: 'comment', 
        EDIT: 'edit',
        DELETE: 'delete',
        MANAGE_USERS: 'manage-users'
    },

    // Role presets
    ROLES: {
        OWNER: {
            name: 'owner',
            permissions: ['view', 'comment', 'edit', 'delete', 'manage-users']
        },
        EDITOR: {
            name: 'editor', 
            permissions: ['view', 'comment', 'edit']
        },
        COMMENTER: {
            name: 'commenter',
            permissions: ['view', 'comment']
        },
        VIEWER: {
            name: 'viewer',
            permissions: ['view']
        }
    },

    // Current session state
    _currentUser: null,
    _currentPermissions: ['view'], // Default: view only

    /**
     * Hash a keyword for secure storage
     * Using simple hash for client-side (not cryptographically secure, but sufficient for this use case)
     * @param {string} keyword - Plain text keyword
     * @returns {string} Hashed keyword
     */
    hashKeyword: (keyword) => {
        if (!keyword) return null;
        
        // Simple hash function (djb2)
        let hash = 5381;
        for (let i = 0; i < keyword.length; i++) {
            hash = ((hash << 5) + hash) + keyword.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return 'kh_' + Math.abs(hash).toString(36);
    },

    /**
     * Create default access control structure for new HKI file
     * @param {string} ownerName - Name of the owner
     * @param {string} ownerKeyword - Owner's edit keyword
     * @returns {Object} Access control structure
     */
    createDefaultAccessControl: (ownerName, ownerKeyword) => {
        return {
            isPublic: true,
            createdBy: ownerName,
            createdAt: new Date().toISOString(),
            editKeys: {
                [AccessControl.hashKeyword(ownerKeyword)]: {
                    name: ownerName,
                    role: 'owner',
                    permissions: AccessControl.ROLES.OWNER.permissions,
                    addedAt: new Date().toISOString(),
                    addedBy: ownerName,
                    lastAccess: null
                }
            },
            accessLog: []
        };
    },

    /**
     * Add a new user/keyword to access control
     * @param {Object} accessControl - Existing access control object
     * @param {string} keyword - New keyword
     * @param {string} userName - User's display name
     * @param {string} role - Role name (owner/editor/commenter/viewer)
     * @param {string} addedBy - Name of user adding this access
     * @returns {Object} Updated access control
     */
    addUser: (accessControl, keyword, userName, role, addedBy) => {
        const roleConfig = AccessControl.ROLES[role.toUpperCase()] || AccessControl.ROLES.VIEWER;
        const hash = AccessControl.hashKeyword(keyword);
        
        if (accessControl.editKeys[hash]) {
            console.warn('⚠️ Keyword already exists, updating...');
        }
        
        accessControl.editKeys[hash] = {
            name: userName,
            role: roleConfig.name,
            permissions: roleConfig.permissions,
            addedAt: new Date().toISOString(),
            addedBy: addedBy,
            lastAccess: null
        };
        
        // Log the action
        accessControl.accessLog.push({
            action: 'user_added',
            targetUser: userName,
            role: roleConfig.name,
            by: addedBy,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Added user "${userName}" with role "${roleConfig.name}"`);
        return accessControl;
    },

    /**
     * Remove a user/keyword from access control
     * @param {Object} accessControl - Access control object
     * @param {string} keyword - Keyword to revoke
     * @param {string} revokedBy - Name of user revoking access
     * @returns {Object} Updated access control
     */
    removeUser: (accessControl, keyword, revokedBy) => {
        const hash = AccessControl.hashKeyword(keyword);
        const user = accessControl.editKeys[hash];
        
        if (!user) {
            console.warn('⚠️ Keyword not found');
            return accessControl;
        }
        
        // Prevent removing the last owner
        const owners = Object.values(accessControl.editKeys).filter(u => u.role === 'owner');
        if (user.role === 'owner' && owners.length <= 1) {
            console.error('❌ Cannot remove the last owner');
            return accessControl;
        }
        
        // Log before removing
        accessControl.accessLog.push({
            action: 'user_removed',
            targetUser: user.name,
            role: user.role,
            by: revokedBy,
            timestamp: new Date().toISOString()
        });
        
        delete accessControl.editKeys[hash];
        console.log(`✅ Removed user "${user.name}"`);
        return accessControl;
    },

    /**
     * Authenticate with a keyword
     * @param {Object} accessControl - Access control object
     * @param {string} keyword - Keyword to try
     * @returns {Object|null} User info if valid, null if invalid
     */
    authenticate: (accessControl, keyword) => {
        if (!accessControl || !accessControl.editKeys) {
            console.warn('⚠️ No access control configured');
            return null;
        }
        
        const hash = AccessControl.hashKeyword(keyword);
        const user = accessControl.editKeys[hash];
        
        if (!user) {
            console.log('❌ Invalid keyword');
            AccessControl._logAccess(accessControl, null, 'login_failed');
            return null;
        }
        
        // Update last access
        user.lastAccess = new Date().toISOString();
        
        // Set current session
        AccessControl._currentUser = user;
        AccessControl._currentPermissions = user.permissions;
        
        // Log successful access
        AccessControl._logAccess(accessControl, user.name, 'login_success');
        
        console.log(`✅ Authenticated as "${user.name}" (${user.role})`);
        return {
            name: user.name,
            role: user.role,
            permissions: user.permissions
        };
    },

    /**
     * Log an access event
     * @private
     */
    _logAccess: (accessControl, userName, action) => {
        if (!accessControl.accessLog) {
            accessControl.accessLog = [];
        }
        
        accessControl.accessLog.push({
            action: action,
            user: userName,
            timestamp: new Date().toISOString(),
            // Don't log IP in browser context, but could add device info
            userAgent: navigator.userAgent.substring(0, 100)
        });
        
        // Keep log manageable (last 100 entries)
        if (accessControl.accessLog.length > 100) {
            accessControl.accessLog = accessControl.accessLog.slice(-100);
        }
    },

    /**
     * Check if current session has a specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean}
     */
    hasPermission: (permission) => {
        return AccessControl._currentPermissions.includes(permission);
    },

    /**
     * Check if user can edit
     * @returns {boolean}
     */
    canEdit: () => {
        return AccessControl.hasPermission(AccessControl.PERMISSIONS.EDIT);
    },

    /**
     * Check if user can comment
     * @returns {boolean}
     */
    canComment: () => {
        return AccessControl.hasPermission(AccessControl.PERMISSIONS.COMMENT);
    },

    /**
     * Check if user can manage users
     * @returns {boolean}
     */
    canManageUsers: () => {
        return AccessControl.hasPermission(AccessControl.PERMISSIONS.MANAGE_USERS);
    },

    /**
     * Get current user info
     * @returns {Object|null}
     */
    getCurrentUser: () => {
        return AccessControl._currentUser;
    },

    /**
     * Clear current session (logout)
     */
    logout: () => {
        const userName = AccessControl._currentUser?.name;
        AccessControl._currentUser = null;
        AccessControl._currentPermissions = ['view'];
        console.log(`👋 Logged out${userName ? ` (was: ${userName})` : ''}`);
    },

    /**
     * Get list of users for management UI
     * @param {Object} accessControl - Access control object
     * @returns {Array} List of users (without keyword hashes)
     */
    listUsers: (accessControl) => {
        if (!accessControl?.editKeys) return [];
        
        return Object.entries(accessControl.editKeys).map(([hash, user]) => ({
            id: hash,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            addedAt: user.addedAt,
            addedBy: user.addedBy,
            lastAccess: user.lastAccess
        }));
    },

    /**
     * Update user's role
     * @param {Object} accessControl - Access control object
     * @param {string} keywordHash - Hash of user's keyword
     * @param {string} newRole - New role
     * @param {string} updatedBy - Who made the change
     * @returns {Object} Updated access control
     */
    updateUserRole: (accessControl, keywordHash, newRole, updatedBy) => {
        const user = accessControl.editKeys[keywordHash];
        if (!user) {
            console.warn('⚠️ User not found');
            return accessControl;
        }
        
        const roleConfig = AccessControl.ROLES[newRole.toUpperCase()] || AccessControl.ROLES.VIEWER;
        const oldRole = user.role;
        
        user.role = roleConfig.name;
        user.permissions = roleConfig.permissions;
        
        accessControl.accessLog.push({
            action: 'role_changed',
            targetUser: user.name,
            oldRole: oldRole,
            newRole: roleConfig.name,
            by: updatedBy,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Updated "${user.name}" from ${oldRole} to ${roleConfig.name}`);
        return accessControl;
    },

    /**
     * Create a contributor entry for version history
     * @param {string} action - What was done
     * @returns {Object} Contributor info for version entry
     */
    getContributorInfo: (action) => {
        const user = AccessControl._currentUser;
        return {
            name: user?.name || 'Anonymous',
            role: user?.role || 'viewer',
            action: action,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Generate a random keyword suggestion
     * @param {number} length - Keyword length
     * @returns {string} Random keyword
     */
    generateKeyword: (length = 8) => {
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Avoid confusing chars
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Migrate old HKI files without access control
     * @param {Object} hkiData - HKI file data
     * @param {string} ownerName - Name to assign as owner
     * @param {string} ownerKeyword - Keyword for owner
     * @returns {Object} HKI data with access control added
     */
    migrateOldFile: (hkiData, ownerName, ownerKeyword) => {
        if (hkiData.accessControl) {
            console.log('📋 File already has access control');
            return hkiData;
        }
        
        hkiData.accessControl = AccessControl.createDefaultAccessControl(ownerName, ownerKeyword);
        
        // Try to infer owner from existing data
        if (hkiData.versions?.length > 0) {
            const firstContributor = hkiData.versions[0].contributor;
            if (firstContributor && firstContributor !== 'User') {
                hkiData.accessControl.createdBy = firstContributor;
            }
        }
        
        console.log('✅ Migrated file to include access control');
        return hkiData;
    }
};

// Make globally available
window.AccessControl = AccessControl;

console.log('✅ AccessControl loaded');
