"""1.17.1 «تحديث الصفحة»: every page, tool and vitamin page must stay where it is after the browser reloads it
(visitor, pharmacist and owner; phone, iPad and computer). Run: python3 tests/reload_flow.py"""
import os, sys, json
from playwright.sync_api import sync_playwright
exec(open('tests/owner_flow.py').read().split('with sync_playwright()')[0])
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra else ''))
    if not cond: fails.append(name)
# a published custom vitamin, so its own page (#v-<id>) is tested too
pub = json.dumps([{'data': {'nut': {'hide': [], 'custom': [{'id': 'vita', 'n': {'ar': 'فيتامين A', 'en': 'Vitamin A'}, 'h': {'ar': 'x', 'en': 'x'}, 'r': [30], 'uk': 'mcg',
    'rows': [{'a0': 19, 'a1': 50, 'sx': 'all', 'rda': '700', 'ul': '3,000'}], 'plan': {'ar': '', 'en': ''}, 'note': {'ar': '', 'en': ''}}]}}}])
SECTIONS = ['calc', 'tools', 'interactions', 'sources', 'roadmap', 'meds', 'sch', 'labs', 'ul']
TOOLS = ['tool-pill', 'tool-d', 'tool-ca', 'tool-gz', 'tool-ml', 'tool-sch', 'tool-labs', 'tool-ul', 'tool-u']
def where(pg):
    return pg.evaluate("[cur,TOOLV||'',CALCV?K:'',location.hash.slice(1)]")
def expect(h):
    # what the page should show for this address: [page, tool, vitamin]
    if h.startswith('tool-'): return ['tools', h, '']
    if h in ('sch', 'labs', 'ul'): return ['tools', 'tool-' + h, '']
    if h.startswith('v-'): return ['calc', '', h[2:]]
    return [h, '', '']
with sync_playwright() as p:
    b = p.chromium.launch()
    for who in ['visitor', 'editor', 'owner']:
        for (W, H, tag) in [(390, 844, 'phone'), (820, 1180, 'ipad'), (1366, 900, 'pc')]:
            ctx = b.new_context(viewport={'width': W, 'height': H}); pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            if who == 'editor': pg.add_init_script("window.__ROLE='editor';window.__PERMS={inter:true,refs:true}")
            setup(pg, pub); pg.goto('http://app.test/'); pg.wait_for_timeout(700)
            if who != 'visitor':
                login(pg); pg.wait_for_timeout(300)
                pg.evaluate("localStorage.setItem('sb-zrlapysswtqrwfsywbvl-auth-token','x')")  # what supabase-js keeps (the fake does not)
            addrs = SECTIONS + TOOLS + ['v-d', 'v-fe', 'v-vita' if who == 'visitor' else 'v-vk']  # a custom vitamin: published one / the team's own content
            if who != 'visitor': addrs += ['links']
            if who == 'owner': addrs += ['team', 'stats']
            if W < 1024: addrs += ['menu']
            bad = []
            for h in addrs:
                pg.evaluate(f"location.hash='{h}'"); pg.wait_for_timeout(250)
                before = where(pg)
                pg.reload(); pg.wait_for_timeout(1300)
                after = where(pg); want = expect(h)
                if after[:3] != want or after[3] != h: bad.append(f'{h}: {before[:3]} → {after}')
            check(f'{who} {tag}: every page stays after reload ({len(addrs)})', not bad, ' | '.join(bad))
            # an information page (floating window) stays open after reload
            pg.evaluate("go('tools')"); pg.wait_for_timeout(200); pg.evaluate("openPage('privacy')"); pg.wait_for_timeout(300)
            h0 = pg.evaluate('location.hash'); pg.reload(); pg.wait_for_timeout(1300)
            check(f'{who} {tag}: an info page stays open after reload', pg.evaluate("!!(SHEET&&SHEET.key==='page')") and pg.evaluate('cur') == 'tools' and h0 == '#info-privacy', h0)
            pg.evaluate('closeSheet()'); pg.wait_for_timeout(150)
            check(f'{who} {tag}: closing it puts the address back', pg.evaluate('location.hash') == '#tools')
            if who != 'visitor':
                check(f'{who} {tag}: still signed in after the reloads', pg.evaluate('OWN.on'))
            check(f'{who} {tag}: no page errors', not errs, '; '.join(errs)[:300])
            ctx.close()
    # first visit from a shared address while the content is still on its way (slow network)
    import time
    for addr, test in [('v-vita', "cur==='calc'&&CALCV&&K==='vita'"), ('info-mine', "!!(SHEET&&SHEET.key==='page')&&$('sheet-t').textContent==='صفحتي'")]:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
        pg0 = ctx.new_page(); setup(pg0); pg0.goto('http://app.test/'); pg0.wait_for_timeout(500)
        pages = pg0.evaluate("DEFAULT_CFG.pages") + [{'id': 'mine', 't': {'ar': 'صفحتي', 'en': 'Mine'}, 'b': {'ar': 'نص', 'en': 'text'}}]
        pg0.evaluate("localStorage.clear()"); pg0.close()
        d = json.loads(pub); d[0]['data']['pages'] = pages; slow = json.dumps(d)
        setup(pg, slow)
        pg.route('http://app.test/api/content', lambda r: (time.sleep(0.8), r.fulfill(status=200, body=slow, content_type='application/json')))
        pg.goto('http://app.test/#' + addr); pg.wait_for_timeout(2200)
        check(f'first visit to #{addr} with slow content: it opens once the content arrives', pg.evaluate(test), str(pg.evaluate("[cur,K,location.hash]")))
        ctx.close()
    b.close()
print('ALL PASSED' if not fails else f'{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
