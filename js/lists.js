/* VITAWAW · js/lists.js
   Interactions tab (filters + search incl. Arabic drug names), sources tab, roadmap ('coming next') and contact links.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== interactions & sources ===================== */
let IF='all',SF='all',ISRC=null; // ISRC: show only the interactions that cite this source (from the sources page)
const BUILTIN=['d','b12','fol','fe','ca','mg','c','zn','preg','inf','vac'];
let KEYS=['all',...BUILTIN],INTER=[],REFGROUP={},CUST={};
const tx2=o=>o?(LANG==='ar'?o.ar:(o.en||o.ar)):'';
const kname=k=>k==='all'?T('all'):CUST[k]?tx2(CUST[k].n):T('n_'+k);
const DRUG_AR={"وارفارين": "warfarin", "ليفوثيروكسين": "levothyroxine", "ثيروكسين": "levothyroxine", "ميتفورمين": "metformin", "ميثوتريكسات": "methotrexate", "اورليستات": "orlistat", "بنسيلامين": "penicillamine", "سيمفاستاتين": "simvastatin", "ثيوفيلين": "theophylline", "ليفودوبا": "levodopa", "ليثيوم": "lithium", "دولوتغرافير": "dolutegravir", "دولوتجرافير": "dolutegravir", "سيسبلاتين": "cisplatin", "فلورويوراسيل": "fluorouracil", "ايزونيازيد": "isoniazid", "سيكلوسيرين": "cycloserine", "فوروسيمايد": "furosemide", "فيوروسمايد": "furosemide", "لازكس": "furosemide", "كوليسترامين": "cholestyramine", "اليندرونات": "alendronate", "سيبروفلوكساسين": "ciprofloxacin", "موكسيفلوكساسين": "moxifloxacin", "اوميبرازول": "omeprazole", "لانسوبرازول": "lansoprazole", "سبيرونولاكتون": "spironolactone", "اميلورايد": "amiloride", "لوسارتان": "losartan", "بينازيبريل": "benazepril", "ليسينوبريل": "lisinopril", "فوسينوبريل": "fosinopril", "كاربامازيبين": "carbamazepine", "فينيتوين": "phenytoin", "فينوباربيتال": "phenobarbital", "بريميدون": "primidone", "فالبروات": "valproate", "ديباكين": "valproate", "ميثيمازول": "methimazole", "سلفاسالازين": "sulfasalazine", "بيرازيناميد": "pyrazinamide", "اسيتريتين": "acitretin", "بيكساروتين": "bexarotene", "بيوميتانيد": "bumetanide", "ميتولازون": "metolazone", "كلوروثيازيد": "chlorothiazide", "تتراسايكلين": "tetracycline", "تتراسيكلين": "tetracycline", "سيفالوسبورين": "cephalosporin", "ستيرويد": "glucocorticoid", "كورتيزون": "glucocorticoid", "بريدنيزولون": "glucocorticoid", "اسبرين": "antiplatelet", "كلوبيدوغريل": "antiplatelet", "تروبونين": "troponin", "نياسين": "niacin", "كوليستيبول": "colestipol", "دوكسيسايكلين": "doxycycline", "دوكسيسيكلين": "doxycycline", "ليفوفلوكساسين": "levofloxacin", "ريسيدرونات": "risedronate", "ريزيدرونات": "risedronate", "فوساماكس": "alendronate", "يوثيروكس": "levothyroxine", "التروكسين": "levothyroxine", "دولوتيغرافير": "dolutegravir", "تيفيكاي": "dolutegravir", "انسولين": "insulin", "ثيازيد": "thiazide", "هيدروكلوروثيازيد": "thiazide", "مضاد حموضه": "antacid", "مضادات الحموضه": "antacid", "بانتوبرازول": "proton pump", "ايزوميبرازول": "proton pump", "نيكسيوم": "proton pump", "سيفوبيرازون": "cefoperazone", "كيموثيرابي": "chemotherapy", "علاج كيميائي": "chemotherapy", "رانيتيدين": "h2 blocker", "فاموتيدين": "h2 blocker", "كابتوبريل": "ace inhibitor", "اينالابريل": "ace inhibitor", "ريفاروكسابان": "anticoagulant", "ابيكسابان": "anticoagulant", "انوكسابارين": "anticoagulant", "هيبارين": "anticoagulant"};
const iTerms=q=>{if(!q)return[];const t=[q];if(q.length>=3)for(const[a,e]of Object.entries(DRUG_AR))if(normAr(a).includes(q))t.push(e);return t};
function renderInter(){
  $('filters').innerHTML=(ISRC&&REFS[ISRC]?`<button type="button" class="srcf" data-clrsrc="1" aria-pressed="true">${T('su_src').replace('{n}',ISRC)} ×</button>`:'')+KEYS.filter(k=>k==='all'||INTER.some(x=>x[0]===k)).map(k=>`<button data-f="${esc(k)}" aria-pressed="${!ISRC&&k===IF}">${esc(kname(k))}</button>`).join('');
  if(IF!=='all'&&!INTER.some(x=>x[0]===IF))IF='all';
  const iq=iTerms(normAr($('isearch')&&$('isearch').value)),mine=MEDS.length?medMatch:null,im=x=>{if(ISRC&&!x[4].includes(ISRC))return false;if(!ISRC&&!(IF==='all'||x[0]===IF))return false;if(mine&&!mine(x))return false;if(!iq.length)return true;const h=normAr([x[1][0],x[1][1],x[2][0],x[2][1],x[3][0],x[3][1]].join(' '));return iq.some(q=>h.includes(q))};
  renderMeds();
  const ish=INTER.filter(im);
  $('ilist').innerHTML=(ish.length?'':`<p class="inone">${T('i_none')}</p>`)+bulkBar('i',ish.filter(x=>!x[7]).length)+ish.sort((a,b)=>SEVORD[a[6]]-SEVORD[b[6]]).map(x=>`<div class="icard sevb-${x[6]}${x[7]?'':' pending'}${x[8]?' hid':''}" data-sid="${x[5]}"><div class="who"><span class="sev sev-${x[6]}">${T('sev_'+x[6])}</span>${esc(L(x[1][0],x[1][1]))} <em>+ ${esc(L(x[2][0],x[2][1]))}</em></div><div class="what">${esc(L(x[3][0],x[3][1]))}${R(x[4])}</div>${icActs(x)}${actBar('i',x[5],{rv:x[7],hidden:x[8],drag:true})}</div>`).join('')+`<button class="oadd" type="button" id="iadd">${PLUS}${T('o_iadd')}</button>`;
  $('icount').textContent=INTER.length;
  // owner: drag ⋮⋮ to change the order of interactions (dangerous ones always stay first: the order counts inside each severity)
  sortable($('ilist'),'.icard',ids=>{if(!ISOWNER()||!Array.isArray(CFG.inter))return;
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
 abx:['ciprofloxacin','levofloxacin','moxifloxacin','doxycycline','tetracycline','quinolone','سيبرو','ليفوفلوكساسين','موكسيفلوكساسين','دوكسي','تتراسيكلين','تتراسايكلين','كينولون'],dtg:['dolutegravir','tivicay','دولوتغرافير','دولوتجرافير','دولوتيغرافير']};
/** the schedule item of a medicine name (Arabic or English), or null */
const medSch=t=>{const h=normAr(t);for(const [id,words] of Object.entries(MEDSCH))if(words.some(w=>h.includes(normAr(w))))return id;return null};
const medMatch=x=>{const h=normAr([x[2][0],x[2][1],x[3][0],x[3][1]].join(' '));return MEDS.some(m=>iTerms(normAr(m)).some(q=>h.includes(q)))};
/** the medicines the site knows (Arabic and English names of every drug in DRUG_AR that appears in a published interaction):
    the visitor picks from these suggestions instead of having to spell the name exactly */
const MEDSKIP=['troponin'];
function medCatalog(){
  const by={};
  Object.entries(DRUG_AR).forEach(([ar,en])=>{if(MEDSKIP.includes(en))return;(by[en]=by[en]||{en,ar:[]}).ar.push(ar)});
  const live=INTER.filter(x=>x[7]&&!x[8]).map(x=>normAr([x[2][0],x[2][1],x[3][0],x[3][1]].join(' ')));
  return Object.values(by).filter(m=>live.some(h=>h.includes(m.en)));
}
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
function addMed(en){if(en&&!MEDS.includes(en)&&MEDS.length<20){MEDS.push(en);saveMeds()}$('medin').value='';renderSug();renderInter()}
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
 pill:'<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M8.6 7.2l6.8 9.6"/>',
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
const GO={sch:()=>openTool('sch'),meds:()=>{go('interactions');setTimeout(()=>$('medin')&&$('medin').focus(),80)},preg:()=>{K='preg';apply();go('calc')},
  labs:()=>openTool('labs'),report:()=>go('calc'),search:()=>openSearch(),calc:()=>go('calc'),tools:()=>go('tools')};
const GOLIST=()=>[['',T('rm_go_none')],['sch',T('tl_sch')],['meds',T('mm_t')],['preg',T('n_preg')],['labs',T('lb_t')],['report',T('rp_t')],['search',T('gs_t')],['calc',T('tab_calc')],['tools',T('tab_tools')]];
function renderRoadmap(){
  const st=k=>`<span class="st st-${esc(k)}">${esc(T('st_'+k))}</span>`;
  $('rmlegend').innerHTML=['now','dev','plan','idea'].map(st).join('');
  const tx=o=>LANG==='ar'?o.ar:(o.en||o.ar);
  $('rmgrid').innerHTML=CFG.roadmap.map((x,i)=>x.hidden&&!SHOWALL()?'':`<div class="rm${x.hidden?' hid':''}" data-sid="${i}"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${IC[x.ic]||IC.plus}</svg></div><h3>${esc(tx(x.t))}</h3><p>${esc(tx(x.d))}</p>${st(x.st)}${x.st==='now'&&GO[x.go]?`<button class="btn pri rmgo" type="button" data-rmgo="${esc(x.go)}">${T('rm_try')}</button>`:''}<div class="rmact">${DRAG(T('o_drag'))}${actBtns('m',i,{hidden:!!x.hidden})}</div></div>`).join('')+`<button class="oadd" type="button" id="rmadd"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>${T('o_add')}</button>`;
  sortable($('rmgrid'),'.rm',ids=>{if(!ISOWNER())return;CFG.roadmap=ids.map(n=>CFG.roadmap[+n]);changed()});
}
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
  $('sfilters').innerHTML=KEYS.map(k=>`<button data-sf="${esc(k)}" aria-pressed="${k===SF}">${esc(kname(k))}</button>`).join('');
  if(!KEYS.includes(SF))SF='all';
  const show=SF==='all'?null:REFGROUP[SF];
  $('reflist').innerHTML=(SHOWALL()?`<li class="oaddli">${bulkBar('r',(CFG.refs||[]).filter(x=>x.rv===false).length)}</li>`:'')+Object.entries(REFS).sort((a,b)=>RTORD[rtOf(a[1])]-RTORD[rtOf(b[1])]||a[0]-b[0]).filter(([n])=>!show||show.includes(+n)).map(([n,x])=>
    `<li id="ref-${n}"${x[6]?' class="hid"':''}><span class="num">${n}</span><div><div class="org"><span class="rtype rt-${rtOf(x)}">${T('rt_'+rtOf(x))}</span>${esc(x[0])}${(LANG==='ar'?x[3]:x[4])?' · '+esc(LANG==='ar'?x[3]:x[4]):''}</div><div class="ttl" dir="auto">${/^https?:\/\//.test(x[2]||'')?`<a href="${esc(x[2])}" target="_blank" rel="noopener">${esc(x[1])}</a>`:esc(x[1])}</div>${usedIn(+n,x)}${actBar('r',n,{rv:x[5]!==false,hidden:x[6]})}</div></li>`).join('')+`<li class="oaddli"><button class="oadd" type="button" id="radd">${PLUS}${T('o_radd')}</button></li>`;
  $('rcount').textContent=Object.keys(REFS).length;
  $('rev2').hidden=!REV().name;if(REV().name)$('rev2').innerHTML=reviewHTML().replace(/^<div class="reviewed">|<\/div>$/g,'');
}
