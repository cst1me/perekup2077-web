// sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function cacheBuild(build, files){
  const cacheName = `perekup-cache-build-${build}`;
  const cache = await caches.open(cacheName);

  // Кэшируем файлы с cache-busting, чтобы реально скачать новые
  const requests = (files || []).map(p => new Request(`${p}?b=${build}`, { cache: 'no-store' }));
  await cache.addAll(requests);

  // Чистим старые кэши (оставим только текущий build)
  const keys = await caches.keys();
  await Promise.all(keys.map(k => {
    if(k.startsWith('perekup-cache-build-') && k !== cacheName) return caches.delete(k);
  }));
}

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  const port = event.ports && event.ports[0];

  if(msg.type === 'SKIP_WAITING'){
    self.skipWaiting();
    return;
  }

  if(msg.type === 'CACHE_BUILD'){
    const { build, files } = msg;
    event.waitUntil((async () => {
      try{
        await cacheBuild(build, files);
        port?.postMessage({ ok: true });
      }catch(e){
        port?.postMessage({ ok: false, error: String(e?.message || e) });
      }
    })());
  }
});

// Стратегия fetch: сначала cache, потом сеть (быстро как приложение)
self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if(cached) return cached;

    try{
      const res = await fetch(event.request);
      return res;
    }catch{
      return cached || Response.error();
    }
  })());
});