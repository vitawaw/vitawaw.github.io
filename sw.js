// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.2.0';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.2.0',
  './js/config.js?v=1.2.0',
  './js/i18n.js?v=1.2.0',
  './js/data.js?v=1.2.0',
  './js/util.js?v=1.2.0',
  './js/validation.js?v=1.2.0',
  './js/render.js?v=1.2.0',
  './js/calculators.js?v=1.2.0',
  './js/content.js?v=1.2.0',
  './js/tools.js?v=1.2.0',
  './js/lists.js?v=1.2.0',
  './js/ui.js?v=1.2.0',
  './js/published.js?v=1.2.0',
  './js/owner.js?v=1.2.0',
  './js/boot.js?v=1.2.0',
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
    e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('./index.html',c));return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  // versioned files (css/js?v=…, fonts, icons): cache first
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c))}return r})));
});
