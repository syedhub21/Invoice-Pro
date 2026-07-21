const CACHE_NAME = 'invoicepro-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/fonts/geist-latin.woff2',
  '/fonts/geist-latin-ext.woff2',
  '/fonts/geist-mono-latin.woff2',
  '/fonts/geist-mono-latin-ext.woff2',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW: Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first strategy for full offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls (static export has no server-side API routes)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first strategy: try cache, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => { 
            cache.put(request, clone); 
          }).catch(() => {});
        }
        return response;
      }).catch(() => {
        // If network fails and it's a navigation request, serve index
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
