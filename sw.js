// Hakli Glyph Recognizer - Service Worker
// Version 251203

const CACHE_NAME = 'hakli-v251203';
const RUNTIME_CACHE = 'hakli-runtime-v251203';

// Critical files to cache on install
const CORE_ASSETS = [
  '/hakli_glyph_recognizer/',
  '/hakli_glyph_recognizer/index.html',
  '/hakli_glyph_recognizer/favicon.svg',
  '/hakli_glyph_recognizer/Hakli_glyphs.JSON',
  'https://docs.opencv.org/4.5.2/opencv.js'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Core assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache core assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip Google APIs (Drive, etc.) - always use network
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('google.com') ||
      url.hostname.includes('gstatic.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Strategy: Cache First, falling back to Network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('[SW] Fetching from network:', url.pathname);
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses for later
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // Could return a custom offline page here
            throw error;
          });
      })
  );
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_GLYPH_IMAGES') {
    // Cache all glyph images for offline use
    const imageUrls = event.data.urls;
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(imageUrls);
      })
      .then(() => {
        console.log('[SW] Cached', imageUrls.length, 'glyph images');
      })
      .catch((error) => {
        console.error('[SW] Failed to cache glyph images:', error);
      });
  }
});

console.log('[SW] Service worker script loaded');
