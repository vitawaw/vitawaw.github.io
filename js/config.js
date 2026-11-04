/* VITAWAW · js/config.js
   App settings: version, Supabase project (public anon key), default editable content (DEFAULT_CFG),
   clean() for every piece of data that comes from outside, mergeCfg() and the cached published copy.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== Medical review (fill in to show the stamp) ===================== */
const APP_VERSION='1.16.1';
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
  look:{fb:'tajawal',fh:'cairo',sb:1,sh:1,st:1},
  medcat:null, /* 1.13.0: the medicines the site recognizes [{en, ar:[names], hide}]; null = the built-in list (lists.js DRUG_AR). Owner edits; pharmacists propose. */
  nutOrder:[], /* order of the vitamins (ids); empty = default order. Owner only. */
  brand:{l1:'',l2:'',url:''},
  review:{n:{ar:'د. سيف الدين',en:'Dr. Saifaldeen'},date:'2026-10-29'}, /* medical review stamp under each result; empty name = hidden. Owner only. */ /* footer logos: l1 = app logo (empty = built-in), l2 = parent company logo, url = company site */
  /* info pages in the side menu (☰ → معلومات). The owner can edit, hide, add and delete them. Plain text: an empty line starts a new paragraph. */
  pages:[
   {id:'about',t:{"ar": "حول التطبيق", "en": "About the app"},b:{"ar": "VITAWAW حاسبة لجرعات الفيتامينات والمعادن **للصيادلة**، مبنية على مصادر طبية رسمية.\n\n## ماذا يقدّم\n- **الحاسبة:** الفيتامينات والمعادن الأساسية، وحاسبات خاصة: الحمل والرضاعة، الرضيع، فيتامين A للأطفال، بعد عمليات السمنة، نقص فيتامين B1، والزنك لإسهال الأطفال.\n- **التداخلات:** تداخلات المكملات مع الأدوية وفواصل الأخذ، من نشرات الأدوية والمراجع الرسمية، مرتبة حسب الخطورة.\n- **أدوية المريض:** أضف أدوية المريض من قائمة أبجدية فتظهر تداخلاتها فقط.\n- **الأدوات:** عدد الحبات، محوّل فيتامين D، الكالسيوم المصحح، عجز الحديد (Ganzoni)، الشراب والقطرات، محوّل الوحدات.\n- **أدوات المتابعة:** جدول المكملات اليومي، الحد الأعلى الآمن، سجل التحاليل.\n- **المصادر:** قائمة كاملة بنوع كل مصدر وأين يُستخدم.\n\n## لماذا تثق بالنتيجة\n- بجانب كل رقم رقم مصدره، اضغطه لفتح المصدر.\n- يراجع صيدلي كل إضافة قبل أن تظهر للزوار.\n\n## على الهاتف\nمن القائمة ← الإعدادات ← «تثبيت على الهاتف» يفتح VITAWAW كتطبيق من الشاشة الرئيسية.", "en": "VITAWAW is a vitamin and mineral dose calculator **for pharmacists**, built on official medical sources.\n\n## What it offers\n- **Calculator:** the main vitamins and minerals, and special calculators: pregnancy and breastfeeding, infants, vitamin A for children, after weight-loss surgery, vitamin B1 deficiency, and zinc for childhood diarrhoea.\n- **Interactions:** supplement–medicine interactions and timing gaps, from drug labels and official references, sorted by severity.\n- **Patient medicines:** add the patient's medicines from an A–Z list to see only their interactions.\n- **Tools:** tablet counter, vitamin D converter, corrected calcium, iron deficit (Ganzoni), syrups and drops, unit converter.\n- **Follow-up tools:** daily supplement schedule, safe upper limit, lab results log.\n- **Sources:** the full list, with the type of each source and where it is used.\n\n## Why you can trust the result\n- Every number shows the number of its source; tap it to open the source.\n- A pharmacist reviews every addition before visitors can see it.\n\n## On your phone\nMenu → Settings → «Install on phone» opens VITAWAW as an app from the home screen."}},
   {id:'who',t:{"ar": "من نحن", "en": "About us"},b:{"ar": "VITAWAW مشروع أكاديمي في الصيدلة – جامعة الشرق الأوسط، بعنوان «حساب جرع الفيتامينات».\n\n## فريق العمل\n- الصيدلي **سيف الدين يحيى خليفة** (قائد الفريق)\n- عبد الرزاق عبد الجليل علي\n- راكان علي شهاب\n- بلال خلف\n\n## هدفنا\nتبسيط حساب جرعات الفيتامينات والمعادن للصيادلة، بالاعتماد على مصادر علمية رسمية يراجعها صيدلي قبل نشرها.\n\n## كيف نعمل\n- لكل رقم في الموقع مصدر رسمي يظهر رقمه بجانبه.\n- يضيف الصيادلة المدعوون المحتوى، ولا يظهر للزوار إلا بعد أن يعتمده الصيدلي المسؤول.\n- يُسجَّل كل تعديل في «سجل الإجراءات»: ماذا تغيّر، ومن غيّره، ومتى.", "en": "VITAWAW is an academic pharmacy project at Middle East University, titled «Vitamin dose calculation».\n\n## Team\n- Pharmacist **Saifaldeen Yahya Khalifa** (team leader)\n- Abdulrazzaq Abduljaleel Ali\n- Rakan Ali Shehab\n- Bilal Khalaf\n\n## Our aim\nTo make vitamin and mineral dosing simpler for pharmacists, based on official scientific sources that a pharmacist reviews before they are published.\n\n## How we work\n- Every number on the site has an official source whose number appears next to it.\n- Invited pharmacists add content; visitors see it only after the responsible pharmacist approves it.\n- Every change is recorded in the «Activity log»: what changed, who changed it and when."}},
   {id:'privacy',t:{"ar": "سياسة الخصوصية", "en": "Privacy policy"},b:{"ar": "## لا نجمع بياناتك\nالعمر والوزن ونتائج التحاليل التي تدخلها تبقى على جهازك فقط ولا تُرسل لأي جهة. لا يحتاج الزائر حساباً.\n\n## بلا تتبّع\nلا أدوات تتبّع ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.\n\n## ما يُحفظ على جهازك\n- إعداداتك: اللغة والمظهر وآخر قسم فتحته.\n- ما تختار حفظه بنفسك: «سجل التحاليل» و«أدوية المريض» و«جدول المكملات».\n- تحذفها كلها في أي وقت من القائمة ← «امسح بياناتي من هذا الجهاز».\n\n## الروابط المشتركة\nرابط «شارك برابط» يحمل القيم التي أدخلتها فقط، ولا تُحفظ في أي مكان.\n\n## حسابات الفريق\nالحسابات للمالك والصيادلة المدعوين فقط، وتُحفظ في قاعدة بيانات محمية، ويُسجَّل ما يغيّرونه في المحتوى.", "en": "## We do not collect your data\nThe age, weight and lab results you enter stay on your device and are never sent anywhere. Visitors need no account.\n\n## No tracking\nNo trackers and no ads; fonts are served from our own site.\n\n## What is kept on your device\n- Your settings: language, appearance and the last section you opened.\n- What you choose to save: «Lab results log», «Patient medicines» and «Supplement schedule».\n- Delete all of it at any time from Menu → «Clear my data from this device».\n\n## Shared links\nA «Share by link» link carries only the values you entered; they are not stored anywhere.\n\n## Team accounts\nAccounts are for the owner and invited pharmacists only, kept in a protected database, and their changes to the content are recorded."}},
   {id:'disclaimer',t:{"ar": "إخلاء المسؤولية", "en": "Disclaimer"},b:{"ar": "## للتثقيف ومساعدة الصيدلي\nالمعلومات في التطبيق للتثقيف ولمساعدة الصيدلي والطبيب، ولا تغني عن الاستشارة الطبية.\n\n## قبل أي جرعة علاجية\n- لا تبدأ جرعة علاجية ولا توقفها دون مراجعة الطبيب أو الصيدلي.\n- احرص أكثر في الحمل والأطفال ومرضى الكلى.\n- اتبع وصفة الطبيب إذا اختلفت عن النتيجة.", "en": "## For education and to support pharmacists\nThe information in this app is for education and to support pharmacists and doctors; it does not replace medical advice.\n\n## Before any treatment dose\n- Do not start or stop a treatment dose without a doctor or pharmacist.\n- Take extra care in pregnancy, children and kidney disease.\n- Follow the doctor's prescription if it differs from the result."}},
  ],
  roadmap:[
   {"st": "now", "go": "sch", "ic": "clock", "t": {"ar": "جدول المكملات وتذكير الجرعات", "en": "Supplement schedule and dose reminders"}, "d": {"ar": "رتّب أوقات المكملات مع أدوية المريض بحيث تُحترم فواصل التداخلات تلقائياً، وأضف المواعيد إلى تقويم الهاتف.", "en": "Arrange supplement times with the patient's medicines so interaction gaps are respected automatically, and add the times to the phone calendar."}},
   {"st": "now", "go": "meds", "ic": "pill", "t": {"ar": "أدوية المريض مرتبة أبجدياً", "en": "Patient medicines, sorted A–Z"}, "d": {"ar": "أضف أدوية المريض فتظهر التداخلات التي تخصها فقط. الأدوية مرتبة بالعربية أو الإنجليزية مع عنوان لكل حرف.", "en": "Add the patient's medicines to see only the interactions that concern them. Sorted in Arabic or English with a heading for each letter."}},
   {"st": "now", "go": "preg", "ic": "baby", "t": {"ar": "حاسبات خاصة والزنك لإسهال الأطفال", "en": "Special calculators and zinc for childhood diarrhoea"}, "d": {"ar": "الحمل والرضاعة، الرضيع، فيتامين A للأطفال، بعد عمليات السمنة، نقص B1، وجديد: الزنك لإسهال الأطفال حسب WHO (10 أو 20 ملغ لمدة 10 – 14 يوماً).", "en": "Pregnancy and breastfeeding, infants, vitamin A for children, after weight-loss surgery, B1 deficiency, and new: zinc for childhood diarrhoea per WHO (10 or 20 mg for 10–14 days)."}},
   {"st": "now", "go": "sources", "ic": "chart", "t": {"ar": "مصدر رسمي لكل رقم", "en": "An official source for every number"}, "d": {"ar": "كل جرعة وتداخل يحمل رقم مصدره من إرشادات ونشرات رسمية، وروابط المصادر تُفحص بانتظام.", "en": "Every dose and interaction carries the number of its source from official guidelines and labels, and the source links are checked regularly."}},
   {"st": "now", "go": "labs", "ic": "chart", "t": {"ar": "سجل التحاليل ومتابعة التحسن", "en": "Lab results log and progress"}, "d": {"ar": "احفظ نتائج التحاليل وشاهد تغيّر المستوى على رسم بياني بين تحليل وآخر.", "en": "Save lab results and see the level change on a chart from one test to the next."}},
   {"st": "now", "go": "report", "ic": "share", "t": {"ar": "تقرير للطبيب وبطاقة للمريض", "en": "Doctor report and patient card"}, "d": {"ar": "ملف مفصّل بالنتيجة والخطة والمصادر للطبيب، وبطاقة مبسطة يسلّمها الصيدلي للمريض.", "en": "A detailed file with the result, plan and sources for the doctor, and a simple card the pharmacist hands to the patient."}},
   {"st": "now", "go": "calc", "ic": "plus", "t": {"ar": "واجهة أوضح", "en": "A clearer layout"}, "d": {"ar": "أربعة مربعات في كل سطر بالرمز والاسم، وبطاقات بارزة بحافة ملونة حسب الخطورة أو الحالة، على الهاتف والآيباد والكمبيوتر.", "en": "Four tiles per line with symbol and name, and cards that stand out with a coloured edge by severity or status, on phone, iPad and computer."}},
   {"st": "dev", "ic": "plus", "t": {"ar": "تداخلات جديدة من نشرات الأدوية", "en": "New interactions from drug labels"}, "d": {"ar": "Raltegravir وCefdinir وMycophenolate وEntacapone وPenicillamine وIsotretinoin مع الفيتامينات والمعادن، من النشرات الرسمية، ويراجعها الصيدلي قبل نشرها.", "en": "Raltegravir, cefdinir, mycophenolate, entacapone, penicillamine and isotretinoin with vitamins and minerals, from the official labels, reviewed by the pharmacist before publishing."}},
   {"st": "plan", "ic": "pill", "t": {"ar": "حاسبة الحديد الوريدي Monofer", "en": "IV iron calculator: Monofer"}, "d": {"ar": "جرعة Ferric derisomaltose حسب الوزن والهيموغلوبين من نشرة الدواء، بجانب Ferinject.", "en": "Ferric derisomaltose dose by weight and haemoglobin from the product label, next to Ferinject."}},
   {"st": "plan", "ic": "baby", "t": {"ar": "B12 وحمض الفوليك للأطفال", "en": "B12 and folic acid for children"}, "d": {"ar": "جرعات علاج النقص للأطفال حسب العمر من BNF for Children.", "en": "Deficiency treatment doses for children by age from the BNF for Children."}},
   {"st": "plan", "ic": "bell", "t": {"ar": "تنبيه مجموع المكملات", "en": "Combined supplement alert"}, "d": {"ar": "عند أخذ أكثر من مكمل فيه العنصر نفسه، يجمع التطبيق الكميات وينبّه إذا تجاوز المجموع الحد الأعلى الآمن.", "en": "When several supplements contain the same nutrient, the app adds them up and warns if the total passes the safe upper limit."}},
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
  if(over.look&&typeof over.look==='object'){const F=['tajawal','cairo','system'],l=over.look,S=v=>{const n=Math.round(+v*20)/20;return n>=0.85&&n<=1.3?n:1}; // 1.16.0: 85%–130% in 5% steps
    out.look={fb:F.includes(l.fb)?l.fb:'tajawal',fh:F.includes(l.fh)?l.fh:'cairo',sb:S(l.sb),sh:S(l.sh),st:S(l.st==null?1:l.st)}}
  if(Array.isArray(over.medcat))out.medcat=over.medcat.filter(m=>m&&typeof m.en==='string'&&/^[a-z0-9][a-z0-9 -]{1,40}$/.test(m.en.trim().toLowerCase())).map(m=>({en:m.en.trim().toLowerCase(),ar:(Array.isArray(m.ar)?m.ar:[]).filter(a=>typeof a==='string'&&a.trim()).map(a=>a.trim().slice(0,40)).slice(0,12),hide:!!m.hide})).slice(0,400);
  if(Array.isArray(over.pages))out.pages=over.pages;
  if(Array.isArray(over.nutOrder))out.nutOrder=over.nutOrder;
  if(over.review&&over.review.n)out.review={n:{ar:over.review.n.ar||'',en:over.review.n.en||''},date:/^\d{4}-\d{2}-\d{2}$/.test(over.review.date||'')?over.review.date:''};
  if(over.menus&&typeof over.menus==='object')out.menus={order:Array.isArray(over.menus.order)?over.menus.order:out.menus.order,bar:Array.isArray(over.menus.bar)?over.menus.bar:out.menus.bar,hide:Array.isArray(over.menus.hide)?over.menus.hide:[]};
  if(over.menus&&over.menus.groups&&typeof over.menus.groups==='object'){const g=over.menus.groups;out.menus.groups={order:Array.isArray(g.order)?g.order:[],names:g.names&&typeof g.names==='object'?g.names:{},items:g.items&&typeof g.items==='object'?g.items:{},off:Array.isArray(g.off)?g.off.filter(x=>typeof x==='string').slice(0,200):[]}}
  if(over.tools&&typeof over.tools==='object'){out.tools={order:Array.isArray(over.tools.order)?over.tools.order:[],hide:Array.isArray(over.tools.hide)?over.tools.hide:[],names:over.tools.names&&typeof over.tools.names==='object'?over.tools.names:{}};
    // 1.16.0 «follow-up tools»: tools, sections (p:…) and information pages (pg:…) the owner put there, in his order
    // 1.16.0: the owner's names, directions and hidden items inside the schedule (sch:), upper limit (ul:) and lab results (lab:)
    if(over.tools.items&&typeof over.tools.items==='object'){const it={},tx=o=>o&&typeof o==='object'?{ar:String(o.ar||'').slice(0,300),en:String(o.en||'').slice(0,300)}:undefined;
      Object.entries(over.tools.items).slice(0,120).forEach(([k,v])=>{if(/^(sch|ul|lab):[a-z0-9]{1,12}$/.test(k)&&v&&typeof v==='object')it[k]={...(v.n?{n:tx(v.n)}:{}),...(v.h?{h:tx(v.h)}:{}),...(v.off?{off:true}:{})}});out.tools.items=it}
    if(Array.isArray(over.tools.follow))out.tools.follow=[...new Set(over.tools.follow.filter(k=>typeof k==='string'&&/^(tool-[a-z]+|p:[a-z]+|pg:[A-Za-z0-9_-]{1,40})$/.test(k)))].slice(0,40)}
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
