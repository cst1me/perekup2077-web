// PEREKUP 2077 — Service Worker v3.1.0 stable
const CACHE_NAME = 'perekup-v310-stable';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './version.json',
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
  './patches/patches.json',
  './assets/cars/default.webp',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isDynamicConfig(url) {
  return url.pathname.endsWith('/version.json') || url.pathname.endsWith('/patches/patches.json');
}

function shouldBypass(url) {
  return url.searchParams.has('clean') || url.searchParams.has('v') || url.searchParams.has('_');
}

async function networkFirst(req, fallbackKey) {
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) {
      const copy = res.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(fallbackKey || req, copy);
    }
    return res;
  } catch (e) {
    const cached = await caches.match(fallbackKey || req);
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req).then(async (res) => {
    if (res && res.ok) {
      const copy = res.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(req, copy);
    }
    return res;
  }).catch(() => null);

  if (cached) return cached;
  const fresh = await fetchPromise;
  if (fresh) return fresh;
  throw new Error('offline');
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}));
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
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!isSameOrigin(url)) return;

  if (isDynamicConfig(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (shouldBypass(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, './index.html').catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(staleWhileRevalidate(req).catch(() => caches.match('./index.html')));
});
