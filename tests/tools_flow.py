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
    pg.goto('http://app.test/#sched'); pg.wait_for_timeout(200)
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
    def more():  # the less used result buttons are under «More ⋯»
        pg.evaluate("document.querySelectorAll('#res details.rmore').forEach(d=>d.open=true)")
    def tool(kind):
        more(); pg.click(f'#res [data-tool="{kind}"]'); pg.wait_for_timeout(120)
    def back():  # tools in a floating window close; schedule, labs and upper limit are pages
        if pg.is_visible('#sheet-x'): pg.click('#sheet-x')
        else: pg.evaluate("go('calc')"); pg.wait_for_timeout(100)
    calc('fe', {'age':4,'wt':16,'feg':'ida'}); tool('ml'); check('child iron -> syrup', T('mldose'), '48 ملغ'); pg.click('#sheet-x')
    calc('fe', {'age':30,'hb':10,'fer':8}); tool('ganz'); check('Hb -> Ganzoni', pg.input_value('#gha'), '10'); pg.click('#sheet-x')
    calc('mg', {'age':40,'mgv':1.5}, 'm'); tool('pills'); check('Mg -> tablets', T('elperi'), 'mmol'); pg.click('#sheet-x')
    calc('vac', {'mon':18,'vag':'prev'}); tool('units'); check('vitamin A -> units', T('uout'), '60,000 mcg RAE'); pg.click('#sheet-x')
    calc('d', {'age':40,'dlab':12}); tool('ul'); check('vitamin D -> UL', T('ulout'), 'فيتامين D'); check('UL is its own page', pg.evaluate('cur'), 'ul'); back()
    calc('d', {'age':40,'dlab':120}); check('D >100 -> corrected calcium button', T('res'), 'الكالسيوم المصحح')
    calc('preg', {'age':28,'tri':'t2'}); tool('sch'); check('pregnancy -> schedule', T('schout'), 'الحديد'); check('schedule is its own page', pg.evaluate('cur'), 'sched'); back()
    calc('fol', {'age':28,'folg':'plan'}); tool('pills'); check('folic acid -> tablets', T('ntabs'), '1 حبة'); pg.click('#sheet-x')
    # 1.9.0 interactions <-> calculator <-> schedule
    calc('fe', {'age':30,'feg':'rda'}); check('interactions in the result', T('res'), 'Levothyroxine')
    pg.click('#res [data-goint]'); pg.wait_for_timeout(150); check('-> interactions page filtered', pg.evaluate('IF'), 'fe')
    card = pg.locator('#ilist .icard', has_text='Levothyroxine').first
    card.locator('[data-gosch]').click(); pg.wait_for_timeout(150)
    check('card -> schedule', ','.join(pg.evaluate("SCI.map(x=>x[0]).filter(id=>$('sc-'+id).checked)")), 'levo,fe'); back()
    check('schedule kept on the device', pg.evaluate("JSON.parse(localStorage.getItem('vw-sch')).ids.join(',')"), 'levo,fe')
    pg.goto('http://app.test/#interactions'); pg.wait_for_timeout(150); pg.evaluate("IF='all';renderInter()")
    pg.fill('#medin','ليفو'); pg.dispatch_event('#medin','input'); pg.wait_for_timeout(100)
    sug = T('medsug'); check('suggestions: levothyroxine', sug, 'Levothyroxine')
    pg.fill('#medin','xyzq'); pg.dispatch_event('#medin','input'); check('no match message', T('medsug'), 'لا يوجد')
    pg.click('#medform button'); check('unknown name not added', T('medchips'), '')
    pg.fill('#medin','ثيروكس'); pg.dispatch_event('#medin','input'); pg.click('#medsug [data-addmed="levothyroxine"]'); pg.wait_for_timeout(150)
    check('my medicines filter', T('medchips'), '2'); check('only matching cards', str(pg.locator('#ilist .icard').count()), '2')
    pg.click('[data-delmed="0"]'); pg.wait_for_timeout(100)
    # a timing set on an interaction replaces the built-in rule
    r = pg.evaluate("(()=>{const x=INTER.find(t=>t[0]==='ca'&&/Levothyroxine/.test(t[2][1]));x[9]={d:'levo',b:5,a:5};const o=schRules().find(o=>o.x==='levo'&&o.y==='ca');x[9]=null;return o.b+'/'+o.a})()")
    check('owner timing wins', r, '5/5')
    # 1.10.0 kidney option, sources used-in, sources in the copied result / patient card
    pg.goto('http://app.test/#calc'); pg.wait_for_timeout(150)
    calc('ca', {'age':60,'cadiet':400}); pg.check('#ckd'); pg.dispatch_event('#ckd','change'); pg.wait_for_timeout(80)
    check('kidney caution (calcium)', T('res'), 'طبيب الكلى'); pg.uncheck('#ckd'); pg.dispatch_event('#ckd','change')
    calc('c', {'age':30,'czg':'rda'}); pg.check('#ckd'); pg.dispatch_event('#ckd','change'); pg.wait_for_timeout(80)
    check('kidney caution (vitamin C)', T('res'), 'الأوكسالات'); pg.uncheck('#ckd'); pg.dispatch_event('#ckd','change')
    calc('fe', {'age':30,'feg':'rda'}); check('sources line for copy', pg.evaluate('srcLine()'), 'NIH Office of Dietary Supplements')
    pg.click('#res [data-card]'); pg.wait_for_timeout(100); check('sources on the patient card', T('pcard'), 'NIH'); pg.keyboard.press('Escape')
    pg.goto('http://app.test/#sources'); pg.wait_for_timeout(150)
    check('used in (calculator)', T('ref-15'), 'الحديد')
    pg.click('#ref-27 [data-isrc]'); pg.wait_for_timeout(150)
    check('source -> its interactions', str(pg.locator('#ilist .icard').count()), '2'); check('source filter chip', T('filters'), 'المصدر 27')
    pg.click('[data-clrsrc]'); pg.wait_for_timeout(80); check('filter cleared', str(pg.evaluate('ISRC')), 'None')
    # 1.11.0 calendar, lab history, report, share link, search, roadmap «available now»
    pg.goto('http://app.test/#calc'); pg.wait_for_timeout(150)
    calc('d', {'age':40,'dlab':12})
    ics = pg.evaluate("icsFile([LAST.cal])")
    check('calendar: weekly 8 times', ics, 'RRULE:FREQ=WEEKLY;COUNT=8'); check('calendar: alarm', ics, 'BEGIN:VALARM'); check('calendar: lines end CRLF', str(ics.count('\r\n')>10), 'True')
    pg.evaluate("localStorage.removeItem('vw-labs');LABS=[]")
    more(); pg.click('#res [data-lab]'); pg.wait_for_timeout(100); check('lab saved from the result', pg.evaluate("JSON.stringify(LABS)"), '"k":"d","v":12')
    pg.evaluate("labAdd('d',35,'2026-12-30')"); pg.evaluate("openTool('labs')"); pg.wait_for_timeout(150)
    check('lab chart drawn', str(pg.locator('#lbout svg polyline').count()), '1'); check('lab change shown', T('lbout'), '▲ 23'); check('labs is its own page', pg.evaluate('cur'), 'labs'); back()
    pg.click('#res [data-report]'); pg.wait_for_timeout(150); rep = T('sheet-b')
    check('report: inputs', rep, '40'); check('report: sources', rep, 'Endocrine Society'); check('report: print button', rep, 'PDF'); pg.click('#sheet-x')
    link = pg.evaluate("shareLink()"); check('share link has values', link, '#c=')
    pg.click('#clear'); pg.goto(link); pg.wait_for_timeout(300)
    check('shared link fills the calculator', pg.input_value('#dlab'), '12'); check('shared link: same result', T('res'), '50,000 IU'); check('hash cleaned', pg.evaluate('location.hash'), '#calc')
    pg.goto('http://app.test/#c=not-valid!!'); pg.wait_for_timeout(200); check('bad link is ignored', pg.evaluate('location.hash'), '#calc')
    pg.evaluate("openSearch()"); pg.fill('#gsq','حديد'); pg.dispatch_event('#gsq','input'); pg.wait_for_timeout(100); gs = T('gsr')
    check('search: calculator', gs, 'الحديد'); check('search: interactions', gs, 'Levothyroxine')
    pg.fill('#gsq','levothyroxine'); pg.dispatch_event('#gsq','input'); pg.wait_for_timeout(80); check('search: English drug name', T('gsr'), 'Levothyroxine')
    pg.click('#gsr [data-gsint]'); pg.wait_for_timeout(150); check('search -> interactions', pg.evaluate('cur'), 'interactions')
    pg.goto('http://app.test/#roadmap'); pg.wait_for_timeout(150)
    check('roadmap: available now', T('rmgrid'), 'متوفر الآن'); pg.locator('#rmgrid [data-rmgo="sch"]').first.click(); pg.wait_for_timeout(150)
    check('try it opens the schedule', pg.evaluate('cur'), 'sched')
    # 1.12.0 notifications for everyone: lab result older than 3 months, new features; the owner's page order
    pg.evaluate("labAdd('b12',300,'2026-01-05')"); pg.goto('http://app.test/#notif'); pg.wait_for_timeout(200)
    check('visitor notifications: lab reminder', T('notif-p'), 'B12'); check('visitor notifications: new features', T('notif-p'), 'جديد في VITAWAW')
    check('opening 🔔 marks them read', str(pg.evaluate('notifCount()')), '0')
    pg.evaluate("CFG.nav={order:['sources','calc','interactions','tools','notif','roadmap','sched','labs','ul'],bar:['sources','calc','interactions'],hide:['ul']};renderNav()")
    check('owner order: sources first in the bar', str(pg.evaluate("[...document.querySelectorAll('.tabs .tab')].filter(t=>!t.hidden&&!t.classList.contains('offbar')).sort((a,b)=>a.style.order-b.style.order).map(t=>t.dataset.p).join(',')")), 'sources,calc,interactions,menu')
    pg.goto('http://app.test/#ul'); pg.wait_for_timeout(150); check('hidden page opens the calculator', pg.evaluate('cur'), 'calc')
    # 1.12.0 tools page: tiles in groups, one tool at a time, «‹ Tools» back; patient mode hides the pharmacist tools
    pg.evaluate("CFG.nav=clone(DEFAULT_CFG.nav);setMode('pro')"); pg.goto('http://app.test/#tools'); pg.wait_for_timeout(200)
    check('tools page: tiles', str(pg.locator('#tgrid .mtile').count()), '10')
    pg.click('#tgrid [data-hub="tool-ca"]'); pg.wait_for_timeout(200)
    check('tile opens one tool', pg.evaluate("location.hash+' '+($('tool-ca').offsetParent!==null)+' '+$('tool-pill').offsetParent"), '#tool-ca true null')
    pg.click('#tback'); pg.wait_for_timeout(200); check('back to the tiles', pg.evaluate("location.hash+' '+$('tools').classList.contains('tv')"), '#tools false')
    pg.evaluate("setMode('pt')"); pg.wait_for_timeout(100)
    check('patient mode: no pharmacist tools', str(pg.locator('#tgrid .mtile').count()), '5'); pg.evaluate("setMode('pro')")
    print('page errors:', errs)
sys.exit(1 if fails or errs else 0)
