const CACHE='rpg-life-v43-writer-buffs';
const ASSETS=['./','./index.html','./styles.css','./fantasy.css','./rpg-v2.css','./rpg-v4.css','./rpg-v5.css','./rpg-v6.css','./rpg-v7.css','./rpg-v8.css','./rpg-v10.css','./rpg-v11.css','./rpg-v12.css','./rpg-v13.css','./rpg-v18.css?v=31','./rpg-v19.css?v=32','./rpg-v20.css?v=33','./rpg-v22.css?v=35','./rpg-v23.css?v=36','./rpg-v24.css?v=38','./rpg-v26.css?v=40','./rpg-v27.css?v=41','./cloud-sync.css?v=37','./app.js','./calorie-bank.js','./rpg-simple-bank.js','./gameplay-v5.js','./gameplay-v6.js','./gameplay-v7.js','./gameplay-v8.js','./gameplay-v10.js','./gameplay-v11.js','./gameplay-v12.js','./gameplay-v13.js','./gameplay-v14.js','./gameplay-v15.js','./gameplay-v16.js','./gameplay-v17.js?v=30','./gameplay-v18.js?v=31','./gameplay-v19.js?v=32','./gameplay-v20.js?v=33','./gameplay-v22.js?v=35','./gameplay-v23.js?v=36','./gameplay-v24.js?v=38','./gameplay-v25.js?v=39','./gameplay-v27.js?v=41','./gameplay-v28.js?v=42','./gameplay-v29.js?v=43','./cloud-sync.js?v=37','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return resp}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match('./index.html'))));
});