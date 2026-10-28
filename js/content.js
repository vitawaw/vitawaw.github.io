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
const bulkBar=(t,n)=>n&&CANAPPROVE()?`<div class="oedit bulk"><span class="pend">${n} ${T('o_pendn')}</span><button class="btn" type="button" data-approveall="${t}">${T('o_approveall')}</button></div>`:'';
const CANAPPROVE=()=>typeof OWN!=='undefined'&&(OWN.role==='owner'||OWN.local);
const NHIDE=()=>(CFG.nut&&CFG.nut.hide)||[];
const NCUST=()=>(CFG.nut&&CFG.nut.custom)||[];
function buildData(){
  const all=SHOWALL();
  REFS=Array.isArray(CFG.refs)?Object.fromEntries(CFG.refs.filter(o=>all||o.rv!==false).map(o=>[o.id,[o.org||'',o.title||'',o.url||'',o.ar||'',o.en||o.ar||'',o.rv!==false]])):DEF_REFS;
  CUST={};NCUST().forEach(c=>{CUST[c.id]=c});
  const VC=NCUST().filter(c=>!c.hidden&&(all||c.rv!==false));
  const hide=NHIDE(),vis=BUILTIN.filter(k=>!hide.includes(k)),custIds=VC.map(c=>c.id);
  KEYS=['all',...vis,...custIds];
  const il=Array.isArray(CFG.inter)?CFG.inter:defInterList();
  INTER=il.map((x,i)=>[x.k,[x.a.ar,x.a.en||x.a.ar],[x.b.ar,x.b.en||x.b.ar],[x.d.ar,x.d.en||x.d.ar],x.r||[],i,x.sev||'moderate',x.rv!==false]).filter(x=>KEYS.includes(x[0])&&(all||x[7]));
  REFGROUP={};
  KEYS.slice(1).forEach(k=>{const g=new Set(DEF_REFGROUP[k]||(CUST[k]?CUST[k].r||[]:[]));INTER.filter(x=>x[0]===k).forEach(x=>x[4].forEach(n=>g.add(n)));REFGROUP[k]=[...g].filter(n=>REFS[n])});
  // picker
  const ownerTools=typeof OWN!=='undefined'&&OWN.on&&!OWN.preview;
  document.querySelectorAll('#picker button[data-k]').forEach(b=>{if(BUILTIN.includes(b.dataset.k)){b.hidden=hide.includes(b.dataset.k)&&!ownerTools;b.classList.toggle('ohid',hide.includes(b.dataset.k));b.querySelectorAll('.ocard').forEach(x=>x.remove())}else b.remove()});
  VC.forEach(c=>{const b=document.createElement('button');b.dataset.k=c.id;b.className='cnut';b.innerHTML=`<span>${esc(tx2(c.n))}</span><small>${esc(tx2(c.h))}</small>${c.rv===false?`<em class="pend">${T('o_pending')}</em>`:''}`;$('picker').appendChild(b);F[c.id]=()=>fCustom(c.id);EX[c.id]={age:30,sex:'f'}});
  if(ownerTools){ // owner sees the same cards as visitors, plus small actions on each card
    const act=(attr,v,label,cls='')=>`<span class="oa${cls}" role="button" tabindex="0" ${attr}="${esc(v)}">${label}</span>`;
    document.querySelectorAll('#picker button[data-k]').forEach(b=>{const k=b.dataset.k,c=CUST[k],o=document.createElement('span');o.className='ocard';
      if(BUILTIN.includes(k))o.innerHTML=(hide.includes(k)?`<em class="ohtag">${T('o_hidden')}</em>`:'')+act('data-nhide',k,T(hide.includes(k)?'o_nshow':'o_nhide'));
      else if(c)o.innerHTML=(c.rv===false&&CANAPPROVE()?act('data-approve','n:'+k,T('o_approve'),' appr'):'')+act('data-nedit',k,T('o_edit'));
      b.appendChild(o)});
  }
  Object.keys(F).forEach(k=>{if(!BUILTIN.includes(k)&&!CUST[k])delete F[k]});
  if(!KEYS.includes(K)||K==='all')K=KEYS[1]||'d';
  document.querySelectorAll('[data-for]').forEach(el=>{el.hidden=!el.dataset.for.split(' ').includes(K)});
  document.querySelectorAll('#picker button[data-k]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===K));
  $('nsw').hidden=$('picker').querySelectorAll('button[data-k]:not([hidden])').length<10;filterNuts();
  renderNutAdmin();
}
function filterNuts(){const q=normAr($('nsearch')&&$('nsearch').value);document.querySelectorAll('#picker button[data-k]').forEach(b=>{const t=[...b.querySelectorAll(':scope>span:not(.ocard),:scope>small')].map(x=>x.textContent).join(' ');b.classList.toggle('nf',!!q&&!normAr(t).includes(q))})}
function renderNutAdmin(){
  const el=$('nadm');if(!el)return;
  if(typeof OWN==='undefined'||!OWN.on){el.innerHTML='';return}
  const hide=NHIDE();
  // compact owner strip above the cards: approve-all + add (the cards themselves carry edit/hide/approve)
  el.innerHTML=`${bulkBar('n',NCUST().filter(c=>c.rv===false).length)}<div class="nadm-row"><button class="btn pri" type="button" id="nadd">${T('o_nadd')}</button><span class="hint">${T('o_nhint')}</span></div>`;
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
  render(r);
}
