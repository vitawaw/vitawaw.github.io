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
/** The same buttons on every editable item: edit, hide/show, delete; a waiting item shows «awaiting review»
   (for the owner it opens 🔔 notifications, where changes are approved or rejected).
   kind: r = source, i = interaction, n = added vitamin, m = roadmap feature. The database checks every change. */
function actBtns(kind,id,{rv=true,hidden=false,edit=true,del=true,drag=false}={}){
  const b=(a,ico,lbl,cls='')=>`<button class="btn${cls}" type="button" data-act="${a}" data-kind="${kind}" data-id="${esc(String(id))}" aria-label="${esc(lbl)}" title="${esc(lbl)}">${ico}<span class="lbl">${esc(lbl)}</span></button>`;
  return (drag?DRAG(T('o_drag')):'')+(rv?'':CANAPPROVE()?`<button class="pend" type="button" data-gonotif="1">${T('o_pending')} ›</button>`:`<span class="pend">${T('o_pending')}</span>`)+(hidden?`<span class="hidb">${T('o_hiddenb')}</span>`:'')+
    (edit?b('edit',PEN,T('o_edit')):'')+b('hide',hidden?EYE:EYEOFF,T(hidden?'o_nshow':'o_nhide'))+(del?b('del',TRASH,T('o_del'),' danger'):'');
}
const actBar=(kind,id,o)=>`<div class="oedit acts">${actBtns(kind,id,o)}</div>`;
const NHIDE=()=>(CFG.nut&&CFG.nut.hide)||[];
const NCUST=()=>(CFG.nut&&CFG.nut.custom)||[];
/** vitamins in the owner's chosen order (CFG.nutOrder); new or unknown ones keep their place at the end */
const ordered=ids=>{const o=CFG.nutOrder||[];return [...ids].sort((a,b)=>{const i=o.indexOf(a),j=o.indexOf(b);return (i<0?1e3+ids.indexOf(a):i)-(j<0?1e3+ids.indexOf(b):j)})};
function buildData(){
  const all=SHOWALL();
  // preview / visitors: an item a pharmacist changed shows its approved version, and a proposed deletion is still shown
  const ver=x=>!all&&x.rv===false&&x.pv?x.pv:x,DL=k=>all?[]:DELS()[k]||[];
  REFS=Array.isArray(CFG.refs)?Object.fromEntries([...CFG.refs.map(ver),...DL('refs')].filter(o=>all||(o.rv!==false&&!o.hidden)).map(o=>[o.id,[o.org||'',o.title||'',o.url||'',o.ar||'',o.en||o.ar||'',o.rv!==false,!!o.hidden,o.kind||'',o.at||'']])):DEF_REFS;
  const NC=[...NCUST().map(ver),...DL('nut')];
  CUST={};NC.forEach(c=>{CUST[c.id]=c});
  const VC=NC.filter(c=>all||(!c.hidden&&c.rv!==false));
  const hide=NHIDE(),vis=BUILTIN.filter(k=>!hide.includes(k)),custIds=VC.map(c=>c.id);
  KEYS=['all',...ordered([...vis,...custIds])];
  const il=Array.isArray(CFG.inter)?[...CFG.inter.map(ver),...DL('inter')]:defInterList();
  INTER=il.map((x,i)=>[x.k,[x.a.ar,x.a.en||x.a.ar],[x.b.ar,x.b.en||x.b.ar],[x.d.ar,x.d.en||x.d.ar],x.r||[],i,x.sev||'moderate',x.rv!==false,!!x.hidden,x.g&&x.g.d?x.g:null]).filter(x=>KEYS.includes(x[0])&&(all||(x[7]&&!x[8])));
  REFGROUP={};
  KEYS.slice(1).forEach(k=>{const g=new Set(DEF_REFGROUP[k]||(CUST[k]?CUST[k].r||[]:[]));INTER.filter(x=>x[0]===k).forEach(x=>x[4].forEach(n=>g.add(n)));REFGROUP[k]=[...g].filter(n=>REFS[n])});
  // picker
  document.querySelectorAll('#picker button[data-k]').forEach(b=>{if(BUILTIN.includes(b.dataset.k))b.hidden=hide.includes(b.dataset.k);else b.remove()});
  VC.forEach(c=>{const b=document.createElement('button');b.dataset.k=c.id;b.className='cnut';b.innerHTML=`<span>${esc(tx2(c.n))}</span><small>${esc(tx2(c.h))}</small>${c.rv===false?`<em class="pend">${T('o_pending')}</em>`:''}${c.hidden?`<em class="hidb">${T('o_hiddenb')}</em>`:''}`;$('picker').appendChild(b);F[c.id]=()=>fCustom(c.id);EX[c.id]={age:30,sex:'f'}});
  Object.keys(F).forEach(k=>{if(!BUILTIN.includes(k)&&!CUST[k])delete F[k]});
  KEYS.slice(1).forEach(k=>{const b=$('picker').querySelector(`button[data-k="${k}"]`);if(b)$('picker').appendChild(b)}); // picker in the same order
  if(!KEYS.includes(K)||K==='all')K=KEYS[1]||'d';
  showFor();
  document.querySelectorAll('#picker button[data-k]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===K));
  $('nsw').hidden=$('picker').querySelectorAll('button[data-k]:not([hidden])').length<10;filterNuts();
  renderNutAdmin();
}
function filterNuts(){const q=normAr($('nsearch')&&$('nsearch').value);document.querySelectorAll('#picker button[data-k]').forEach(b=>b.classList.toggle('nf',!!q&&!normAr(b.textContent).includes(q)))}
function renderNutAdmin(){
  const el=$('nadm');if(!el)return;
  if(typeof OWN==='undefined'||!OWN.on){el.innerHTML='';return}
  const hide=NHIDE();
  const cust=Object.fromEntries(NCUST().map(c=>[c.id,c]));
  el.innerHTML=`<p class="nadm-h">${T('o_nman')}</p><p class="hint">${T('o_drag_i')}</p><div class="nadm-l" id="nadm-l">`+
    ordered([...BUILTIN,...NCUST().map(c=>c.id)]).map(k=>{const c=cust[k];
      return c?`<span class="nchip cust${c.rv===false?' pending':''}${c.hidden?' off':''}" data-sid="${esc(k)}">${DRAG(T('o_drag'))}${esc(tx2(c.n))}${actBtns('n',c.id,{rv:c.rv!==false,hidden:!!c.hidden})}</span>`
        :`<span class="nchip${hide.includes(k)?' off':''}" data-sid="${k}">${DRAG(T('o_drag'))}${esc(T('n_'+k))}<button type="button" data-nhide="${k}">${T(hide.includes(k)?'o_nshow':'o_nhide')}</button></span>`}).join('')+
    `</div>${bulkBar('n',NCUST().filter(c=>c.rv===false).length)}<button class="btn pri" type="button" id="nadd">${T('o_nadd')}</button><p class="hint">${T('o_nhint')}</p>`;
  // owner: drag the ⋮⋮ handle to change the vitamins' order (saved with the page settings, then published)
  sortable($('nadm-l'),'.nchip',ids=>{if(!ISOWNER())return;CFG.nutOrder=ids;changed()});
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
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),esc(row.rda+u)],[L('الحد الأعلى (UL)','Upper limit (UL)'),row.ul?esc(row.ul+u+L(' / يوم',' / day')):L('غير محدد','Not established')]];
  const r={badge:L('الاحتياج اليومي','Daily requirement'),tone:'info',title:esc(L(`${row.rda}${u} ${nm} يومياً`,`${row.rda}${u} ${nm} daily`)),sub:esc(tx2(c.h)),refs,kv,
    pt:esc(L(`تحتاج ${row.rda}${u} من ${nm} يومياً.`,`You need ${row.rda}${u} of ${nm} a day.`))};
  if(tx2(c.plan))r.opts=[{h:L('التوجيه العلاجي','Treatment guidance'),b:esc(tx2(c.plan)),r:refs}];
  if(tx2(c.note))r.notes=[{t:esc(tx2(c.note)),r:refs}];
  // kidney disease: potassium, phosphorus and magnesium build up when the kidneys cannot remove them (NIH fact sheets cited by the vitamin)
  if(CKD()&&['potassium','phosphorus','mg','magnesium'].includes(id))(r.notes=r.notes||[]).unshift({t:L(`في القصور الكلوي لا تؤخذ مكملات ${nm} إلا بإشراف الطبيب، لخطر تراكمه في الدم.`,`In kidney disease take ${nm} supplements only under medical supervision, because it can build up in the blood.`),r:refs,u:1});
  render(r);
}
