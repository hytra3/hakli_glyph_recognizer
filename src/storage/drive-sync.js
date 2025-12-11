// ============================================
// GOOGLE DRIVE SYNC - Updated for GIS
// Cloud storage for HKI inscription files
// Uses Google Identity Services (new OAuth method)
// ============================================

const DriveSync = {
    // OAuth2 configuration
    CONFIG: {
        CLIENT_ID: '894554328044-5ocv2t6g8h9ssj80sscniuqgl2t3021m.apps.googleusercontent.com',
        SCOPES: 'https://www.googleapis.com/auth/drive.file',
        FOLDER_NAME: 'Hakli_Inscriptions'
    },

    // State
    _isInitialized: false,
    _isSignedIn: false,
    _accessToken: null,
    _tokenClient: null,
    _folderId: null,

    /**
     * Configure Google Drive API credentials
     * @param {string} clientId - OAuth2 client ID
     */
    configure: (clientId) => {
        DriveSync.CONFIG.CLIENT_ID = clientId;
        console.log('☁️ Drive sync configured');
    },

    /**
     * Initialize Google Identity Services
     * @returns {Promise<boolean>} Success status
     */
    initialize: async () => {
        if (!DriveSync.CONFIG.CLIENT_ID) {
            console.warn('⚠️ Drive sync not configured - missing Client ID');
            return false;
        }

        return new Promise((resolve) => {
            // Load Google Identity Services script
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            
            gisScript.onload = () => {
                try {
                    // Initialize the token client
                    DriveSync._tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: DriveSync.CONFIG.CLIENT_ID,
                        scope: DriveSync.CONFIG.SCOPES,
                        callback: (response) => {
                            if (response.access_token) {
                                DriveSync._accessToken = response.access_token;
                                DriveSync._isSignedIn = true;
                                console.log('☁️ Google Drive authenticated');
                            }
                        },
                        error_callback: (error) => {
                            console.error('OAuth error:', error);
                            DriveSync._isSignedIn = false;
                        }
                    });
                    
                    DriveSync._isInitialized = true;
                    console.log('☁️ Google Identity Services initialized');
                    resolve(true);
                } catch (error) {
                    console.error('GIS initialization error:', error);
                    resolve(false);
                }
            };
            
            gisScript.onerror = () => {
                console.error('Failed to load Google Identity Services');
                resolve(false);
            };
            
            document.head.appendChild(gisScript);
        });
    },

    /**
     * Sign in to Google
     * @returns {Promise<boolean>} Success status
     */
    signIn: async () => {
        if (!DriveSync._isInitialized) {
            const initialized = await DriveSync.initialize();
            if (!initialized) return false;
        }

        return new Promise((resolve) => {
            try {
                // Update callback to resolve the promise
                DriveSync._tokenClient.callback = (response) => {
                    if (response.access_token) {
                        DriveSync._accessToken = response.access_token;
                        DriveSync._isSignedIn = true;
                        console.log('☁️ Signed in to Google Drive');
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                };
                
                // Request access token (shows popup)
                DriveSync._tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (error) {
                console.error('Sign-in error:', error);
                resolve(false);
            }
        });
    },

    /**
     * Sign out from Google
     */
    signOut: () => {
        if (DriveSync._accessToken) {
            google.accounts.oauth2.revoke(DriveSync._accessToken, () => {
                console.log('☁️ Signed out from Google Drive');
            });
        }
        DriveSync._accessToken = null;
        DriveSync._isSignedIn = false;
        DriveSync._folderId = null;
    },

    /**
     * Check if user is signed in
     * @returns {boolean}
     */
    isSignedIn: () => {
        return DriveSync._isSignedIn && DriveSync._accessToken !== null;
    },

    /**
     * Make authenticated API request
     * @param {string} url - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<Response>}
     */
    _apiRequest: async (url, options = {}) => {
        if (!DriveSync._accessToken) {
            throw new Error('Not authenticated');
        }
        
        const headers = {
            'Authorization': `Bearer ${DriveSync._accessToken}`,
            ...options.headers
        };
        
        return fetch(url, { ...options, headers });
    },

    /**
     * Get or create the Hakli inscriptions folder
     * @returns {Promise<string>} Folder ID
     */
    getOrCreateFolder: async () => {
        if (DriveSync._folderId) {
            return DriveSync._folderId;
        }

        try {
            // Search for existing folder
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${DriveSync.CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
            
            const searchResponse = await DriveSync._apiRequest(searchUrl);
            const searchData = await searchResponse.json();
            
            if (searchData.files && searchData.files.length > 0) {
                DriveSync._folderId = searchData.files[0].id;
                console.log('☁️ Found existing folder:', DriveSync._folderId);
                return DriveSync._folderId;
            }

            // Create new folder
            const createResponse = await DriveSync._apiRequest(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: DriveSync.CONFIG.FOLDER_NAME,
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                }
            );
            
            const createData = await createResponse.json();
            DriveSync._folderId = createData.id;
            console.log('☁️ Created folder:', DriveSync._folderId);
            return DriveSync._folderId;
        } catch (error) {
            console.error('Folder error:', error);
            throw error;
        }
    },

    /**
     * Save HKI data to Google Drive
     * @param {object} hkiData - The inscription data
     * @param {string} filename - Optional filename (auto-generated if not provided)
     * @returns {Promise<object>} Result with success, filename, and file metadata
     */
    saveToCloud: async (hkiData, filename = null) => {
        if (!DriveSync.isSignedIn()) {
            return { success: false, error: 'Not signed in to Google Drive' };
        }

        try {
            // Auto-generate filename if not provided
            if (!filename) {
                const title = hkiData.inscriptionTitle || 'Inscription';
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.hki`;
            }

            const folderId = await DriveSync.getOrCreateFolder();
            const content = JSON.stringify(hkiData, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            
            // Check if file already exists
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and '${folderId}' in parents and trashed=false&fields=files(id,name)`;
            const searchResponse = await DriveSync._apiRequest(searchUrl);
            const searchData = await searchResponse.json();
            
            const metadata = {
                name: filename,
                mimeType: 'application/json'
            };

            let fileData;
            
            if (searchData.files && searchData.files.length > 0) {
                // Update existing file
                const fileId = searchData.files[0].id;
                const updateResponse = await DriveSync._apiRequest(
                    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: blob
                    }
                );
                fileData = await updateResponse.json();
                console.log('☁️ Updated file in Drive:', filename);
            } else {
                // Create new file with multipart upload
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify({
                    ...metadata,
                    parents: [folderId]
                })], { type: 'application/json' }));
                form.append('file', blob);

                const createResponse = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${DriveSync._accessToken}` },
                        body: form
                    }
                );
                fileData = await createResponse.json();
                console.log('☁️ Created file in Drive:', filename);
            }
            
            return {
                success: true,
                filename: filename,
                fileId: fileData.id,
                fileData: fileData
            };
        } catch (error) {
            console.error('Save to Drive error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Load HKI data from Google Drive
     * @param {string} fileId - Google Drive file ID
     * @returns {Promise<object>} HKI data
     */
    loadFromCloud: async (fileId) => {
        if (!DriveSync.isSignedIn()) {
            throw new Error('Not signed in to Google Drive');
        }

        const response = await DriveSync._apiRequest(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        );
        
        return await response.json();
    },

    /**
     * List HKI files in Drive folder
     * @returns {Promise<Array>} List of files
     */
    listFiles: async () => {
        if (!DriveSync.isSignedIn()) {
            throw new Error('Not signed in to Google Drive');
        }

        const folderId = await DriveSync.getOrCreateFolder();
        
        const response = await DriveSync._apiRequest(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`
        );
        
        const data = await response.json();
        console.log('☁️ Found files:', data.files?.length || 0);
        return data.files || [];
    },

    /**
     * Delete a file from Google Drive
     * @param {string} fileId - File ID to delete
     * @returns {Promise<boolean>} Success status
     */
    deleteFile: async (fileId) => {
        if (!DriveSync.isSignedIn()) {
            throw new Error('Not signed in to Google Drive');
        }

        const response = await DriveSync._apiRequest(
            `https://www.googleapis.com/drive/v3/files/${fileId}`,
            { method: 'DELETE' }
        );
        
        return response.ok;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DriveSync;
}

// Make globally available
window.DriveSync = DriveSync;
