"""Medical regression cases: python3 tests/medical_cases.py
Runs the calculator in a browser for fixed inputs and checks the key output against the cited source."""
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
CASES = [  # nutrient, fields, sex, expected text somewhere in the result (Arabic UI)
 ('d',  {'age':40,'dlab':12}, 'f', '50,000 IU أسبوعياً'),                 # Endocrine Society 2011 adult deficiency
 ('d',  {'age':40,'dlab':12}, 'f', 'إرشاد 2024 لم يحدد مستوى مستهدفاً'),    # transparency note
 ('d',  {'age':40,'dlab':25}, 'f', 'تعتبره NIH كافياً'),                    # 20-29 note
 ('d',  {'age':40,'dlab':55}, 'f', 'أعلى من 50 ng/mL'),                     # NIH >50 note
 ('d',  {'age':40,'dlab':160}, 'f', '150 ng/mL'),                           # NIH toxicity threshold
 ('d',  {'age':0,'dlab':12}, 'f', '2,000 IU يومياً لمدة 6 أسابيع'),
 ('b12',{'age':0,'b12v':400}, 'm', '0.4 – 0.5'),                            # NIH infant RDA/AI
 ('b12',{'age':40,'b12v':150}, 'f', 'Hydroxocobalamin'),
 ('fe', {'age':0,'feg':'rda'}, 'f', '0.27'),                                            # NIH infant AI
 ('fe', {'age':10,'wt':30,'feg':'ida'}, 'f', 'أعلى من جرعة المراهقين'),                 # 90 mg > 65 mg warning
 ('fe', {'age':10,'wt':30,'feg':'ida'}, 'f', 'مراجعة بعد شهر وبعد 3 أشهر'),            # AAP follow-up
 ('ca', {'age':0}, 'f', '200 – 260'),                                       # NIH infant AI
 ('ca', {'age':30,'cadiet':400}, 'f', '600'),                               # gap 1000-400
 ('mg', {'age':40,'mgv':1.0}, 'm', 'المغنيسيوم الوريدي في المستشفى'),       # <0.5 mmol/L -> IV (SPS)
 ('mg', {'age':40,'mgv':1.5}, 'm', '10 – 24 mmol'),                          # mild -> oral (SPS)
 ('mg', {'age':40,'mgv':1.5}, 'm', 'بعد 7 أيام'),
 ('c',  {'age':0}, 'f', '40 – 50'),                                          # NIH infant AI
 ('zn', {'age':30}, 'm', '11'),
]
fails = 0
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1280,'height':900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('http://app.test/**', serve)
    pg.route('http://app.test/api/content', lambda r: r.fulfill(status=200, body='[]', content_type='application/json'))
    pg.route('https://**', lambda r: r.fulfill(status=200, body='[]', content_type='application/json'))
    pg.goto('http://app.test/'); pg.wait_for_timeout(500)
    for k, fields, sx, want in CASES:
        pg.click('#clear'); pg.click(f'#picker [data-k="{k}"]')
        for f, v in fields.items():
            if f in ('feg','folg','czg'): pg.select_option('#'+f, v)
            else: pg.fill('#'+f, str(v))
        pg.select_option('#sex', sx)
        for f in fields: pg.dispatch_event('#'+f, 'change' if f in ('feg','folg','czg') else 'input')
        pg.wait_for_timeout(80)
        txt = pg.inner_text('#res')
        ok = want in txt; fails += not ok
        print(('ok   ' if ok else 'FAIL ') + f'{k} {fields} {sx} -> expects «{want}»')
        if not ok: print('     got:', txt[:200].replace('\n', ' | '))
    print('page errors:', errs)
sys.exit(1 if fails or errs else 0)
