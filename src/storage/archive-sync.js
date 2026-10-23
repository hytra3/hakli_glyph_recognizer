// ============================================
// COMMUNITY ARCHIVE SYNC  (identity-only; replaces Drive full-scope)
// v261022a
//
// Signs in with Google identity only (openid email profile) — NO Drive scope,
// so contributors never see the "unverified app / unsafe" consent screen.
// Reads the public catalog + inscription blobs, and publishes / curates through
// the archive Cloud Functions (project tawkin-blue).
//
// Exposes BOTH window.ArchiveSync and window.DriveSync so the existing app and
// WarehouseModal keep working unchanged (drop-in replacement).
// ============================================

const ArchiveSync = {
    CONFIG: {
        CLIENT_ID: '533670139668-51vdk21n97p2e9lgubfvmdsnqu3ie2jr.apps.googleusercontent.com',
        SCOPES: 'openid email profile',
        FN_BASE: 'https://us-central1-tawkin-blue.cloudfunctions.net',
        BUCKET_BASE: 'https://storage.googleapis.com/hakli-archive-tawkin-blue'
    },

    _isInitialized: false,
    _isSignedIn: false,
    _accessToken: null,
    _userEmail: null,
    _userName: null,
    _tokenClient: null,

    configure: (config = {}) => {
        if (config.clientId) ArchiveSync.CONFIG.CLIENT_ID = config.clientId;
        if (config.fnBase) ArchiveSync.CONFIG.FN_BASE = config.fnBase;
        if (config.bucketBase) ArchiveSync.CONFIG.BUCKET_BASE = config.bucketBase;
    },

    initialize: async () => {
        if (ArchiveSync._isInitialized) return true;
        if (!ArchiveSync.CONFIG.CLIENT_ID) return false;
        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.async = true; s.defer = true;
            s.onload = () => {
                try {
                    ArchiveSync._tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: ArchiveSync.CONFIG.CLIENT_ID,
                        scope: ArchiveSync.CONFIG.SCOPES,
                        callback: () => {},        // replaced per sign-in
                        error_callback: () => {}
                    });
                    ArchiveSync._isInitialized = true;
                    console.log('☁️ ArchiveSync initialized (identity-only, no Drive scope)');
                    resolve(true);
                } catch (e) { console.error('GIS init error:', e); resolve(false); }
            };
            s.onerror = () => { console.error('Failed to load Google Identity Services'); resolve(false); };
            document.head.appendChild(s);
        });
    },

    _fetchUserInfo: async (token) => {
        try {
            const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!r.ok) return;
            const u = await r.json();
            ArchiveSync._userEmail = u.email || null;
            ArchiveSync._userName = u.name || u.email || null;
        } catch (e) { /* non-fatal */ }
    },

    // Identity-only sign-in. No privacy-notice confirm: we request no Drive access.
    signIn: async () => {
        if (!ArchiveSync._isInitialized) await ArchiveSync.initialize();
        if (!ArchiveSync._tokenClient) return false;
        return new Promise((resolve) => {
            ArchiveSync._tokenClient.callback = async (resp) => {
                if (resp && resp.access_token) {
                    ArchiveSync._accessToken = resp.access_token;
                    ArchiveSync._isSignedIn = true;
                    await ArchiveSync._fetchUserInfo(resp.access_token);
                    console.log('☁️ Signed in as:', ArchiveSync._userEmail);
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            ArchiveSync._tokenClient.error_callback = () => {
                ArchiveSync._isSignedIn = false;
                resolve(false);
            };
            try { ArchiveSync._tokenClient.requestAccessToken({ prompt: '' }); }
            catch (e) { console.error('Sign-in error:', e); resolve(false); }
        });
    },

    signOut: () => {
        try {
            if (ArchiveSync._accessToken && window.google && google.accounts && google.accounts.oauth2) {
                google.accounts.oauth2.revoke(ArchiveSync._accessToken, () => {});
            }
        } catch (e) { /* ignore */ }
        ArchiveSync._accessToken = null;
        ArchiveSync._isSignedIn = false;
        ArchiveSync._userEmail = null;
        ArchiveSync._userName = null;
    },

    isSignedIn: () => ArchiveSync._isSignedIn && ArchiveSync._accessToken !== null,
    getUserEmail: () => ArchiveSync._userEmail,
    getUserName: () => ArchiveSync._userName,

    _authHeader: () => ({ Authorization: `Bearer ${ArchiveSync._accessToken}` }),

    // Drop circular refs (topMatches) AND the large, viewer-unused displayImage
    // to keep published blobs small. The source `image`, per-glyph thumbnails,
    // reading data and translations are preserved so the entry stays complete
    // and re-loadable into the editor.
    _stringifyForUpload: (obj, stripAudio) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
            if (key === 'topMatches') return undefined;
            if (key === 'displayImage') return undefined;
            if (stripAudio && (key === 'audioData' || key === 'audio')) return undefined;
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return undefined;
                seen.add(value);
            }
            return value;
        });
    },

    // ---- Reads (public, no auth) ----
    listPublished: async () => {
        try {
            const r = await fetch(`${ArchiveSync.CONFIG.FN_BASE}/listInscriptions`);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const data = await r.json();
            return (data.items || []).map((it) => ({
                id: it.id,
                name: (it.title || 'Untitled') + '.hki',
                title: it.title || 'Untitled',
                owner: it.ownerName || '',          // display name, not email
                visibility: 'published',
                collaborators: [],
                thumbnail: null,
                glyphCount: (typeof it.glyphCount === 'number') ? it.glyphCount : undefined,
                hasAudio: !!it.hasAudio,
                status: it.status || 'final',
                blobUrl: it.blobUrl,
                modifiedTime: it.createdAt
            }));
        } catch (e) { console.error('listPublished failed:', e); return []; }
    },

    // Phase 1: no cloud drafts / Drive sharing — local IndexedDB handles drafts.
    listDrafts: async () => [],
    listSharedWithMe: async () => [],

    // Accepts a catalog id (fetches its public blob) or a full blobUrl.
    loadHki: async (idOrUrl) => {
        let url = String(idOrUrl || '');
        if (!/^https?:\/\//.test(url)) {
            url = `${ArchiveSync.CONFIG.BUCKET_BASE}/inscriptions/${idOrUrl}.hki`;
        }
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
    },

    // ---- Publish ----
    // Every cloud save publishes a new attributed entry to the PUBLIC archive.
    // There is no in-place update: re-publishing creates a new version (the
    // epigraphy model). Local in-progress work stays in IndexedDB.
    saveHki: async (hkiData, options = {}) => {
        if (!ArchiveSync.isSignedIn()) throw new Error('Must be signed in to publish (401)');
        const { title = 'Untitled', provenance = '', status = 'draft', shareAudio = true } = options;
        const body = {
            title: title,
            provenance: provenance || hkiData.inscriptionSource || '',
            status: status,
            hki: hkiData
        };
        const r = await fetch(`${ArchiveSync.CONFIG.FN_BASE}/submitInscription`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ArchiveSync._authHeader()),
            body: ArchiveSync._stringifyForUpload(body, shareAudio === false)
        });
        if (!r.ok) {
            let msg = 'HTTP ' + r.status;
            try { const e = await r.json(); if (e && e.error) msg = e.error + ' (' + r.status + ')'; } catch (x) {}
            throw new Error(msg);
        }
        const result = await r.json();
        return { id: result.id, name: `${title}.hki`, blobUrl: result.blobUrl };
    },

    // Curator-only. Maps the old "delete" affordance to a hide.
    setHidden: async (id, hidden) => {
        if (!ArchiveSync.isSignedIn()) throw new Error('Must be signed in (401)');
        const r = await fetch(`${ArchiveSync.CONFIG.FN_BASE}/setHidden`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ArchiveSync._authHeader()),
            body: JSON.stringify({ id: id, hidden: hidden !== false })
        });
        if (!r.ok) {
            let msg = 'HTTP ' + r.status;
            try { const e = await r.json(); if (e && e.error) msg = e.error + ' (' + r.status + ')'; } catch (x) {}
            throw new Error(msg);
        }
        return await r.json();
    },
    deleteHki: async (id) => { await ArchiveSync.setHidden(id, true); return true; },

    // Owner or curator: advance a reading's maturity stage (metadata only).
    setStatus: async (id, status) => {
        if (!ArchiveSync.isSignedIn()) throw new Error('Must be signed in (401)');
        const r = await fetch(`${ArchiveSync.CONFIG.FN_BASE}/setStatus`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ArchiveSync._authHeader()),
            body: JSON.stringify({ id: id, status: status })
        });
        if (!r.ok) {
            let msg = 'HTTP ' + r.status;
            try { const e = await r.json(); if (e && e.error) msg = e.error + ' (' + r.status + ')'; } catch (x) {}
            throw new Error(msg);
        }
        return await r.json();
    },

    // ---- Inert in Phase 1 (no Drive folders / collaborators / cloud chart) ----
    loadProfile: async () => ({ collaborators: [], pendingRequests: [] }),
    saveProfile: async () => {},
    updateHkiCollaborators: async () => {},
    shareFileWithUser: async () => {},
    _syncPermissions: async () => {},
    getOrCreateFolder: async () => null,
    loadChartFromDrive: async () => null,
    saveChartToDrive: async () => ({ success: false, reason: 'cloud chart disabled in Phase 1' }),
    getChartMetadata: async () => null,
    checkChartConflict: async () => false,
    initializeDriveChart: async () => ({ success: false }),
    listFiles: async () => [],
    saveToCloud: async (hkiData, filename) =>
        ArchiveSync.saveHki(hkiData, { title: String(filename || 'Untitled').replace(/\.hki$/i, '') }),
    loadFromCloud: async (id) => ArchiveSync.loadHki(id)
};

if (typeof window !== 'undefined') {
    window.ArchiveSync = ArchiveSync;
    window.DriveSync = ArchiveSync;   // drop-in: existing call sites keep working
    ArchiveSync.initialize().then(() => console.log('✅ ArchiveSync (community archive) loaded'));
}
