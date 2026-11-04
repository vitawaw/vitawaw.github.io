/* VITAWAW · js/lists.js
   Interactions tab (filters + search incl. Arabic drug names), sources tab, roadmap ('coming next') and contact links.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== interactions & sources ===================== */
let IF='all',SF='all',RTF='all',ISRC=null; // ISRC: show only the interactions that cite this source (from the sources page)
const BUILTIN=['d','b12','fol','fe','ca','mg','c','zn','preg','inf','vac','bar','thi'];
let KEYS=['all',...BUILTIN],INTER=[],REFGROUP={},CUST={};
const tx2=o=>o?(LANG==='ar'?o.ar:(o.en||o.ar)):'';
const kname=k=>k==='all'?T('all'):CUST[k]?tx2(CUST[k].n):T('n_'+k);
const DRUG_AR={"رالتيغرافير": "raltegravir", "رالتغرافير": "raltegravir", "ايزنتريس": "raltegravir", "سيفدينير": "cefdinir", "اومنيسيف": "cefdinir", "مايكوفينولات": "mycophenolate", "ميكوفينولات": "mycophenolate", "سيلسبت": "mycophenolate", "انتاكابون": "entacapone", "إنتاكابون": "entacapone", "كومتان": "entacapone", "ايزوتريتينوين": "isotretinoin", "روكتان": "isotretinoin", "التروموباج": "eltrombopag", "ايلتروموباج": "eltrombopag", "بروماكتا": "eltrombopag", "ريفوليد": "eltrombopag", "بالوكسافير": "baloxavir", "زوفلوزا": "baloxavir", "اكزوفلوزا": "baloxavir", "جابابنتين": "gabapentin", "غابابنتين": "gabapentin", "نيورونتين": "gabapentin", "بكتيغرافير": "bictegravir", "بيكتيغرافير": "bictegravir", "بكتارفي": "biktarvy", "بيكتارفي": "biktarvy", "وارفارين": "warfarin", "ليفوثيروكسين": "levothyroxine", "ثيروكسين": "levothyroxine", "ميتفورمين": "metformin", "ميثوتريكسات": "methotrexate", "اورليستات": "orlistat", "بنسيلامين": "penicillamine", "سيمفاستاتين": "simvastatin", "ثيوفيلين": "theophylline", "ليفودوبا": "levodopa", "ليثيوم": "lithium", "دولوتغرافير": "dolutegravir", "دولوتجرافير": "dolutegravir", "سيسبلاتين": "cisplatin", "فلورويوراسيل": "fluorouracil", "ايزونيازيد": "isoniazid", "سيكلوسيرين": "cycloserine", "فوروسيمايد": "furosemide", "فيوروسمايد": "furosemide", "لازكس": "furosemide", "كوليسترامين": "cholestyramine", "اليندرونات": "alendronate", "سيبروفلوكساسين": "ciprofloxacin", "موكسيفلوكساسين": "moxifloxacin", "اوميبرازول": "omeprazole", "لانسوبرازول": "lansoprazole", "سبيرونولاكتون": "spironolactone", "اميلورايد": "amiloride", "لوسارتان": "losartan", "بينازيبريل": "benazepril", "ليسينوبريل": "lisinopril", "فوسينوبريل": "fosinopril", "كاربامازيبين": "carbamazepine", "فينيتوين": "phenytoin", "فينوباربيتال": "phenobarbital", "بريميدون": "primidone", "فالبروات": "valproate", "ديباكين": "valproate", "ميثيمازول": "methimazole", "سلفاسالازين": "sulfasalazine", "بيرازيناميد": "pyrazinamide", "اسيتريتين": "acitretin", "بيكساروتين": "bexarotene", "بيوميتانيد": "bumetanide", "ميتولازون": "metolazone", "كلوروثيازيد": "chlorothiazide", "تتراسايكلين": "tetracycline", "تتراسيكلين": "tetracycline", "سيفالوسبورين": "cephalosporin", "ستيرويد": "glucocorticoid", "كورتيزون": "glucocorticoid", "بريدنيزولون": "glucocorticoid", "اسبرين": "antiplatelet", "كلوبيدوغريل": "antiplatelet", "تروبونين": "troponin", "نياسين": "niacin", "كوليستيبول": "colestipol", "دوكسيسايكلين": "doxycycline", "دوكسيسيكلين": "doxycycline", "ليفوفلوكساسين": "levofloxacin", "ريسيدرونات": "risedronate", "ريزيدرونات": "risedronate", "فوساماكس": "alendronate", "يوثيروكس": "levothyroxine", "التروكسين": "levothyroxine", "دولوتيغرافير": "dolutegravir", "تيفيكاي": "dolutegravir", "انسولين": "insulin", "ثيازيد": "thiazide", "هيدروكلوروثيازيد": "thiazide", "مضاد حموضه": "antacid", "مضادات الحموضه": "antacid", "بانتوبرازول": "proton pump", "ايزوميبرازول": "proton pump", "نيكسيوم": "proton pump", "سيفوبيرازون": "cefoperazone", "كيموثيرابي": "chemotherapy", "علاج كيميائي": "chemotherapy", "رانيتيدين": "h2 blocker", "فاموتيدين": "h2 blocker", "كابتوبريل": "ace inhibitor", "اينالابريل": "ace inhibitor", "ريفاروكسابان": "anticoagulant", "ابيكسابان": "anticoagulant", "انوكسابارين": "anticoagulant", "هيبارين": "anticoagulant"};
/** English names of medicines whose interactions are listed under their class */
const DRUG_CLASS={levofloxacin:'quinolone',ofloxacin:'quinolone',norfloxacin:'quinolone',minocycline:'tetracycline',ibandronate:'bisphosphonate'};
const iTerms=q=>{if(!q)return[];const t=[q];if(q.length>=3){for(const m of medBase())for(const a of m.ar)if(normAr(a).includes(q))t.push(m.en);for(const[a,e]of Object.entries(DRUG_CLASS))if(a.includes(q)||q.includes(a))t.push(e)}return t};
function renderInter(){
  $('filters').innerHTML=(ISRC&&REFS[ISRC]?`<button type="button" class="srcf" data-clrsrc="1" aria-pressed="true">${T('su_src').replace('{n}',ISRC)} ×</button>`:'')+KEYS.filter(k=>k==='all'||INTER.some(x=>x[0]===k)).map(k=>`<button data-f="${esc(k)}" aria-pressed="${!ISRC&&k===IF}">${esc(kname(k))}<bdi class="fc">${INTER.filter(x=>k==='all'||x[0]===k).length}</bdi></button>`).join('');
  if(IF!=='all'&&!INTER.some(x=>x[0]===IF))IF='all';
  const onMeds=typeof cur!=='undefined'&&cur==='meds'; // «my medicines» page: only the medicines decide (no supplement chip, search or source filter)
  const iq=onMeds?[]:iTerms(normAr($('isearch')&&$('isearch').value)),mine=onMeds&&MEDS.length?medMatch:null,im=x=>{if(onMeds)return !!mine&&mine(x);if(ISRC&&!x[4].includes(ISRC))return false;if(!ISRC&&!(IF==='all'||x[0]===IF))return false;if(mine&&!mine(x))return false;if(!iq.length)return true;const h=normAr([x[1][0],x[1][1],x[2][0],x[2][1],x[3][0],x[3][1]].join(' '));return iq.some(q=>h.includes(q))};
  renderMeds();
  const ish=INTER.filter(im);
  const card=x=>`<div class="icard sevb-${x[6]}${x[7]?'':' pending'}${x[8]?' hid':''}" data-sid="${x[5]}"><div class="who"><span class="sev sev-${x[6]}">${T('sev_'+x[6])}</span>${esc(L(x[1][0],x[1][1]))} <em>+ ${esc(L(x[2][0],x[2][1]))}</em></div><div class="what">${esc(L(x[3][0],x[3][1]))}${R(x[4])}</div>${stampHTML(x[10],x[11])}${icActs(x)}${actBar('i',x[5],{rv:x[7],hidden:x[8],drag:true})}</div>`,bySev=(a,b)=>SEVORD[a[6]]-SEVORD[b[6]];
  // 1.14.6: one list of cards like the sources page (the supplement chips at the top filter it)
  const body='<div class="cgrid">'+ish.sort(bySev).map(card).join('')+'</div>';
  $('ilist').innerHTML=(ish.length?'':`<p class="inone">${T(onMeds&&!MEDS.length?'mp_none':'i_none')}</p>`)+bulkBar('i',ish.filter(x=>!x[7]).length)+body;
  $('icount').textContent=INTER.length;
  // owner: drag ⋮⋮ to change the order of interactions (dangerous ones always stay first: the order counts inside each severity)
  sortable($('ilist'),'.icard',(ids,it)=>{if(!ISOWNER()||!Array.isArray(CFG.inter))return;
    if(it&&it.parentNode){const g=new Set([...it.parentNode.querySelectorAll('.icard')].map(x=>x.dataset.sid));ids=ids.filter(x=>g.has(x))} // only the dragged card's group moves
    const idx=ids.map(Number),slots=[...idx].sort((a,b)=>a-b),old=CFG.inter.slice();
    slots.forEach((s,n)=>{CFG.inter[s]=old[idx[n]]});changed()});
}
/** buttons on an interaction card: open the supplement's calculator; arrange both in the daily schedule when the schedule knows them */
function icActs(x){
  const calc=!!document.querySelector(`#picker button[data-k="${CSS.escape(x[0])}"]:not([hidden])`);
  const sch=schPair(x);
  return calc||sch?`<div class="iact">${calc?`<button class="btn" type="button" data-gocalc="${esc(x[0])}">${T('ic_calc')}</button>`:''}${sch?`<button class="btn" type="button" data-gosch="${esc(sch.join(','))}">${T('ic_sch')}</button>`:''}</div>`:'';
}
/** the two schedule items of an interaction: its timing (x[9].d), or the medicine recognised in its text */
function schPair(x){
  const ids=SCI.map(s=>s[0]);if(!ids.includes(x[0]))return null;
  const d=x[9]&&ids.includes(x[9].d)?x[9].d:medSch(x[2][0]+' '+x[2][1]);
  return d&&d!==x[0]?[x[0],d]:null;
}
/* ===================== my medicines (interactions page) =====================
   The visitor lists the medicines they take; the page then shows only the interactions that concern them, and can send
   them to the daily schedule. The list stays on this device only (localStorage), like the other preferences. */
let MEDS=[];try{MEDS=JSON.parse(localStorage.getItem('vw-meds')||'[]').filter(x=>typeof x==='string').slice(0,20)}catch(e){}
const MEDSCH={levo:['levothyroxine','ليفوثيروكسين','ثيروكسين','يوثيروكس','التروكسين','euthyrox','eltroxin','synthroid'],bis:['alendronate','risedronate','bisphosphonate','اليندرونات','ريسيدرونات','فوساماكس','بايفوسفونيت'],
 abx:['ciprofloxacin','levofloxacin','moxifloxacin','doxycycline','tetracycline','quinolone','سيبرو','ليفوفلوكساسين','موكسيفلوكساسين','دوكسي','تتراسيكلين','تتراسايكلين','كينولون'],dtg:['dolutegravir','tivicay','دولوتغرافير','دولوتجرافير','دولوتيغرافير'],
 bik:['bictegravir','biktarvy','بكتيغرافير','بيكتيغرافير','بكتارفي','بيكتارفي'],elt:['eltrombopag','promacta','revolade','التروموباج','ايلتروموباج','بروماكتا','ريفوليد'],gaba:['gabapentin','neurontin','جابابنتين','غابابنتين','نيورونتين'],
 cef:['cefdinir','omnicef','سيفدينير','اومنيسيف'],mmf:['mycophenolate','cellcept','mycophenolic','مايكوفينولات','ميكوفينولات','سيلسبت'],pen:['penicillamine','cuprimine','depen','بنسيلامين','بنيسيلامين']};
/** the schedule item of a medicine name (Arabic or English), or null */
const medSch=t=>{const h=normAr(t);for(const [id,words] of Object.entries(MEDSCH))if(words.some(w=>h.includes(normAr(w))))return id;return null};
const medMatch=x=>{const h=normAr([x[2][0],x[2][1],x[3][0],x[3][1]].join(' '));return MEDS.some(m=>iTerms(normAr(m)).some(q=>h.includes(q)))};
/** the medicines the site knows (Arabic and English names of every drug in DRUG_AR that appears in a published interaction):
    the visitor picks from these suggestions instead of having to spell the name exactly */
const MEDSKIP=['troponin'];
/** the list of medicines (1.13.0: the team edits it on «My medicines»; CFG.medcat replaces the built-in list once saved) */
function medBase(){
  if(Array.isArray(CFG.medcat))return CFG.medcat;
  const by={};
  Object.entries(DRUG_AR).forEach(([ar,en])=>{if(MEDSKIP.includes(en))return;(by[en]=by[en]||{en,ar:[],hide:false}).ar.push(ar)});
  return Object.values(by);
}
const liveInter=()=>INTER.filter(x=>x[7]&&!x[8]).map(x=>normAr([x[2][0],x[2][1],x[3][0],x[3][1]].join(' ')));
/** how many published interactions name this medicine (English name or its group) */
const medHits=en=>{const terms=[en,...Object.entries(DRUG_CLASS).filter(([a])=>a===en).map(([,c])=>c)];return liveInter().filter(h=>terms.some(t=>h.includes(t))).length};
function medCatalog(){
  const live=liveInter();
  return medBase().filter(m=>!m.hide&&m.ar.length&&live.some(h=>h.includes(m.en)||(DRUG_CLASS[m.en]&&h.includes(DRUG_CLASS[m.en]))));
}
/* «My medicines» page: every medicine the site knows; tap to add it to your list. The team edits (✎) or adds (+). */
let MCQ='',MCSORT='';
/** 1.16.0: the medicines in alphabetical order — Arabic (أ–ي) or English (A–Z), with a letter heading over each group */
const mcSort=()=>MCSORT||(LANG==='ar'?'ar':'en');
const mcName=(m,k)=>k==='ar'?(m.ar[0]||m.en):m.en;
const mcLetter=(m,k)=>{const c=mcName(m,k).trim().charAt(0);return k==='ar'?c.replace(/[إأآا]/,'ا'):c.toUpperCase()};
function renderMedCat(){
  const el=$('medcat');if(!el)return;
  const team=typeof CAN==='function'&&CAN('inter')&&!(typeof OWN!=='undefined'&&OWN.preview),q=normAr(MCQ),k=mcSort();
  const list=medBase().map((m,i)=>({...m,i})).filter(m=>(team||(!m.hide&&medHits(m.en)))&&(!q||normAr(m.en+' '+m.ar.join(' ')).includes(q)))
    .sort((a,b)=>mcName(a,k).localeCompare(mcName(b,k),k==='ar'?'ar':'en'));
  let last='',rows='';
  list.forEach(m=>{const n=medHits(m.en),on=MEDS.includes(m.en),l=mcLetter(m,k);
    if(l!==last){rows+=`<h4 class="mclet" dir="${k==='ar'?'rtl':'ltr'}">${esc(l)}</h4>`;last=l}
    const nm=k==='ar'?`${m.ar[0]||m.en} · ${m.en.charAt(0).toUpperCase()+m.en.slice(1)}`:`${m.en.charAt(0).toUpperCase()+m.en.slice(1)} · ${m.ar[0]||''}`;
    rows+=`<div class="mcrow${m.hide?' hid':''}"><button type="button" class="mcadd" data-mcadd="${esc(m.en)}"${on||m.hide||!n?' disabled':''}><b dir="auto">${esc(nm)}</b><small>${on?T('mc_in'):n?T('mc_n').replace('{n}',n):T('mc_none')}</small></button>${team&&EDITING()?EPEN(`data-mcedit="${m.i}"`):''}</div>`});
  el.innerHTML=`<div class="filters mcsort" role="group" aria-label="${esc(T('mc_sort'))}"><span class="hint">${esc(T('mc_sort'))}</span>${[['ar','أ – ي'],['en','A – Z']].map(([v,l])=>`<button type="button" data-mcsort="${v}" aria-pressed="${k===v}">${l}</button>`).join('')}</div>`+
    (list.length?`<div class="mclist">${rows}</div>`:`<p class="hint">${T('mc_empty')}</p>`);
  const aw=$('mcaddw');if(aw)aw.innerHTML=team?`<button class="oadd otop" type="button" data-mcedit="new">${PLUS}${T('mc_new')}</button>`:'';
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mcsort]');if(!b)return;e.preventDefault();MCSORT=b.dataset.mcsort;renderMedCat()});
async function editMed(i){
  const base=JSON.parse(JSON.stringify(medBase())),m=i==='new'?{en:'',ar:[],hide:false}:base[+i];if(!m)return;
  let err=null,vals=[m.en,m.ar.join('، ')];
  for(;;){
    const r=await dialog({title:i==='new'?T('mc_new'):T('mc_edit'),info:T('mc_info'),err,fields:[{label:T('mc_en'),value:vals[0],ltr:1},{label:T('mc_ar'),value:vals[1]}],
      buttons:[...(i==='new'?[]:[{label:T(m.hide?'mc_show':'mc_hide'),action:'hide',danger:!m.hide}]),{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action==='cancel')return;
    if(r.action==='hide'){m.hide=!m.hide;break}
    vals=r.values;const en=vals[0].trim().toLowerCase(),ar=vals[1].split(/[،,]/).map(x=>x.trim()).filter(Boolean);
    if(!/^[a-z0-9][a-z0-9 -]{1,40}$/.test(en)){err={i:0,msg:T('mc_bad_en')};continue}
    if(base.some((x,j)=>x.en===en&&String(j)!==String(i))){err={i:0,msg:T('mc_dup')};continue}
    if(!ar.length){err={i:1,msg:T('mc_bad_ar')};continue}
    m.en=en;m.ar=ar;break;
  }
  if(i==='new')base.push(m);
  CFG.medcat=base;changed();renderMedCat();renderInter();
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-mcadd]');if(a){addMed(a.dataset.mcadd);renderMedCat();return}
  const ed=e.target.closest('[data-mcedit]');if(ed){e.preventDefault();editMed(ed.dataset.mcedit)}
});
const medLabel=m=>{const en=m.en.charAt(0).toUpperCase()+m.en.slice(1);return LANG==='ar'?`${m.ar[0]} · ${en}`:`${en} · ${m.ar[0]}`};
/** suggestions for what was typed (any spelling of the Arabic name, or the English name) */
function medSuggest(q){
  q=normAr(q);if(q.length<2)return[];
  return medCatalog().filter(m=>!MEDS.includes(m.en)&&(m.en.includes(q)||m.ar.some(a=>normAr(a).includes(q)))).slice(0,8);
}
function renderSug(){
  const box=$('medsug'),list=medSuggest($('medin').value),typed=normAr($('medin').value).length>=2;
  box.hidden=!typed;$('medin').setAttribute('aria-expanded',String(typed&&!!list.length));
  box.innerHTML=list.length?list.map(m=>`<button type="button" role="option" data-addmed="${esc(m.en)}">${esc(medLabel(m))}</button>`).join(''):`<p class="hint">${T('mm_nomatch')}</p>`;
}
function addMed(en){if(en&&!MEDS.includes(en)&&MEDS.length<20){MEDS.push(en);saveMeds()}$('medin').value='';renderSug();renderInter();renderMedCat()}
function saveMeds(){try{localStorage.setItem('vw-meds',JSON.stringify(MEDS))}catch(e){}}
function renderMeds(){
  const el=$('medchips');if(!el)return;
  const hits=MEDS.length?INTER.filter(x=>x[7]&&!x[8]&&medMatch(x)):[];
  const ids=[...new Set([...MEDS.map(medSch).filter(Boolean),...hits.map(x=>x[0]).filter(k=>SCI.some(s=>s[0]===k))])];
  const cat=Object.fromEntries(medCatalog().map(m=>[m.en,m]));
  el.innerHTML=MEDS.map((m,i)=>`<span class="mchip">${esc(cat[m]?medLabel(cat[m]):m)}<button type="button" data-delmed="${i}" aria-label="${esc(T('o_del'))}">×</button></span>`).join('')+
    (MEDS.length?`<span class="mmsum">${hits.length?T('mm_n').replace('{n}',hits.length):T('mm_none')}</span>`+(ids.length>1?`<button class="btn" type="button" data-gosch="${esc(ids.join(','))}">${T('ic_sch')}</button>`:''):'');
}
const IC={
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
 chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
 plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
 pill:'<rect x="6" y="7" width="12" height="14" rx="2"/><path d="M7.5 3h9v4h-9zM12 11v6M9 14h6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
 cam:'<path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
 baby:'<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>'};
/** footer: the app logo and (when set) the company logo, side by side in circles; both open the company site if set */
function renderBrand(){
  const el=$('flogos');if(!el)return;const b=CFG.brand||{};
  const pic=(src,alt,fallback)=>src?`<img src="${esc(src)}" alt="${esc(alt)}">`:fallback;
  const circ=(x,cls)=>b.url?`<a class="fl ${cls}" href="${esc(b.url)}" target="_blank" rel="noopener" title="${esc(b.url)}">${x}</a>`:`<span class="fl ${cls}">${x}</span>`;
  el.innerHTML=circ(pic(b.l1,'VITAWAW',`<svg viewBox="4 10 56 52" aria-hidden="true">${MARKSVG}</svg>`),'c1')+(b.l2?circ(pic(b.l2,T('br_l2'),''),'c2'):'');
}
function renderContact(){
  renderBrand();
  const E=CFG.contact.email,P=(CFG.contact.phone||'').trim();
  const subj='VITAWAW – '+L('اقتراح','Suggestion');
  $('mail1').textContent=E;$('mailrow').hidden=!E;$('mailh').hidden=!E;
  $('mailgo').href=E?mailto(subj):'';
  $('vno').textContent=T('vno')+' '+APP_VERSION;
  $('phonerow').hidden=!P;$('phone1').textContent=P;
  $('wago').href=waLink(subj);$('callgo').href='tel:'+P.replace(/[^+\d]/g,'');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-copymail]');if(!b)return;
  const done=()=>{b.textContent=T('cpd');setTimeout(()=>b.textContent=T('cpm'),1600)};
  try{navigator.clipboard.writeText(EMAILF()).then(done).catch(()=>fallback(EMAILF(),done))}catch(err){fallback(EMAILF(),done)}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-copyphone]');if(!b)return;const P=CFG.contact.phone;
  const done=()=>{b.textContent=T('cpd');setTimeout(()=>b.textContent=T('cpp'),1600)};
  try{navigator.clipboard.writeText(P).then(done).catch(()=>fallback(P,done))}catch(err){fallback(P,done)}});
/** «جرّبه» on a feature that is available now: where each feature lives */
const GO={sch:()=>openTool('sch'),meds:()=>{go('meds');setTimeout(()=>$('medin')&&$('medin').focus(),80)},preg:()=>openNut('preg'),bar:()=>openNut('bar'),thi:()=>openNut('thi'),
  labs:()=>openTool('labs'),report:()=>go('calc'),sources:()=>go('sources'),search:()=>openSearch(),calc:()=>go('calc'),tools:()=>go('tools')};
const GOLIST=()=>[['',T('rm_go_none')],['sch',T('tl_sch')],['meds',T('mm_t')],['preg',T('n_preg')],['bar',T('n_bar')],['thi',T('n_thi')],['labs',T('lb_t')],['report',T('rp_t')],['search',T('gs_t')],['calc',T('tab_calc')],['tools',T('tab_tools')],['sources',T('tab_src')]];
let RMF='all'; // roadmap filter: all | now | dev | plan | idea
/* 1.16.0: «coming next» laid out like the interactions: status chips with counts at the top, then one card per line,
   sorted by status (available now → in development → planned → idea) as interactions are by severity; the owner's
   order counts inside each status. */
const RMORD={now:0,dev:1,plan:2,idea:3};
function renderRoadmap(){
  const st=k=>`<span class="st st-${esc(k)}">${esc(T('st_'+k))}</span>`,tx=o=>LANG==='ar'?o.ar:(o.en||o.ar);
  const vis=CFG.roadmap.map((x,i)=>[x,i]).filter(([x])=>!x.hidden||SHOWALL());
  $('rmlegend').innerHTML=['all','now','dev','plan','idea'].map(k=>`<button type="button" data-rmf="${k}" aria-pressed="${k===RMF}">${esc(T(k==='all'?'all':'st_'+k))}<bdi class="fc">${vis.filter(([x])=>k==='all'||x.st===k).length}</bdi></button>`).join('');
  const list=vis.filter(([x])=>RMF==='all'||x.st===RMF).sort((a,b)=>(RMORD[a[0].st]??9)-(RMORD[b[0].st]??9)||a[1]-b[1]);
  $('rmgrid').innerHTML=list.map(([x,i])=>`<div class="rm rmst-${esc(x.st)}${x.hidden?' hid':''}" data-sid="${i}"><div class="rmh">${st(x.st)}<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${IC[x.ic]||IC.plus}</svg></div><h3>${esc(tx(x.t))}</h3></div><p>${esc(tx(x.d))}</p>${x.st==='now'&&GO[x.go]?`<div class="rmf"><button class="btn pri rmgo" type="button" data-rmgo="${esc(x.go)}">${T('rm_try')}</button></div>`:''}<div class="rmact">${actBtns('m',i,{hidden:!!x.hidden,drag:true})}</div></div>`).join('')||`<p class="inone">${T('i_none')}</p>`;
  $('rmaddw').innerHTML=`<button class="oadd otop" type="button" id="rmadd">${PLUS}${T('o_add')}</button>`;
  sortable($('rmgrid'),'.rm',ids=>{if(!ISOWNER())return;const keep=CFG.roadmap.filter((_,n)=>!ids.includes(String(n)));CFG.roadmap=[...ids.map(n=>CFG.roadmap[+n]),...keep];changed()});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rmf]');if(!b)return;RMF=b.dataset.rmf;renderRoadmap()});
/* Source type from the organisation name, used to order the list (strongest first) and label it. */
const REFTYPES=[[/Society|NICE|Academy of Pediatrics|WHO|World Health/i,'g'],[/NIH|National Institutes|BNF|National Formulary|Specialist Pharmacy/i,'o'],
  [/SmPC|label|Medsafe|data sheet|Food and Drug|FDA/i,'d'],[/Cochrane|Lancet|BMJ|Journal|J Clin/i,'s'],[/Medscape|StatPearls|MSD|Manual/i,'c']];
const RTORD={g:0,o:1,d:2,s:3,c:4,x:5};
const refType=org=>{for(const[re,t]of REFTYPES)if(re.test(org||''))return t;return 'x'};
/** the type chosen in the source dialog, or guessed from the organisation */
const rtOf=x=>RTORD[x[7]]!=null?x[7]:refType(x[0]);
/** under each source: where it is used (calculators, interactions) and when it was last reviewed (approved) */
function usedIn(n,x){
  const calcs=KEYS.slice(1).filter(k=>BUILTIN.includes(k)?(DEF_REFGROUP[k]||[]).includes(n):CUST[k]&&(CUST[k].r||[]).includes(n));
  const ni=INTER.filter(i=>i[7]&&!i[8]&&i[4].includes(n)).length,at=/^\d{4}-\d{2}/.test(x[8]||'')?x[8].slice(0,7):'';
  if(!calcs.length&&!ni&&!at)return '';
  return `<div class="used">${calcs.length||ni?`<span>${T('su_in')}</span>`:''}${calcs.map(k=>`<button type="button" data-gocalc="${esc(k)}">${esc(kname(k))}</button>`).join('')}${ni?`<button type="button" data-isrc="${n}">${T('su_int').replace('{n}',ni)}</button>`:''}${at?`<small>${T('su_at')} <bdi>${at}</bdi></small>`:''}</div>`;
}
function renderRefs(){
  // 1.14.1: one full list. Above the search: source types; below it: vitamins (like interactions). Counts follow the other filter + search.
  if(!KEYS.includes(SF))SF='all';
  const onLk=$('reflist').parentNode.id==='linksb'&&typeof lkShow==='function',lk=onLk?lkShow():null; // 1.14.6: the link filter only on its own page
  const sq=iTerms(normAr($('ssearch')&&$('ssearch').value)),sm=([n,x])=>!sq.length||sq.some(q=>normAr([n,x[0],x[1],x[3],x[4]].join(' ')).includes(q));
  const base=Object.entries(REFS).filter(sm),inV=(n,k)=>k==='all'||(REFGROUP[k]||[]).includes(+n),inT=(x,k)=>k==='all'||rtOf(x)===k;
  const tc=k=>base.filter(([n,x])=>inV(n,SF)&&inT(x,k)).length,vc=k=>base.filter(([n,x])=>inT(x,RTF)&&inV(n,k)).length;
  const tks=['all',...Object.keys(RTORD).filter(k=>Object.values(REFS).some(x=>rtOf(x)===k))];
  if(!tks.includes(RTF))RTF='all';
  $('rtfilters').innerHTML=tks.map(k=>`<button type="button" data-rtf="${k}" aria-pressed="${k===RTF}">${esc(T(k==='all'?'all':'rtp_'+k))}<bdi class="fc">${tc(k)}</bdi></button>`).join('');
  $('sfilters').innerHTML=KEYS.map(k=>`<button type="button" data-sf="${esc(k)}" aria-pressed="${k===SF}">${esc(kname(k))}<bdi class="fc">${vc(k)}</bdi></button>`).join('');
  $('refbulk').innerHTML=SHOWALL()?bulkBar('r',(CFG.refs||[]).filter(x=>x.rv===false).length):'';
  $('reflist').innerHTML=base.sort((a,b)=>RTORD[rtOf(a[1])]-RTORD[rtOf(b[1])]||a[0]-b[0]).filter(([n,x])=>lk?lk.includes(+n):inT(x,RTF)&&inV(n,SF)).map(([n,x])=>
    `<li id="ref-${n}"${x[6]?' class="hid"':''}><span class="num">${n}</span><div><div class="org"><span class="rtype rt-${rtOf(x)}">${T('rt_'+rtOf(x))}</span>${esc(x[0])}${(LANG==='ar'?x[3]:x[4])?' · '+esc(LANG==='ar'?x[3]:x[4]):''}</div><div class="ttl" dir="auto">${/^https?:\/\//.test(x[2]||'')?`<a href="${esc(x[2])}" target="_blank" rel="noopener">${esc(x[1])}</a>`:esc(x[1])}</div>${onLk?lkBadge(+n,x):''}${stampHTML(x[9],x[10])}${usedIn(+n,x)}${actBar('r',n,{rv:x[5]!==false,hidden:x[6]})}</div></li>`).join('');
  $('rcount').textContent=Object.keys(REFS).length;
  if(typeof renderLinks==='function')renderLinks();
  $('rev2').hidden=!REV().name;if(REV().name)$('rev2').innerHTML=reviewHTML0().replace(/^<div class="reviewed">|<\/div>$/g,'');
}

/* tap a card (interaction, source, coming next): the whole card in a floating window */
document.addEventListener('click',e=>{
  if(e.target.closest('button,a,input,select,label,summary,.drag'))return;
  const c=e.target.closest('#ilist .icard,#reflist>li,#rmgrid .rm');if(!c||c.closest('#sheet'))return;
  const t=c.matches('.icard')?c.querySelector('.who').textContent:c.matches('.rm')?c.querySelector('h3').textContent:(c.querySelector('.org')||c).textContent;
  openSheet(t.trim(),`<div class="cardfull ${c.className}">${c.innerHTML}</div>`,{key:'card'});
});
// a button or link inside an opened card does its job and the window closes (e.g. «used in» → the calculator)
document.addEventListener('click',e=>{if(e.target.closest('#sheet-b .cardfull')&&e.target.closest('button,a'))setTimeout(()=>{if(SHEET&&SHEET.key==='card')closeSheet(false)},0)});

