const CACHE='rpg-life-v70-pwa-runtime';

self.addEventListener('install',event=>{
  const base=new URL('./',self.location.href);
  const essentials=[
    new URL('./',base).href,
    new URL('manifest.webmanifest?v=70',base).href,
    new URL('assets/app-icon-v3.png?v=70',base).href,  ];
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(essentials).catch(()=>{}))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('rpg-life-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  const networkFirst=
    request.mode==='navigate' ||
    ['script','style','manifest'].includes(request.destination);

  if(networkFirst){
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response&&response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(request,copy));
          }
          return response;
        })
        .catch(async()=>(
          (await caches.match(request)) ||
          (request.mode==='navigate' ? (await caches.match(new URL('./',self.location.href).href)) : null) ||
          Response.error()
        ))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached||Response.error());
      return cached||network;
    })
  );
});
