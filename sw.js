// PEREKUP 2077 — Service Worker v3.0.8
var CACHE = 'perekup-v308';

self.addEventListener('install', function() {
  console.log('[SW] v308 install');
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  console.log('[SW] v308 activate');
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n) {
        return n !== CACHE;
      }).map(function(n) {
        console.log('[SW] Delete old cache:', n);
        return caches.delete(n);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  
  // Always fresh for version.json
  if (url.pathname.indexOf('version.json') !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }
  
  // Network first
  e.respondWith(
    fetch(e.request).then(function(r) {
      if (r && r.ok) {
        var c = r.clone();
        caches.open(CACHE).then(function(cache) { cache.put(e.request, c); });
      }
      return r;
    }).catch(function() { return caches.match(e.request); })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'NUKE') {
    caches.keys().then(function(n) {
      return Promise.all(n.map(function(k) { return caches.delete(k); }));
    });
  }
});
