/*
 * Service worker for the school site.
 * - Installs the "app shell" (the page and icons) so the site opens offline too.
 * - Pages: network first, so the newest version is used when online; cached copy when offline.
 * - Other same-origin files: cache first, then network.
 * - Other origins (CDNs, Firebase, APIs): always the network; never cached here.
 */
const CACHE = 'nakhapara-shell-v1';
const PAGE = new URL('./index.html', self.location.href).href;
const SHELL = [
  new URL('./', self.location.href).href,
  PAGE,
  new URL('./manifest.json', self.location.href).href,
  new URL('./icons/icon-192.png', self.location.href).href,
  new URL('./icons/icon-512.png', self.location.href).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // CDNs, Firebase and APIs go straight to the network

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(PAGE, copy));
          return res;
        })
        .catch(() => caches.match(PAGE))
    );
    return;
  }

  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
