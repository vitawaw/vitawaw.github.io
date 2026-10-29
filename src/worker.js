/**
 * VITAWAW edge worker (Cloudflare Workers).
 *
 * - Every normal file (index.html, js/, css/, fonts/ …) is served directly by Cloudflare as a
 *   static asset. Those requests never reach this code and are free and unlimited.
 * - Only GET /api/content runs here. It returns the published content (the same JSON the
 *   site used to read from Supabase directly) and keeps a copy for CACHE_SECONDS, so
 *   thousands of visitors cause only a few Supabase requests per minute.
 * - After CACHE_SECONDS the copy we have is returned at once and refreshed in the background; if Supabase is slow
 *   or down, visitors keep getting the last good copy (one Supabase request at a time, retried every 30 s).
 * - A daily cron request keeps the free Supabase project from pausing after 7 idle days.
 * - GET /api/links?ids=1,2,… checks the links of published sources (at most LINKS_MAX per request, the free plan allows
 *   50 outgoing requests per call). Only URLs that are in the published content can be checked (never a URL from the
 *   request), and each answer is cached for a day, so the endpoint cannot be used to make the worker fetch other sites.
 *
 * Settings come from wrangler.jsonc "vars": SUPABASE_URL and SUPABASE_ANON_KEY (public key,
 * the database is protected by row level security).
 */
const CACHE_SECONDS = 60;
const RETRY_SECONDS = 30; // when Supabase fails, wait this long before trying again (visitors get the last good copy)
let memo = null;     // { body, etag, at } kept in this isolate's memory
let loading = null;  // the Supabase request in progress, shared by everyone who arrives meanwhile
let failedAt = 0;
const LINKS_MAX = 25;
const LINK_TTL = 86400; // seconds a link check stays cached

async function loadFromSupabase(env) {
  const url = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/site_config?id=eq.published&select=data';
  const r = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error('supabase ' + r.status);
  const body = await r.text();
  const rows = JSON.parse(body); // refuse to cache anything that is not valid JSON …
  if (!Array.isArray(rows) || !rows[0] || !rows[0].data) throw new Error('no published content'); // … or empty
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body));
  const etag = '"' + [...new Uint8Array(hash)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('') + '"';
  memo = { body, etag, at: Date.now() };
  failedAt = 0;
  return memo;
}
/** one Supabase request at a time per isolate */
function refresh(env) {
  if (!loading) loading = loadFromSupabase(env).catch(e => { failedAt = Date.now(); console.error('content refresh failed:', e.message); throw e; })
    .finally(() => { loading = null; });
  return loading;
}

async function content(request, env, ctx) {
  let entry = memo, stale = false;
  const old = !entry || Date.now() - entry.at > CACHE_SECONDS * 1000;
  if (!entry) {
    try { entry = await refresh(env); } catch (e) { return json('{"error":"content unavailable"}', 503, 'no-store'); }
  } else if (old) {
    // answer at once with the copy we have; update it in the background (unless Supabase failed a moment ago)
    stale = true;
    if (Date.now() - failedAt > RETRY_SECONDS * 1000) ctx.waitUntil(refresh(env).catch(() => {}));
  }
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=600`,
    ETag: entry.etag,
    'X-Content-Type-Options': 'nosniff',
  };
  if (stale) headers['X-Stale'] = '1';
  // browsers send back the weak form W/"…" because Cloudflare compresses the response
  const inm = (request.headers.get('If-None-Match') || '').split(',').map(s => s.trim().replace(/^W\//, ''));
  if (inm.includes(entry.etag) || inm.includes('*')) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : entry.body, { status: 200, headers });
}

/** ok = page answers; broken = 404/410 or the site does not exist; blocked = the site refuses robots or is busy (not a verdict) */
async function checkUrl(u) {
  const go = method => fetch(u, { method, redirect: 'follow', signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VITAWAW link check; +https://billowing-glade-6627.vitawaw26.workers.dev)', Accept: 'text/html,application/pdf,*/*' } });
  try {
    let r = await go('HEAD');
    if (r.status === 405 || r.status === 501 || r.status === 403) r = await go('GET'); // some sites refuse HEAD only
    const s = r.status;
    return { code: s, state: s < 400 ? 'ok' : (s === 404 || s === 410) ? 'broken' : 'blocked' };
  } catch (e) {
    return { code: 0, state: /timeout|abort/i.test(String(e && e.name || e)) ? 'blocked' : 'broken' };
  }
}
async function links(request, env, ctx) {
  const url = new URL(request.url);
  const ids = [...new Set((url.searchParams.get('ids') || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b).slice(0, LINKS_MAX);
  if (!ids.length) return json('{"error":"ids"}', 400, 'no-store');
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.origin + '/api/links?ids=' + ids.join(','));
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let entry = memo;
  if (!entry) { try { entry = await refresh(env); } catch (e) { return json('{"error":"content unavailable"}', 503, 'no-store'); } }
  const refs = (JSON.parse(entry.body)[0].data.refs || []).filter(r => ids.includes(r.id) && /^https?:\/\//.test(r.url || ''));
  const out = await Promise.all(refs.map(async r => ({ id: r.id, ...(await checkUrl(r.url)) })));
  const res = json(JSON.stringify({ at: new Date().toISOString(), links: out }), 200, `public, max-age=${LINK_TTL}`);
  if (cache) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

const json = (body, status, cache) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/content') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json('{"error":"method"}', 405, 'no-store');
      return content(request, env, ctx);
    }
    if (url.pathname === '/api/links') {
      if (request.method !== 'GET') return json('{"error":"method"}', 405, 'no-store');
      return links(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/')) return json('{"error":"not found"}', 404, 'no-store');
    // anything else is the static site (normally served before this code even runs)
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
  // Daily keep-alive so the free Supabase project never pauses for inactivity.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(loadFromSupabase(env).catch(e => console.error('keep-alive failed (Supabase may pause):', e.message)));
  },
};
