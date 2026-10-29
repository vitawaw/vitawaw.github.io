"""Language audit: walks every page, dialog and menu in one language and lists any text left in the other.
Run: python3 tests/i18n_audit.py en   (or ar). Prints TOTAL 0 when clean."""
import json, sys, re
from playwright.sync_api import sync_playwright
html=open('index.html',encoding='utf-8').read()
seed=open('tests/seed_state.json').read();fake=open('tests/fake_supabase.js').read()
ROOT='.'
def serve(route):
    import os,mimetypes
    from urllib.parse import urlparse
    p=urlparse(route.request.url).path.lstrip('/') or 'index.html'
    f=os.path.join(ROOT,p)
    if not os.path.isfile(f): f=os.path.join(ROOT,'index.html')
    ct=mimetypes.guess_type(f)[0] or 'text/html'
    hdr={}
    if ct=='text/html':
        import re
        h=open(os.path.join(ROOT,'_headers')).read()
        m=re.search(r'Content-Security-Policy: (.*)',h)
        if m: hdr['Content-Security-Policy']=m.group(1).replace("connect-src 'self'","connect-src 'self' http://app.test").replace('; upgrade-insecure-requests','')
    body=open(f,'rb').read()
    if f.endswith('owner.js'):   # the fake library stands in for supabase-js, so the page must expect the fake's fingerprint
        import re,hashlib,base64
        body=re.sub(rb"sri:'sha384-[^']+'",("sri:'sha384-"+base64.b64encode(hashlib.sha384(fake.encode()).digest()).decode()+"'").encode(),body)
    route.fulfill(status=200,body=body,content_type=ct,headers=hdr)
def setup(pg,pub='[]'):
    pg.add_init_script('window.__SEED='+seed+';')
    pg.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,body=fake,content_type='application/javascript'))
    pg.route('https://zrlapysswtqrwfsywbvl.supabase.co/**',lambda r:r.fulfill(status=200,body=pub,content_type='application/json'))
    pg.route('https://fonts.googleapis.com/**',lambda r:r.fulfill(status=200,body='',content_type='text/css'))
    pg.route('http://app.test/**',serve)
    pg.route('http://app.test/api/content',lambda r:r.fulfill(status=200,body=pub,content_type='application/json'))
SCAN=r'''(lang)=>{
 const AR=/[؀-ۿ]/;
 const EN=/\b(?!(?:mg|mcg|IU|ng|mL|dL|nmol|pmol|pg|kg|cm|RAE|DFE|NE|ALA|EPA|DHA|INR|HIV|ACE|ARBs?|PPIs?|NIH|ODS|FDA|EFSA|WHO|NICE|BNF|AI|UL|RDA|OK|VITAWAW|Supabase|Medscape|Endocrine|Society|Ganzoni|WhatsApp|e\.g)\b)[a-z]{3,}\s+[a-z]{2,}\s+[a-z]{2,}/i;
 const bad = lang==='en' ? (s=>AR.test(s)) : (s=>EN.test(s) && !AR.test(s));
 const out=[];
 const vis=el=>{for(let e=el;e&&e!==document.body;e=e.parentElement){if(e.hidden||getComputedStyle(e).display==='none')return false}return true};
 const where=el=>{let p=el;const parts=[];while(p&&p!==document.body&&parts.length<3){if(p.id){parts.unshift('#'+p.id);break}parts.unshift(p.tagName.toLowerCase()+(p.className&&typeof p.className==='string'?'.'+p.className.split(' ')[0]:''));p=p.parentElement}return parts.join('>')};
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){const t=n.nodeValue.trim();if(!t)continue;const pe=n.parentElement;if(['SCRIPT','STYLE'].includes(pe.tagName))continue;
   if(bad(t))out.push([vis(pe)?'V':'h',where(pe),t.slice(0,140)])}
 document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el=>{['placeholder','title','aria-label','alt'].forEach(a=>{const v=el.getAttribute(a);if(v&&bad(v))out.push([vis(el)?'V':'h','@'+a+' '+where(el),v.slice(0,140)])})});
 if(bad(document.title))out.push(['V','<title>',document.title]);
 return out}'''
found={}
def scan(pg,label,lang):
    for v,w,t in pg.evaluate(SCAN,lang):
        key=(lang,w,t)
        if key not in found: found[key]=label
def fill_all(pg):
    pg.evaluate('''()=>{const set=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}};
      set('age','35');set('wt','70');set('ht','165');set('dlab','14');set('b12v','160');set('cadiet','500');set('mgv','1.5')}''')
def nutrients(pg):
    return pg.evaluate("[...document.querySelectorAll('#picker button[data-k]')].map(b=>b.dataset.k)")
def walk(pg,lang,tag):
    pg.click('#t-calc');pg.wait_for_timeout(150)
    scan(pg,tag+' calc-empty',lang)
    for mode in ['pro','patient']:
        pg.click(f'#modeg [data-mode="{mode}"]') if pg.is_visible(f'#modeg [data-mode="{mode}"]') else None
        for k in nutrients(pg):
            pg.click(f'#picker [data-k="{k}"]');pg.wait_for_timeout(60)
            fill_all(pg)
            for sx in (['m','f','p','l'] if mode=='pro' else ['f']):
                try: pg.select_option('#sex',sx)
                except Exception: pass
                pg.wait_for_timeout(30);scan(pg,f'{tag} calc {mode} {k} {sx}',lang)
            for cb in ['mal','med','ren','neuro','mgsx','mgren','smk']:
                pg.evaluate(f"(()=>{{const e=document.getElementById('{cb}');if(e){{e.checked=true;e.dispatchEvent(new Event('change',{{bubbles:true}}))}}}})()")
            for sel in ['folg','feg','czg','dunit','b12u','mgu']:
                opts=pg.evaluate(f"(()=>{{const e=document.getElementById('{sel}');return e?[...e.options].map(o=>o.value):[]}})()")
                for o in opts:
                    pg.evaluate(f"(()=>{{const e=document.getElementById('{sel}');e.value='{o}';e.dispatchEvent(new Event('change',{{bubbles:true}}))}})()");pg.wait_for_timeout(20)
                    scan(pg,f'{tag} calc {mode} {k} {sel}={o}',lang)
            # infant / child
            for a in ['0','5']:
                pg.fill('#age',a);pg.dispatch_event('#age','input');pg.wait_for_timeout(30);scan(pg,f'{tag} calc {k} age{a}',lang)
            if pg.locator('#res [data-card]:visible').count():
                pg.locator('#res [data-card]').first.click(timeout=2000);pg.wait_for_timeout(100);scan(pg,f'{tag} card {k}',lang)
                txt=pg.evaluate('typeof cardText==="function"?cardText():""')
                if lang=='en' and re.search('[؀-ۿ]',txt): found[(lang,'cardText '+k,txt[:140])]=tag
                pg.keyboard.press('Escape');pg.wait_for_timeout(50)
    pg.fill('#nsearch','zzzz') if pg.is_visible('#nsearch') else None
    pg.wait_for_timeout(50);scan(pg,tag+' search-empty',lang)
    if pg.is_visible('#nsearch'): pg.fill('#nsearch','');pg.dispatch_event('#nsearch','input')
    pg.click('#t-tools');pg.wait_for_timeout(100);scan(pg,tag+' tools-empty',lang)
    pg.evaluate('''()=>{document.querySelectorAll('#tools input').forEach((e,i)=>{if(e.type==='number'||e.type==='text'||!e.type){e.value=String([60,1.5,2,1000,4,3.5,9,70,9,15,500][i%11]);e.dispatchEvent(new Event('input',{bubbles:true}))}});
      document.querySelectorAll('#tools select').forEach(s=>{s.selectedIndex=s.options.length-1;s.dispatchEvent(new Event('change',{bubbles:true}))})}''')
    pg.wait_for_timeout(100);scan(pg,tag+' tools-filled',lang)
    for t in ['interactions','sources','roadmap']:
        pg.evaluate(f"go('{t}')");pg.wait_for_timeout(100);scan(pg,tag+' '+t,lang)
        for f in pg.locator(f'#{t} [data-f], #filters button, #sfilters button').all()[:20]:
            try: f.click();pg.wait_for_timeout(30);scan(pg,tag+' '+t+' filter',lang)
            except Exception: pass
def menus(pg,lang,tag):
    pg.evaluate("go('menu')");pg.wait_for_timeout(120);scan(pg,tag+' menu',lang)
    for pid in pg.evaluate("(CFG.pages||[]).map(p=>p.id)"):
        pg.evaluate(f"openPage('{pid}')");pg.wait_for_timeout(50);scan(pg,f'{tag} page {pid}',lang);pg.evaluate('closeSheet(false)')
def owner_dialogs(pg,lang,tag):
    sels=['[data-act="edit"][data-kind="n"]','#nadd','[data-act="edit"][data-kind="i"]','#iadd','[data-act="edit"][data-kind="r"]','#radd','[data-act="del"][data-kind="r"]','#o-publish','#o-pass','[data-approveall="n"]','[data-approveall="i"]','[data-approveall="r"]','[data-edtext]','[data-edcolor]','[data-edcontact]','[data-act="edit"][data-kind="m"]','#rmadd','#o-discard']
    for tab in ['calc','interactions','sources','roadmap','tools']:
        pg.evaluate(f"go('{tab}')");pg.wait_for_timeout(120);scan(pg,f'{tag} owner {tab}',lang)
        for s in sels:
            loc=pg.locator(f'#{tab} {s}, #obar {s}' if s.startswith('#o-') else f'#{tab} {s}')
            if s.startswith('#o-'): loc=pg.locator(s)
            if not loc.count() or not loc.first.is_visible(): continue
            try:
                loc.first.click();pg.wait_for_timeout(120)
                if pg.is_visible('#dlg'):
                    scan(pg,f'{tag} dlg {tab} {s}',lang)
                    # trigger validation message by submitting empty where possible
                    pg.keyboard.press('Escape');pg.wait_for_timeout(60)
                    if pg.is_visible('#dlg'):
                        b=pg.locator('#dlg-a button:not(.pri)')
                        if b.count(): b.first.click();pg.wait_for_timeout(60)
            except Exception as e: print('ERR',s,e)
    pg.evaluate('setPreview(true)');pg.wait_for_timeout(150);scan(pg,tag+' preview',lang);pg.click('#o-pvexit');pg.wait_for_timeout(100)
with sync_playwright() as p:
    b=p.chromium.launch()
    for start in [sys.argv[1]]:
        other='ar' if start=='en' else 'en'
        pg=b.new_context(viewport={'width':390,'height':844}).new_page();pg.set_default_timeout(4000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));setup(pg)
        pg.goto('http://app.test/');pg.wait_for_timeout(600)
        pg.evaluate('l=>setLang(l)',start);pg.wait_for_timeout(150);scan(pg,'visitor home',start)
        walk(pg,start,'visitor');menus(pg,start,'visitor')
        # render in this lang, then switch and scan stale content
        pg.click('#t-calc');pg.click('#picker [data-k="d"]');fill_all(pg);pg.wait_for_timeout(100)
        pg.evaluate('l=>setLang(l)',other);pg.wait_for_timeout(200);scan(pg,'after-switch calc',other)
        for t in ['tools','interactions','sources','roadmap']:
            pg.evaluate(f"go('{t}')");pg.wait_for_timeout(60);scan(pg,'after-switch '+t,other)
        pg.evaluate('l=>setLang(l)',start);pg.wait_for_timeout(150)
        # owner
        pg.evaluate('openOwner()');pg.wait_for_timeout(900);scan(pg,'owner home',start)
        walk(pg,start,'owner');owner_dialogs(pg,start,'owner');menus(pg,start,'owner')
        pg.evaluate('l=>setLang(l)',other);pg.wait_for_timeout(200)
        for t in ['calc','tools','interactions','sources','roadmap']:
            pg.evaluate(f"go('{t}')");pg.wait_for_timeout(60);scan(pg,'owner after-switch '+t,other)
        print(start,'errors:',errs[:5])
    # login dialog (visitor, not logged)
    for lg in ['en','ar']:
        pg=b.new_context(viewport={'width':390,'height':844}).new_page()
        pg.add_init_script("window.__NOSESSION=1");setup(pg);pg.goto('http://app.test/');pg.wait_for_timeout(500);pg.evaluate('l=>setLang(l)',lg);pg.wait_for_timeout(100)
groups={}
for (lang,w,t),lab in found.items(): groups.setdefault((lang,t),[]).append((w,lab))
for (lang,t),ws in sorted(groups.items()):
    print(f'[{lang}] {t!r}\n      at {ws[0][0]} ({ws[0][1]}){" +%d"%(len(ws)-1) if len(ws)>1 else ""}')
print('TOTAL',len(groups))
