from playwright.sync_api import sync_playwright
import json
html=open('index.html',encoding='utf-8').read()
seed=open('tests/seed_state.json').read()
fake=open('tests/fake_supabase.js').read()
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
def ok(pg): pg.click('#dlg-a .pri'); pg.wait_for_timeout(300)
def menu(pg):
    # the menu: ☰ «Menu» page on phones/tablets, the side menu on wide screens; returns its container
    if pg.evaluate('WIDE()'): return '#side-b'
    if pg.evaluate('cur')!='menu': pg.click('#t-menu');pg.wait_for_timeout(200)
    return '#menu-b'
def more(pg,label):
    # taps a row, tile or chip with this text in the menu
    c=menu(pg);pg.locator(f'{c} button, {c} a',has_text=label).first.click();pg.wait_for_timeout(300)
def login(pg): more(pg,'تسجيل الدخول');pg.wait_for_timeout(600)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844});pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:(m.type=='error' or 'Content Security Policy' in m.text) and errs.append(m.text));setup(pg)
    pg.goto('http://app.test/');pg.wait_for_timeout(500);login(pg)
    print('owner on:',pg.evaluate("document.body.classList.contains('owner')"),'| bar:',pg.inner_text('#ostate'))
    print('picker has vk (pending, owner sees):',pg.locator('#picker [data-k="vk"]').count(),pg.inner_text('#picker [data-k="vk"]').replace('\n',' / '))
    pg.click('#t-interactions');pg.wait_for_timeout(200)
    print('first card (sorted major first):',pg.locator('#ilist .icard').first.inner_text().replace('\n',' | ')[:120])
    pg.screenshot(path='tests/out_owner.png')
    # preview hides pending
    pg.click('#o-preview');pg.wait_for_timeout(300);print('PREVIEW icount:',pg.inner_text('#icount'),'vk in picker:',pg.locator('#picker [data-k="vk"]').count());pg.click('#o-pvexit');pg.wait_for_timeout(300);pg.click('#t-interactions');pg.wait_for_timeout(200)
    # edit an interaction severity
    pg.click('[data-act="edit"][data-kind="i"][data-id="0"]');pg.wait_for_timeout(200);pg.select_option('#dlgf1','major');ok(pg)
    # add interaction
    pg.click('#iadd');pg.wait_for_timeout(200);pg.select_option('#dlgf0','ca');pg.fill('#dlgf4','Ciprofloxacin');pg.fill('#dlgf6','يقلل امتصاص المضاد؛ افصل بينهما');pg.check('#dlgf8 input[value="18"]');ok(pg)
    # save
    pg.click('#o-save');pg.wait_for_timeout(600);print('after save toast:',pg.inner_text('#toast'),'| new ids:',pg.evaluate("CFG.inter.filter(x=>x.b.ar==='Ciprofloxacin').map(x=>x.id+'/'+x.rv)"))
    # publish without approving -> pending excluded
    pg.click('#o-publish');pg.wait_for_timeout(200);ok(pg);pg.wait_for_timeout(500)
    pub=pg.evaluate('window.__PUB');print('PUB1: inter',len(pub['inter']),'custom',len(pub['nut']['custom']),'refs',len(pub['refs']),'has warfarin:',any(x['b']['ar']=='Warfarin' for x in pub['inter']))
    # approve pending (nutrient, interaction, source) then publish
    pg.click('#t-notif');pg.wait_for_timeout(300);print('NOTIF cards:',pg.locator('#notif-b .ncard').count())
    pg.locator('#notif-b .ntop button').click();pg.wait_for_timeout(200);ok(pg);pg.wait_for_timeout(800)
    print('bar after approvals:',pg.inner_text('#ostate'))
    pg.click('#o-publish');pg.wait_for_timeout(200);ok(pg);pg.wait_for_timeout(500)
    pub=pg.evaluate('window.__PUB');print('PUB2: inter',len(pub['inter']),'custom',len(pub['nut']['custom']),'refs',len(pub['refs']),'warfarin sev:',[x['sev'] for x in pub['inter'] if x['b']['ar']=='Warfarin'])
    print('owner errors',errs)
    # visitor
    v=b.new_context(viewport={'width':390,'height':844}).new_page();verr=[];v.on('pageerror',lambda e:verr.append(str(e)))
    setup(v,json.dumps([{'data':pub}]));v.goto('http://app.test/');v.wait_for_timeout(800)
    v.click('#picker [data-k="vk"]');v.fill('#age','40');v.select_option('#sex','m');v.dispatch_event('#age','input');v.wait_for_timeout(200)
    print('VISITOR vk:',v.inner_text('#res h3'))
    v.click('#t-interactions');v.wait_for_timeout(200);print('VISITOR first:',v.locator('#ilist .icard').first.inner_text().replace('\n',' | ')[:100],'| pend shown:',v.locator('.pend:visible').count(),'| edit btns:',v.locator('[data-act]:visible').count())
    v.screenshot(path='tests/out_visitor.png')
    print('visitor errors',verr)
    # editor: edits reset review, cannot publish
    e=b.new_context(viewport={'width':390,'height':844}).new_page();e.add_init_script("window.__ROLE='editor'");setup(e);e.add_init_script("window.__PERMS={inter:true}");e.goto('http://app.test/');e.wait_for_timeout(500);login(e)
    print('EDITOR publish btn visible:',e.is_visible('#o-publish'),'| approve btns:',e.locator('[data-act="ok"],[data-approve]').count())
    print('EDITOR classes:',e.evaluate("['cant-nut','cant-inter','cant-refs','cant-text','not-owner'].filter(c=>document.body.classList.contains(c)).join(',')"))
    e.click('#t-interactions');e.wait_for_timeout(200);e.click('[data-act="edit"][data-kind="i"][data-id="0"]');e.wait_for_timeout(200);e.select_option('#dlgf1','minor');ok(e)
    e.click('#o-save');e.wait_for_timeout(600);print('EDITOR saved parts:',e.evaluate('window.__SAVED'),'| draft written:',e.evaluate("__calls.some(c=>c[0]==='upsert')"),'| toast:',e.inner_text('#toast'))
