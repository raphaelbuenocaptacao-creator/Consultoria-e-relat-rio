const CACHE_VERSION = 'consultoria-relatorio-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_SHELL = new Set(['./', './index.html', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg', './icons/icon-512-maskable.svg']);
const PRIVATE_PATH = /\/(api|auth|login|logout|admin|session|sessions|token|tokens|account|profile|me)(\/|\?|$)/i;

function isSafeRequest(request) {
  if (request.method !== 'GET' || request.headers.has('Authorization')) return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin && !PRIVATE_PATH.test(url.pathname);
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll([...APP_SHELL])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== STATIC_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (!isSafeRequest(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match('./index.html')));
    return;
  }

  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  const relative = './' + url.pathname.slice(scopePath.length);
  if (!APP_SHELL.has(relative)) return;

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
