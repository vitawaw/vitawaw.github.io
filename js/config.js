/* VITAWAW · js/config.js
   App settings: version, Supabase project (public anon key), default editable content (DEFAULT_CFG),
   clean() for every piece of data that comes from outside, mergeCfg() and the cached published copy.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== Medical review (fill in to show the stamp) ===================== */
const APP_VERSION='1.2.0';
const REVIEW={name:'',role:'',date:''}; // e.g. {name:'د. ...', role:'صيدلي سريري', date:'2026-11-01'}

/* ===================== Supabase connection (fill after creating the project) ===================== */
const SB={url:'https://zrlapysswtqrwfsywbvl.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpybGFweXNzd3Rxcndmc3l3YnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjIxODcsImV4cCI6MjEwODY5ODE4N30.b8tbg5S8g4ojb3Iams4_nik8K6AvLlV5rNZHe2Nthiw'}; // e.g. {url:'https://xxxx.supabase.co', key:'eyJ... (anon public key)'}

/* ===================== editable configuration ===================== */
const DEFAULT_CFG={
  contact:{email:'vitawaw26@gmail.com',phone:''},
  refs:null,inter:null,nut:{hide:[],custom:[]},
  colors:{calc:['#0B6B6E','#8E1B54'],tools:['#00167a','#075BFF'],interactions:['#7a2e00','#d9731f'],sources:['#0a4a2c','#17915a'],roadmap:['#3a1678','#7c4dff']},
  text:{},
  roadmap:[
   {st:'dev',ic:'bell',t:{ar:'تذكير بمواعيد الجرعات',en:'Dose reminders'},d:{ar:'تنبيه في يوم ووقت الجرعة، خاصة للجرعات الأسبوعية التي يسهل نسيانها.',en:'A reminder on the day and time of each dose, especially weekly doses that are easy to forget.'}},
   {st:'dev',ic:'clock',t:{ar:'جدول يومي ذكي للمكملات',en:'Smart daily schedule'},d:{ar:'ترتيب أوقات أخذ المكملات معاً بحيث تُحترم فواصل التداخلات تلقائياً.',en:'Arranges the times for all your supplements so interaction gaps are respected automatically.'}},
   {st:'plan',ic:'chart',t:{ar:'سجل التحاليل ومتابعة التحسن',en:'Lab history and progress'},d:{ar:'احفظ نتائج تحاليلك وشاهد تحسّن المستوى على رسم بياني بين تحليل وآخر.',en:'Save your test results and see your level improve on a chart from one test to the next.'}},
   {st:'dev',ic:'plus',t:{ar:'توسيع المحتوى باستمرار',en:'Content keeps growing'},d:{ar:'نضيف فيتامينات ومعادن وتداخلات دوائية جديدة باستمرار، ويراجع صيدلي كل إضافة قبل نشرها.',en:'We keep adding vitamins, minerals and drug interactions, and a pharmacist reviews every addition before it is published.'}},
   {st:'plan',ic:'pill',t:{ar:'فحص تداخلات أدويتك',en:'Check your own medicines'},d:{ar:'أدخل أدويتك الحالية فتظهر التداخلات التي تخصك فقط مع المكملات.',en:'Enter the medicines you take and see only the interactions that apply to you.'}},
   {st:'plan',ic:'share',t:{ar:'تقرير PDF للطبيب',en:'PDF report for your doctor'},d:{ar:'ملف مفصّل بالنتيجة والخطة والمصادر لطباعته أو إرساله للطبيب.',en:'A detailed file with the result, plan and sources to print or send to your doctor.'}},
   {st:'idea',ic:'baby',t:{ar:'قسم خاص للحمل والأطفال',en:'Pregnancy and children section'},d:{ar:'جرعات مفصّلة حسب أسبوع الحمل وعمر الطفل ووزنه بإشراف مختصين.',en:'Detailed doses by pregnancy week and by child age and weight, reviewed by specialists.'}},
   {st:'idea',ic:'cam',t:{ar:'قراءة العبوة بالكاميرا',en:'Scan the pack with your camera'},d:{ar:'صوّر علبة المكمل فيتعرّف التطبيق على التركيز ويحسب عدد الحبات مباشرة.',en:'Photograph the supplement box and the app reads the strength and counts the tablets for you.'}}
  ]
};
/* ===================== data safety =====================
   Everything that comes from the database or the browser cache goes through clean()
   before it is shown. It removes anything that could act as HTML or script:
   - "<" and ">" in any text become full-width ‹ › look-alikes (medical text like "<20" still reads fine)
   - links must start with http:// or https:// (blocks javascript: links)
   - ids, status and icon names may only contain letters, numbers, "_" and "-"
   - colours must be hex (#rrggbb), e-mail and phone must look like an e-mail and a phone number */
const SAFE_ID_KEYS=new Set(['k','id','st','ic','sev','uk','sx']);
function clean(v,key){
  if(typeof v==='string'){
    if(key==='url')return /^https?:\/\/[^\s"'<>]+$/i.test(v.trim())?v.trim():'';
    if(SAFE_ID_KEYS.has(key))return v.replace(/[^\w-]/g,'');
    if(key==='email')return /^[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}$/i.test(v.trim())?v.trim():'';
    if(key==='phone')return v.replace(/[^+\d\s()-]/g,'');
    return v.replace(/</g,'\u2039').replace(/>/g,'\u203A');
  }
  if(Array.isArray(v)){
    if(key==='calc'||key==='tools'||key==='interactions'||key==='sources'||key==='roadmap'&&typeof v[0]==='string')
      return v.map(c=>/^#[0-9a-f]{3,8}$/i.test(c)?c:'#075BFF');
    return v.map(x=>clean(x,SAFE_ID_KEYS.has(key)||key==='hide'?'id':undefined));
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
  if(Array.isArray(over.refs))out.refs=over.refs;
  if(Array.isArray(over.inter))out.inter=over.inter;
  if(over.nut)out.nut={hide:over.nut.hide||[],custom:over.nut.custom||[]};
  return out}
let PUBLISHED=null,CFG=clone(DEFAULT_CFG);
try{const c=localStorage.getItem('vw-cfg');if(c){PUBLISHED=JSON.parse(c);CFG=mergeCfg(DEFAULT_CFG,PUBLISHED)}}catch(e){}
const EMAILF=()=>CFG.contact.email;
const mailto=(subj,body='')=>`mailto:${encodeURIComponent(EMAILF()).replace('%40','@')}?subject=${encodeURIComponent(subj)}${body?'&body='+encodeURIComponent(body):''}`;
