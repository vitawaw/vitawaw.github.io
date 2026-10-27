// VITAWAW offline cache. Change VERSION whenever you upload a new index.html
const VERSION='vitawaw-1.0.1';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.url.includes('.supabase.co'))return; // always live data
  // pages: network first so updates show, cache as fallback offline
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('./index.html',c));return r}).catch(()=>caches.match('./index.html')));return}
  // everything else (fonts, icons): cache first
  e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok||r.type==='opaque'){const c=r.clone();caches.open(VERSION).then(x=>x.put(e.request,c))}return r})));
});
