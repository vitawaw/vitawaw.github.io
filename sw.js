// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.13.0-5765fc84';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.13.0-3329b329',
  './js/pre.js?v=1.13.0-ade4e9d5',
  './js/config.js?v=1.13.0-cb35a58e',
  './js/i18n.js?v=1.13.0-936343ce',
  './js/data.js?v=1.13.0-5e682832',
  './js/util.js?v=1.13.0-79bc26a7',
  './js/validation.js?v=1.13.0-37b8f300',
  './js/render.js?v=1.13.0-dec0f6d6',
  './js/calculators.js?v=1.13.0-746d4342',
  './js/content.js?v=1.13.0-f26d1ff7',
  './js/tools.js?v=1.13.0-648e05fa',
  './js/lists.js?v=1.13.0-f92f442b',
  './js/ui.js?v=1.13.0-a9aa5a60',
  './js/published.js?v=1.13.0-87f710f2',
  './js/owner.js?v=1.13.0-a04cc79a',
  './js/nav.js?v=1.13.0-0c465b6d',
  './js/team.js?v=1.13.0-ca6436a6',
  './js/boot.js?v=1.13.0-fa591121',
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
