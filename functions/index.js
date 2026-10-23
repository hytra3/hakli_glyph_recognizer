'use strict';

/**
 * Hakli community archive — Cloud Functions (2nd gen, Node 20).
 *
 * Three HTTP functions, deployed from this one source with different
 * --entry-point values:
 *   submitInscription  POST  (signed-in user)  store .hki in GCS + index in Datastore
 *   listInscriptions   GET   (public)          list published, non-hidden inscriptions
 *   setHidden          POST  (curator only)    hide / unhide an inscription
 *
 * Auth is identity-only: the browser signs in with Google Identity Services,
 * gets an ID token, and sends it as `Authorization: Bearer <id_token>`.
 * We verify it here against our OAuth client ID — NO Drive scope, so no
 * "unverified app / unsafe" consent screen for contributors.
 *
 * Storage: the existing project database is in Datastore mode, so we use the
 * Datastore API (kind = HakliInscription) rather than Firestore Native.
 * Inscription blobs live in a public-read GCS bucket; the catalog only holds
 * metadata + the public blob URL.
 */

const functions = require('@google-cloud/functions-framework');
const { Datastore } = require('@google-cloud/datastore');
const { Storage } = require('@google-cloud/storage');

// ---- Config (overridable via deploy-time env vars) -------------------------
const BUCKET = process.env.BUCKET || 'hakli-archive-tawkin-blue';
const KIND = process.env.DS_KIND || 'HakliInscription';
const CLIENT_ID = process.env.CLIENT_ID ||
  '533670139668-51vdk21n97p2e9lgubfvmdsnqu3ie2jr.apps.googleusercontent.com';
const CURATORS = (process.env.CURATOR_EMAILS || 'marty@heaton.biz')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://hudhud.dev,https://hytra3.github.io,http://localhost,http://localhost:8080')
  .split(',').map((s) => s.trim()).filter(Boolean);
// Reject absurdly large payloads early (bytes of JSON in the request body).
const MAX_HKI_BYTES = parseInt(process.env.MAX_HKI_BYTES || '25000000', 10); // ~25MB (photo + audio)

// Maturity of a reading (all public). Orthogonal to `hidden` (curator moderation).
const STAGES = ['draft', 'review', 'final'];
function normStatus(body) {
  if (STAGES.includes(body.status)) return body.status;
  if (body.visibility === 'published') return 'final';
  if (STAGES.includes(body.visibility)) return body.visibility;
  return 'draft';
}

const datastore = new Datastore();
const storage = new Storage();

// ---- Helpers ---------------------------------------------------------------
function setCors(req, res) {
  const origin = req.headers.origin;
  res.set('Access-Control-Allow-Origin',
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Max-Age', '3600');
}

// Verify the caller's Google OAuth access token by asking Google who it belongs
// to. Identity-only (openid/email/profile) — no Drive scope, so no "unsafe"
// consent screen. Returns { email, name }. Throws { code, msg }.
async function verifyUser(req) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw { code: 401, msg: 'Missing bearer token' };
  let info;
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${m[1].trim()}` }
    });
    if (!resp.ok) throw new Error('userinfo ' + resp.status);
    info = await resp.json();
  } catch (e) {
    throw { code: 401, msg: 'Invalid or expired token' };
  }
  if (!info || !info.email || info.email_verified === false) {
    throw { code: 401, msg: 'Unverified identity' };
  }
  return { email: String(info.email).toLowerCase(), name: info.name || info.email };
}

function newId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function str(v, max) {
  return (v == null ? '' : String(v)).slice(0, max);
}

// ---- submitInscription -----------------------------------------------------
functions.http('submitInscription', async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = await verifyUser(req);
    const body = req.body || {};
    const hki = body.hki;
    if (!hki || typeof hki !== 'object') {
      return res.status(400).json({ error: 'Missing hki object' });
    }
    const hkiJson = JSON.stringify(hki);
    if (Buffer.byteLength(hkiJson, 'utf8') > MAX_HKI_BYTES) {
      return res.status(413).json({ error: 'Inscription too large' });
    }

    const id = newId();
    const objectPath = `inscriptions/${id}.hki`;
    await storage.bucket(BUCKET).file(objectPath).save(hkiJson, {
      contentType: 'application/json',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=300' }
    });
    const blobUrl = `https://storage.googleapis.com/${BUCKET}/${objectPath}`;

    // Also store the source image as a small standalone public object so the
    // gallery can show a thumbnail without fetching the whole .hki blob.
    try {
      const im = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(hki.image || '');
      if (im) {
        await storage.bucket(BUCKET).file(`inscriptions/${id}.img`).save(Buffer.from(im[2], 'base64'), {
          contentType: im[1],
          resumable: false,
          metadata: { cacheControl: 'public, max-age=3600' }
        });
      }
    } catch (e) { console.warn('thumb write failed:', e && e.message); }

    const now = new Date();
    const glyphCount = Array.isArray(hki.recognitionResults)
      ? hki.recognitionResults.length
      : (typeof body.glyphCount === 'number' ? body.glyphCount : 0);

    await datastore.save({
      key: datastore.key([KIND, id]),
      data: [
        { name: 'title', value: str(body.title || hki.inscriptionTitle || 'Untitled', 200) },
        { name: 'ownerEmail', value: user.email },
        { name: 'ownerName', value: str(user.name, 120) },
        { name: 'anchorProvenance', value: str(body.provenance || hki.inscriptionSource || '', 500), excludeFromIndexes: true },
        { name: 'status', value: normStatus(body) },
        { name: 'visibility', value: 'published' },   // back-compat; listing no longer filters on it
        { name: 'hidden', value: false },
        { name: 'glyphCount', value: glyphCount },
        { name: 'hasAudio', value: !!(hki.audioData || hki.hasAudio) },
        { name: 'blobUrl', value: blobUrl, excludeFromIndexes: true },
        { name: 'createdAt', value: now },
        { name: 'updatedAt', value: now }
      ]
    });

    return res.status(200).json({ id, blobUrl, status: normStatus(body) });
  } catch (e) {
    const code = Number.isInteger(e && e.code) ? e.code : 500;
    if (code === 500) console.error('submitInscription error:', e);
    return res.status(code).json({ error: (e && e.msg) || 'Server error' });
  }
});

// ---- listInscriptions ------------------------------------------------------
functions.http('listInscriptions', async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  try {
    // List all non-hidden entries (any maturity stage), newest first. We filter
    // `hidden` in code so the query needs only the automatic createdAt index —
    // no composite index to maintain.
    const query = datastore.createQuery(KIND)
      .order('createdAt', { descending: true })
      .limit(500);
    const [rows] = await datastore.runQuery(query);
    const items = rows
      .filter((r) => r.hidden !== true)
      .map((r) => ({
        id: r[datastore.KEY].name,
        title: r.title,
        ownerName: r.ownerName,
        provenance: r.anchorProvenance,
        glyphCount: r.glyphCount,
        hasAudio: r.hasAudio,
        status: r.status || (r.visibility === 'published' ? 'final' : (r.visibility || 'draft')),
        blobUrl: r.blobUrl,
        createdAt: r.createdAt
      }));
    res.set('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ items });
  } catch (e) {
    console.error('listInscriptions error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- setHidden (curator) ---------------------------------------------------
functions.http('setHidden', async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = await verifyUser(req);
    if (!CURATORS.includes(user.email)) {
      return res.status(403).json({ error: 'Not a curator' });
    }
    const body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Missing id' });

    const key = datastore.key([KIND, String(body.id)]);
    const [entity] = await datastore.get(key);
    if (!entity) return res.status(404).json({ error: 'Not found' });

    const data = Object.assign({}, entity);
    delete data[datastore.KEY];
    data.hidden = body.hidden !== false; // default: hide
    data.updatedAt = new Date();
    await datastore.save({ key, data });

    return res.status(200).json({ id: String(body.id), hidden: data.hidden });
  } catch (e) {
    const code = Number.isInteger(e && e.code) ? e.code : 500;
    if (code === 500) console.error('setHidden error:', e);
    return res.status(code).json({ error: (e && e.msg) || 'Server error' });
  }
});

// ---- setStatus (owner or curator) ------------------------------------------
// Advance a reading's maturity (draft -> review -> final) in place. Metadata
// only — it does not change the inscription's content (that stays versioned).
functions.http('setStatus', async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = await verifyUser(req);
    const body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Missing id' });
    if (!STAGES.includes(body.status)) return res.status(400).json({ error: 'Invalid status' });

    const key = datastore.key([KIND, String(body.id)]);
    const [entity] = await datastore.get(key);
    if (!entity) return res.status(404).json({ error: 'Not found' });

    const isOwner = entity.ownerEmail && String(entity.ownerEmail).toLowerCase() === user.email;
    if (!isOwner && !CURATORS.includes(user.email)) {
      return res.status(403).json({ error: 'Only the owner or a curator can change status' });
    }

    const data = Object.assign({}, entity);
    delete data[datastore.KEY];
    data.status = body.status;
    data.updatedAt = new Date();
    await datastore.save({ key, data });

    return res.status(200).json({ id: String(body.id), status: body.status });
  } catch (e) {
    const code = Number.isInteger(e && e.code) ? e.code : 500;
    if (code === 500) console.error('setStatus error:', e);
    return res.status(code).json({ error: (e && e.msg) || 'Server error' });
  }
});

// ---- restrictAudio (owner or curator) --------------------------------------
// Remove the audio from an inscription's PUBLIC copy (e.g. pending the speaker's
// permission). Strips audioData from the blob, re-saves it no-cache, and clears
// the catalog hasAudio flag. The owner's local .hki still has the recording, so
// they can re-publish with audio once permission is granted.
functions.http('restrictAudio', async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const user = await verifyUser(req);
    const body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Missing id' });

    const key = datastore.key([KIND, String(body.id)]);
    const [entity] = await datastore.get(key);
    if (!entity) return res.status(404).json({ error: 'Not found' });
    const isOwner = entity.ownerEmail && String(entity.ownerEmail).toLowerCase() === user.email;
    if (!isOwner && !CURATORS.includes(user.email)) {
      return res.status(403).json({ error: 'Only the owner or a curator can restrict audio' });
    }

    // Strip audio from the blob and re-save (no-cache so viewers pick it up).
    const file = storage.bucket(BUCKET).file(`inscriptions/${String(body.id)}.hki`);
    const [buf] = await file.download();
    const hki = JSON.parse(buf.toString('utf8'));
    const had = !!(hki.audioData || hki.audio);
    delete hki.audioData;
    delete hki.audio;
    await file.save(JSON.stringify(hki), {
      contentType: 'application/json',
      resumable: false,
      metadata: { cacheControl: 'no-cache' }
    });

    // Clear the catalog flag so the card's audio chip disappears.
    const data = Object.assign({}, entity);
    delete data[datastore.KEY];
    data.hasAudio = false;
    data.updatedAt = new Date();
    await datastore.save({ key, data });

    return res.status(200).json({ id: String(body.id), audioRemoved: had });
  } catch (e) {
    const code = Number.isInteger(e && e.code) ? e.code : 500;
    if (code === 500) console.error('restrictAudio error:', e);
    return res.status(code).json({ error: (e && e.msg) || 'Server error' });
  }
});
