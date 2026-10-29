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
 ('d',  {'age':0,'dlab':12}, 'f', '50,000 IU مرة أسبوعياً لمدة 6 أسابيع'),       # ES 2011 infant weekly alternative
 ('d',  {'age':18,'dlab':12}, 'm', '2,000 IU يومياً لمدة 6 أسابيع على الأقل'),  # ES 2011: 18 years = child/adolescent group
 ('d',  {'age':19,'dlab':12}, 'm', '50,000 IU أسبوعياً أو 6,000 IU يومياً'),     # adults from 19
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
 # 1.7.0
 ('b12',{'age':40,'b12v':250,'ab12':20}, 'f', 'Active B12 أقل من 25'),        # NICE NG239 active B12 <25 = deficiency
 ('b12',{'age':40,'b12v':250,'ab12':50}, 'f', 'افحص MMA'),                    # 25-70 indeterminate -> MMA
 ('b12',{'age':40,'b12v':250,'ab12':90}, 'f', 'نقص غير مرجّح'),               # >70 unlikely
 ('fe', {'age':30,'hb':10.5,'fer':8}, 'f', '60 – 120 ملغ'),                    # WHO Hb <12 + ferritin <=30 -> IDA
 ('fe', {'age':30,'hb':13,'fer':10}, 'm', 'نقص مخزون بدون فقر دم'),            # men: anemia below 13
 ('fe', {'age':30,'hb':10,'fer':150}, 'f', 'لا تبدأ الحديد'),
 ('fe', {'age':40,'hb':14.5,'fer':40}, 'm', 'نقص مخزون بدون فقر دم'),          # BSG 2021: adults below 45
 ('fe', {'age':40,'hb':14.5,'fer':45}, 'm', 'مخزون الحديد طبيعي'),             # 45 is not below 45
 ('fe', {'age':15,'hb':13,'fer':30}, 'm', 'نقص الحديد'),                        # AAP adolescents: 30 or less                  # anemia with normal ferritin
 ('fe', {'age':3,'wt':14,'hb':10.8,'fer':10}, 'f', '42 ملغ'),                  # 24-59 mo cut-off 11; 3 mg/kg (AAP)
 ('fe', {'age':30,'fer':50,'infl':1}, 'f', 'أقل من 70 ng/mL'),                   # inflammation: limit 70 -> deficiency
 ('mg', {'age':8,'wt':25,'mgv':1.5}, 'm', '63 – 125 ملغ'),                     # RCH 2.5-5 mg/kg three times a day
 ('inf',{'mon':5,'wt':7,'feed':'bf'}, 'f', '7 ملغ يومياً'),                    # AAP 2026 1 mg/kg from 4 months
 ('inf',{'mon':5,'wt':7,'feed':'bf'}, 'f', '400 IU'),                          # AAP 2008 vitamin D
 ('inf',{'mon':0,'feed':'ff'}, 'f', '1 ملغ عضلياً'),                           # AAP 2022 vitamin K
 ('inf',{'mon':1,'wt':2,'feed':'bf','pre':1}, 'f', '4 – 6 ملغ'),               # preterm 2-3 mg/kg
 ('vac',{'mon':18,'vag':'prev'}, 'f', '200,000 IU بالفم كل 4 – 6 أشهر'),       # WHO 2011
 ('vac',{'mon':8,'vag':'prev'}, 'f', '100,000 IU بالفم مرة واحدة'),
 ('vac',{'mon':8,'vag':'xer'}, 'f', 'اليوم 14'),                               # WHO 1997 day 1, 2, 14
 ('preg',{'age':28,'tri':'t2'}, 'f', '30 – 60 ملغ'),                           # WHO ANC 2016
 ('preg',{'age':28,'tri':'t2','hb':10.2}, 'f', '120 ملغ'),                     # anemic (<10.5 in 2nd trimester)
 ('preg',{'age':28,'tri':'t1','ntd':1}, 'f', '4 – 5 ملغ'),
 ('preg',{'age':28,'tri':'lac'}, 'f', '150 mcg'),                              # ATA iodine
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
            if f in ('feg','folg','czg','tri','feed','vag'): pg.select_option('#'+f, v)
            elif f in ('infl','pre','ntd','lowca','veg'): pg.check('#'+f)
            else: pg.fill('#'+f, str(v))
        if pg.is_visible('#sex'): pg.select_option('#sex', sx)
        for f in fields: pg.dispatch_event('#'+f, 'change' if f in ('feg','folg','czg','tri','feed','vag','infl','pre','ntd','lowca','veg') else 'input')
        pg.wait_for_timeout(80)
        txt = pg.inner_text('#res')
        ok = want in txt; fails += not ok
        print(('ok   ' if ok else 'FAIL ') + f'{k} {fields} {sx} -> expects «{want}»')
        if not ok: print('     got:', txt[:200].replace('\n', ' | '))
    print('page errors:', errs)
sys.exit(1 if fails or errs else 0)
