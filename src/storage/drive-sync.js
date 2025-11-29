// ============================================
// GOOGLE DRIVE SYNC
// Cloud storage for HKI inscription files
// ============================================

const DriveSync = {
    // OAuth2 configuration
    CONFIG: {
        CLIENT_ID: '894554328044-5ocv2t6g8h9ssj80sscniuqgl2t3021m.apps.googleusercontent.com',
        API_KEY: null,  // API key is optional for OAuth flow
        SCOPES: 'https://www.googleapis.com/auth/drive.file',
        DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        FOLDER_NAME: 'Hakli_Inscriptions'
    },

    // State
    _isInitialized: false,
    _isSignedIn: false,
    _folderId: null,

    /**
     * Configure Google Drive API credentials
     * @param {string} clientId - OAuth2 client ID
     * @param {string} apiKey - API key
     */
    configure: (clientId, apiKey) => {
        DriveSync.CONFIG.CLIENT_ID = clientId;
        DriveSync.CONFIG.API_KEY = apiKey;
        console.log('☁️ Drive sync configured');
    },

    /**
     * Initialize Google API client
     * @returns {Promise<boolean>} Success status
     */
    initialize: async () => {
        if (!DriveSync.CONFIG.CLIENT_ID) {
            console.warn('⚠️ Drive sync not configured - missing Client ID');
            return false;
        }

        return new Promise((resolve) => {
            // Load Google API script
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = async () => {
                try {
                    await new Promise((res) => gapi.load('client:auth2', res));
                    
                    await gapi.client.init({
                        apiKey: DriveSync.CONFIG.API_KEY,
                        clientId: DriveSync.CONFIG.CLIENT_ID,
                        discoveryDocs: [DriveSync.CONFIG.DISCOVERY_DOC],
                        scope: DriveSync.CONFIG.SCOPES
                    });

                    DriveSync._isInitialized = true;
                    DriveSync._isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
                    
                    // Listen for sign-in state changes
                    gapi.auth2.getAuthInstance().isSignedIn.listen((isSignedIn) => {
                        DriveSync._isSignedIn = isSignedIn;
                    });

                    console.log('☁️ Google Drive API initialized');
                    resolve(true);
                } catch (error) {
                    console.error('Drive initialization error:', error);
                    resolve(false);
                }
            };
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    },

    /**
     * Sign in to Google
     * @returns {Promise<boolean>} Success status
     */
    signIn: async () => {
        if (!DriveSync._isInitialized) {
            const init = await DriveSync.initialize();
            if (!init) return false;
        }

        try {
            await gapi.auth2.getAuthInstance().signIn();
            DriveSync._isSignedIn = true;
            console.log('☁️ Signed in to Google');
            return true;
        } catch (error) {
            console.error('Sign in error:', error);
            return false;
        }
    },

    /**
     * Sign out from Google
     */
    signOut: async () => {
        if (DriveSync._isInitialized && DriveSync._isSignedIn) {
            await gapi.auth2.getAuthInstance().signOut();
            DriveSync._isSignedIn = false;
            console.log('☁️ Signed out from Google');
        }
    },

    /**
     * Check if signed in
     * @returns {boolean} Sign-in status
     */
    isSignedIn: () => DriveSync._isSignedIn,

    /**
     * Get or create the Hakli folder in Drive
     * @returns {Promise<string|null>} Folder ID or null
     */
    getOrCreateFolder: async () => {
        if (DriveSync._folderId) return DriveSync._folderId;

        if (!DriveSync._isSignedIn) {
            console.warn('Not signed in to Drive');
            return null;
        }

        try {
            // Search for existing folder
            const response = await gapi.client.drive.files.list({
                q: `name='${DriveSync.CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)'
            });

            if (response.result.files && response.result.files.length > 0) {
                DriveSync._folderId = response.result.files[0].id;
                console.log('☁️ Found existing folder:', DriveSync._folderId);
                return DriveSync._folderId;
            }

            // Create new folder
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: DriveSync.CONFIG.FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });

            DriveSync._folderId = createResponse.result.id;
            console.log('☁️ Created folder:', DriveSync._folderId);
            return DriveSync._folderId;
        } catch (error) {
            console.error('Folder creation error:', error);
            return null;
        }
    },

    /**
     * Save HKI file to Google Drive
     * @param {Object} hkiData - HKI data object
     * @param {string} filename - Filename (e.g., "DH-2025-001.hki")
     * @returns {Promise<Object|null>} File metadata or null
     */
    saveToCloud: async (hkiData, filename) => {
        if (!DriveSync._isSignedIn) {
            const signedIn = await DriveSync.signIn();
            if (!signedIn) {
                alert('❌ Please sign in to Google Drive first');
                return null;
            }
        }

        const folderId = await DriveSync.getOrCreateFolder();
        if (!folderId) {
            alert('❌ Could not access Drive folder');
            return null;
        }

        try {
            // Check if file already exists
            const existingFile = await DriveSync.findFile(filename);
            
            const content = JSON.stringify(hkiData, null, 2);
            const blob = new Blob([content], { type: 'application/json' });

            const metadata = {
                name: filename,
                mimeType: 'application/json'
            };

            if (existingFile) {
                // Update existing file
                const response = await DriveSync._updateFile(existingFile.id, blob, metadata);
                console.log('☁️ Updated file in Drive:', filename);
                return response;
            } else {
                // Create new file
                metadata.parents = [folderId];
                const response = await DriveSync._createFile(blob, metadata);
                console.log('☁️ Created file in Drive:', filename);
                return response;
            }
        } catch (error) {
            console.error('Save to cloud error:', error);
            alert('❌ Failed to save to Google Drive');
            return null;
        }
    },

    /**
     * Load HKI file from Google Drive
     * @param {string} fileId - Drive file ID
     * @returns {Promise<Object|null>} HKI data or null
     */
    loadFromCloud: async (fileId) => {
        if (!DriveSync._isSignedIn) {
            alert('❌ Please sign in to Google Drive first');
            return null;
        }

        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            const hkiData = typeof response.body === 'string' 
                ? JSON.parse(response.body) 
                : response.result;

            console.log('☁️ Loaded file from Drive');
            return hkiData;
        } catch (error) {
            console.error('Load from cloud error:', error);
            alert('❌ Failed to load from Google Drive');
            return null;
        }
    },

    /**
     * List all HKI files in Drive folder
     * @returns {Promise<Array>} Array of file metadata
     */
    listFiles: async () => {
        if (!DriveSync._isSignedIn) {
            return [];
        }

        const folderId = await DriveSync.getOrCreateFolder();
        if (!folderId) return [];

        try {
            const response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'files(id, name, modifiedTime, size)',
                orderBy: 'modifiedTime desc'
            });

            return response.result.files || [];
        } catch (error) {
            console.error('List files error:', error);
            return [];
        }
    },

    /**
     * Find file by name
     * @param {string} filename - Filename to find
     * @returns {Promise<Object|null>} File metadata or null
     */
    findFile: async (filename) => {
        const folderId = await DriveSync.getOrCreateFolder();
        if (!folderId) return null;

        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
                fields: 'files(id, name, modifiedTime)'
            });

            return response.result.files?.[0] || null;
        } catch (error) {
            console.error('Find file error:', error);
            return null;
        }
    },

    /**
     * Delete file from Drive
     * @param {string} fileId - File ID to delete
     * @returns {Promise<boolean>} Success status
     */
    deleteFile: async (fileId) => {
        if (!DriveSync._isSignedIn) return false;

        try {
            await gapi.client.drive.files.delete({ fileId });
            console.log('☁️ Deleted file from Drive');
            return true;
        } catch (error) {
            console.error('Delete file error:', error);
            return false;
        }
    },

    /**
     * Sync local library with Drive
     * @returns {Promise<Object>} Sync results
     */
    syncLibrary: async () => {
        if (!DriveSync._isSignedIn) {
            const signedIn = await DriveSync.signIn();
            if (!signedIn) return { success: false, message: 'Not signed in' };
        }

        try {
            const localLibrary = HKIStorage.getLibrary();
            const cloudFiles = await DriveSync.listFiles();

            const results = {
                uploaded: 0,
                downloaded: 0,
                conflicts: [],
                errors: []
            };

            // Upload local files not in cloud
            for (const [id, hki] of Object.entries(localLibrary)) {
                const cloudFile = cloudFiles.find(f => f.name === `${id}.hki`);
                
                if (!cloudFile) {
                    // Not in cloud, upload it
                    const saved = await DriveSync.saveToCloud(hki, `${id}.hki`);
                    if (saved) results.uploaded++;
                } else {
                    // Check for conflicts (cloud is newer)
                    const cloudModified = new Date(cloudFile.modifiedTime);
                    const localModified = new Date(hki.lastModified);
                    
                    if (cloudModified > localModified) {
                        results.conflicts.push({
                            id,
                            cloudModified,
                            localModified,
                            cloudFileId: cloudFile.id
                        });
                    }
                }
            }

            // Download cloud files not in local
            for (const cloudFile of cloudFiles) {
                const id = cloudFile.name.replace('.hki', '');
                if (!localLibrary[id]) {
                    const hkiData = await DriveSync.loadFromCloud(cloudFile.id);
                    if (hkiData) {
                        // Save to local cache
                        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
                        cache[id] = hkiData;
                        localStorage.setItem(CONFIG.STORAGE.INSCRIPTION_KEY, JSON.stringify(cache));
                        results.downloaded++;
                    }
                }
            }

            console.log('☁️ Sync complete:', results);
            return { success: true, results };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Create file using multipart upload
     * @private
     */
    _createFile: async (blob, metadata) => {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form
        });

        return response.json();
    },

    /**
     * Update file content
     * @private
     */
    _updateFile: async (fileId, blob, metadata) => {
        const token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
        
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: blob
        });

        return response.json();
    },

    /**
     * Get sync status for UI display
     * @returns {Object} Status object
     */
    getStatus: () => ({
        initialized: DriveSync._isInitialized,
        signedIn: DriveSync._isSignedIn,
        folderId: DriveSync._folderId,
        configured: !!(DriveSync.CONFIG.CLIENT_ID && DriveSync.CONFIG.API_KEY)
    })
};

// Make globally available
window.DriveSync = DriveSync;
