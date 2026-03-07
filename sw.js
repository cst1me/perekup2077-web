// PEREKUP 2077 — Service Worker v5.4.4 optimized
const CACHE_NAME = 'perekup-v545-opt';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/main.js',
  './js/core/state.js',
  './js/core/monetization.js',
  './js/modes/sim.js',
  './js/modes/sixty.js'
];

// Установка - кешируем критические ресурсы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация - чистим старые кеши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Запросы - Cache First для статики, Network First для API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Пропускаем внешние запросы
  if (url.origin !== self.location.origin) return;
  
  // Network First для version.json и patches
  if (url.pathname.includes('version.json') || url.pathname.includes('patches')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Cache First для всего остального
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
