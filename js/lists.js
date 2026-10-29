/* VITAWAW · js/lists.js
   Interactions tab (filters + search incl. Arabic drug names), sources tab, roadmap ('coming next') and contact links.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== interactions & sources ===================== */
let IF='all',SF='all';
const BUILTIN=['d','b12','fol','fe','ca','mg','c','zn'];
let KEYS=['all',...BUILTIN],INTER=[],REFGROUP={},CUST={};
const tx2=o=>o?(LANG==='ar'?o.ar:(o.en||o.ar)):'';
const kname=k=>k==='all'?T('all'):CUST[k]?tx2(CUST[k].n):T('n_'+k);
const DRUG_AR={"وارفارين": "warfarin", "ليفوثيروكسين": "levothyroxine", "ثيروكسين": "levothyroxine", "ميتفورمين": "metformin", "ميثوتريكسات": "methotrexate", "اورليستات": "orlistat", "بنسيلامين": "penicillamine", "سيمفاستاتين": "simvastatin", "ثيوفيلين": "theophylline", "ليفودوبا": "levodopa", "ليثيوم": "lithium", "دولوتغرافير": "dolutegravir", "دولوتجرافير": "dolutegravir", "سيسبلاتين": "cisplatin", "فلورويوراسيل": "fluorouracil", "ايزونيازيد": "isoniazid", "سيكلوسيرين": "cycloserine", "فوروسيمايد": "furosemide", "فيوروسمايد": "furosemide", "لازكس": "furosemide", "كوليسترامين": "cholestyramine", "اليندرونات": "alendronate", "سيبروفلوكساسين": "ciprofloxacin", "موكسيفلوكساسين": "moxifloxacin", "اوميبرازول": "omeprazole", "لانسوبرازول": "lansoprazole", "سبيرونولاكتون": "spironolactone", "اميلورايد": "amiloride", "لوسارتان": "losartan", "بينازيبريل": "benazepril", "ليسينوبريل": "lisinopril", "فوسينوبريل": "fosinopril", "كاربامازيبين": "carbamazepine", "فينيتوين": "phenytoin", "فينوباربيتال": "phenobarbital", "بريميدون": "primidone", "فالبروات": "valproate", "ديباكين": "valproate", "ميثيمازول": "methimazole", "سلفاسالازين": "sulfasalazine", "بيرازيناميد": "pyrazinamide", "اسيتريتين": "acitretin", "بيكساروتين": "bexarotene", "بيوميتانيد": "bumetanide", "ميتولازون": "metolazone", "كلوروثيازيد": "chlorothiazide", "تتراسايكلين": "tetracycline", "تتراسيكلين": "tetracycline", "سيفالوسبورين": "cephalosporin", "ستيرويد": "glucocorticoid", "كورتيزون": "glucocorticoid", "بريدنيزولون": "glucocorticoid", "اسبرين": "antiplatelet", "كلوبيدوغريل": "antiplatelet", "تروبونين": "troponin", "نياسين": "niacin", "كوليستيبول": "colestipol"};
const iTerms=q=>{if(!q)return[];const t=[q];if(q.length>=3)for(const[a,e]of Object.entries(DRUG_AR))if(normAr(a).includes(q))t.push(e);return t};
function renderInter(){
  $('filters').innerHTML=KEYS.filter(k=>k==='all'||INTER.some(x=>x[0]===k)).map(k=>`<button data-f="${esc(k)}" aria-pressed="${k===IF}">${esc(kname(k))}</button>`).join('');
  if(IF!=='all'&&!INTER.some(x=>x[0]===IF))IF='all';
  const iq=iTerms(normAr($('isearch')&&$('isearch').value)),im=x=>{if(!(IF==='all'||x[0]===IF))return false;if(!iq.length)return true;const h=normAr([x[1][0],x[1][1],x[2][0],x[2][1],x[3][0],x[3][1]].join(' '));return iq.some(q=>h.includes(q))};
  const ish=INTER.filter(im);
  $('ilist').innerHTML=(ish.length?'':`<p class="inone">${T('i_none')}</p>`)+bulkBar('i',ish.filter(x=>!x[7]).length)+ish.sort((a,b)=>SEVORD[a[6]]-SEVORD[b[6]]).map(x=>`<div class="icard sevb-${x[6]}${x[7]?'':' pending'}${x[8]?' hid':''}"><div class="who"><span class="sev sev-${x[6]}">${T('sev_'+x[6])}</span>${esc(L(x[1][0],x[1][1]))} <em>+ ${esc(L(x[2][0],x[2][1]))}</em></div><div class="what">${esc(L(x[3][0],x[3][1]))}${R(x[4])}</div>${actBar('i',x[5],{rv:x[7],hidden:x[8]})}</div>`).join('')+`<button class="oadd" type="button" id="iadd">${PLUS}${T('o_iadd')}</button>`;
  $('icount').textContent=INTER.length;
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
function renderContact(){
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
function renderRoadmap(){
  const st=k=>`<span class="st st-${esc(k)}">${esc(T('st_'+k))}</span>`;
  $('rmlegend').innerHTML=['dev','plan','idea'].map(st).join('');
  const tx=o=>LANG==='ar'?o.ar:(o.en||o.ar);
  $('rmgrid').innerHTML=CFG.roadmap.map((x,i)=>x.hidden&&!SHOWALL()?'':`<div class="rm${x.hidden?' hid':''}"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${IC[x.ic]||IC.plus}</svg></div><h3>${esc(tx(x.t))}</h3><p>${esc(tx(x.d))}</p>${st(x.st)}<div class="rmact">${actBtns('m',i,{hidden:!!x.hidden})}<button class="btn" type="button" data-rmup="${i}" aria-label="${esc(T('o_up'))}">↑</button><button class="btn" type="button" data-rmdown="${i}" aria-label="${esc(T('o_down'))}">↓</button></div></div>`).join('')+`<button class="oadd" type="button" id="rmadd"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>${T('o_add')}</button>`;
}
/* Source type from the organisation name, used to order the list (strongest first) and label it. */
const REFTYPES=[[/Society|NICE|Academy of Pediatrics|WHO|World Health/i,'g'],[/NIH|National Institutes|BNF|National Formulary|Specialist Pharmacy/i,'o'],
  [/SmPC|label|Medsafe|data sheet|Food and Drug|FDA/i,'d'],[/Cochrane|Lancet|BMJ|Journal|J Clin/i,'s'],[/Medscape|StatPearls|MSD|Manual/i,'c']];
const RTORD={g:0,o:1,d:2,s:3,c:4,x:5};
const refType=org=>{for(const[re,t]of REFTYPES)if(re.test(org||''))return t;return 'x'};
/** the type chosen in the source dialog, or guessed from the organisation */
const rtOf=x=>RTORD[x[7]]!=null?x[7]:refType(x[0]);
function renderRefs(){
  $('sfilters').innerHTML=KEYS.map(k=>`<button data-sf="${esc(k)}" aria-pressed="${k===SF}">${esc(kname(k))}</button>`).join('');
  if(!KEYS.includes(SF))SF='all';
  const show=SF==='all'?null:REFGROUP[SF];
  $('reflist').innerHTML=(SHOWALL()?`<li class="oaddli">${bulkBar('r',(CFG.refs||[]).filter(x=>x.rv===false).length)}</li>`:'')+Object.entries(REFS).sort((a,b)=>RTORD[rtOf(a[1])]-RTORD[rtOf(b[1])]||a[0]-b[0]).filter(([n])=>!show||show.includes(+n)).map(([n,x])=>
    `<li id="ref-${n}"${x[6]?' class="hid"':''}><span class="num">${n}</span><div><div class="org"><span class="rtype rt-${rtOf(x)}">${T('rt_'+rtOf(x))}</span>${esc(x[0])}${(LANG==='ar'?x[3]:x[4])?' · '+esc(LANG==='ar'?x[3]:x[4]):''}</div><div class="ttl">${/^https?:\/\//.test(x[2]||'')?`<a href="${esc(x[2])}" target="_blank" rel="noopener">${esc(x[1])}</a>`:esc(x[1])}</div>${actBar('r',n,{rv:x[5]!==false,hidden:x[6]})}</div></li>`).join('')+`<li class="oaddli"><button class="oadd" type="button" id="radd">${PLUS}${T('o_radd')}</button></li>`;
  $('rcount').textContent=Object.keys(REFS).length;
  $('rev2').hidden=!REVIEW.name;if(REVIEW.name)$('rev2').innerHTML=reviewHTML().replace(/^<div class="reviewed">|<\/div>$/g,'');
}
