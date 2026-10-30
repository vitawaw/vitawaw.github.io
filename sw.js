// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.11.1-b4e3faa7';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.11.1-b750ea07',
  './js/pre.js?v=1.11.1-20f65a20',
  './js/config.js?v=1.11.1-3d0d65ea',
  './js/i18n.js?v=1.11.1-45c88972',
  './js/data.js?v=1.11.1-5672c063',
  './js/util.js?v=1.11.1-19fde934',
  './js/validation.js?v=1.11.1-0db6be41',
  './js/render.js?v=1.11.1-b6302095',
  './js/calculators.js?v=1.11.1-ed27f643',
  './js/content.js?v=1.11.1-3ee5aa74',
  './js/tools.js?v=1.11.1-6004d8ff',
  './js/lists.js?v=1.11.1-3691e0dd',
  './js/ui.js?v=1.11.1-cec8fdc9',
  './js/published.js?v=1.11.1-87f710f2',
  './js/owner.js?v=1.11.1-d7c63e3d',
  './js/nav.js?v=1.11.1-d1741d89',
  './js/team.js?v=1.11.1-eb689bb8',
  './js/boot.js?v=1.11.1-fa591121',
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
