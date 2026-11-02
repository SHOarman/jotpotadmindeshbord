// Clean Service Worker - Self-healing and cache clearing
const CACHE_NAME = 'jotpot-admin-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Pass-through fetch handler for PWA compliance without caching hashed Vite modules or stale index.html
self.addEventListener('fetch', (event) => {
  // Let network handle all requests naturally to avoid stale-chunk and MIME type conflicts
  return;
});
