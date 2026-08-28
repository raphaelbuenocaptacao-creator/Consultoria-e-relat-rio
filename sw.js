const CACHE_VERSION = 'consultoria-relatorio-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];

const PRIVATE_PATH = /\/(api|auth|login|logout|admin|session|sessions|token|tokens|account|profile|me)(\/|\?|$)/i;

function isSafeRequest(request) {
  if (request.method !== 'GET') return false;
  if (request.headers.has('Authorization')) return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (PRIVATE_PATH.test(url.pathname)) return false;
  return true;
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== STATIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (!isSafeRequest(request)) return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
