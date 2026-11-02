// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.12.1-52573449';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.12.1-1313e169',
  './js/pre.js?v=1.12.1-20f65a20',
  './js/config.js?v=1.12.1-eed4ad92',
  './js/i18n.js?v=1.12.1-a7123d7f',
  './js/data.js?v=1.12.1-5672c063',
  './js/util.js?v=1.12.1-19fde934',
  './js/validation.js?v=1.12.1-0db6be41',
  './js/render.js?v=1.12.1-5aa78271',
  './js/calculators.js?v=1.12.1-ed27f643',
  './js/content.js?v=1.12.1-545c9a81',
  './js/tools.js?v=1.12.1-0884a85c',
  './js/lists.js?v=1.12.1-80cf42f5',
  './js/ui.js?v=1.12.1-e31e6d11',
  './js/published.js?v=1.12.1-87f710f2',
  './js/owner.js?v=1.12.1-6a6f5b5b',
  './js/nav.js?v=1.12.1-d854a4a1',
  './js/team.js?v=1.12.1-ca6436a6',
  './js/boot.js?v=1.12.1-fa591121',
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
