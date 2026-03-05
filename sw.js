// PEREKUP 2077 — Service Worker v3.0.4
var CACHE_NAME = 'perekup-v304';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'RESET_CACHES') {
    var port = e.ports && e.ports[0];
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      if (port) port.postMessage({ ok: true });
    }).catch(function(err) {
      if (port) port.postMessage({ ok: false, error: String(err) });
    });
  }
});
