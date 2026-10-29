// Unit test for the link check in src/worker.js: node tests/worker_links_test.mjs
import worker from '../src/worker.js';
const pub = JSON.stringify([{ data: { refs: [
  { id: 1, url: 'https://ok.test/a' }, { id: 2, url: 'https://gone.test/b' }, { id: 3, url: 'https://bot.test/c' }, { id: 4, url: '' }] } }]);
const asked = [];
globalThis.fetch = async (url, init) => {
  if (url.includes('/rest/v1/site_config')) return new Response(pub, { status: 200 });
  asked.push(url + ' ' + (init.method || 'GET'));
  if (url.startsWith('https://ok.test')) return new Response('', { status: 200 });
  if (url.startsWith('https://gone.test')) return new Response('', { status: 404 });
  if (url.startsWith('https://bot.test')) return new Response('', { status: 403 });
  throw new Error('unexpected url ' + url);
};
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };
const ctx = { waitUntil() {} };
const get = path => worker.fetch(new Request('https://site.test' + path), env, ctx);
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok  ', m); };
let r = await get('/api/links?ids=1,2,3,4,99');
const j = await r.json(), by = Object.fromEntries(j.links.map(x => [x.id, x.state]));
ok(r.status === 200 && by[1] === 'ok' && by[2] === 'broken' && by[3] === 'blocked', 'ok / broken (404) / blocked (403)');
ok(!(4 in by) && !(99 in by), 'empty URL and unknown id are not checked');
ok(asked.every(a => /^https:\/\/(ok|gone|bot)\.test/.test(a)), 'only URLs from the published sources are fetched');
ok(asked.filter(a => a.startsWith('https://bot.test')).length === 2, '403 on HEAD is retried once with GET');
r = await get('/api/links?ids=https://evil.test');
ok(r.status === 400, 'a URL instead of ids is refused');
ok(/max-age=86400/.test((await get('/api/links?ids=1')).headers.get('Cache-Control')), 'cached for a day');
console.log('all link-check tests passed');
