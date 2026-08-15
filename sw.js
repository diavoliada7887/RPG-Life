const CACHE='rpg-live-v4-quick-icons';
const ASSETS=[
  './','./index.html','./styles.css','./fantasy.css','./rpg-assets.css','./app.js','./fantasy-patch.js','./rpg-assets.js','./manifest.webmanifest','./icon.svg',
  './assets/rpg/elf_chronist_01.png','./assets/rpg/dwarf_supplier_01.png','./assets/rpg/dragon_mainquest_01.png','./assets/rpg/bard_herald_01.png','./assets/rpg/spirit_buff_01.png','./assets/rpg/gremlin_debuff_01.png','./assets/rpg/popup_quest_accepted_01.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match('./index.html')))));
