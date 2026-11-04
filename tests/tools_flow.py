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
    pg.goto('http://app.test/#tool-sch'); pg.wait_for_timeout(200)  # each tool has its own page since 1.12.0
    for id in ['levo','fe','ca','abx']: pg.check('#sc-'+id)
    pg.dispatch_event('#schk','change'); pg.wait_for_timeout(100)
    out = T('schout'); check('schedule solved', out, 'Levothyroxine')
    asg = pg.evaluate("schSolve(['levo','fe','ca','abx'])")
    ok = abs(asg['levo']-asg['fe'])>=240 and abs(asg['levo']-asg['ca'])>=240 and abs(asg['fe']-asg['ca'])>=120 and all(t<=m-120 or t>=m+360 for m in (asg['fe'],asg['ca']) for t in (asg['abx'],asg['abx']+720))
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule gaps {asg}')
    asg = pg.evaluate("schSolve(['bis','levo','ca','mg'])"); ok = asg['levo']>=asg['bis']+30 and asg['ca']>=asg['bis']+120 and abs(asg['levo']-asg['mg'])>=240
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule alendronate {asg}')
    # 1.13.0: eltrombopag 2 h before or 4 h after minerals; gabapentin (3 doses) at least 2 h after magnesium; Biktarvy and magnesium 2 h / 6 h
    asg = pg.evaluate("schSolve(['elt','fe','ca','mg','zn'])"); ok = bool(asg) and all(asg['elt']<=asg[m]-120 or asg['elt']>=asg[m]+240 for m in ('fe','ca','mg','zn'))
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule eltrombopag {asg}')
    asg = pg.evaluate("schSolve(['gaba','mg'])"); ok = bool(asg) and all(t<=asg['mg'] or t>=asg['mg']+120 for t in (asg['gaba'],asg['gaba']+360,asg['gaba']+720))
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule gabapentin {asg}')
    asg = pg.evaluate("schSolve(['bik','mg'])"); ok = bool(asg) and (asg['bik']<=asg['mg']-120 or asg['bik']>=asg['mg']+360)
    fails += not ok; print(('ok   ' if ok else 'FAIL ')+f'schedule Biktarvy {asg}')
    check('my medicines -> schedule (gabapentin)', str(pg.evaluate("medSch('نيورونتين')")), 'gaba')
    # 1.13.0 tools: zinc acetate, serum zinc/copper units, more upper limits, lab history lines
    pg.goto('http://app.test/#tool-pill'); pg.wait_for_timeout(150)
    setv('salt','za','change'); setv('tabmg',50); setv('needmg',15); check('zinc acetate 30%', T('elper'), '15 ملغ')
    pg.goto('http://app.test/#tool-u'); pg.wait_for_timeout(150)
    setv('ucv','znl','change'); setv('uval',100); check('serum zinc 100 µg/dL', T('uout'), '15.3 µmol/L')
    setv('ucv','cul','change'); setv('uval',100); check('serum copper 100 µg/dL', T('uout'), '15.7 µmol/L')
    check('upper limits: copper', pg.evaluate("ULT.map(x=>x[0]).join(',')"), 'copper,manganese,molybdenum,choline,phosphorus')
    check('lab history: active B12 and folate', pg.evaluate("LABT.map(x=>x[0]).join(',')"), 'd,b12,ab12,fol,hb,fer,mg')
    # 1.13.0 own pages: «my medicines» (same list as on interactions) and the link check (team only)
    pg.goto('http://app.test/#meds'); pg.wait_for_timeout(200)
    check('my medicines page: the list moved here', pg.evaluate("$('mymed').closest('.page').id"), 'meds')
    check('my medicines page: empty until a medicine is added', T('ilist'), 'أضف دواءً')
    pg.goto('http://app.test/#interactions'); pg.wait_for_timeout(200)
    check('back on the interactions page: the list returns, «my medicines» stays on its own page (1.14.6)', pg.evaluate("$('mymed').closest('.page').id+','+$('ilist').closest('.page').id"), 'meds,interactions')
    pg.goto('http://app.test/#links'); pg.wait_for_timeout(200); check('link check: visitors are sent to the calculator', pg.evaluate('cur'), 'calc')
    pg.goto('http://app.test/#meds'); pg.wait_for_timeout(200)
    check('medicines in the app are listed', str(pg.locator('#medcat .mcadd').count()>3), 'True')
    check('visitors cannot edit the list', str(pg.locator('#medcat [data-mcedit]').count()), '0')
    check('Arabic names come from the editable list', ','.join(pg.evaluate("iTerms(normAr('ليفوثيروكسين'))")), 'ليفوثيروكسين,levothyroxine')
    pg.evaluate("CFG.medcat=[{en:'levothyroxine',ar:['التروكسين الجديد'],hide:false}]")
    check('an edited name is recognised', ','.join(pg.evaluate("iTerms(normAr('التروكسين الجديد'))")), 'levothyroxine')
    pg.evaluate("CFG.medcat=null")
    # 1.14.0: «و» beside English names, owner fonts and sizes, interactions grouped
    check('و between English names', pg.evaluate("bidiFix('(Omeprazole وLansoprazole)')"), '(Omeprazole، Lansoprazole)')
    check('و before an English name', pg.evaluate("bidiFix('الحديد وB12')"), 'الحديد و B12')
    pg.evaluate("CFG.look={fb:'cairo',fh:'cairo',sb:1.2,sh:1};applyLook()")
    check('owner font size applied', pg.evaluate("getComputedStyle(document.body).fontSize"), '18px')
    pg.evaluate("CFG.look=null;applyLook()")
    check('default font size back', pg.evaluate("getComputedStyle(document.body).fontSize"), '15px')
    # menu groups: the owner's names and order are used
    pg.evaluate("CFG.menus.groups={order:['settings','help'],names:{help:{ar:'مساعدة',en:'Help'}},items:{}};renderMenu()")
    check('menu: owner order and name', pg.evaluate("[...document.querySelectorAll('#menu-b .mgs>.mg')].slice(0,2).map(g=>g.dataset.sid+':'+(g.querySelector('h3')||{}).textContent).join(',')"), 'settings:الإعدادات,help:مساعدة')
    pg.evaluate("delete CFG.menus.groups;renderMenu()")
    # calculator -> tools, filled in
    pg.goto('http://app.test/#calc'); pg.wait_for_timeout(300)
    def calc(k, fields, sx='f'):
        pg.evaluate("go('calc')"); pg.wait_for_timeout(60); pg.click(f'#picker [data-k="{k}"]'); pg.wait_for_timeout(80); pg.click('#clear')  # the vitamin opens its own page
        for f, v in fields.items():
            if f in ('feg','folg','czg','tri','feed','vag'): pg.select_option('#'+f, v); pg.dispatch_event('#'+f,'change')
            else: pg.fill('#'+f, str(v)); pg.dispatch_event('#'+f,'input')
        if pg.is_visible('#sex'): pg.select_option('#sex', sx); pg.dispatch_event('#sex','change')
        pg.wait_for_timeout(80)
    def back():  # tools open as full pages (‹ back); other windows close with ×
        if pg.is_visible('#sheet-x'): pg.click('#sheet-x')
        elif pg.is_visible('#tback'): pg.click('#tback'); pg.wait_for_timeout(150)
    def tool(kind):
        pg.click(f'#res [data-tool="{kind}"]'); pg.wait_for_timeout(120)
    calc('fe', {'age':4,'wt':16,'feg':'ida'}); tool('ml'); check('child iron -> syrup', T('mldose'), '48 ملغ'); back()
    calc('fe', {'age':30,'hb':10,'fer':8}); tool('ganz'); check('Hb -> Ganzoni', pg.input_value('#gha'), '10'); back()
    calc('mg', {'age':40,'mgv':1.5}, 'm'); tool('pills'); check('Mg -> tablets', T('elperi'), 'mmol'); back()
    calc('vac', {'mon':18,'vag':'prev'}); tool('units'); check('vitamin A -> units', T('uout'), '60,000 mcg RAE'); back()
    calc('d', {'age':40,'dlab':12}); tool('ul'); check('vitamin D -> UL', T('ulout'), 'فيتامين D'); back()
    calc('d', {'age':40,'dlab':120}); check('D >100 -> corrected calcium button', T('res'), 'الكالسيوم المصحح')
    calc('preg', {'age':28,'tri':'t2'}); tool('sch'); check('pregnancy -> schedule', T('schout'), 'الحديد'); back()
    calc('fol', {'age':28,'folg':'plan'}); tool('pills'); check('folic acid -> tablets', T('ntabs'), '1 حبة'); back()
    # 1.9.0 interactions <-> calculator <-> schedule
    calc('fe', {'age':30,'feg':'rda'}); check('interactions in the result', T('res'), 'Levothyroxine')
    pg.click('#res [data-goint]'); pg.wait_for_timeout(150); check('-> interactions page filtered', pg.evaluate('IF'), 'fe')
    card = pg.locator('#ilist .icard', has_text='Levothyroxine').first
    card.locator('[data-gosch]').click(); pg.wait_for_timeout(150)
    check('card -> schedule', ','.join(pg.evaluate("SCI.map(x=>x[0]).filter(id=>$('sc-'+id).checked)")), 'levo,fe'); back()
    pg.goto('http://app.test/#meds'); pg.wait_for_timeout(150); pg.evaluate("IF='all';renderInter()")
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
    pg.click('#ref-15 .num'); pg.wait_for_timeout(150); check('used in (calculator), shown in the opened card', T('sheet-b'), 'الحديد'); pg.click('#sheet-x')
    pg.click('#ref-27 .num'); pg.wait_for_timeout(150); pg.click('#sheet-b [data-isrc]'); pg.wait_for_timeout(150)
    check('source -> its interactions', str(pg.locator('#ilist .icard').count()), '2'); check('source filter chip', T('filters'), 'المصدر 27')
    pg.click('[data-clrsrc]'); pg.wait_for_timeout(80); check('filter cleared', str(pg.evaluate('ISRC')), 'None')
    # 1.11.0 calendar, lab history, report, share link, search, roadmap «available now»
    pg.goto('http://app.test/#calc'); pg.wait_for_timeout(150)
    calc('d', {'age':40,'dlab':12})
    ics = pg.evaluate("icsFile([LAST.cal])")
    check('calendar: weekly 8 times', ics, 'RRULE:FREQ=WEEKLY;COUNT=8'); check('calendar: alarm', ics, 'BEGIN:VALARM'); check('calendar: lines end CRLF', str(ics.count('\r\n')>10), 'True')
    pg.evaluate("localStorage.removeItem('vw-labs');LABS=[]")
    pg.click('#res [data-lab]'); pg.wait_for_timeout(100); check('lab saved from the result', pg.evaluate("JSON.stringify(LABS)"), '"k":"d","v":12')
    pg.evaluate("labAdd('d',35,'2026-12-30')"); pg.evaluate("openTool('labs')"); pg.wait_for_timeout(150)
    check('lab chart drawn', str(pg.locator('#lbout svg polyline').count()), '1'); check('lab change shown', T('lbout'), '▲ 23'); back()
    pg.click('#res [data-report]'); pg.wait_for_timeout(150); rep = T('sheet-b')
    check('report: inputs', rep, '40'); check('report: sources', rep, 'Endocrine Society'); check('report: print button', rep, 'PDF'); back()
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
    check('try it opens the schedule', pg.evaluate('location.hash'), '#tool-sch'); back()
    # 1.12.0 notifications for everyone: lab result older than 3 months, new features; opening 🔔 marks them read
    pg.evaluate("labAdd('b12',300,'2026-01-05')"); pg.goto('http://app.test/#notif'); pg.wait_for_timeout(200)
    check('visitor notifications: lab reminder', T('notif-p'), 'B12'); check('visitor notifications: new features', T('notif-p'), 'جديد في VITAWAW')
    check('opening 🔔 marks them read', str(pg.evaluate('notifCount()')), '0')
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(100)  # 🔔 is a floating window
    # 1.12.0 second pages: a vitamin opens patient data + result; tools are rectangles and each opens its own page
    pg.goto('http://app.test/#calc'); pg.wait_for_timeout(200)
    check('calculator: list of vitamins only', str(pg.is_visible('#s-data') or pg.is_visible('#resbox')), 'False')
    pg.click('#picker [data-k="b12"]'); pg.wait_for_timeout(200)
    check('vitamin opens its page', pg.evaluate("location.hash+' '+($('s-data').offsetParent!==null)"), '#v-b12 true')
    pg.click('#cbackb'); pg.wait_for_timeout(200); check('back to the vitamins', str(pg.is_visible('#picker')), 'True')
    pg.goto('http://app.test/#tools'); pg.wait_for_timeout(200)
    check('tools page: rectangles', str(pg.locator('#tgrid [data-tv]').count()), '9')
    pg.click('#tgrid [data-tv="tool-ca"]'); pg.wait_for_timeout(200)
    check('tool opens its page alone', pg.evaluate("location.hash+' '+($('tool-ca').offsetParent!==null)+' '+$('tool-pill').offsetParent"), '#tool-ca true null')
    pg.click('#tback'); pg.wait_for_timeout(200); check('back to the tools', str(pg.is_visible('#tgrid')), 'True')
    # 1.12.0: patient mode hides the pharmacist tools; the owner's hidden tool and renamed tool; a pharmacist's stamp on an item
    check('1.15.0: every tool shown (no patient mode)', str(pg.locator('#tgrid [data-tv]').count()), '9')
    pg.evaluate("CFG.tools={order:['tool-u','tool-ul'],hide:['tool-gz'],names:{'tool-ul':{ar:'فحص الحد',en:'UL'}}};renderNav()"); pg.wait_for_timeout(100)
    order = pg.evaluate("[...document.querySelectorAll('#tgrid [data-tv]')].map(b=>b.dataset.tv).join(',')")  # 1.14.1: the owner's order inside each part (1.16.0: the follow-up part has its own order, CFG.tools.follow)
    check('owner: order, hide, name of tools', str(order.startswith('tool-u,tool-pill') and 'tool-sch,tool-ul,tool-labs' in order and 'tool-gz' not in order), 'True')
    # 1.16.0 schedule: the label gaps of the new drugs (Cefdinir ↔ iron/magnesium 2 h, Mycophenolate before magnesium ≥2 h, Penicillamine ↔ iron 2 h)
    gaps = pg.evaluate("""(()=>{const g=(a,b)=>{const s=schSolve([a,b]);if(!s)return 'none';return Math.min(...doseTimes(a,s[a]).flatMap(x=>doseTimes(b,s[b]).map(y=>Math.abs(x-y))))/60};
      const m=schSolve(['mmf','mg']);return [g('cef','fe'),g('cef','mg'),g('pen','fe'),m&&Math.min(...doseTimes('mmf',m.mmf).map(t=>m.mg-t).filter(d=>d>=0))/60]})()""")
    check('1.16.0 schedule: Cefdinir/Penicillamine 2 h from iron and magnesium, magnesium ≥2 h after Mycophenolate', str(all(x!='none' and x>=2 for x in gaps)), 'True')
    check('1.16.0 schedule: «أدوية المريض» ticks the medicines of the list', pg.evaluate("(()=>{MEDS.length=0;MEDS.push('cefdinir','mycophenolate');schBuild();document.getElementById('scmine').click();return ['cef','mmf'].every(k=>document.getElementById('sc-'+k).checked)})()") and 'True' or 'False', 'True')
    pg.evaluate("MEDS.length=0;['cef','mmf'].forEach(k=>{document.getElementById('sc-'+k).checked=false});schBuild()")
    pg.evaluate("CFG.tools={...CFG.tools,items:{'sch:fe':{n:{ar:'الحديد الفموي',en:'Oral iron'}},'ul:se':{off:true},'lab:mg':{off:true}}};renderNav();schBuild();ulBuild();labsBuild()")
    check('1.16.0 owner renames a schedule item, hides an upper-limit item and a lab test', str(pg.inner_text('#schk').count('الحديد الفموي')==1 and pg.locator('#ul-se').count()==0 and pg.locator('#lbk option[value="mg"]').count()==0), 'True')
    pg.evaluate("CFG.tools={...CFG.tools,items:{}};schBuild();ulBuild();labsBuild()")
    check('owner: renamed tool', T('tgrid'), 'فحص الحد'); check('owner: hidden tool gone', str(pg.locator('#tgrid [data-tv="tool-gz"]').count()), '0')
    check('stamp of a pharmacist', pg.evaluate("stampHTML('د. أحمد','2026-11-02')"), 'راجعه: د. أحمد')
    print('page errors:', errs)
sys.exit(1 if fails or errs else 0)
