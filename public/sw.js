const CACHE_NAME = 'forschungsdaten-app-v2';
const CORE_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
  );
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/favicon.svg' || url.pathname === '/favicon.ico') return;
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((resp) => {
            if (resp && resp.status === 200) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
