"""Tools regression: python3 tests/tools_flow.py
Checks the tool formulas (tablets, vitamin D, corrected calcium, Ferinject table, syrup volume, daily schedule)
and that calculator results open the tools already filled in."""
from playwright.sync_api import sync_playwright
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def serve(route):
    from urllib.parse import urlparse
    import mimetypes
    p = urlparse(route.request.url).path.lstrip('/') or 'index.html'
    f = os.path.join(ROOT, p)
    if not os.path.isfile(f): f = os.path.join(ROOT, 'index.html')
    route.fulfill(status=200, body=open(f, 'rb').read(), content_type=mimetypes.guess_type(f)[0] or 'text/html')
fails = 0
def check(name, got, want):
    global fails
    ok = want in got; fails += not ok
    print(('ok   ' if ok else 'FAIL ') + f'{name} -> expects «{want}»' + ('' if ok else f'\n     got: {got[:220]!r}'))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1280,'height':900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('http://app.test/**', serve)
    pg.route('http://app.test/api/content', lambda r: r.fulfill(status=200, body='[]', content_type='application/json'))
    pg.route('https://**', lambda r: r.fulfill(status=200, body='[]', content_type='application/json'))
    pg.goto('http://app.test/#tools'); pg.wait_for_timeout(500)
    def setv(id, v, ev='input'):
        pg.evaluate("([id,v,ev])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event(ev,{bubbles:true}))}", [id, str(v), ev])
    T = lambda id: pg.inner_text('#'+id)
    # tablets: dried ferrous sulfate 200 mg = 65 mg iron; magnesium oxide in mmol
    setv('salt','fsd','change'); setv('tabmg',200); setv('needmg',65); check('dried ferrous sulfate', T('elper'), '65 ملغ'); check('one tablet', T('ntabs'), '1 حبة')
    setv('salt','mo','change'); setv('tabmg',400); setv('needmg',243); check('Mg oxide mmol', T('elperi'), '9.9 mmol')
    # vitamin D: 6,000 IU/day -> one 50,000 capsule every 8 days; 200,000 ampoule = 33 days
    setv('iu',6000); setv('ampiu','200000','change'); check('capsule every N days', T('cp50'), 'كل 8'); check('ampoule days', T('amp'), '33')
    setv('iu',7000); check('whole capsule weekly', T('cp50'), '1 كبسولة أسبوعياً')
    # corrected calcium in mmol/L and g/L: 2.1 mmol/L, albumin 32 g/L -> 9.06 mg/dL
    setv('tcau','mmol','change'); setv('tca',2.1); setv('albu','gl','change'); setv('alb',32); check('corrected Ca SI', T('cca'), '9.06 mg/dL')
    # Ferinject simplified table
    setv('gw',60); setv('gha',9); check('Ferinject 60 kg Hb 9', T('gtab'), '1,500'); setv('gw',80); setv('gha',11); check('Ferinject 80 kg Hb 11', T('gtab'), '1,500')
    setv('gha',14.5); check('Ferinject Hb >=14', T('gtab'), '500'); setv('gw',30); check('Ferinject <35 kg', T('gtabi'), 'Ganzoni')
    # syrup: 10 kg x 3 mg/kg, 25 mg/mL -> 1.2 mL; 15 mg/0.6 mL -> 1.2 mL; drops at 20/mL -> 24 drops
    setv('mlwt',10); setv('mlmgkg',3); setv('mlconc',25); setv('mlper',1); check('syrup mL', T('mlvol'), '1.2 مل')
    setv('mldpm',20); check('drops', T('mlvol'), '24 قطرة'); setv('mldpm','')
    # schedule: levothyroxine + iron + calcium + antibiotic keep their gaps
    for id in ['levo','fe','ca','abx']: pg.check('#sc-'+id)
    pg.dispatch_event('#schk','change'); pg.wait_for_timeout(100)
    out = T('schout'); check('schedule solved', out, 'Levothyroxine')
    asg = pg.evaluate("schSolve(['levo','fe','ca','abx'])")
    ok = abs(asg['levo']-asg['fe'])>=240 and abs(asg['levo']-asg['ca'])>=240 and abs(asg['fe']-asg['ca'])>=120 and all(t<=m-120 or t>=m+360 for m in (asg['fe'],asg['ca']) for t in (asg['abx'],asg['abx']+720))
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule gaps {asg}')
    asg = pg.evaluate("schSolve(['bis','levo','ca','mg'])"); ok = asg['levo']>=asg['bis']+30 and asg['ca']>=asg['bis']+120 and abs(asg['levo']-asg['mg'])>=240
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule alendronate {asg}')
    # calculator -> tools, filled in
    pg.goto('http://app.test/#calc'); pg.wait_for_timeout(300)
    def calc(k, fields, sx='f'):
        pg.click('#clear'); pg.click(f'#picker [data-k="{k}"]')
        for f, v in fields.items():
            if f in ('feg','folg','czg','tri','feed','vag'): pg.select_option('#'+f, v); pg.dispatch_event('#'+f,'change')
            else: pg.fill('#'+f, str(v)); pg.dispatch_event('#'+f,'input')
        if pg.is_visible('#sex'): pg.select_option('#sex', sx); pg.dispatch_event('#sex','change')
        pg.wait_for_timeout(80)
    def tool(kind):
        pg.click(f'#res [data-tool="{kind}"]'); pg.wait_for_timeout(120)
    calc('fe', {'age':4,'wt':16,'feg':'ida'}); tool('ml'); check('child iron -> syrup', T('mldose'), '48 ملغ'); pg.click('#sheet-x')
    calc('fe', {'age':30,'hb':10,'fer':8}); tool('ganz'); check('Hb -> Ganzoni', pg.input_value('#gha'), '10'); pg.click('#sheet-x')
    calc('mg', {'age':40,'mgv':1.5}, 'm'); tool('pills'); check('Mg -> tablets', T('elperi'), 'mmol'); pg.click('#sheet-x')
    calc('vac', {'mon':18,'vag':'prev'}); tool('units'); check('vitamin A -> units', T('uout'), '60,000 mcg RAE'); pg.click('#sheet-x')
    calc('d', {'age':40,'dlab':12}); tool('ul'); check('vitamin D -> UL', T('ulout'), 'فيتامين D'); pg.click('#sheet-x')
    calc('d', {'age':40,'dlab':120}); check('D >100 -> corrected calcium button', T('res'), 'الكالسيوم المصحح')
    calc('preg', {'age':28,'tri':'t2'}); tool('sch'); check('pregnancy -> schedule', T('schout'), 'الحديد'); pg.click('#sheet-x')
    calc('fol', {'age':28,'folg':'plan'}); tool('pills'); check('folic acid -> tablets', T('ntabs'), '1 حبة'); pg.click('#sheet-x')
    # 1.9.0 interactions <-> calculator <-> schedule
    calc('fe', {'age':30,'feg':'rda'}); check('interactions in the result', T('res'), 'Levothyroxine')
    pg.click('#res [data-goint]'); pg.wait_for_timeout(150); check('-> interactions page filtered', pg.evaluate('IF'), 'fe')
    card = pg.locator('#ilist .icard', has_text='Levothyroxine').first
    card.locator('[data-gosch]').click(); pg.wait_for_timeout(150)
    check('card -> schedule', ','.join(pg.evaluate("SCI.map(x=>x[0]).filter(id=>$('sc-'+id).checked)")), 'levo,fe'); pg.click('#sheet-x')
    pg.goto('http://app.test/#interactions'); pg.wait_for_timeout(150); pg.evaluate("IF='all';renderInter()")
    pg.fill('#medin','ليفوثيروكسين'); pg.click('#medform button'); pg.wait_for_timeout(150)
    check('my medicines filter', T('medchips'), '2'); check('only matching cards', str(pg.locator('#ilist .icard').count()), '2')
    pg.click('[data-delmed="0"]'); pg.wait_for_timeout(100)
    # a timing set on an interaction replaces the built-in rule
    r = pg.evaluate("(()=>{const x=INTER.find(t=>t[0]==='ca'&&/Levothyroxine/.test(t[2][1]));x[9]={d:'levo',b:5,a:5};const o=schRules().find(o=>o.x==='levo'&&o.y==='ca');x[9]=null;return o.b+'/'+o.a})()")
    check('owner timing wins', r, '5/5')
    print('page errors:', errs)
sys.exit(1 if fails or errs else 0)
