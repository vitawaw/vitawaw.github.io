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
 * - GET /api/links?ids=1,2,… (signed-in team only, 1.16.0) checks the links of published sources (at most LINKS_MAX per request, the free plan allows
 *   50 outgoing requests per call). Only URLs that are in the published content can be checked (never a URL from the
 *   request), and each answer is cached for a day, so the endpoint cannot be used to make the worker fetch other sites.
 *
 * - POST /api/hit (1.17.0) counts visits for the owner's dashboard, anonymously: the page sends only what happened
 *   ({e:[[kind,item],…], lang, dv}); the worker adds the country code and a 16-character code made from
 *   (day + IP + browser + salt) that changes every day. The IP and the browser text are never stored or sent on.
 *   Supabase public.log_hits() checks every value. Robots are not counted.
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
/* 1.16.0: the link check is for the signed-in team only (owner and invited pharmacists; sign-up is invite-only).
   The page sends the user's Supabase session token; Supabase confirms it (/auth/v1/user). Confirmed tokens are
   remembered in this isolate for 10 minutes so a check of 72 sources asks Supabase once. */
const TEAM_OK = new Map(); // token hash -> time confirmed
async function teamOnly(request, env) {
  const m = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return false;
  const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m[1])))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
  const t = TEAM_OK.get(h);
  if (t && Date.now() - t < 600000) return true;
  try {
    const r = await fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + m[1] }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    if (TEAM_OK.size > 500) TEAM_OK.clear();
    TEAM_OK.set(h, Date.now());
    return true;
  } catch (e) { return false; }
}
async function links(request, env, ctx) {
  const url = new URL(request.url);
  if (!(await teamOnly(request, env))) return json('{"error":"sign in"}', 401, 'no-store');
  const ids = [...new Set((url.searchParams.get('ids') || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b).slice(0, LINKS_MAX);
  if (!ids.length) return json('{"error":"ids"}', 400, 'no-store');
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.origin + '/api/links?ids=' + ids.join(','));
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let entry = memo;
  if (!entry) { try { entry = await refresh(env); } catch (e) { return json('{"error":"content unavailable"}', 503, 'no-store'); } }
  const refs = (JSON.parse(entry.body)[0].data.refs || []).filter(r => ids.includes(r.id) && /^https?:\/\//.test(r.url || ''));
  const out = await Promise.all(refs.map(async r => ({ id: r.id, ...(await checkUrl(r.url)) })));
  const res = json(JSON.stringify({ at: new Date().toISOString(), links: out }), 200, `private, max-age=${LINK_TTL}`);
  if (cache) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/* 1.17.0 anonymous visit counting (see the top of the file). STATS_SALT (optional secret) makes the daily code
   impossible to recompute; without it the public key is used, which is enough because only the owner's database reads it. */
const HIT_MAX = 4096;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|node-fetch|axios/i;
async function hit(request, env, ctx) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return new Response(null, { status: 403 });
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  const text = await request.text().catch(() => '');
  if (!text || text.length > HIT_MAX) return new Response(null, { status: 413 });
  let b; try { b = JSON.parse(text); } catch (e) { return new Response(null, { status: 400 }); }
  if (!b || !Array.isArray(b.e)) return new Response(null, { status: 400 });
  const e = b.e.filter(x => Array.isArray(x) && typeof x[0] === 'string' && (x[1] === undefined || typeof x[1] === 'string')).slice(0, 40)
    .map(x => [x[0].slice(0, 10), (x[1] || '').slice(0, 40)]);
  if (!e.length) return new Response(null, { status: 204 });
  const lang = b.lang === 'en' ? 'en' : 'ar';
  const device = ['phone', 'tablet', 'pc'].includes(b.dv) ? b.dv : /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'phone' : 'pc';
  const cc = String((request.cf && request.cf.country) || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1' ? cc : '';
  const day = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Baghdad day, like the database
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const salt = env.STATS_SALT || env.SUPABASE_ANON_KEY || '';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(day + '|' + ip + '|' + ua + '|' + salt));
  const vid = [...new Uint8Array(d)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
  const key = env.SUPABASE_ANON_KEY;
  ctx.waitUntil(fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/log_hits', {
    method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p: { vid, device, lang, country, e } }), signal: AbortSignal.timeout(5000),
  }).then(r => { if (!r.ok && r.status !== 404) console.error('log_hits', r.status); }).catch(() => {}));
  return new Response(null, { status: 204 });
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
    if (url.pathname === '/api/hit') {
      if (request.method !== 'POST') return json('{"error":"method"}', 405, 'no-store');
      return hit(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/')) return json('{"error":"not found"}', 404, 'no-store');
    // anything else is the static site (normally served before this code even runs)
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
  // Daily keep-alive so the free Supabase project never pauses for inactivity.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(loadFromSupabase(env).catch(e => console.error('keep-alive failed (Supabase may pause):', e.message)));
    // the free test project used by the preview links pauses after 7 idle days too: wake it with the same daily request
    if (env.TEST_SUPABASE_URL && env.TEST_SUPABASE_ANON_KEY) {
      const k = env.TEST_SUPABASE_ANON_KEY;
      ctx.waitUntil(fetch(env.TEST_SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/site_config?id=eq.published&select=id',
        { headers: { apikey: k, Authorization: 'Bearer ' + k }, signal: AbortSignal.timeout(5000) })
        .then(r => { if (!r.ok) throw new Error('supabase ' + r.status); })
        .catch(e => console.error('test project keep-alive failed:', e.message)));
    }
  },
};
