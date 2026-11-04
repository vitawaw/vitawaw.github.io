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
// 1.17.0 POST /api/hit: anonymous counting
{
  const sent = []; const w = []; const cx = { waitUntil(p) { w.push(p); } };
  globalThis.fetch = async (u, init) => { sent.push([u, JSON.parse(init.body), init.headers]); return new Response('', { status: 204 }); };
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148';
  const post = (body, h = {}) => { const q = new Request('https://site.test/api/hit', { method: 'POST', body, headers: { 'User-Agent': UA, 'CF-Connecting-IP': '1.2.3.4', ...h } }); Object.defineProperty(q, 'cf', { value: { country: 'iq' } }); return worker.fetch(q, env, cx); };
  r = await post(JSON.stringify({ e: [['open', ''], ['calc', 'd']], lang: 'en' })); await Promise.all(w);
  ok(r.status === 204 && sent.length === 1 && sent[0][0] === 'https://x.supabase.co/rest/v1/rpc/log_hits', 'hit -> 204 and one log_hits call');
  const p = sent[0][1].p;
  ok(/^[0-9a-f]{16}$/.test(p.vid) && p.device === 'phone' && p.lang === 'en' && p.country === 'IQ' && p.e.length === 2, 'hit: daily code, phone, language, country');
  ok(!JSON.stringify(sent[0][1]).includes('1.2.3.4') && !JSON.stringify(sent[0][1]).includes('iPhone'), 'hit: IP and browser text never sent on');
  await post(JSON.stringify({ e: [['open', '']] })); await Promise.all(w);
  ok(sent[1][1].p.vid === p.vid, 'hit: same person, same day -> same code');
  await post(JSON.stringify({ e: [['open', '']] }), { 'CF-Connecting-IP': '5.6.7.8' }); await Promise.all(w);
  ok(sent[2][1].p.vid !== p.vid, 'hit: other person -> other code');
  const n = sent.length;
  r = await post(JSON.stringify({ e: [['open', '']] }), { 'User-Agent': 'Googlebot/2.1' }); await Promise.all(w);
  ok(r.status === 204 && sent.length === n, 'hit: robots are not counted');
  r = await post('x'.repeat(5000)); ok(r.status === 413, 'hit: big body refused');
  r = await post(JSON.stringify({ e: [['open', '']] }), { Origin: 'https://evil.test' }); ok(r.status === 403, 'hit: other site refused');
  r = await post(JSON.stringify({ e: Array.from({ length: 90 }, () => ['calc', 'd']), dv: 'tablet' })); await Promise.all(w);
  ok(sent.at(-1)[1].p.e.length === 40 && sent.at(-1)[1].p.device === 'tablet', 'hit: at most 40 events; page device hint used');
  r = await get('/api/hit'); ok(r.status === 405, 'hit: GET refused');
  globalThis.fetch = realFetch;
}
console.log('all worker tests passed');
