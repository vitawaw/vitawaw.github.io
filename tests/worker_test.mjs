// Unit test for src/worker.js without Cloudflare: node tests/worker_test.mjs
import worker from '../src/worker.js';
let calls = 0, fail = false;
const pub = JSON.stringify([{ data: { refs: [], inter: [], text: {} } }]);
globalThis.fetch = async (url, init) => {
  calls++;
  if (!url.includes('/rest/v1/site_config?id=eq.published')) throw new Error('unexpected url ' + url);
  if (init.headers.apikey !== 'anon') throw new Error('missing key');
  if (fail) return new Response('down', { status: 500 });
  return new Response(pub, { status: 200 });
};
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', ASSETS: { fetch: async () => new Response('asset') } };
const ctx = { waitUntil() {} };
const get = (path, h = {}) => worker.fetch(new Request('https://site.test' + path, { headers: h }), env, ctx);
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok  ', m); };

let r = await get('/api/content');
ok(r.status === 200 && (await r.text()) === pub, 'first request returns published content');
const etag = r.headers.get('ETag');
ok(/max-age=60/.test(r.headers.get('Cache-Control')), 'cache header set');
for (let i = 0; i < 50; i++) await get('/api/content');
ok(calls === 1, '50 more requests -> still 1 Supabase call (memory cache)');
r = await get('/api/content', { 'If-None-Match': etag });
ok(r.status === 304, 'unchanged content -> 304 Not Modified');
// force expiry by moving time forward
r = await get('/api/content', { 'If-None-Match': 'W/' + etag });
ok(r.status === 304, 'weak ETag from the browser (W/"…", after compression) -> 304');
r = await worker.fetch(new Request('https://site.test/api/content', { method: 'HEAD' }), env, ctx);
ok(r.status === 200 && (await r.text()) === '', 'HEAD -> headers only');
// after the cache time: answer at once with the old copy, refresh in the background
const waits = []; const ctx2 = { waitUntil(p) { waits.push(p); } };
fail = true;
const realNow = Date.now; Date.now = () => realNow() + 120000;
let t0 = realNow();
r = await worker.fetch(new Request('https://site.test/api/content'), env, ctx2);
ok(r.status === 200 && r.headers.get('X-Stale') === '1' && realNow() - t0 < 100, 'expired copy served at once while refreshing');
await Promise.all(waits); const c1 = calls;
r = await worker.fetch(new Request('https://site.test/api/content'), env, ctx2);
ok(calls === c1, 'Supabase just failed -> no new request for 30 s (no 5 s waits)');
// empty answer must not replace good content
fail = false; Date.now = () => realNow() + 240000;
const keepPub = pub; globalThis.__empty = true;
const realFetch = globalThis.fetch; globalThis.fetch = async () => { calls++; return new Response('[]', { status: 200 }); };
waits.length = 0; await worker.fetch(new Request('https://site.test/api/content'), env, ctx2); await Promise.all(waits);
r = await get('/api/content');
ok((await r.text()) === keepPub, 'empty [] from Supabase is ignored, good copy kept');
globalThis.fetch = realFetch;
Date.now = realNow;
r = await get('/api/other');
ok(r.status === 404, 'unknown /api path -> 404');
r = await worker.fetch(new Request('https://site.test/api/content', { method: 'POST' }), env, ctx);
ok(r.status === 405, 'POST refused');
r = await get('/index.html');
ok((await r.text()) === 'asset', 'non-api path goes to static assets');
console.log('all worker tests passed');
