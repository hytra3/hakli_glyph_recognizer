// ============================================
// SYNC MANAGER - Battery Efficient Edition
// Offline-first storage with smart auto-sync
// - Pauses when tab is hidden
// - Only polls when there are pending items
// - Exponential backoff on failures
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
    _syncInterval: null,
    _lastSyncCheck: null,
    _isTabVisible: !document.hidden,

    // Configuration
    CONFIG: {
        SYNC_DEBOUNCE_MS: 2000,       // Wait before syncing after change
        BASE_RETRY_DELAY_MS: 30000,   // Base retry delay (30s)
        MAX_RETRY_DELAY_MS: 300000,   // Max retry delay (5 min)
        MAX_RETRIES: 3,               // Max retry attempts per file
        SYNC_CHECK_INTERVAL: 60000,   // Check every minute (only when pending)
        PENDING_KEY: 'hakli_pending_sync',
        VERBOSE_LOGGING: false        // Set to true for debug logging
    },

    /**
     * Initialize sync manager
     */
    initialize: () => {
        // Listen for online/offline events
        window.addEventListener('online', SyncManager._handleOnline);
        window.addEventListener('offline', SyncManager._handleOffline);
        
        // Listen for visibility change - pause when hidden
        document.addEventListener('visibilitychange', SyncManager._handleVisibilityChange);
        
        // Load pending queue from storage
        SyncManager._loadPendingQueue();
        
        console.log('✅ SyncManager initialized', {
            online: SyncManager._isOnline,
            pendingCount: SyncManager._syncQueue.length
        });
        
        // Only start polling if there are pending items
        if (SyncManager._syncQueue.length > 0) {
            SyncManager._startPolling();
        }
        
        // Initial sync attempt if online and have pending items
        if (SyncManager._isOnline && SyncManager._syncQueue.length > 0) {
            setTimeout(() => SyncManager.syncPending(), 1000);
        }
    },

    /**
     * Handle visibility change - pause/resume polling
     * @private
     */
    _handleVisibilityChange: () => {
        SyncManager._isTabVisible = !document.hidden;
        
        if (SyncManager._isTabVisible) {
            // Tab became visible - resume if needed
            if (SyncManager.CONFIG.VERBOSE_LOGGING) {
                console.log('👁️ Tab visible - checking sync');
            }
            
            if (SyncManager._syncQueue.length > 0) {
                SyncManager._startPolling();
                // Try immediate sync
                if (SyncManager._isOnline) {
                    SyncManager.syncPending();
                }
            }
        } else {
            // Tab hidden - pause polling to save battery
            if (SyncManager.CONFIG.VERBOSE_LOGGING) {
                console.log('😴 Tab hidden - pausing sync');
            }
            SyncManager._stopPolling();
        }
    },

    /**
     * Start polling interval (only when needed)
     * @private
     */
    _startPolling: () => {
        if (SyncManager._syncInterval) return; // Already polling
        
        SyncManager._syncInterval = setInterval(() => {
            // Only sync if:
            // 1. Tab is visible
            // 2. We're online
            // 3. Not already syncing
            // 4. There are pending items
            if (SyncManager._isTabVisible && 
                SyncManager._isOnline && 
                !SyncManager._isSyncing &&
                SyncManager._syncQueue.length > 0) {
                SyncManager.syncPending();
            }
        }, SyncManager.CONFIG.SYNC_CHECK_INTERVAL);
        
        if (SyncManager.CONFIG.VERBOSE_LOGGING) {
            console.log('⏰ Sync polling started');
        }
    },

    /**
     * Stop polling interval
     * @private
     */
    _stopPolling: () => {
        if (SyncManager._syncInterval) {
            clearInterval(SyncManager._syncInterval);
            SyncManager._syncInterval = null;
            
            if (SyncManager.CONFIG.VERBOSE_LOGGING) {
                console.log('⏰ Sync polling stopped');
            }
        }
        
        // Also clear retry timeout
        if (SyncManager._retryTimeout) {
            clearTimeout(SyncManager._retryTimeout);
            SyncManager._retryTimeout = null;
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
        
        // Only attempt sync if we have pending items and tab is visible
        if (SyncManager._syncQueue.length > 0 && SyncManager._isTabVisible) {
            setTimeout(() => SyncManager.syncPending(), 1000);
        }
    },

    /**
     * Handle going offline
     * @private
     */
    _handleOffline: () => {
        console.log('📴 Connection lost');
        SyncManager._isOnline = false;
        SyncManager._notifyListeners({ type: 'offline' });
        
        // Stop polling when offline
        SyncManager._stopPolling();
    },

    /**
     * Save an HKI file with sync support
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
        
        // 2. Save to localStorage
        try {
            const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE?.INSCRIPTION_KEY) 
                || 'hakli_inscriptions';
            const cache = JSON.parse(localStorage.getItem(storageKey) || '{}');
            cache[inscriptionId] = hkiData;
            localStorage.setItem(storageKey, JSON.stringify(cache));
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
        if (downloadLocal && typeof Utils !== 'undefined') {
            Utils.downloadBlob(Utils.createJsonBlob(hkiData), generatedFilename);
        }
        
        // 4. Attempt cloud sync if requested and online
        let cloudResult = null;
        if (syncToCloud) {
            if (SyncManager._isOnline && typeof DriveSync !== 'undefined' && DriveSync.isSignedIn()) {
                cloudResult = await SyncManager._syncSingleFile(inscriptionId, hkiData);
            } else {
                // Add to pending queue and start polling
                SyncManager._addToPendingQueue(inscriptionId);
                SyncManager._startPolling();
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
        if (typeof DriveSync === 'undefined') {
            return { success: false, error: 'DriveSync not available' };
        }
        
        try {
            console.log(`☁️ Syncing ${inscriptionId}...`);
            
            // Update status to syncing
            hkiData.syncStatus.status = SyncManager.STATUS.SYNCING;
            SyncManager._updateLocalCache(inscriptionId, hkiData);
            SyncManager._notifyListeners({ type: 'syncing', inscriptionId });
            
            // Attempt upload
            const result = await DriveSync.saveToCloud(hkiData, `${inscriptionId}.hki`);
            
            if (result.success || result.id) {
                // Update sync metadata
                hkiData.syncStatus = {
                    status: SyncManager.STATUS.SYNCED,
                    lastLocalSave: hkiData.syncStatus.lastLocalSave,
                    lastSynced: new Date().toISOString(),
                    driveFileId: result.fileId || result.id,
                    retryCount: 0
                };
                
                SyncManager._updateLocalCache(inscriptionId, hkiData);
                SyncManager._removeFromPendingQueue(inscriptionId);
                
                console.log(`✅ Synced: ${inscriptionId}`);
                SyncManager._notifyListeners({ 
                    type: 'synced', 
                    inscriptionId,
                    driveFileId: result.fileId || result.id
                });
                
                // Stop polling if nothing left
                if (SyncManager._syncQueue.length === 0) {
                    SyncManager._stopPolling();
                }
                
                return { success: true, fileId: result.fileId || result.id };
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
     */
    syncPending: async () => {
        if (SyncManager._isSyncing) {
            return { skipped: true, reason: 'Already syncing' };
        }
        
        if (!SyncManager._isOnline) {
            return { skipped: true, reason: 'Offline' };
        }
        
        if (typeof DriveSync === 'undefined' || !DriveSync.isSignedIn()) {
            return { skipped: true, reason: 'Not signed in' };
        }
        
        const pendingIds = SyncManager._getPendingQueue();
        if (pendingIds.length === 0) {
            // Don't log anything - nothing to do
            SyncManager._stopPolling(); // No need to poll anymore
            return { synced: 0, failed: 0 };
        }
        
        console.log(`☁️ Syncing ${pendingIds.length} pending files...`);
        SyncManager._isSyncing = true;
        SyncManager._notifyListeners({ type: 'sync_started', count: pendingIds.length });
        
        const results = { synced: 0, failed: 0, errors: [] };
        const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE?.INSCRIPTION_KEY) 
            || 'hakli_inscriptions';
        const cache = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        for (const inscriptionId of pendingIds) {
            // Check if tab is still visible - abort if hidden
            if (!SyncManager._isTabVisible) {
                console.log('😴 Tab hidden - pausing sync');
                break;
            }
            
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
            
            // Small delay between syncs
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        SyncManager._isSyncing = false;
        SyncManager._lastSyncCheck = new Date().toISOString();
        
        if (results.synced > 0 || results.failed > 0) {
            console.log(`☁️ Sync complete: ${results.synced} synced, ${results.failed} failed`);
        }
        
        SyncManager._notifyListeners({ type: 'sync_complete', results });
        
        // Schedule retry with exponential backoff if there were failures
        if (results.failed > 0 && !SyncManager._retryTimeout && SyncManager._isTabVisible) {
            const retryDelay = Math.min(
                SyncManager.CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, results.failed - 1),
                SyncManager.CONFIG.MAX_RETRY_DELAY_MS
            );
            
            SyncManager._retryTimeout = setTimeout(() => {
                SyncManager._retryTimeout = null;
                if (SyncManager._isTabVisible) {
                    SyncManager.syncPending();
                }
            }, retryDelay);
        }
        
        // Stop polling if nothing left
        if (SyncManager._syncQueue.length === 0) {
            SyncManager._stopPolling();
        }
        
        return results;
    },

    /**
     * Get sync status for a specific file
     */
    getStatus: (inscriptionId) => {
        const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE?.INSCRIPTION_KEY) 
            || 'hakli_inscriptions';
        const cache = JSON.parse(localStorage.getItem(storageKey) || '{}');
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
            isSignedIn: typeof DriveSync !== 'undefined' && DriveSync.isSignedIn()
        };
    },

    /**
     * Get sync status summary
     */
    getSummary: () => {
        const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE?.INSCRIPTION_KEY) 
            || 'hakli_inscriptions';
        const cache = JSON.parse(localStorage.getItem(storageKey) || '{}');
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
            isSignedIn: typeof DriveSync !== 'undefined' && DriveSync.isSignedIn(),
            isSyncing: SyncManager._isSyncing,
            isPolling: SyncManager._syncInterval !== null,
            isTabVisible: SyncManager._isTabVisible,
            lastSyncCheck: SyncManager._lastSyncCheck
        };
    },

    /**
     * Force retry sync for a specific file
     */
    retrySingle: async (inscriptionId) => {
        const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE?.INSCRIPTION_KEY) 
            || 'hakli_inscriptions';
        const cache = JSON.parse(localStorage.getItem(storageKey) || '{}');
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
        const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE?.INSCRIPTION_KEY) 
            || 'hakli_inscriptions';
        const cache = JSON.parse(localStorage.getItem(storageKey) || '{}');
        cache[inscriptionId] = hkiData;
        localStorage.setItem(storageKey, JSON.stringify(cache));
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
    }
};

// Make globally available
window.SyncManager = SyncManager;

console.log('✅ SyncManager (Battery Efficient) loaded');
