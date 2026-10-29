// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.6.5-5b24608a';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.6.5-78f658d9',
  './js/config.js?v=1.6.5-eab06d46',
  './js/i18n.js?v=1.6.5-049f6116',
  './js/data.js?v=1.6.5-8cd09a7b',
  './js/util.js?v=1.6.5-dbf2951a',
  './js/validation.js?v=1.6.5-a04550f9',
  './js/render.js?v=1.6.5-d1cd5800',
  './js/calculators.js?v=1.6.5-a7e74cee',
  './js/content.js?v=1.6.5-0ae40063',
  './js/tools.js?v=1.6.5-de864cbb',
  './js/lists.js?v=1.6.5-48ba577d',
  './js/ui.js?v=1.6.5-30791157',
  './js/published.js?v=1.6.5-87f710f2',
  './js/owner.js?v=1.6.5-d9c3f3d3',
  './js/nav.js?v=1.6.5-69e8c584',
  './js/team.js?v=1.6.5-cc0702ac',
  './js/boot.js?v=1.6.5-aa24558c',
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
