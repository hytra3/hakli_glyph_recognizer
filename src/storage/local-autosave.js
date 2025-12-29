// ============================================
// LOCAL AUTO-SAVE
// Silent background saving to IndexedDB
// Works offline, persists across sessions
// ============================================

const LocalAutoSave = (() => {
    const DB_NAME = 'HakliGlyphRecognizer';
    const DB_VERSION = 1;
    const STORE_NAME = 'autosave';
    const AUTOSAVE_KEY = 'current_work';
    const BACKUP_PREFIX = 'backup_';
    const MAX_BACKUPS = 5;
    const SAVE_DEBOUNCE_MS = 30000; // Save 30 seconds after last change
    
    let db = null;
    let saveTimeout = null;
    let lastSaveTime = null;
    let onSaveCallback = null;
    
    /**
     * Initialize IndexedDB
     */
    const init = () => {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('❌ LocalAutoSave: Failed to open database');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                db = request.result;
                console.log('✅ LocalAutoSave: Database ready');
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                
                // Create object store if it doesn't exist
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    console.log('✅ LocalAutoSave: Store created');
                }
            };
        });
    };
    
    /**
     * Save data to IndexedDB
     */
    const saveToDb = async (key, data) => {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const record = {
                id: key,
                data: data,
                timestamp: new Date().toISOString()
            };
            
            const request = store.put(record);
            
            request.onsuccess = () => resolve(record);
            request.onerror = () => reject(request.error);
        });
    };
    
    /**
     * Load data from IndexedDB
     */
    const loadFromDb = async (key) => {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    };
    
    /**
     * Delete data from IndexedDB
     */
    const deleteFromDb = async (key) => {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    };
    
    /**
     * Get all keys from store
     */
    const getAllKeys = async () => {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    };
    
    /**
     * Clean up old backups, keeping only MAX_BACKUPS
     */
    const cleanupOldBackups = async () => {
        try {
            const keys = await getAllKeys();
            const backupKeys = keys
                .filter(k => k.startsWith(BACKUP_PREFIX))
                .sort()
                .reverse();
            
            // Delete excess backups
            if (backupKeys.length > MAX_BACKUPS) {
                const toDelete = backupKeys.slice(MAX_BACKUPS);
                for (const key of toDelete) {
                    await deleteFromDb(key);
                }
                console.log(`🧹 LocalAutoSave: Cleaned up ${toDelete.length} old backups`);
            }
        } catch (err) {
            console.warn('LocalAutoSave: Cleanup failed', err);
        }
    };
    
    /**
     * Save current work (debounced)
     */
    const scheduleSave = (getData) => {
        // Clear any pending save
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        // Schedule new save
        saveTimeout = setTimeout(async () => {
            try {
                const data = getData();
                if (!data || !data.recognitionResults || data.recognitionResults.length === 0) {
                    return; // Don't save empty work
                }
                
                // Save current work
                await saveToDb(AUTOSAVE_KEY, data);
                lastSaveTime = new Date();
                
                // Also create a timestamped backup
                const backupKey = BACKUP_PREFIX + Date.now();
                await saveToDb(backupKey, data);
                
                // Cleanup old backups
                await cleanupOldBackups();
                
                console.log('💾 LocalAutoSave: Saved at', lastSaveTime.toLocaleTimeString());
                
                // Notify callback if set
                if (onSaveCallback) {
                    onSaveCallback(lastSaveTime);
                }
            } catch (err) {
                console.error('❌ LocalAutoSave: Save failed', err);
            }
        }, SAVE_DEBOUNCE_MS);
    };
    
    /**
     * Force immediate save (for before page close)
     */
    const saveNow = async (data) => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
        
        if (!data || !data.recognitionResults || data.recognitionResults.length === 0) {
            return null;
        }
        
        try {
            await saveToDb(AUTOSAVE_KEY, data);
            lastSaveTime = new Date();
            console.log('💾 LocalAutoSave: Immediate save at', lastSaveTime.toLocaleTimeString());
            return lastSaveTime;
        } catch (err) {
            console.error('❌ LocalAutoSave: Immediate save failed', err);
            return null;
        }
    };
    
    /**
     * Load last autosaved work
     */
    const loadLastWork = async () => {
        try {
            const record = await loadFromDb(AUTOSAVE_KEY);
            if (record) {
                console.log('📂 LocalAutoSave: Found saved work from', record.timestamp);
                return {
                    data: record.data,
                    timestamp: record.timestamp
                };
            }
            return null;
        } catch (err) {
            console.error('❌ LocalAutoSave: Load failed', err);
            return null;
        }
    };
    
    /**
     * Check if there's saved work available
     */
    const hasSavedWork = async () => {
        try {
            const record = await loadFromDb(AUTOSAVE_KEY);
            return record !== null && record.data && record.data.recognitionResults;
        } catch (err) {
            return false;
        }
    };
    
    /**
     * Clear autosaved work (after successful cloud save)
     */
    const clearAutosave = async () => {
        try {
            await deleteFromDb(AUTOSAVE_KEY);
            lastSaveTime = null;
            console.log('🗑️ LocalAutoSave: Cleared autosave');
        } catch (err) {
            console.warn('LocalAutoSave: Clear failed', err);
        }
    };
    
    /**
     * Get last save time
     */
    const getLastSaveTime = () => lastSaveTime;
    
    /**
     * Set callback for when save completes
     */
    const onSave = (callback) => {
        onSaveCallback = callback;
    };
    
    /**
     * Get time since last save (human readable)
     */
    const getTimeSinceLastSave = () => {
        if (!lastSaveTime) return null;
        
        const seconds = Math.floor((new Date() - lastSaveTime) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 120) return '1 min ago';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 7200) return '1 hour ago';
        return Math.floor(seconds / 3600) + ' hours ago';
    };
    
    // Initialize on load
    init().catch(err => console.warn('LocalAutoSave init deferred:', err));
    
    return {
        init,
        scheduleSave,
        saveNow,
        loadLastWork,
        hasSavedWork,
        clearAutosave,
        getLastSaveTime,
        getTimeSinceLastSave,
        onSave
    };
})();

// Make globally available
window.LocalAutoSave = LocalAutoSave;

console.log('✅ LocalAutoSave module loaded');
