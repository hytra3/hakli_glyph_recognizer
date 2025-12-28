// ============================================
// GOOGLE DRIVE SYNC - Warehouse Edition
// Cloud storage for HKI inscription files
// Supports: Public view (no auth) + Authenticated edit
// ============================================

const DriveSync = {
    // Configuration
    CONFIG: {
        CLIENT_ID: '894554328044-5ocv2t6g8h9ssj80sscniuqgl2t3021m.apps.googleusercontent.com',
        API_KEY: 'AIzaSyAZ6ptZw3XfBZJDUdV9V-GKClCej0iEkRI',
        SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
        FOLDER_NAME: 'Hakli_Inscriptions',
        SHARED_FOLDER_ID: '1XttYhdnw4Pl11ccfS5AEuO3W-aCRZ2qo'
    },

    // State
    _isInitialized: false,
    _isSignedIn: false,
    _accessToken: null,
    _tokenClient: null,
    _folderId: null,
    _userEmail: null,

    /**
     * Configure Drive sync
     */
    configure: (config = {}) => {
        if (config.clientId) DriveSync.CONFIG.CLIENT_ID = config.clientId;
        if (config.apiKey) DriveSync.CONFIG.API_KEY = config.apiKey;
        if (config.sharedFolderId) DriveSync.CONFIG.SHARED_FOLDER_ID = config.sharedFolderId;
        console.log('☁️ DriveSync configured');
    },

    /**
     * Initialize Google Identity Services
     */
    initialize: async () => {
        if (DriveSync._isInitialized) return true;
        
        if (!DriveSync.CONFIG.CLIENT_ID) {
            console.warn('⚠️ DriveSync: Missing Client ID');
            return false;
        }

        return new Promise((resolve) => {
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            
            gisScript.onload = () => {
                try {
                    DriveSync._tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: DriveSync.CONFIG.CLIENT_ID,
                        scope: DriveSync.CONFIG.SCOPES,
                        callback: async (response) => {
                            if (response.access_token) {
                                DriveSync._accessToken = response.access_token;
                                DriveSync._isSignedIn = true;
                                
                                // Get user email
                                try {
                                    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                                        headers: { 'Authorization': `Bearer ${response.access_token}` }
                                    });
                                    const userData = await userInfo.json();
                                    DriveSync._userEmail = userData.email;
                                    console.log('☁️ Signed in as:', DriveSync._userEmail);
                                } catch (e) {
                                    console.warn('Could not get user email:', e);
                                }
                            }
                        },
                        error_callback: (error) => {
                            console.error('OAuth error:', error);
                            DriveSync._isSignedIn = false;
                        }
                    });
                    
                    DriveSync._isInitialized = true;
                    console.log('☁️ DriveSync initialized');
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
     */
    signIn: async () => {
        if (!DriveSync._isInitialized) {
            await DriveSync.initialize();
        }

        return new Promise((resolve) => {
            const originalCallback = DriveSync._tokenClient.callback;
            
            DriveSync._tokenClient.callback = async (response) => {
                if (response.access_token) {
                    DriveSync._accessToken = response.access_token;
                    DriveSync._isSignedIn = true;
                    
                    // Get user email
                    try {
                        const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                            headers: { 'Authorization': `Bearer ${response.access_token}` }
                        });
                        const userData = await userInfo.json();
                        DriveSync._userEmail = userData.email;
                    } catch (e) {
                        console.warn('Could not get user email:', e);
                    }
                    
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            
            try {
                DriveSync._tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (error) {
                console.error('Sign-in error:', error);
                resolve(false);
            }
        });
    },

    /**
     * Sign out
     */
    signOut: () => {
        if (DriveSync._accessToken) {
            google.accounts.oauth2.revoke(DriveSync._accessToken, () => {
                console.log('☁️ Signed out');
            });
        }
        DriveSync._accessToken = null;
        DriveSync._isSignedIn = false;
        DriveSync._userEmail = null;
        DriveSync._folderId = null;
    },

    /**
     * Check sign-in status
     */
    isSignedIn: () => DriveSync._isSignedIn && DriveSync._accessToken !== null,
    
    /**
     * Get current user email
     */
    getUserEmail: () => DriveSync._userEmail,

    /**
     * Make authenticated API request
     */
    _apiRequest: async (url, options = {}) => {
        if (!DriveSync._accessToken) {
            throw new Error('Not authenticated');
        }
        
        const headers = {
            'Authorization': `Bearer ${DriveSync._accessToken}`,
            ...options.headers
        };
        
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(error.error?.message || 'API request failed');
        }
        return response;
    },

    /**
     * Make public API request (using API key, no auth needed)
     */
    _publicRequest: async (url) => {
        const separator = url.includes('?') ? '&' : '?';
        const publicUrl = DriveSync.CONFIG.API_KEY 
            ? `${url}${separator}key=${DriveSync.CONFIG.API_KEY}`
            : url;
        
        const response = await fetch(publicUrl);
        if (!response.ok) {
            throw new Error('Public API request failed');
        }
        return response;
    },

    /**
     * Get or create user's Hakli folder
     */
    getOrCreateFolder: async () => {
        if (DriveSync._folderId) return DriveSync._folderId;

        try {
            // Search for existing folder
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${DriveSync.CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
            
            const searchResponse = await DriveSync._apiRequest(searchUrl);
            const searchData = await searchResponse.json();
            
            if (searchData.files && searchData.files.length > 0) {
                DriveSync._folderId = searchData.files[0].id;
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

    // ==========================================
    // WAREHOUSE METHODS
    // ==========================================

    /**
     * List published inscriptions (public, no auth required)
     * These are files with visibility='published' in the shared folder
     */
    listPublished: async () => {
        try {
            const folderId = DriveSync.CONFIG.SHARED_FOLDER_ID;
            if (!folderId) {
                console.warn('No shared folder ID configured');
                return [];
            }

            // If signed in, use authenticated request
            let response;
            if (DriveSync.isSignedIn()) {
                const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,properties,appProperties,thumbnailLink,modifiedTime)`;
                response = await DriveSync._apiRequest(url);
            } else if (DriveSync.CONFIG.API_KEY) {
                // Public request with API key
                const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,properties,appProperties,thumbnailLink,modifiedTime)&key=${DriveSync.CONFIG.API_KEY}`;
                response = await fetch(url);
            } else {
                console.warn('Cannot list published: no auth or API key');
                return [];
            }

            const data = await response.json();
            if (!data.files) return [];

            // Filter to published only and parse metadata
            return data.files
                .filter(file => {
                    const visibility = file.appProperties?.visibility || file.properties?.visibility;
                    return visibility === 'published';
                })
                .map(file => DriveSync._parseFileMetadata(file));
        } catch (error) {
            console.error('Failed to list published:', error);
            return [];
        }
    },

    /**
     * List user's draft inscriptions (auth required)
     */
    listDrafts: async (userEmail) => {
        if (!DriveSync.isSignedIn()) return [];
        
        try {
            const folderId = await DriveSync.getOrCreateFolder();
            const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,properties,appProperties,thumbnailLink,modifiedTime)`;
            
            const response = await DriveSync._apiRequest(url);
            const data = await response.json();
            if (!data.files) return [];

            // Filter to drafts owned by user
            return data.files
                .filter(file => {
                    const visibility = file.appProperties?.visibility || 'draft';
                    const owner = file.appProperties?.owner;
                    return visibility === 'draft' && owner === userEmail;
                })
                .map(file => DriveSync._parseFileMetadata(file));
        } catch (error) {
            console.error('Failed to list drafts:', error);
            return [];
        }
    },

    /**
     * List inscriptions shared with user (auth required)
     */
    listSharedWithMe: async (userEmail) => {
        if (!DriveSync.isSignedIn()) return [];
        
        try {
            // Check both user's folder and shared folder
            const folders = [DriveSync.CONFIG.SHARED_FOLDER_ID];
            if (DriveSync._folderId) folders.push(DriveSync._folderId);
            
            const allItems = [];
            
            for (const folderId of folders.filter(Boolean)) {
                const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,properties,appProperties,thumbnailLink,modifiedTime)`;
                
                const response = await DriveSync._apiRequest(url);
                const data = await response.json();
                if (!data.files) continue;

                // Filter to items shared with this user (not owned by them)
                const sharedItems = data.files
                    .filter(file => {
                        const owner = file.appProperties?.owner;
                        const collaborators = file.appProperties?.collaborators;
                        const collabList = collaborators ? JSON.parse(collaborators) : [];
                        return owner !== userEmail && collabList.includes(userEmail);
                    })
                    .map(file => DriveSync._parseFileMetadata(file));
                
                allItems.push(...sharedItems);
            }
            
            return allItems;
        } catch (error) {
            console.error('Failed to list shared:', error);
            return [];
        }
    },

    /**
     * Parse file metadata from Drive API response
     */
    _parseFileMetadata: (file) => {
        const props = { ...file.properties, ...file.appProperties };
        return {
            id: file.id,
            name: file.name,
            title: props.title || file.name.replace('.hki', ''),
            owner: props.owner,
            visibility: props.visibility || 'draft',
            collaborators: props.collaborators ? JSON.parse(props.collaborators) : [],
            thumbnail: props.thumbnail || file.thumbnailLink,
            glyphCount: props.glyphCount ? parseInt(props.glyphCount) : undefined,
            modifiedTime: file.modifiedTime
        };
    },

    /**
     * Load HKI file contents
     */
    loadHki: async (fileId) => {
        let response;
        
        if (DriveSync.isSignedIn()) {
            const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            response = await DriveSync._apiRequest(url);
        } else if (DriveSync.CONFIG.API_KEY) {
            const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${DriveSync.CONFIG.API_KEY}`;
            response = await fetch(url);
        } else {
            throw new Error('Cannot load: not authenticated');
        }

        const data = await response.json();
        return data;
    },

    /**
     * Save HKI file to Drive
     */
    saveHki: async (hkiData, options = {}) => {
        if (!DriveSync.isSignedIn()) {
            throw new Error('Must be signed in to save');
        }

        const {
            fileId = null,  // null = create new, otherwise update
            title = 'Untitled',
            visibility = 'draft',
            collaborators = []
        } = options;

        const folderId = visibility === 'published' 
            ? DriveSync.CONFIG.SHARED_FOLDER_ID 
            : await DriveSync.getOrCreateFolder();

        // Generate thumbnail from image data
        let thumbnail = '';
        if (hkiData.displayImage || hkiData.image) {
            thumbnail = await DriveSync._generateThumbnail(hkiData.displayImage || hkiData.image);
        }

        // Prepare metadata
        const metadata = {
            name: `${title}.hki`,
            mimeType: 'application/json',
            appProperties: {
                owner: DriveSync._userEmail,
                visibility,
                collaborators: JSON.stringify(collaborators),
                title,
                thumbnail,
                glyphCount: String(hkiData.recognitionResults?.length || 0)
            }
        };

        if (!fileId) {
            metadata.parents = [folderId];
        }

        // Create multipart request body
        const boundary = '-------HakliUploadBoundary';
        const body = [
            `--${boundary}`,
            'Content-Type: application/json; charset=UTF-8',
            '',
            JSON.stringify(metadata),
            `--${boundary}`,
            'Content-Type: application/json',
            '',
            JSON.stringify(hkiData),
            `--${boundary}--`
        ].join('\r\n');

        let url, method;
        if (fileId) {
            // Update existing
            url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
            method = 'PATCH';
        } else {
            // Create new
            url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            method = 'POST';
        }

        const response = await DriveSync._apiRequest(url, {
            method,
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
        });

        const result = await response.json();
        console.log(`☁️ ${fileId ? 'Updated' : 'Created'} file:`, result.id);
        
        return {
            id: result.id,
            name: result.name
        };
    },

    /**
     * Update HKI collaborators only (without re-uploading content)
     */
    updateHkiCollaborators: async (fileId, collaborators) => {
        if (!DriveSync.isSignedIn()) {
            throw new Error('Must be signed in');
        }

        const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
        await DriveSync._apiRequest(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appProperties: {
                    collaborators: JSON.stringify(collaborators)
                }
            })
        });
        
        console.log('☁️ Updated collaborators for:', fileId);
    },

    /**
     * Generate thumbnail from base64 image
     */
    _generateThumbnail: async (imageData) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 120;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // Calculate crop to make square
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve('');
            img.src = imageData;
        });
    },

    // ==========================================
    // PROFILE METHODS (collaborator management)
    // ==========================================

    /**
     * Load user profile (collaborator list, etc.)
     */
    loadProfile: async (userEmail) => {
        if (!DriveSync.isSignedIn()) return null;
        
        try {
            const folderId = await DriveSync.getOrCreateFolder();
            const profileName = `_profile_${userEmail.replace('@', '_at_')}.json`;
            
            // Search for profile file
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${profileName}' and '${folderId}' in parents and trashed=false&fields=files(id)`;
            const searchResponse = await DriveSync._apiRequest(searchUrl);
            const searchData = await searchResponse.json();
            
            if (searchData.files && searchData.files.length > 0) {
                const fileId = searchData.files[0].id;
                const contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
                const contentResponse = await DriveSync._apiRequest(contentUrl);
                return await contentResponse.json();
            }
            
            return { collaborators: [], pendingRequests: [] };
        } catch (error) {
            console.error('Failed to load profile:', error);
            return { collaborators: [], pendingRequests: [] };
        }
    },

    /**
     * Save user profile
     */
    saveProfile: async (userEmail, profileData) => {
        if (!DriveSync.isSignedIn()) {
            throw new Error('Must be signed in');
        }
        
        const folderId = await DriveSync.getOrCreateFolder();
        const profileName = `_profile_${userEmail.replace('@', '_at_')}.json`;
        
        // Search for existing profile
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${profileName}' and '${folderId}' in parents and trashed=false&fields=files(id)`;
        const searchResponse = await DriveSync._apiRequest(searchUrl);
        const searchData = await searchResponse.json();
        
        const existingId = searchData.files?.[0]?.id;
        
        const metadata = {
            name: profileName,
            mimeType: 'application/json'
        };
        
        if (!existingId) {
            metadata.parents = [folderId];
        }

        const boundary = '-------HakliProfileBoundary';
        const body = [
            `--${boundary}`,
            'Content-Type: application/json; charset=UTF-8',
            '',
            JSON.stringify(metadata),
            `--${boundary}`,
            'Content-Type: application/json',
            '',
            JSON.stringify(profileData),
            `--${boundary}--`
        ].join('\r\n');

        const url = existingId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        
        await DriveSync._apiRequest(url, {
            method: existingId ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
        });
        
        console.log('☁️ Profile saved');
    },

    // ==========================================
    // LEGACY METHODS (for compatibility)
    // ==========================================

    listFiles: async () => {
        if (!DriveSync.isSignedIn()) return [];
        
        try {
            const folderId = await DriveSync.getOrCreateFolder();
            const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime,appProperties)`;
            
            const response = await DriveSync._apiRequest(url);
            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('Failed to list files:', error);
            return [];
        }
    },

    saveToCloud: async (hkiData, filename) => {
        return DriveSync.saveHki(hkiData, {
            title: filename.replace('.hki', ''),
            visibility: 'draft'
        });
    },

    loadFromCloud: async (fileId) => {
        return DriveSync.loadHki(fileId);
    }
};

// Auto-initialize
if (typeof window !== 'undefined') {
    DriveSync.initialize().then(() => {
        console.log('✅ DriveSync (Warehouse Edition) loaded');
    });
}
