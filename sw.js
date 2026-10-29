// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.6.3';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.6.3-28d3da4d',
  './js/config.js?v=1.6.3-22e525f3',
  './js/i18n.js?v=1.6.3-02217025',
  './js/data.js?v=1.6.3-8cd09a7b',
  './js/util.js?v=1.6.3-db8d77a4',
  './js/validation.js?v=1.6.3-a04550f9',
  './js/render.js?v=1.6.3-64df5776',
  './js/calculators.js?v=1.6.3-a7e74cee',
  './js/content.js?v=1.6.3-e01d5b48',
  './js/tools.js?v=1.6.3-de864cbb',
  './js/lists.js?v=1.6.3-01fbd4cb',
  './js/ui.js?v=1.6.3-076cc2c2',
  './js/published.js?v=1.6.3-61cc18dc',
  './js/owner.js?v=1.6.3-33151ebe',
  './js/nav.js?v=1.6.3-6dd0d8c8',
  './js/team.js?v=1.6.3-cc0702ac',
  './js/boot.js?v=1.6.3-aa24558c',
  './fonts/cairo-600.woff',
  './fonts/cairo-700.woff',
  './fonts/cairo-800.woff',
  './fonts/tajawal-400.woff',
  './fonts/tajawal-500.woff',
  './fonts/tajawal-700.woff'
];

self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;               // Supabase, jsDelivr: always live
  // live content: network first, last good copy when offline
  if(url.pathname.startsWith('/api/')){
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c))}return r}).catch(()=>caches.match(req)));
    return;
  }
  // pages: network first so updates show, cache as fallback offline
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put('./index.html',c))}return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  // versioned files (css/js?v=…, fonts, icons): cache first
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c))}return r})));
});
