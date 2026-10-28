/**
 * VITAWAW edge worker (Cloudflare Workers).
 *
 * - Every normal file (index.html, js/, css/, fonts/ …) is served directly by Cloudflare as a
 *   static asset. Those requests never reach this code and are free and unlimited.
 * - Only GET /api/content runs here. It returns the published content (the same JSON the
 *   site used to read from Supabase directly) and keeps a copy for CACHE_SECONDS, so
 *   thousands of visitors cause only a few Supabase requests per minute.
 * - If Supabase is slow or down, the last good copy is returned (stale) instead of an error.
 * - POST /api/check-links (signed-in owner/editor only) opens the URLs of up to 15 sources and reports
 *   their HTTP status. Only URLs already stored in the sources table are fetched (no open proxy).
 * - A daily cron request keeps the free Supabase project from pausing after 7 idle days.
 *
 * Settings come from wrangler.jsonc "vars": SUPABASE_URL and SUPABASE_ANON_KEY (public key,
 * the database is protected by row level security).
 */
const CACHE_SECONDS = 60;
let memo = null; // { body, etag, at } kept in this isolate's memory

async function loadFromSupabase(env) {
  const url = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/site_config?id=eq.published&select=data';
  const r = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error('supabase ' + r.status);
  const body = await r.text();
  JSON.parse(body); // refuse to cache anything that is not valid JSON
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body));
  const etag = '"' + [...new Uint8Array(hash)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('') + '"';
  memo = { body, etag, at: Date.now() };
  return memo;
}

async function content(request, env, ctx) {
  let entry = memo, stale = false;
  if (!entry || Date.now() - entry.at > CACHE_SECONDS * 1000) {
    try {
      entry = await loadFromSupabase(env);
    } catch (e) {
      if (!entry) return json('{"error":"content unavailable"}', 503, 'no-store');
      stale = true; // serve the last good copy
    }
  }
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=600`,
    ETag: entry.etag,
    'X-Content-Type-Options': 'nosniff',
  };
  if (stale) headers['X-Stale'] = '1';
  if (request.headers.get('If-None-Match') === entry.etag) return new Response(null, { status: 304, headers });
  return new Response(entry.body, { status: 200, headers });
}

/** Owner tool: check that source links still open. */
async function checkLinks(request, env) {
  if (request.method !== 'POST') return json('{"error":"method"}', 405, 'no-store');
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json('{"error":"sign in"}', 401, 'no-store');
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const h = { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token };
  const u = await fetch(base + '/auth/v1/user', { headers: h });
  if (!u.ok) return json('{"error":"sign in"}', 401, 'no-store');
  const user = await u.json();
  if (!/^[0-9a-f-]{36}$/i.test(user.id || '')) return json('{"error":"sign in"}', 401, 'no-store');
  const m = await fetch(`${base}/rest/v1/members?select=role&user_id=eq.${user.id}`, { headers: h });
  const role = m.ok ? ((await m.json())[0] || {}).role : null;
  if (role !== 'owner' && role !== 'editor') return json('{"error":"not allowed"}', 403, 'no-store');
  let ids = [];
  try { ids = (await request.json()).ids; } catch (e) {}
  ids = (Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 15);
  if (!ids.length) return json('{"results":[]}', 200, 'no-store');
  const s = await fetch(`${base}/rest/v1/sources?select=id,url&id=in.(${ids.join(',')})`, { headers: h });
  const rows = s.ok ? await s.json() : [];
  const results = await Promise.all(rows.filter(r => /^https?:\/\//i.test(r.url || '')).map(async r => {
    try {
      const res = await fetch(r.url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VITAWAW link check)' }, signal: AbortSignal.timeout(8000) });
      if (res.body) res.body.cancel().catch(() => {});
      return { id: r.id, status: res.status, ok: res.status >= 200 && res.status < 400 };
    } catch (e) { return { id: r.id, status: 0, ok: false }; }
  }));
  return json(JSON.stringify({ results }), 200, 'no-store');
}

const json = (body, status, cache) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/content') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json('{"error":"method"}', 405, 'no-store');
      return content(request, env, ctx);
    }
    if (url.pathname === '/api/check-links') return checkLinks(request, env);
    if (url.pathname.startsWith('/api/')) return json('{"error":"not found"}', 404, 'no-store');
    // anything else is the static site (normally served before this code even runs)
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
  // Daily keep-alive so the free Supabase project never pauses for inactivity.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(loadFromSupabase(env).catch(() => {}));
  },
};
