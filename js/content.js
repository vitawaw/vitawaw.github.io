/* VITAWAW · js/content.js
   Turns CFG (published or owner draft) into the lists the UI uses: REFS, INTER, KEYS, custom nutrients
   (buildData), the nutrient picker, the owner's nutrient admin and the generic table-based calculator (fCustom).
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== editable content (sources, interactions, custom nutrients) ===================== */
const defRefList=()=>Object.entries(DEF_REFS).map(([id,x])=>({id:+id,org:x[0],title:x[1],url:x[2],ar:x[3],en:x[4]}));
const DEF_SEV=['moderate','moderate','minor','moderate','moderate','moderate','moderate','moderate','minor','minor','moderate','moderate','moderate'];
const defInterList=()=>DEF_INTER.map((x,i)=>({k:x[0],a:{ar:x[1][0],en:x[1][1]},b:{ar:x[2][0],en:x[2][1]},d:{ar:x[3][0],en:x[3][1]},r:x[4].slice(),sev:DEF_SEV[i]||'moderate'}));
const SHOWALL=()=>typeof OWN!=='undefined'&&OWN.on&&!OWN.preview;
const SEVORD={major:0,moderate:1,minor:2};
const bulkBar=(t,n)=>n&&CANAPPROVE()?`<div class="oedit bulk"><span class="pend">${n} ${T('o_pendn')}</span><button class="btn" type="button" data-gonotif="1">${T('nt_open')}</button></div>`:'';
const CANAPPROVE=()=>typeof OWN!=='undefined'&&(OWN.role==='owner'||OWN.local);
/** 1.16.0: every editable item carries the same two buttons — ⋮⋮ to drag it and ✎ to open its floating window, which holds
   everything about it (Arabic and English name, description, hide/show, delete). A waiting item shows «awaiting review»
   (for the owner it opens 🔔 notifications, where changes are approved or rejected).
   kind: r = source, i = interaction, n = added vitamin, m = roadmap feature. The database checks every change. */
const EPEN=(attrs,lbl)=>`<button class="btn epen" type="button" ${attrs} aria-label="${esc(lbl||T('o_editall'))}" title="${esc(lbl||T('o_editall'))}">${PEN}</button>`;
function actBtns(kind,id,{rv=true,hidden=false,edit=true,drag=false}={}){
  return (drag?DRAG(T('o_drag')):'')+(rv?'':CANAPPROVE()?`<button class="pend" type="button" data-gonotif="1">${T('o_pending')} ›</button>`:`<span class="pend">${T('o_pending')}</span>`)+(hidden?`<span class="hidb">${T('o_hiddenb')}</span>`:'')+
    (edit?EPEN(`data-act="edit" data-kind="${kind}" data-id="${esc(String(id))}"`):'');
}
/** the buttons at the bottom of an item's floating window: hide/show · delete · (reset) · cancel · save */
const EDB=({hidden=false,hide=true,del=true,reset=false,isNew=false}={})=>[...(!isNew&&hide?[{label:T(hidden?'o_nshow':'o_nhide'),action:'hide'}]:[]),...(!isNew&&del?[{label:T('o_del'),action:'del',danger:1}]:[]),
  ...(reset?[{label:T('o_reset'),action:'reset'}]:[]),{label:T('o_cancel'),action:'cancel'},{label:T('ed_save'),action:'ok',pri:1}];
const actBar=(kind,id,o)=>`<div class="oedit acts">${actBtns(kind,id,o)}</div>`;
const NHIDE=()=>(CFG.nut&&CFG.nut.hide)||[];
const NCUST=()=>(CFG.nut&&CFG.nut.custom)||[];
/** vitamins in the owner's chosen order (CFG.nutOrder); new or unknown ones keep their place at the end */
const ordered=ids=>{const o=CFG.nutOrder||[];return [...ids].sort((a,b)=>{const i=o.indexOf(a),j=o.indexOf(b);return (i<0?1e3+ids.indexOf(a):i)-(j<0?1e3+ids.indexOf(b):j)})};
function buildData(){
  const all=SHOWALL();
  // preview / visitors: an item a pharmacist changed shows its approved version, and a proposed deletion is still shown
  const ver=x=>!all&&x.rv===false&&x.pv?x.pv:x,DL=k=>all?[]:DELS()[k]||[];
  REFS=Array.isArray(CFG.refs)?Object.fromEntries([...CFG.refs.map(ver),...DL('refs')].filter(o=>all||(o.rv!==false&&!o.hidden)).map(o=>[o.id,[o.org||'',o.title||'',o.url||'',o.ar||'',o.en||o.ar||'',o.rv!==false,!!o.hidden,o.kind||'',o.at||'',o.sb||'',o.sa||'']])):DEF_REFS;
  // sources of the built-in calculators added in 1.13.0 (ids 69+) come with the code until the owner publishes them from the database
  if(Array.isArray(CFG.refs))Object.keys(DEF_REFS).filter(n=>+n>=69&&!CFG.refs.some(o=>o.id==n)).forEach(n=>{REFS[n]=DEF_REFS[n]});
  const NC=[...NCUST().map(ver),...DL('nut')];
  CUST={};NC.forEach(c=>{CUST[c.id]=c});
  const VC=NC.filter(c=>all||(!c.hidden&&c.rv!==false));
  const hide=NHIDE(),vis=BUILTIN.filter(k=>!hide.includes(k)),custIds=VC.map(c=>c.id);
  KEYS=['all',...ordered([...vis,...custIds])];
  const il=Array.isArray(CFG.inter)?[...CFG.inter.map(ver),...DL('inter')]:defInterList();
  INTER=il.map((x,i)=>[x.k,[x.a.ar,x.a.en||x.a.ar],[x.b.ar,x.b.en||x.b.ar],[x.d.ar,x.d.en||x.d.ar],x.r||[],i,x.sev||'moderate',x.rv!==false,!!x.hidden,x.g&&x.g.d?x.g:null,x.sb||'',x.sa||'']).filter(x=>KEYS.includes(x[0])&&(all||(x[7]&&!x[8])));
  REFGROUP={};
  KEYS.slice(1).forEach(k=>{const g=new Set(DEF_REFGROUP[k]||(CUST[k]?CUST[k].r||[]:[]));INTER.filter(x=>x[0]===k).forEach(x=>x[4].forEach(n=>g.add(n)));REFGROUP[k]=[...g].filter(n=>REFS[n])});
  // picker (the owner's buttons around each vitamin are taken off first and put back by renderNutAdmin)
  $('picker').querySelectorAll('em.bh').forEach(e=>e.remove());
  $('picker').querySelectorAll('.pkw').forEach(w=>{const b=w.querySelector('button[data-k]');if(b)w.before(b);w.remove()});
  document.querySelectorAll('#picker button[data-k]').forEach(b=>{if(BUILTIN.includes(b.dataset.k)){b.hidden=hide.includes(b.dataset.k)&&!all;b.classList.toggle('off',hide.includes(b.dataset.k))}else b.remove()});
  VC.forEach(c=>{const b=document.createElement('button');b.dataset.k=c.id;b.className='cnut';b.innerHTML=`<span>${esc(tx2(c.n))}</span><small>${esc(tx2(c.h))}</small>${c.rv===false?`<em class="pend">${T('o_pending')}</em>`:''}${c.hidden?`<em class="hidb">${T('o_hiddenb')}</em>`:''}`;$('picker').appendChild(b);F[c.id]=()=>fCustom(c.id);EX[c.id]={age:30,sex:'f'}});
  Object.keys(F).forEach(k=>{if(!BUILTIN.includes(k)&&!CUST[k])delete F[k]});
  KEYS.slice(1).forEach(k=>{const b=$('picker').querySelector(`button[data-k="${k}"]`);if(b)$('picker').appendChild(b)}); // picker in the same order
  // 1.14.0: the special calculators (pregnancy, infant, vitamin A for children, weight-loss surgery, B1 deficiency) come after the vitamins, under their own heading
  $('picker').querySelectorAll('.pkh').forEach(h=>h.remove());
  const SPEC=['preg','inf','vac','bar','thi'],spec=KEYS.slice(1).filter(k=>SPEC.includes(k)).map(k=>$('picker').querySelector(`button[data-k="${k}"]`)).filter(Boolean);
  if(spec.some(b=>!b.hidden)){const h=document.createElement('h3');h.className='pkh';h.dataset.t='pk_spec';h.textContent=T('pk_spec');$('picker').appendChild(h);spec.forEach(b=>$('picker').appendChild(b))}
  // 1.16.0: every vitamin tile carries its symbol (same tile design as the tools and the menu sections)
  $('picker').querySelectorAll('button[data-k]').forEach(b=>{if(!b.querySelector('.tico'))b.insertAdjacentHTML('afterbegin',`<i class="tico" aria-hidden="true">${vBadge(b.dataset.k)}</i>`)});
  if(!KEYS.includes(K)||K==='all')K=KEYS[1]||'d';
  showFor();
  document.querySelectorAll('#picker button[data-k]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===K));
  $('nsw').hidden=$('picker').querySelectorAll('button[data-k]:not([hidden])').length<10;filterNuts();
  renderNutAdmin();
}
const VSVG=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const VBADGE={d:'D',b12:'B12',fol:'B9',fe:'Fe',ca:'Ca',mg:'Mg',c:'C',zn:'Zn',vac:'A',thi:'B1',
  preg:VSVG('<circle cx="12" cy="5" r="2.5"/><path d="M10 21v-6l-1-4a3 3 0 0 1 3-3c2 0 2.5 1.5 3.5 3.5a3.5 3.5 0 0 1-2.5 4.5v5"/>'),
  inf:VSVG('<circle cx="12" cy="10" r="6"/><path d="M9.5 9h.01M14.5 9h.01M10 12.5a3 3 0 0 0 4 0M12 4c-1 0-1.5-1-1-2"/><path d="M8 17l-1 4M16 17l1 4"/>'),
  bar:VSVG('<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8"/>')};
/** the symbol on a vitamin tile: D, B12, Fe… a picture for the special calculators, the first letters for an added one */
function vBadge(k){if(VBADGE[k])return VBADGE[k];const c=CUST[k],n=c&&((c.n&&c.n.en)||(c.n&&c.n.ar))||'';const m=n.match(/\b(?:vitamin|فيتامين)\s*([A-Za-z]\d{0,2})/i);return esc(m?m[1]:(n.replace(/[^A-Za-z\u0600-\u06FF]/g,'').slice(0,2)||'+'))}
function filterNuts(){const q=normAr($('nsearch')&&$('nsearch').value);document.querySelectorAll('#picker button[data-k]').forEach(b=>b.classList.toggle('nf',!!q&&!normAr(b.textContent).includes(q)));document.querySelectorAll('#picker .pkh').forEach(h=>h.classList.toggle('nf',!!q))}
/** owner: each vitamin carries its own buttons (drag ⋮⋮ to reorder · edit · hide/show · delete); «add» is under the list */
function renderNutAdmin(){
  const el=$('nadm'),pk=$('picker');if(!el)return;
  if(typeof OWN==='undefined'||!OWN.on||OWN.preview){el.innerHTML='';return}
  const hide=NHIDE(),cust=Object.fromEntries(NCUST().map(c=>[c.id,c]));
  pk.querySelectorAll('button[data-k]').forEach(b=>{const k=b.dataset.k,c=cust[k],off=c?!!c.hidden:hide.includes(k);
    const w=document.createElement('div');w.className='pkw'+(off?' off':'');w.dataset.sid=k;b.before(w);w.appendChild(b);
    if(off&&!c)b.insertAdjacentHTML('beforeend',`<em class="hidb bh">${T('o_hiddenb')}</em>`);
    // ⋮⋮ (owner: the order is a site setting) and ✎ (an added vitamin: whoever may edit vitamins; a built-in one: the owner)
    w.insertAdjacentHTML('beforeend',`<div class="pka">${ISOWNER()?DRAG(T('o_drag')):''}${c?(CAN('nut')?EPEN(`data-act="edit" data-kind="n" data-id="${esc(c.id)}"`):''):ISOWNER()?EPEN(`data-nedit="${k}"`):''}</div>`)});
  el.innerHTML=`<button class="oadd otop" type="button" id="nadd">${PLUS}${T('o_nadd').replace(/^\+\s*/,'')}</button>${bulkBar('n',NCUST().filter(c=>c.rv===false).length)}<p class="hint">${T('o_tile_hint')}</p>`;
  // drag the ⋮⋮ handle to change the vitamins' order (saved with the page settings, then published)
  sortable(pk,'.pkw',ids=>{if(!ISOWNER())return;CFG.nutOrder=ids;changed()});
}
/* custom nutrient calculator: dose table by age and sex */
const SEXES=()=>[['all',T('o_sx_all')],['m',T('sx_m')],['f',T('sx_f')],['p',T('sx_p')],['l',T('sx_l')]];
function pickRow(rows,age,sx){
  const inAge=rows.filter(r=>age>=r.a0&&age<=r.a1);
  const order=sx==='p'||sx==='l'?[sx,'f','all']:[sx,'all'];
  for(const s of order){const r=inAge.find(x=>x.sx===s);if(r)return r}
  return null;
}
function fCustom(id){
  const c=CUST[id];if(!c)return;
  const x=req(['age']);if(!x)return;
  const age=x.age,sx=$('sex').value,u=' '+tx2(c.u||UNITTXT[c.uk]),nm=tx2(c.n),row=pickRow(c.rows||[],age,sx);
  const refs=(c.r||[]).filter(n=>REFS[n]);
  if(!row){render({badge:L('لا توجد قيمة','No value'),tone:'warn',title:esc(L(`لا توجد جرعة مسجّلة لهذا العمر في ${nm}`,`No dose recorded for this age in ${nm}`)),sub:esc(L('راجع الطبيب أو الصيدلي','Ask a doctor or pharmacist')),refs});return}
  const kv=[[RDAL(age),esc(row.rda+u)],[L('الحد الأعلى الآمن (UL)','Tolerable Upper Intake Level (UL)'),row.ul?esc(row.ul+u+L(' / يوم',' / day')):L('غير محدد','Not established')]];
  const r={badge:L('الاحتياج اليومي','Daily requirement'),tone:'info',title:esc(L(`${row.rda}${u} ${nm} يومياً`,`${row.rda}${u} ${nm} daily`)),sub:esc(tx2(c.h)),refs,kv,
    pt:esc(L(`تحتاج ${row.rda}${u} من ${nm} يومياً.`,`You need ${row.rda}${u} of ${nm} a day.`))};
  if(tx2(c.plan))r.opts=[{h:L('التوجيه العلاجي','Treatment guidance'),b:esc(tx2(c.plan)),r:refs}];
  if(tx2(c.note))r.notes=[{t:esc(tx2(c.note)),r:refs}];
  // kidney disease: potassium, phosphorus and magnesium build up when the kidneys cannot remove them (NIH fact sheets cited by the vitamin)
  if(CKD()&&['potassium','phosphorus','mg','magnesium'].includes(id))(r.notes=r.notes||[]).unshift({t:L(`في القصور الكلوي لا تؤخذ مكملات ${nm} إلا بإشراف الطبيب، لخطر تراكمه في الدم.`,`In kidney disease take ${nm} supplements only under medical supervision, because it can build up in the blood.`),r:refs,u:1});
  render(r);
}
