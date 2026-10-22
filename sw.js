// Hakli Glyph Recognizer - Service Worker
// Network First for same-origin app code (no stale .js after deploy);
// a separate UNVERSIONED "stable" cache holds the heavy immutable deps
// (OpenCV.js, chart+templates, CDN libs) so offline recognition survives
// both a fresh install and every deploy.

const CACHE_VERSION = 'v261022c';
const CACHE_NAME = `hakli-${CACHE_VERSION}`;          // app shell (versioned)
const RUNTIME_CACHE = `hakli-runtime-${CACHE_VERSION}`; // same-origin app code (versioned)
const STABLE_CACHE = 'hakli-stable-v1';               // heavy immutable deps (NOT purged on deploy)

// Small shell files to cache on install (resilient, per-item).
const CORE_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './favicon.png',
  './hh-logo.png',
  './manifest.json'
];

// Heavy, (near-)immutable deps required for offline recognition.
// These go in STABLE_CACHE and persist across deploys.
//  - opencv.js            : WASM CV engine (~10MB), never changes between deploys
//  - Hakli_glyphs.JSON    : the chart + all 66 templates embedded as data: URIs
//  - React / ReactDOM / Babel / Tailwind / jsPDF : version-pinned CDN libs
const STABLE_SAME_ORIGIN = [
  './opencv.js',
  './Hakli_glyphs.JSON'
];
const STABLE_CDN = [
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// The chart changes occasionally (community adds glyphs); serve it
// stale-while-revalidate so it is offline-safe AND self-freshens online.
const SWR_PATHS = ['/Hakli_glyphs.JSON'];

// Cache each URL independently so one failure can't abort the whole batch
// (the old cache.addAll was atomic — a single 404 cached nothing).
async function cacheEachInto(cacheName, urls) {
  const cache = await caches.open(cacheName);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const isCross = /^https?:\/\//.test(url) && url.indexOf(self.location.origin) !== 0;
      try {
        // Try a normal (CORS) fetch first — gives verifiable responses for
        // CDNs that send CORS headers (unpkg, cdnjs).
        let res = await fetch(url, { cache: 'reload' }).catch(() => null);
        // Some CDNs (e.g. cdn.tailwindcss.com) send no CORS headers, so the
        // CORS fetch fails. Retry opaque (no-cors) so we can still cache them —
        // opaque responses serve fine to <script src> tags.
        if ((!res || !res.ok) && isCross) {
          res = await fetch(url, { mode: 'no-cors', cache: 'reload' });
        }
        if (res && (res.ok || res.type === 'opaque')) {
          await cache.put(url, res.clone());
          return url;
        }
        throw new Error('bad status ' + (res && res.status));
      } catch (e) {
        console.warn('[SW] precache skipped:', url, e.message);
        throw e;
      }
    })
  );
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[SW] precached ${ok}/${urls.length} into ${cacheName}`);
}

// Install - cache the small shell AND the heavy offline-critical deps,
// each resiliently. Install still succeeds even if some items fail.
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION}...`);
  event.waitUntil(
    (async () => {
      await cacheEachInto(CACHE_NAME, CORE_ASSETS);
      // Heavy deps: don't block install success on these, but kick them off now.
      await cacheEachInto(STABLE_CACHE, [...STABLE_SAME_ORIGIN, ...STABLE_CDN])
        .catch(() => {});
      console.log('[SW] Install complete');
      // Don't skipWaiting - let the page decide when to activate the update.
    })()
  );
});

// Activate - delete old versioned caches, but NEVER the stable cache.
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}...`);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('hakli-') &&
                         n !== CACHE_NAME &&
                         n !== RUNTIME_CACHE &&
                         n !== STABLE_CACHE)      // keep the stable deps across deploys
          .map((n) => { console.log('[SW] Deleting old cache:', n); return caches.delete(n); })
      ))
      .then(() => { console.log('[SW] Activated'); return self.clients.claim(); })
  );
});

function isStableRequest(url) {
  if (url.origin === self.location.origin) {
    return STABLE_SAME_ORIGIN.some((p) => url.pathname.endsWith(p.replace('./', '/')) ||
                                          url.pathname.endsWith(p.replace('./', '')));
  }
  // cross-origin CDN libs
  return STABLE_CDN.some((u) => url.href === u || url.href.startsWith(u.split('?')[0]));
}

function isSwr(url) {
  return SWR_PATHS.some((p) => url.pathname.endsWith(p));
}

// Fetch routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Google APIs (Drive, OAuth) - always network, never intercept.
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('accounts.google')) {
    return;
  }

  // 1. Chart JSON (templates) - Stale-While-Revalidate into STABLE.
  //    Offline-safe (serves cache) and self-freshening (updates in background).
  if (isSwr(url)) {
    event.respondWith(
      caches.open(STABLE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res && res.status === 200) cache.put(request, res.clone());
          return res;
        }).catch(() => null);
        return cached || (await network) || caches.match(request);
      })
    );
    return;
  }

  // 2. Heavy immutable deps (OpenCV, CDN libs) - Cache-First into STABLE.
  //    These never change between deploys, so cache-first is safe and fast,
  //    and they survive version bumps.
  if (isStableRequest(url)) {
    event.respondWith(
      caches.open(STABLE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // 3. HTML / navigation - Network First (always get the latest shell online,
  //    fall back to cache offline).
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. Same-origin app code (.jsx, src/*.js) - Network First into versioned
  //    runtime, so code updates take effect on deploy; offline falls back to cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 5. Any other cross-origin - Cache First into runtime.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }))
  );
});

// Messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  // Belt-and-suspenders: let the app ask the SW to (re)warm the heavy deps
  // into the stable cache, e.g. right after a successful online load.
  if (event.data && event.data.type === 'WARM_STABLE') {
    event.waitUntil(
      cacheEachInto(STABLE_CACHE, [...STABLE_SAME_ORIGIN, ...STABLE_CDN]).catch(() => {})
    );
  }
});

console.log(`[SW] Service worker script loaded - ${CACHE_VERSION}`);
