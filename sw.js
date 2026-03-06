// PEREKUP 2077 — Service Worker v3.1.1 stable-max
const CACHE_NAME = 'perekup-v311-stable-max';
const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './styles.css',
  './manifest.json',
  './js/main.js',
  './js/core/data.js',
  './js/core/utils.js',
  './js/core/state.js',
  './js/core/repair.js',
  './js/core/snapshots.js',
  './js/modes/sim.js',
  './js/modes/sixty.js',
  './js/ui/modal.js',
  './js/ui/screens.js',
  './js/update/updater.js',
  './js/update/patches.js',
  './assets/cars/default.webp',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

function isDynamicConfig(url) {
  return url.pathname.endsWith('/version.json') || url.pathname.endsWith('/patches/patches.json');
}

function shouldBypass(url) {
  return url.searchParams.has('clean') || url.searchParams.has('v') || url.searchParams.has('_') || url.searchParams.has('retry') || url.searchParams.has('reset');
}

async function putOk(request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackKey, timeoutMs) {
  try {
    const fresh = await withTimeout(fetch(request, { cache: 'no-store' }), timeoutMs || 4500);
    await putOk(fallbackKey || request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(fallbackKey || request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const freshPromise = fetch(request).then(async (response) => {
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (cached) return cached;
  const fresh = await freshPromise;
  if (fresh) return fresh;
  throw new Error('offline');
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'NUKE' || (event.data && event.data.type === 'RESET_CACHES')) {
    const port = event.ports && event.ports[0];
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => port && port.postMessage({ ok: true }))
      .catch((error) => port && port.postMessage({ ok: false, error: String(error) }));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!sameOrigin(url)) return;

  if (isDynamicConfig(url)) {
    event.respondWith(networkFirst(request, request, 3000));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, './index.html', 4000)
        .catch(() => caches.match('./index.html'))
        .catch(() => caches.match('./offline.html'))
    );
    return;
  }

  if (shouldBypass(url)) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(
    staleWhileRevalidate(request)
      .catch(() => caches.match(request))
      .catch(() => {
        if (request.destination === 'document') return caches.match('./offline.html');
        throw new Error('offline');
      })
  );
});
