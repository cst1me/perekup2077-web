/* PEREKUP 2077 — Steam-like updater (Service Worker)
   - кеш по build из manifest.json
   - build устанавливается только после CACHE_BUILD ok (на стороне клиента)
   - navigate/app-shell: отдаём index.html из кеша, если он есть
*/
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

function cacheNameForBuild(build){
  const b = parseInt(build, 10) || 0;
  return `perekup-cache-build-${b || 'unknown'}`;
}

async function cacheBuild(build, files){
  const cacheName = cacheNameForBuild(build);
  const cache = await caches.open(cacheName);

  // удалить старые build-кеши
  const keys = await caches.keys();
  await Promise.all(keys.map(async (k)=>{
    if(k.startsWith('perekup-cache-build-') && k !== cacheName){
      await caches.delete(k);
    }
  }));

  const scope = self.registration.scope;
  for(const f of (files || [])){
    const cleanUrl = new URL(f, scope).toString();
    const bustUrl = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + `b=${encodeURIComponent(build)}&t=${Date.now()}`;
    const res = await fetch(bustUrl, { cache: 'no-store' });
    if(!res.ok) throw new Error(`fetch failed ${res.status} ${f}`);
    await cache.put(cleanUrl, res.clone());
  }
  return true;
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if(data.type === 'CACHE_BUILD'){
    const port = event.ports && event.ports[0];
    event.waitUntil((async ()=>{
      try{
        await cacheBuild(data.build, data.files || []);
        port && port.postMessage({ ok:true });
      }catch(e){
        port && port.postMessage({ ok:false, error:String(e && (e.message || e)) });
      }
    })());
  }
});

async function findLatestBuildCache(){
  const keys = await caches.keys();
  const buildCaches = keys
    .filter(k => k.startsWith('perekup-cache-build-'))
    .map(k => ({ k, n: parseInt(k.replace('perekup-cache-build-',''), 10) || 0 }))
    .sort((a,b) => b.n - a.n);
  return buildCaches.length ? buildCaches[0].k : null;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith((async ()=>{
    const cacheName = await findLatestBuildCache();
    if(!cacheName) return fetch(req);

    const cache = await caches.open(cacheName);

    // app-shell для навигаций
    if(req.mode === 'navigate'){
      const shellUrl = new URL('./index.html', self.registration.scope).toString();
      const shell = await cache.match(shellUrl, { ignoreSearch:true });
      if(shell) return shell;
      return fetch(req);
    }

    // корень сайта -> index.html
    let cacheKey = url.toString();
    if(url.pathname === '/' ) cacheKey = new URL('./index.html', self.registration.scope).toString();

    const cached = await cache.match(cacheKey, { ignoreSearch:true });
    if(cached) return cached;

    try{
      const res = await fetch(req);
      if(res && res.ok) await cache.put(cacheKey, res.clone());
      return res;
    }catch(_e){
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
