// PEREKUP 2077 — Service Worker v3.1.8
var CACHE_NAME = 'perekup-v401';
var CACHE_PREFIX = 'perekup-';

self.addEventListener('install', function(event) {
  console.log('[SW] v401 installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] v401 activating');
  event.waitUntil(
    Promise.all([
      // Удаляем старые кеши
      caches.keys().then(function(names) {
        return Promise.all(
          names.filter(function(name) {
            return name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME;
          }).map(function(name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  
  // Всегда network-first для критических файлов
  if (url.pathname.indexOf('version.json') !== -1 || 
      url.pathname.indexOf('manifest.json') !== -1 ||
      url.pathname.indexOf('.html') !== -1) {
    event.respondWith(
      fetch(request).catch(function() { return caches.match(request); })
    );
    return;
  }
  
  // Network-first с cache fallback
  event.respondWith(
    fetch(request)
      .then(function(response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
        }
        return response;
      })
      .catch(function() { return caches.match(request); })
  );
});

self.addEventListener('message', function(event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'NUKE_CACHES') {
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    }).then(function() {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ success: true });
    });
  }
});
