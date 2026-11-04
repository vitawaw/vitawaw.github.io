// VITAWAW service worker: lets the installed app open offline.
// VERSION and FILES are updated by tools/set_version.py; do not edit them by hand.
const VERSION='vitawaw-1.16.0-60291281';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './css/app.css?v=1.16.0-e48d36e9',
  './js/pre.js?v=1.16.0-ce28d413',
  './js/config.js?v=1.16.0-134daa33',
  './js/i18n.js?v=1.16.0-5f97e9a9',
  './js/data.js?v=1.16.0-78a70643',
  './js/util.js?v=1.16.0-ece5b126',
  './js/validation.js?v=1.16.0-37b8f300',
  './js/render.js?v=1.16.0-0d83e90b',
  './js/calculators.js?v=1.16.0-1dff5b6c',
  './js/content.js?v=1.16.0-5406ea95',
  './js/tools.js?v=1.16.0-648e05fa',
  './js/lists.js?v=1.16.0-116b1500',
  './js/ui.js?v=1.16.0-84bf8dd2',
  './js/published.js?v=1.16.0-87f710f2',
  './js/owner.js?v=1.16.0-b9da055f',
  './js/nav.js?v=1.16.0-c63b45e3',
  './js/team.js?v=1.16.0-ca6436a6',
  './js/boot.js?v=1.16.0-de688673',
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
