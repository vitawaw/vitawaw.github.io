/* VITAWAW · js/config.js
   App settings: version, Supabase project (public anon key), default editable content (DEFAULT_CFG),
   clean() for every piece of data that comes from outside, mergeCfg() and the cached published copy.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== Medical review (fill in to show the stamp) ===================== */
const APP_VERSION='1.16.0';
/* the medical review stamp is set by the owner (menu → site → «ختم المراجعة الطبية») and published with the settings: CFG.review */

/* ===================== Supabase connection (fill after creating the project) ===================== */
/* the live site (production) uses the real project; the preview links (*.workers.dev other than production) use the separate
   free test project «vitawaw-test», so saving and publishing on a preview never touches the live site (1.12.2) */
const SB_LIVE={url:'https://zrlapysswtqrwfsywbvl.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpybGFweXNzd3Rxcndmc3l3YnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjIxODcsImV4cCI6MjEwODY5ODE4N30.b8tbg5S8g4ojb3Iams4_nik8K6AvLlV5rNZHe2Nthiw'};
const SB_TEST={url:'https://qzxdvdesscsyqbaqyuqb.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eGR2ZGVzc2NzeXFiYXF5dXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDc2MzcsImV4cCI6MjEwOTIyMzYzN30.NH41HaD3KZIix0TFqffoqLb05jiFiXJeF4H29rXKoWY'};
const IS_PREVIEW=/\.workers\.dev$/.test(location.hostname)&&location.hostname!=='billowing-glade-6627.vitawaw26.workers.dev';
const SB=IS_PREVIEW?SB_TEST:SB_LIVE; // public anon keys only (data is protected by RLS); never the service_role key

/* ===================== editable configuration ===================== */
const DEFAULT_CFG={
  contact:{email:'vitawaw26@gmail.com',phone:''},
  refs:null,inter:null,nut:{hide:[],custom:[]},
  colors:{calc:['#0B6B6E','#8E1B54'],tools:['#00167a','#075BFF'],interactions:['#7a2e00','#d9731f'],sources:['#0a4a2c','#17915a'],roadmap:['#3a1678','#7c4dff'],meds:['#7a2e00','#d9731f'],sch:['#00167a','#075BFF'],labs:['#00167a','#075BFF'],ul:['#00167a','#075BFF']},
  /* owner only (1.12.0): main sections — order everywhere, the four in the bottom bar (and the top bar on computers), hidden ones */
  menus:{order:['calc','interactions','tools','sources','roadmap'],bar:['calc','interactions','tools','sources'],hide:[]},
  /* owner only (1.12.0): the tools page — order, hidden tools, names {id:{ar,en}} */
  tools:{order:[],hide:[],names:{}},
  text:{},
  /* 1.14.0 owner: fonts of the body text and the headings (self-hosted Tajawal / Cairo, or the device's own) and their sizes */
  look:{fb:'tajawal',fh:'cairo',sb:1,sh:1},
  medcat:null, /* 1.13.0: the medicines the site recognizes [{en, ar:[names], hide}]; null = the built-in list (lists.js DRUG_AR). Owner edits; pharmacists propose. */
  nutOrder:[], /* order of the vitamins (ids); empty = default order. Owner only. */
  brand:{l1:'',l2:'',url:''},
  review:{n:{ar:'د. سيف الدين',en:'Dr. Saifaldeen'},date:'2026-10-29'}, /* medical review stamp under each result; empty name = hidden. Owner only. */ /* footer logos: l1 = app logo (empty = built-in), l2 = parent company logo, url = company site */
  /* info pages in the side menu (☰ → معلومات). The owner can edit, hide, add and delete them. Plain text: an empty line starts a new paragraph. */
  pages:[
   {id:'about',t:{ar:'حول التطبيق',en:"About the app"},b:{ar:"VITAWAW حاسبة لجرعات الفيتامينات والمعادن مبنية على مصادر طبية موثوقة، مع التداخلات الدوائية وأدوات صيدلانية مساعدة.\n\nبجانب كل رقم في النتيجة رقم مصدره، اضغطه لفتح المصدر.\n\nيراجع صيدلي كل إضافة جديدة قبل أن تظهر للزوار.",en:"VITAWAW is a vitamin and mineral dose calculator based on trusted medical sources, with drug interactions and pharmacy tools.\n\nEvery number in a result shows the number of its source; tap it to open the source.\n\nA pharmacist reviews every new addition before visitors can see it."}},
   {id:'who',t:{ar:'من نحن',en:"About us"},b:{ar:"VITAWAW مشروع أكاديمي في الصيدلة – جامعة الشرق الأوسط، بعنوان «حساب جرع الفيتامينات».\n\nفريق العمل: الصيدلي سيف الدين يحيى خليفة (قائد الفريق)، عبد الرزاق عبد الجليل علي، راكان علي شهاب، بلال خلف.\n\nهدفنا تبسيط حساب جرعات الفيتامينات والمعادن للصيادلة، بالاعتماد على مصادر علمية موثوقة يراجعها صيدلي.",en:"VITAWAW is an academic pharmacy project at Middle East University, titled «Vitamin dose calculation».\n\nTeam: pharmacist Saifaldeen Yahya Khalifa (team leader), Abdulrazzaq Abduljaleel Ali, Rakan Ali Shehab and Bilal Khalaf.\n\nOur aim is to make vitamin and mineral dosing simpler for pharmacists, based on trusted scientific sources reviewed by a pharmacist."}},
   {id:'privacy',t:{ar:'سياسة الخصوصية',en:'Privacy policy'},b:{ar:'لا نجمع أي بيانات شخصية. العمر والوزن ونتائج التحاليل التي تدخلها تبقى على جهازك فقط ولا تُرسل لأي جهة.\n\nلا نستخدم أدوات تتبّع ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.\n\nيحفظ متصفحك على جهازك فقط: إعداداتك (اللغة والمظهر وآخر قسم فتحته)، وما تختار حفظه بنفسك في «سجل التحاليل» و«أدوية المريض». تستطيع حذفها في أي وقت من داخل التطبيق.\n\nرابط «شارك برابط» يحمل القيم التي أدخلتها فقط، ولا تُحفظ في أي مكان.',en:'We do not collect any personal data. The age, weight and lab results you enter stay on your device and are never sent anywhere.\n\nThere are no trackers or ads, and fonts are served from our own site.\n\nYour browser keeps on your device only your settings (language, appearance and the last section you opened) and what you choose to save in «Lab results log» and «Patient medicines». You can delete them at any time in the app.\n\nA «Share by link» link carries only the values you entered; they are not stored anywhere.'}},
   {id:'disclaimer',t:{ar:'إخلاء المسؤولية',en:'Disclaimer'},b:{ar:'المعلومات في التطبيق للتثقيف ولمساعدة الصيدلي والطبيب، ولا تغني عن الاستشارة الطبية.\n\nلا تبدأ جرعة علاجية ولا توقفها دون مراجعة الطبيب أو الصيدلي، خاصة للحامل والأطفال ومرضى الكلى.',en:'The information in this app is for education and to support pharmacists and doctors; it does not replace medical advice.\n\nDo not start or stop a treatment dose without a doctor or pharmacist, especially in pregnancy, children and kidney disease.'}}
  ],
  roadmap:[
   {"st": "now", "go": "sch", "ic": "clock", "t": {"ar": "جدول المكملات وتذكير الجرعات", "en": "Supplement schedule and dose reminders"}, "d": {"ar": "رتّب أوقات المكملات مع أدوية المريض بحيث تُحترم فواصل التداخلات تلقائياً، وأضف المواعيد إلى تقويم الهاتف.", "en": "Arrange supplement times with the patient's medicines so interaction gaps are respected automatically, and add the times to the phone calendar."}},
   {"st": "now", "go": "labs", "ic": "chart", "t": {"ar": "سجل التحاليل ومتابعة التحسن", "en": "Lab results log and progress"}, "d": {"ar": "احفظ نتائج التحاليل وشاهد تغيّر المستوى على رسم بياني بين تحليل وآخر.", "en": "Save lab results and see the level change on a chart from one test to the next."}},
   {"st": "now", "go": "meds", "ic": "pill", "t": {"ar": "أدوية المريض", "en": "Patient medicines"}, "d": {"ar": "أضف أدوية المريض فتظهر التداخلات التي تخصها فقط مع المكملات. الأدوية مرتبة أبجدياً بالعربية أو الإنجليزية.", "en": "Add the patient's medicines to see only the interactions that concern them. Medicines are sorted A–Z in Arabic or English."}},
   {"st": "now", "go": "report", "ic": "share", "t": {"ar": "تقرير للطبيب وبطاقة للمريض", "en": "Doctor report and patient card"}, "d": {"ar": "ملف مفصّل بالنتيجة والخطة والمصادر للطبيب، وبطاقة مبسطة يسلّمها الصيدلي للمريض.", "en": "A detailed file with the result, plan and sources for the doctor, and a simple card the pharmacist hands to the patient."}},
   {"st": "now", "go": "preg", "ic": "baby", "t": {"ar": "حاسبات خاصة", "en": "Special calculators"}, "d": {"ar": "الحمل والرضاعة، الرضيع، فيتامين A للأطفال، بعد عمليات السمنة، نقص فيتامين B1، والزنك لإسهال الأطفال (WHO).", "en": "Pregnancy and breastfeeding, infants, vitamin A for children, after weight-loss surgery, vitamin B1 deficiency, and zinc for childhood diarrhoea (WHO)."}},
   {"st": "dev", "ic": "plus", "t": {"ar": "تداخلات جديدة من نشرات الأدوية", "en": "New interactions from drug labels"}, "d": {"ar": "نضيف تداخلات الأدوية مع الفيتامينات والمعادن من النشرات الرسمية، ويراجع الصيدلي كل إضافة قبل نشرها.", "en": "We add drug interactions with vitamins and minerals from official labels, and a pharmacist reviews every addition before it is published."}},
   {"st": "plan", "ic": "pill", "t": {"ar": "حاسبة الحديد الوريدي Monofer", "en": "IV iron calculator: Monofer"}, "d": {"ar": "جرعة Ferric derisomaltose حسب الوزن والهيموغلوبين من نشرة الدواء، بجانب Ferinject.", "en": "Ferric derisomaltose dose by weight and haemoglobin from the product label, next to Ferinject."}},
   {"st": "plan", "ic": "baby", "t": {"ar": "B12 وحمض الفوليك للأطفال", "en": "B12 and folic acid for children"}, "d": {"ar": "جرعات علاج النقص للأطفال حسب العمر من BNF for Children.", "en": "Deficiency treatment doses for children by age from the BNF for Children."}},
   {"st": "idea", "ic": "cam", "t": {"ar": "قراءة العبوة بالكاميرا", "en": "Scan the pack with the camera"}, "d": {"ar": "صوّر علبة المكمل فيتعرّف التطبيق على التركيز ويحسب عدد الحبات مباشرة.", "en": "Photograph the supplement box and the app reads the strength and counts the tablets."}}
  ]
};
/* ===================== data safety =====================
   Everything that comes from the database or the browser cache goes through clean()
   before it is shown. It removes anything that could act as HTML or script:
   - "<" and ">" in any text become full-width ‹ › look-alikes (medical text like "<20" still reads fine)
   - links must start with http:// or https:// (blocks javascript: links)
   - ids, status and icon names may only contain letters, numbers, "_" and "-"
   - colors must be hex (#rrggbb), email and phone must look like an email and a phone number */
const SAFE_ID_KEYS=new Set(['k','id','st','ic','sev','uk','sx','go']);
function clean(v,key){
  if(typeof v==='string'){
    if(key==='url')return /^https?:\/\/[^\s"'<>]+$/i.test(v.trim())?v.trim():'';
    if(key==='l1'||key==='l2')return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v)&&v.length<300000?v:''; // uploaded logo (small picture)
    if(SAFE_ID_KEYS.has(key))return v.replace(/[^\w-]/g,'');
    if(key==='email')return /^[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}$/i.test(v.trim())?v.trim():'';
    if(key==='phone')return v.replace(/[^+\d\s()-]/g,'');
    return v.replace(/</g,'\u2039').replace(/>/g,'\u203A');
  }
  if(Array.isArray(v)){
    if(key==='calc'||key==='tools'||key==='interactions'||key==='sources'||key==='roadmap'&&typeof v[0]==='string')
      return v.map(c=>/^#[0-9a-f]{3,8}$/i.test(c)?c:'#075BFF');
    return v.map(x=>clean(x,SAFE_ID_KEYS.has(key)||key==='hide'||key==='nutOrder'||key==='order'||key==='bar'?'id':undefined));
  }
  if(v&&typeof v==='object'){const o={};for(const[k,x]of Object.entries(v))o[k]=clean(x,k);return o}
  return v;
}
const clone=o=>JSON.parse(JSON.stringify(o));
function mergeCfg(base,over){const out=clone(base);if(!over)return out;over=clean(over);
  if(over.contact)Object.assign(out.contact,over.contact);
  if(over.colors)Object.assign(out.colors,over.colors);
  if(over.text)out.text=Object.assign({},over.text);
  if(Array.isArray(over.roadmap))out.roadmap=over.roadmap;
  if(over.look&&typeof over.look==='object'){const F=['tajawal','cairo','system'],S=[0.9,1,1.1,1.2],l=over.look;
    out.look={fb:F.includes(l.fb)?l.fb:'tajawal',fh:F.includes(l.fh)?l.fh:'cairo',sb:S.includes(+l.sb)?+l.sb:1,sh:S.includes(+l.sh)?+l.sh:1}}
  if(Array.isArray(over.medcat))out.medcat=over.medcat.filter(m=>m&&typeof m.en==='string'&&/^[a-z0-9][a-z0-9 -]{1,40}$/.test(m.en.trim().toLowerCase())).map(m=>({en:m.en.trim().toLowerCase(),ar:(Array.isArray(m.ar)?m.ar:[]).filter(a=>typeof a==='string'&&a.trim()).map(a=>a.trim().slice(0,40)).slice(0,12),hide:!!m.hide})).slice(0,400);
  if(Array.isArray(over.pages))out.pages=over.pages;
  if(Array.isArray(over.nutOrder))out.nutOrder=over.nutOrder;
  if(over.review&&over.review.n)out.review={n:{ar:over.review.n.ar||'',en:over.review.n.en||''},date:/^\d{4}-\d{2}-\d{2}$/.test(over.review.date||'')?over.review.date:''};
  if(over.menus&&typeof over.menus==='object')out.menus={order:Array.isArray(over.menus.order)?over.menus.order:out.menus.order,bar:Array.isArray(over.menus.bar)?over.menus.bar:out.menus.bar,hide:Array.isArray(over.menus.hide)?over.menus.hide:[]};
  if(over.menus&&over.menus.groups&&typeof over.menus.groups==='object'){const g=over.menus.groups;out.menus.groups={order:Array.isArray(g.order)?g.order:[],names:g.names&&typeof g.names==='object'?g.names:{},items:g.items&&typeof g.items==='object'?g.items:{},off:Array.isArray(g.off)?g.off.filter(x=>typeof x==='string').slice(0,200):[]}}
  if(over.tools&&typeof over.tools==='object')out.tools={order:Array.isArray(over.tools.order)?over.tools.order:[],hide:Array.isArray(over.tools.hide)?over.tools.hide:[],names:over.tools.names&&typeof over.tools.names==='object'?over.tools.names:{}};
  if(over.brand)out.brand={l1:over.brand.l1||'',l2:over.brand.l2||'',url:over.brand.url||''};
  if(Array.isArray(over.refs))out.refs=over.refs;
  if(Array.isArray(over.inter))out.inter=over.inter;
  if(over.nut)out.nut={hide:over.nut.hide||[],custom:over.nut.custom||[]};
  return out}
let PUBLISHED=null,CFG=clone(DEFAULT_CFG);
try{const c=localStorage.getItem('vw-cfg');if(c){PUBLISHED=JSON.parse(c);CFG=mergeCfg(DEFAULT_CFG,PUBLISHED)}}catch(e){}
const EMAILF=()=>CFG.contact.email||'';
const PHONEF=()=>(CFG.contact.phone||'').trim();
/** WhatsApp chat link for the contact phone (digits only, international format). */
const waLink=(text='')=>{const d=PHONEF().replace(/\D/g,'');return d?`https://wa.me/${d}${text?'?text='+encodeURIComponent(text):''}`:''};
/** Link to send us a message: email if there is one, otherwise WhatsApp to the phone. */
const msgLink=(subj,body='')=>EMAILF()?mailto(subj,body):waLink(subj+(body?'\n'+body:''));
const mailto=(subj,body='')=>`mailto:${encodeURIComponent(EMAILF()).replace('%40','@')}?subject=${encodeURIComponent(subj)}${body?'&body='+encodeURIComponent(body):''}`;
