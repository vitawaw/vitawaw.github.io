/**
 * VITAWAW edge worker (Cloudflare Workers).
 *
 * - Every normal file (index.html, js/, css/, fonts/ …) is served directly by Cloudflare as a
 *   static asset. Those requests never reach this code and are free and unlimited.
 * - Only GET /api/content runs here. It returns the published content (the same JSON the
 *   site used to read from Supabase directly) and keeps a copy for CACHE_SECONDS, so
 *   thousands of visitors cause only a few Supabase requests per minute.
 * - If Supabase is slow or down, the last good copy is returned (stale) instead of an error.
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

const json = (body, status, cache) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/content') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return json('{"error":"method"}', 405, 'no-store');
      return content(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/')) return json('{"error":"not found"}', 404, 'no-store');
    // anything else is the static site (normally served before this code even runs)
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
  // Daily keep-alive so the free Supabase project never pauses for inactivity.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(loadFromSupabase(env).catch(() => {}));
  },
};
