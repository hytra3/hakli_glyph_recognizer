// ============================================
// SYNC MANAGER
// Offline-first storage with auto-sync to Google Drive
// ============================================

const SyncManager = {
    // Sync status constants
    STATUS: {
        SYNCED: 'synced',
        PENDING: 'pending',
        SYNCING: 'syncing',
        ERROR: 'error',
        OFFLINE: 'offline',
        CONFLICT: 'conflict'
    },

    // State
    _isOnline: navigator.onLine,
    _isSyncing: false,
    _syncQueue: [],
    _listeners: [],
    _retryTimeout: null,
    _lastSyncCheck: null,

    // Configuration
    CONFIG: {
        SYNC_DEBOUNCE_MS: 2000,      // Wait before syncing after change
        RETRY_DELAY_MS: 30000,        // Retry failed syncs after 30s
        MAX_RETRIES: 3,               // Max retry attempts
        SYNC_CHECK_INTERVAL: 60000,   // Check for sync every minute
        PENDING_KEY: 'hakli_pending_sync'
    },

    /**
     * Initialize sync manager
     * Sets up event listeners for online/offline status
     */
    initialize: () => {
        // Listen for online/offline events
        window.addEventListener('online', SyncManager._handleOnline);
        window.addEventListener('offline', SyncManager._handleOffline);
        
        // Listen for visibility change (sync when tab becomes active)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && SyncManager._isOnline) {
                SyncManager.syncPending();
            }
        });
        
        // Periodic sync check
        setInterval(() => {
            if (SyncManager._isOnline && !SyncManager._isSyncing) {
                SyncManager.syncPending();
            }
        }, SyncManager.CONFIG.SYNC_CHECK_INTERVAL);
        
        // Load pending queue from storage
        SyncManager._loadPendingQueue();
        
        console.log('✅ SyncManager initialized', {
            online: SyncManager._isOnline,
            pendingCount: SyncManager._syncQueue.length
        });
        
        // Initial sync attempt if online
        if (SyncManager._isOnline) {
            setTimeout(() => SyncManager.syncPending(), 1000);
        }
    },

    /**
     * Handle coming online
     * @private
     */
    _handleOnline: () => {
        console.log('🌐 Connection restored');
        SyncManager._isOnline = true;
        SyncManager._notifyListeners({ type: 'online' });
        
        // Attempt to sync pending items
        setTimeout(() => SyncManager.syncPending(), 1000);
    },

    /**
     * Handle going offline
     * @private
     */
    _handleOffline: () => {
        console.log('📴 Connection lost');
        SyncManager._isOnline = false;
        SyncManager._notifyListeners({ type: 'offline' });
        
        // Clear any retry timeout
        if (SyncManager._retryTimeout) {
            clearTimeout(SyncManager._retryTimeout);
            SyncManager._retryTimeout = null;
        }
    },

    /**
     * Save an HKI file with sync support
     * Always saves locally first, then tries to sync
     * @param {Object} hkiData - HKI file data
     * @param {Object} options - Save options
     * @returns {Object} Save result
     */
    save: async (hkiData, options = {}) => {
        const {
            filename = null,
            downloadLocal = true,
            syncToCloud = true
        } = options;
        
        const inscriptionId = hkiData.inscriptionId;
        const generatedFilename = filename || `${inscriptionId}.hki`;
        
        // 1. Add sync metadata
        hkiData.syncStatus = {
            status: SyncManager.STATUS.PENDING,
            lastLocalSave: new Date().toISOString(),
            lastSynced: hkiData.syncStatus?.lastSynced || null,
            driveFileId: hkiData.syncStatus?.driveFileId || null,
            retryCount: 0
        };
        
        // 2. Save to localStorage (always - this is our source of truth)
        try {
            const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
            cache[inscriptionId] = hkiData;
            localStorage.setItem(CONFIG.STORAGE.INSCRIPTION_KEY, JSON.stringify(cache));
            console.log(`💾 Saved locally: ${inscriptionId}`);
        } catch (error) {
            console.error('Local save failed:', error);
            return {
                success: false,
                error: 'Local save failed: ' + error.message,
                location: 'local'
            };
        }
        
        // 3. Download file if requested
        if (downloadLocal) {
            Utils.downloadBlob(Utils.createJsonBlob(hkiData), generatedFilename);
        }
        
        // 4. Attempt cloud sync if requested and online
        let cloudResult = null;
        if (syncToCloud) {
            if (SyncManager._isOnline && DriveSync.isSignedIn()) {
                cloudResult = await SyncManager._syncSingleFile(inscriptionId, hkiData);
            } else {
                // Add to pending queue
                SyncManager._addToPendingQueue(inscriptionId);
                cloudResult = {
                    success: false,
                    pending: true,
                    reason: SyncManager._isOnline ? 'Not signed in to Drive' : 'Offline'
                };
            }
        }
        
        // 5. Notify listeners
        SyncManager._notifyListeners({
            type: 'save',
            inscriptionId,
            localSuccess: true,
            cloudResult
        });
        
        return {
            success: true,
            inscriptionId,
            filename: generatedFilename,
            syncStatus: hkiData.syncStatus.status,
            cloudResult
        };
    },

    /**
     * Sync a single file to Drive
     * @private
     */
    _syncSingleFile: async (inscriptionId, hkiData) => {
        try {
            console.log(`☁️ Syncing ${inscriptionId}...`);
            
            // Update status to syncing
            hkiData.syncStatus.status = SyncManager.STATUS.SYNCING;
            SyncManager._updateLocalCache(inscriptionId, hkiData);
            SyncManager._notifyListeners({ type: 'syncing', inscriptionId });
            
            // Attempt upload
            const result = await DriveSync.saveToCloud(hkiData, `${inscriptionId}.hki`);
            
            if (result.success) {
                // Update sync metadata
                hkiData.syncStatus = {
                    status: SyncManager.STATUS.SYNCED,
                    lastLocalSave: hkiData.syncStatus.lastLocalSave,
                    lastSynced: new Date().toISOString(),
                    driveFileId: result.fileId,
                    retryCount: 0
                };
                
                SyncManager._updateLocalCache(inscriptionId, hkiData);
                SyncManager._removeFromPendingQueue(inscriptionId);
                
                console.log(`✅ Synced: ${inscriptionId}`);
                SyncManager._notifyListeners({ 
                    type: 'synced', 
                    inscriptionId,
                    driveFileId: result.fileId
                });
                
                return { success: true, fileId: result.fileId };
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error) {
            console.error(`❌ Sync failed for ${inscriptionId}:`, error);
            
            // Update status to error
            hkiData.syncStatus.status = SyncManager.STATUS.ERROR;
            hkiData.syncStatus.lastError = error.message;
            hkiData.syncStatus.retryCount = (hkiData.syncStatus.retryCount || 0) + 1;
            
            SyncManager._updateLocalCache(inscriptionId, hkiData);
            SyncManager._addToPendingQueue(inscriptionId);
            
            SyncManager._notifyListeners({
                type: 'error',
                inscriptionId,
                error: error.message
            });
            
            return { success: false, error: error.message };
        }
    },

    /**
     * Sync all pending files
     * @returns {Object} Sync results summary
     */
    syncPending: async () => {
        if (SyncManager._isSyncing) {
            console.log('⏳ Sync already in progress');
            return { skipped: true, reason: 'Already syncing' };
        }
        
        if (!SyncManager._isOnline) {
            console.log('📴 Cannot sync: offline');
            return { skipped: true, reason: 'Offline' };
        }
        
        if (!DriveSync.isSignedIn()) {
            console.log('🔒 Cannot sync: not signed in');
            return { skipped: true, reason: 'Not signed in' };
        }
        
        const pendingIds = SyncManager._getPendingQueue();
        if (pendingIds.length === 0) {
            console.log('✨ Nothing to sync');
            return { synced: 0, failed: 0 };
        }
        
        console.log(`☁️ Syncing ${pendingIds.length} pending files...`);
        SyncManager._isSyncing = true;
        SyncManager._notifyListeners({ type: 'sync_started', count: pendingIds.length });
        
        const results = { synced: 0, failed: 0, errors: [] };
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        
        for (const inscriptionId of pendingIds) {
            const hkiData = cache[inscriptionId];
            if (!hkiData) {
                SyncManager._removeFromPendingQueue(inscriptionId);
                continue;
            }
            
            // Skip if too many retries
            if ((hkiData.syncStatus?.retryCount || 0) >= SyncManager.CONFIG.MAX_RETRIES) {
                console.warn(`⚠️ Skipping ${inscriptionId}: max retries exceeded`);
                results.failed++;
                results.errors.push({ id: inscriptionId, error: 'Max retries exceeded' });
                continue;
            }
            
            const result = await SyncManager._syncSingleFile(inscriptionId, hkiData);
            
            if (result.success) {
                results.synced++;
            } else {
                results.failed++;
                results.errors.push({ id: inscriptionId, error: result.error });
            }
            
            // Small delay between syncs to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        SyncManager._isSyncing = false;
        SyncManager._lastSyncCheck = new Date().toISOString();
        
        console.log(`☁️ Sync complete: ${results.synced} synced, ${results.failed} failed`);
        SyncManager._notifyListeners({ 
            type: 'sync_complete', 
            results 
        });
        
        // Schedule retry if there were failures
        if (results.failed > 0 && !SyncManager._retryTimeout) {
            SyncManager._retryTimeout = setTimeout(() => {
                SyncManager._retryTimeout = null;
                SyncManager.syncPending();
            }, SyncManager.CONFIG.RETRY_DELAY_MS);
        }
        
        return results;
    },

    /**
     * Get sync status for a specific file
     * @param {string} inscriptionId - Inscription ID
     * @returns {Object} Sync status
     */
    getStatus: (inscriptionId) => {
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const hkiData = cache[inscriptionId];
        
        if (!hkiData) {
            return { status: 'not_found' };
        }
        
        const syncStatus = hkiData.syncStatus || {};
        const isPending = SyncManager._getPendingQueue().includes(inscriptionId);
        
        return {
            status: isPending ? SyncManager.STATUS.PENDING : (syncStatus.status || SyncManager.STATUS.PENDING),
            lastLocalSave: syncStatus.lastLocalSave,
            lastSynced: syncStatus.lastSynced,
            driveFileId: syncStatus.driveFileId,
            retryCount: syncStatus.retryCount || 0,
            lastError: syncStatus.lastError,
            isOnline: SyncManager._isOnline,
            isSignedIn: DriveSync.isSignedIn()
        };
    },

    /**
     * Get sync status summary for all files
     * @returns {Object} Summary
     */
    getSummary: () => {
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const pending = SyncManager._getPendingQueue();
        
        let synced = 0, unsynced = 0, errors = 0;
        
        Object.entries(cache).forEach(([id, hki]) => {
            const status = hki.syncStatus?.status;
            if (status === SyncManager.STATUS.SYNCED) synced++;
            else if (status === SyncManager.STATUS.ERROR) errors++;
            else unsynced++;
        });
        
        return {
            total: Object.keys(cache).length,
            synced,
            pending: pending.length,
            errors,
            isOnline: SyncManager._isOnline,
            isSignedIn: DriveSync.isSignedIn(),
            isSyncing: SyncManager._isSyncing,
            lastSyncCheck: SyncManager._lastSyncCheck
        };
    },

    /**
     * Force retry sync for a specific file
     * @param {string} inscriptionId - Inscription ID
     */
    retrySingle: async (inscriptionId) => {
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const hkiData = cache[inscriptionId];
        
        if (!hkiData) {
            console.warn(`⚠️ File not found: ${inscriptionId}`);
            return { success: false, error: 'File not found' };
        }
        
        // Reset retry count
        hkiData.syncStatus = hkiData.syncStatus || {};
        hkiData.syncStatus.retryCount = 0;
        SyncManager._updateLocalCache(inscriptionId, hkiData);
        
        return await SyncManager._syncSingleFile(inscriptionId, hkiData);
    },

    /**
     * Add listener for sync events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    addListener: (callback) => {
        SyncManager._listeners.push(callback);
        return () => {
            SyncManager._listeners = SyncManager._listeners.filter(l => l !== callback);
        };
    },

    /**
     * Notify all listeners
     * @private
     */
    _notifyListeners: (event) => {
        SyncManager._listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    },

    /**
     * Update local cache
     * @private
     */
    _updateLocalCache: (inscriptionId, hkiData) => {
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        cache[inscriptionId] = hkiData;
        localStorage.setItem(CONFIG.STORAGE.INSCRIPTION_KEY, JSON.stringify(cache));
    },

    /**
     * Add to pending sync queue
     * @private
     */
    _addToPendingQueue: (inscriptionId) => {
        const queue = SyncManager._getPendingQueue();
        if (!queue.includes(inscriptionId)) {
            queue.push(inscriptionId);
            localStorage.setItem(SyncManager.CONFIG.PENDING_KEY, JSON.stringify(queue));
            SyncManager._syncQueue = queue;
        }
    },

    /**
     * Remove from pending sync queue
     * @private
     */
    _removeFromPendingQueue: (inscriptionId) => {
        const queue = SyncManager._getPendingQueue().filter(id => id !== inscriptionId);
        localStorage.setItem(SyncManager.CONFIG.PENDING_KEY, JSON.stringify(queue));
        SyncManager._syncQueue = queue;
    },

    /**
     * Get pending sync queue
     * @private
     */
    _getPendingQueue: () => {
        try {
            return JSON.parse(localStorage.getItem(SyncManager.CONFIG.PENDING_KEY) || '[]');
        } catch {
            return [];
        }
    },

    /**
     * Load pending queue from storage
     * @private
     */
    _loadPendingQueue: () => {
        SyncManager._syncQueue = SyncManager._getPendingQueue();
    },

    /**
     * Check for conflicts between local and remote versions
     * @param {string} inscriptionId - Inscription ID
     * @returns {Object} Conflict check result
     */
    checkConflict: async (inscriptionId) => {
        if (!SyncManager._isOnline || !DriveSync.isSignedIn()) {
            return { canCheck: false, reason: 'Offline or not signed in' };
        }
        
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const localData = cache[inscriptionId];
        
        if (!localData?.syncStatus?.driveFileId) {
            return { hasConflict: false, reason: 'No remote version' };
        }
        
        try {
            const remoteData = await DriveSync.loadFromCloud(localData.syncStatus.driveFileId);
            
            // Compare versions
            const localVersion = localData.currentVersion || 1;
            const remoteVersion = remoteData.currentVersion || 1;
            
            if (remoteVersion > localVersion) {
                return {
                    hasConflict: true,
                    localVersion,
                    remoteVersion,
                    remotelastModified: remoteData.lastModified
                };
            }
            
            return { hasConflict: false };
        } catch (error) {
            console.error('Conflict check failed:', error);
            return { canCheck: false, error: error.message };
        }
    },

    /**
     * Pull latest version from Drive
     * @param {string} inscriptionId - Inscription ID
     * @returns {Object} Pull result
     */
    pullFromCloud: async (inscriptionId) => {
        if (!SyncManager._isOnline || !DriveSync.isSignedIn()) {
            return { success: false, error: 'Offline or not signed in' };
        }
        
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const localData = cache[inscriptionId];
        
        if (!localData?.syncStatus?.driveFileId) {
            return { success: false, error: 'No remote version to pull' };
        }
        
        try {
            const remoteData = await DriveSync.loadFromCloud(localData.syncStatus.driveFileId);
            
            // Preserve sync metadata
            remoteData.syncStatus = {
                status: SyncManager.STATUS.SYNCED,
                lastLocalSave: new Date().toISOString(),
                lastSynced: new Date().toISOString(),
                driveFileId: localData.syncStatus.driveFileId,
                retryCount: 0
            };
            
            cache[inscriptionId] = remoteData;
            localStorage.setItem(CONFIG.STORAGE.INSCRIPTION_KEY, JSON.stringify(cache));
            
            SyncManager._notifyListeners({
                type: 'pulled',
                inscriptionId,
                version: remoteData.currentVersion
            });
            
            return { success: true, data: remoteData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Make globally available
window.SyncManager = SyncManager;

console.log('✅ SyncManager loaded');
