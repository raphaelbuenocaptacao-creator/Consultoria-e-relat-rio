const CACHE_VERSION = 'consultoria-relatorio-v4-safe-shell';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_SHELL = new Set([
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-512-maskable.svg'
]);
const PRIVATE_PATH = /\/(api|auth|login|logout|admin|session|sessions|token|tokens|account|profile|me)(\/|\?|$)/i;
const SENSITIVE_QUERY_KEYS = new Set([
  'token','access_token','refresh_token','password','passwd','secret','session','session_id',
  'auth','authorization','api_key','apikey','code','credential','credentials'
]);

function hasSensitiveQuery(url) {
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) return true;
  }
  return false;
}

function isSafeRequest(request) {
  if (request.method !== 'GET' || request.headers.has('Authorization') || request.headers.has('Cookie')) return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin && !PRIVATE_PATH.test(url.pathname) && !hasSensitiveQuery(url);
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type === 'opaque') return false;
  const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.includes('private') || cacheControl.includes('no-store')) return false;
  if (response.headers.has('Set-Cookie')) return false;
  return true;
}

async function precacheShell() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all([...APP_SHELL].map(async path => {
    try {
      const response = await fetch(path, {
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'follow'
      });
      if (isCacheableResponse(response)) await cache.put(path, response.clone());
    } catch (error) {
      console.warn('PWA precache skipped:', path, error);
    }
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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
    event.respondWith(
      fetch(request, { cache: 'no-store', credentials: 'same-origin' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const url = new URL(request.url);
  if (url.search) return;
  const scopePath = new URL(self.registration.scope).pathname;
  const relative = './' + url.pathname.slice(scopePath.length);
  if (!APP_SHELL.has(relative)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request, { cache: 'no-store', credentials: 'omit' });
    if (isCacheableResponse(response)) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
