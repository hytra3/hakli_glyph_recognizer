// ============================================
// CACHE STORAGE
// Local storage management for application data
// ============================================

const CacheStorage = {
    /**
     * Save data to localStorage cache
     * @param {Object} data - Data to save
     * @param {string} key - Storage key (optional, uses default)
     * @returns {boolean} Success status
     */
    saveToCache: (data, key = null) => {
        try {
            const storageKey = key || `hakli_cache_${Date.now()}`;
            const jsonString = JSON.stringify(data);
            localStorage.setItem(storageKey, jsonString);
            
            console.log(`💾 Saved to cache: ${storageKey} (${(jsonString.length / 1024).toFixed(1)} KB)`);
            return true;
        } catch (error) {
            console.error('Failed to save to cache:', error);
            
            if (error.name === 'QuotaExceededError') {
                alert('⚠️ Storage quota exceeded! Try clearing old cache entries.');
                CacheStorage.showStorageInfo();
            }
            return false;
        }
    },

    /**
     * Load data from localStorage cache
     * @param {string} key - Storage key
     * @returns {Object|null} Cached data or null
     */
    loadFromCache: (key) => {
        try {
            const jsonString = localStorage.getItem(key);
            if (!jsonString) return null;
            
            const data = JSON.parse(jsonString);
            console.log(`📂 Loaded from cache: ${key}`);
            return data;
        } catch (error) {
            console.error('Failed to load from cache:', error);
            return null;
        }
    },

    /**
     * Remove item from cache
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    removeFromCache: (key) => {
        try {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed from cache: ${key}`);
            return true;
        } catch (error) {
            console.error('Failed to remove from cache:', error);
            return false;
        }
    },

    /**
     * Clear all Hakli-related cache
     * @param {boolean} confirm - Whether to show confirmation
     * @returns {boolean} Success status
     */
    clearAllCache: (confirm = true) => {
        if (confirm && !window.confirm('⚠️ Clear all cached data? This cannot be undone.')) {
            return false;
        }

        try {
            const keys = Object.keys(localStorage);
            const hakliKeys = keys.filter(k => k.startsWith('hakli'));
            
            hakliKeys.forEach(key => localStorage.removeItem(key));
            
            console.log(`🗑️ Cleared ${hakliKeys.length} cache entries`);
            alert(`✅ Cleared ${hakliKeys.length} cached items`);
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    },

    /**
     * Get all cache keys
     * @returns {Array} Array of cache keys
     */
    getAllKeys: () => {
        return Object.keys(localStorage).filter(k => k.startsWith('hakli'));
    },

    /**
     * Get cache size information
     * @returns {Object} Size information
     */
    getCacheSize: () => {
        const keys = CacheStorage.getAllKeys();
        let totalSize = 0;
        const items = [];

        keys.forEach(key => {
            const item = localStorage.getItem(key);
            const size = item ? item.length : 0;
            totalSize += size;
            items.push({ key, size });
        });

        return {
            totalKeys: keys.length,
            totalSize: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            items: items.sort((a, b) => b.size - a.size)
        };
    },

    /**
     * Show storage information in console
     */
    showStorageInfo: () => {
        const info = CacheStorage.getCacheSize();
        console.log('📊 Cache Storage Info:');
        console.log(`   Total items: ${info.totalKeys}`);
        console.log(`   Total size: ${info.totalSizeMB} MB`);
        console.log('   Largest items:');
        info.items.slice(0, 5).forEach(item => {
            console.log(`   - ${item.key}: ${(item.size / 1024).toFixed(1)} KB`);
        });
    },

    /**
     * Export cache to JSON file
     * @returns {boolean} Success status
     */
    exportCache: () => {
        try {
            const cache = {};
            const keys = CacheStorage.getAllKeys();
            
            keys.forEach(key => {
                const data = CacheStorage.loadFromCache(key);
                if (data) cache[key] = data;
            });

            const filename = `hakli-cache-${Utils.formatDateForFilename()}.json`;
            Utils.downloadBlob(Utils.createJsonBlob(cache), filename);
            
            console.log(`📥 Exported ${keys.length} cache entries to ${filename}`);
            return true;
        } catch (error) {
            console.error('Failed to export cache:', error);
            return false;
        }
    },

    /**
     * Import cache from JSON file
     * @param {Object} cacheData - Cache data to import
     * @param {boolean} merge - Whether to merge with existing cache
     * @returns {boolean} Success status
     */
    importCache: (cacheData, merge = true) => {
        try {
            if (!merge) {
                CacheStorage.clearAllCache(false);
            }

            let importedCount = 0;
            Object.entries(cacheData).forEach(([key, data]) => {
                if (CacheStorage.saveToCache(data, key)) {
                    importedCount++;
                }
            });

            console.log(`📤 Imported ${importedCount} cache entries`);
            alert(`✅ Imported ${importedCount} items`);
            return true;
        } catch (error) {
            console.error('Failed to import cache:', error);
            alert('❌ Failed to import cache: ' + error.message);
            return false;
        }
    },

    /**
     * Add to recent exports list
     * @param {Object} exportInfo - Export information
     */
    addRecentExport: (exportInfo) => {
        try {
            const key = CONFIG.STORAGE.RECENT_EXPORTS_KEY;
            const recent = CacheStorage.loadFromCache(key) || [];
            
            recent.unshift({
                ...exportInfo,
                timestamp: new Date().toISOString()
            });

            // Keep only recent exports
            const trimmed = recent.slice(0, CONFIG.STORAGE.MAX_RECENT_EXPORTS);
            CacheStorage.saveToCache(trimmed, key);
        } catch (error) {
            console.error('Failed to add recent export:', error);
        }
    },

    /**
     * Get recent exports list
     * @returns {Array} Recent exports
     */
    getRecentExports: () => {
        const key = CONFIG.STORAGE.RECENT_EXPORTS_KEY;
        return CacheStorage.loadFromCache(key) || [];
    },

    /**
     * Check if storage is available
     * @returns {boolean} Storage availability
     */
    isStorageAvailable: () => {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.error('localStorage not available:', error);
            return false;
        }
    },

    /**
     * Get estimated storage quota
     * @returns {Promise<Object>} Storage quota info
     */
    getStorageQuota: async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2),
                    usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
                    quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2)
                };
            } catch (error) {
                console.error('Failed to get storage quota:', error);
            }
        }
        return null;
    }
};

// Make globally available
window.CacheStorage = CacheStorage;
