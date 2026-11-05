// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.17.1-3168a7ba';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.17.1-4e76553a',
  './js/pre.js?v=1.17.1-ce28d413',
  './js/config.js?v=1.17.1-7cc44897',
  './js/i18n.js?v=1.17.1-147b126e',
  './js/data.js?v=1.17.1-78a70643',
  './js/util.js?v=1.17.1-ece5b126',
  './js/validation.js?v=1.17.1-37b8f300',
  './js/render.js?v=1.17.1-66a9cb73',
  './js/calculators.js?v=1.17.1-1dff5b6c',
  './js/content.js?v=1.17.1-5406ea95',
  './js/tools.js?v=1.17.1-f9c3ba50',
  './js/lists.js?v=1.17.1-2bffe93a',
  './js/ui.js?v=1.17.1-23674f2f',
  './js/published.js?v=1.17.1-87f710f2',
  './js/owner.js?v=1.17.1-cc56612c',
  './js/nav.js?v=1.17.1-7030cf93',
  './js/team.js?v=1.17.1-ca6436a6',
  './js/stats.js?v=1.17.1-5a8860e0',
  './js/boot.js?v=1.17.1-1e021727',
  './fonts/cairo-700.woff2',
  './fonts/cairo-800.woff2',
  './fonts/tajawal-400.woff2',
  './fonts/tajawal-500.woff2',
  './fonts/tajawal-700.woff2'
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
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();e.waitUntil(caches.open(VERSION).then(x=>x.put(req,c)))}return r}).catch(()=>caches.match(req)));
    return;
  }
  // pages: network first so updates show; after 3 s on a weak signal (or offline) the saved copy
  if(req.mode==='navigate'){
    const net=fetch(req).then(r=>{if(r.ok){const c=r.clone();e.waitUntil(caches.open(VERSION).then(x=>x.put('./index.html',c)))}return r});
    const slow=new Promise(ok=>setTimeout(ok,3000)).then(()=>caches.match('./index.html'));
    e.respondWith(Promise.race([net.catch(()=>caches.match('./index.html')),slow.then(m=>m||net)]));
    return;
  }
  // versioned files (css/js?v=…, fonts, icons): cache first
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c))}return r})));
});
