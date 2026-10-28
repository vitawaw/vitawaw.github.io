/* VITAWAW · js/owner.js
   Owner/editor mode: login (Supabase Auth, invite-only), editing dialogs, review/approve, save draft,
   publish, preview, password change. The Supabase library is downloaded only when someone logs in.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== owner mode ===================== */
const OWN={on:false,local:false,role:null,client:null,base:'',preview:false};
// texts editable from their own page
const EDITABLE=['hc_t','hc_l','ht_t','ht_l','ti_t','hi_l','ts_t','hs_l','rm_t','rm_l','sg_t','sg_l','by','priv','w_t','foot2'];
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2200)}
function cfgJSON(){return JSON.stringify({contact:CFG.contact,colors:CFG.colors,text:CFG.text,roadmap:CFG.roadmap,refs:CFG.refs,inter:CFG.inter,nut:CFG.nut})}
function dirty(){return cfgJSON()!==OWN.base}
function ownerBar(){
  $('owho').textContent='VITAWAW · '+T(OWN.local?'o_local':OWN.role==='owner'?'o_owner':'o_editor');
  const d=dirty();$('odot').classList.toggle('dirty',d||OWN.saved);
  const pc=pendingCount();$('ostate').textContent=T(d?'o_dirty':OWN.saved?'o_saved':'o_clean')+(pc?` · ${pc} ${T('o_pendn')}`:'');
  $('o-preview').textContent=T('o_preview');$('o-discard').textContent=T('o_discard');$('o-save').textContent=T('o_save');
  $('o-publish').textContent=T('o_publish');$('o-logout').textContent=T('o_logout');$('o-pass').textContent=T('o_chpass');$('o-pass').hidden=OWN.local;$('o-pvexit').textContent=T('o_pvexit');
  $('o-publish').hidden=!(OWN.local||OWN.role==='owner');
}
function changed(){refreshAll();ownerBar()}
function decorate(){
  document.querySelectorAll('.edp').forEach(b=>b.remove());
  document.querySelectorAll('[data-ed]').forEach(el=>el.removeAttribute('data-ed'));
  if(!OWN.on)return;
  EDITABLE.forEach(k=>document.querySelectorAll(`[data-t="${k}"]`).forEach(el=>{
    el.setAttribute('data-ed','');
    const b=document.createElement('button');b.type='button';b.className='edp';b.innerHTML=PEN;b.title=T('o_edit');b.dataset.edtext=k;
    el.after(b);
  }));
  document.querySelectorAll('.hero .hi').forEach(h=>{const page=h.closest('.page').id;const b=document.createElement('button');b.type='button';b.className='edp';b.title=T('o_colors');b.dataset.edcolor=page;
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/></svg>';h.appendChild(b)});
  const f=document.querySelector('footer');const b=document.createElement('button');b.type='button';b.className='edp';b.title=T('o_contact');b.dataset.edcontact='1';b.innerHTML=PEN;f.appendChild(b);
  const c=document.querySelector('#roadmap .contact h2');if(c){const b2=b.cloneNode(true);c.appendChild(b2)}
}

/* ----- generic dialog ----- */
function dialog({title,fields=[],info='',buttons}){
  return new Promise(res=>{
    $('dlg-t').textContent=title;$('dlg-m').hidden=true;
    $('dlg-b').innerHTML=(info?`<p class="info">${esc(info)}</p>`:'')+fields.map((f,i)=>{
      const id='dlgf'+i,lab=`<label class="l" for="${id}">${esc(f.label)}</label>`;
      if(f.type==='textarea')return `<div class="row">${lab}<textarea id="${id}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.ltr?' dir="ltr"':''}>${esc(f.value)}</textarea></div>`;
      if(f.type==='checks')return `<div class="row"><label class="l" for="${id}">${esc(f.label)}</label><div class="checks" id="${id}">${f.options.map(o=>`<label class="ck"><input type="checkbox" value="${o[0]}"${f.value.includes(o[0])?' checked':''}><span>${esc(o[1])}</span></label>`).join('')}</div></div>`;
      if(f.type==='select')return `<div class="row">${lab}<select id="${id}">${f.options.map(o=>`<option value="${o[0]}"${o[0]===f.value?' selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;
      if(f.type==='colors')return `<div class="cols"><div class="row"><label class="l" for="${id}a">${esc(f.labels[0])}</label><input type="color" id="${id}a" value="${f.value[0]}"></div><div class="row"><label class="l" for="${id}b">${esc(f.labels[1])}</label><input type="color" id="${id}b" value="${f.value[1]}"></div></div>`;
      return `<div class="row">${lab}<input type="${f.type||'text'}" id="${id}" value="${esc(f.value)}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${['tel','email','url'].includes(f.type)?' dir="ltr"':''}></div>`;
    }).join('');
    $('dlg-a').innerHTML=buttons.map((b,i)=>`<button class="btn${b.pri?' pri':''}" type="${b.pri?'submit':'button'}" data-bi="${i}">${esc(b.label)}</button>`).join('');
    const read=()=>fields.map((f,i)=>f.type==='colors'?[$('dlgf'+i+'a').value,$('dlgf'+i+'b').value]:f.type==='checks'?[...$('dlgf'+i).querySelectorAll('input:checked')].map(x=>+x.value):$('dlgf'+i).value);
    const finish=v=>{$('dlg').hidden=true;$('dlgf').onsubmit=null;$('dlg-a').onclick=null;res(v)};
    $('dlg-a').onclick=e=>{const b=e.target.closest('[data-bi]');if(!b||b.type==='submit')return;finish({action:buttons[+b.dataset.bi].action,values:read()})};
    $('dlgf').onsubmit=e=>{e.preventDefault();const b=buttons.find(x=>x.pri);finish({action:b.action,values:read()})};
    dialog.msg=m=>{$('dlg-m').textContent=m;$('dlg-m').hidden=false};
    $('dlg').hidden=false;const first=$('dlg-b').querySelector('input,textarea,select');(first||$('dlg-a').querySelector('button')).focus();
  });
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dlg').hidden){$('dlg-a').querySelector('[data-bi]:not([type=submit])')?.click()}});

/* ----- editors ----- */
async function editText(k){
  const cur=CFG.text[k]||{},defAr=I18N[k][0],defEn=I18N[k][1];
  const long=(cur.ar||defAr).length>60;
  const r=await dialog({title:T('o_edit'),fields:[{label:T('o_text'),type:long?'textarea':'text',value:cur.ar||defAr},{label:T('o_texten'),type:long?'textarea':'text',value:cur.en||defEn}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok'){const ar=r.values[0].trim()||defAr,en=r.values[1].trim()||defEn;if(ar===defAr&&en===defEn)delete CFG.text[k];else CFG.text[k]={ar,en};changed();if(ar!==defAr&&en===defEn)toast(T('o_enwarn'))}
  if(r.action==='reset'){delete CFG.text[k];changed()}
}
async function editColors(p){
  const r=await dialog({title:T('o_colors'),fields:[{type:'colors',labels:[T('o_c1'),T('o_c2')],value:CFG.colors[p]}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok'){CFG.colors[p]=r.values[0];changed()}
  if(r.action==='reset'){CFG.colors[p]=clone(DEFAULT_CFG.colors[p]);changed()}
}
async function editContact(){
  const c=CFG.contact;
  const r=await dialog({title:T('o_contact'),fields:[{label:T('o_email'),type:'email',value:c.email},{label:T('o_phone'),type:'tel',value:c.phone||''}],
    buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok'){const [e,ph]=r.values.map(x=>x.trim());if(!e&&!ph){toast(T('o_contact_need'));return}CFG.contact={email:e,phone:ph};changed()}
}
const STATUSES=()=>[['dev',T('st_dev')],['plan',T('st_plan')],['idea',T('st_idea')]];
const ICONS=()=>Object.keys(IC).map(k=>[k,{bell:'🔔',chart:'📈',plus:'➕',pill:'💊',clock:'⏰',share:'📤',cam:'📷',baby:'👶'}[k]+' '+k]);
async function editFeature(i){
  const isNew=i==null,x=isNew?{st:'plan',ic:'plus',t:{ar:'',en:''},d:{ar:'',en:''}}:CFG.roadmap[i];
  const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
  const r=await dialog({title:T(isNew?'o_add':'o_feat'),fields:[{label:T('o_ftitle'),value:x.t.ar},{label:T('o_fdesc'),type:'textarea',value:x.d.ar},{label:T('o_fst'),type:'select',options:STATUSES(),value:x.st},{label:T('o_fic'),type:'select',options:ICONS(),value:x.ic}],buttons:btns});
  if(r.action==='ok'){const [t,d,st,ic]=r.values;if(!t.trim())return;
    const item={st,ic,t:{ar:t.trim(),en:(x.t.ar===t.trim()?x.t.en:'')},d:{ar:d.trim(),en:(x.d.ar===d.trim()?x.d.en:'')}};
    if(isNew)CFG.roadmap.push(item);else CFG.roadmap[i]=item;changed()}
  if(r.action==='del'){const q=await dialog({title:T('o_delq'),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_del'),action:'ok',pri:1}]});if(q.action==='ok'){CFG.roadmap.splice(i,1);changed()}}
}
function moveFeature(i,d){const j=i+d;if(j<0||j>=CFG.roadmap.length)return;const a=CFG.roadmap;[a[i],a[j]]=[a[j],a[i]];changed()}
document.addEventListener('click',e=>{
  if(!OWN.on)return;const t=e.target.closest('[data-edtext],[data-edcolor],[data-edcontact],[data-rmedit],[data-rmup],[data-rmdown],#rmadd');if(!t)return;
  e.preventDefault();e.stopPropagation();
  if(t.dataset.edtext)editText(t.dataset.edtext);
  else if(t.dataset.edcolor)editColors(t.dataset.edcolor);
  else if(t.dataset.edcontact)editContact();
  else if(t.dataset.rmedit)editFeature(+t.dataset.rmedit);
  else if(t.dataset.rmup)moveFeature(+t.dataset.rmup,-1);
  else if(t.dataset.rmdown)moveFeature(+t.dataset.rmdown,1);
  else if(t.id==='rmadd')editFeature(null);
},true);


/* ----- sources, interactions, nutrients (owner) ----- */
const refOpts=()=>Object.entries(REFS).sort((a,b)=>a[0]-b[0]).map(([n,x])=>[+n,`${n}. ${x[0]} — ${x[1]}`]);
const ensureRefs=()=>{if(!Array.isArray(CFG.refs))CFG.refs=defRefList()};
const ensureInter=()=>{if(!Array.isArray(CFG.inter))CFG.inter=defInterList()};
const keep=(o,ar)=>({ar,en:o&&o.ar===ar?(o.en||''):''});
async function confirmDel(info){const q=await dialog({title:T('o_delq'),info:info||'',buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_del'),action:'ok',pri:1}]});return q.action==='ok'}
async function editRef(id){
  ensureRefs();const isNew=id==null,o=isNew?{org:'',title:'',url:'',ar:'',en:''}:CFG.refs.find(x=>x.id===id);if(!o)return;
  let v=[o.org,o.title,o.url,o.ar];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'o_radd':'o_redit'),info:T('o_rinfo'),fields:[{label:T('o_rorg'),value:v[0]},{label:T('o_rtitle'),type:'textarea',value:v[1]},{label:T('o_rurl'),type:'url',value:v[2]},{label:T('o_ruse'),value:v[3]}],buttons:btns});
    if(r.action==='del'){
      const uses=[...(CFG.inter||[]).filter(x=>(x.r||[]).includes(id)).map(x=>x.a.ar+' + '+x.b.ar),...NCUST().filter(c=>(c.r||[]).includes(id)).map(c=>c.n.ar),...BUILTIN.filter(k=>(DEF_REFGROUP[k]||[]).includes(id)).map(k=>T('n_'+k))];
      if(!(await confirmDel(uses.length?T('o_rused')+' '+uses.join(L('، ',', ')):'')))return;
      CFG.refs=CFG.refs.filter(x=>x.id!==id);if(Array.isArray(CFG.inter))CFG.inter.forEach(x=>{x.r=(x.r||[]).filter(n=>n!==id)});NCUST().forEach(c=>{c.r=(c.r||[]).filter(n=>n!==id)});changed();return}
    if(r.action!=='ok')return;
    v=r.values.map(x=>x.trim());
    if(!v[0]||!v[1]){toast(T('o_rneed'));continue}
    if(v[2]&&!/^https?:\/\//i.test(v[2])){toast(T('o_rbadurl'));continue}
    const item={id:isNew?Math.max(29,(OWN.nextRef||1)-1,...CFG.refs.map(x=>x.id))+1:id,org:v[0],title:v[1],url:v[2],ar:v[3],en:o.ar===v[3]?(o.en||''):'',rv:OWN.role==='owner'||OWN.local};
    if(isNew)CFG.refs.push(item);else CFG.refs[CFG.refs.findIndex(x=>x.id===id)]=item;
    changed();if(isNew)toast(T('o_radded')+' '+item.id);return;
  }
}
async function editInter(i){
  ensureInter();const isNew=i==null,o=isNew?null:CFG.inter[i];
  const nuts=KEYS.slice(1).map(k=>[k,kname(k)]);if(!nuts.length)return;
  let v=o?[o.k,o.sev||'moderate',o.a.ar,o.b.ar,o.d.ar,(o.r||[]).slice()]:[nuts[0][0],'moderate','','','',[]];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'o_iadd':'o_iedit'),fields:[{label:T('o_inut'),type:'select',options:nuts,value:v[0]},{label:T('o_isev'),type:'select',options:[['major',T('sev_major')],['moderate',T('sev_moderate')],['minor',T('sev_minor')]],value:v[1]},{label:T('o_ia'),value:v[2],ph:T('o_ia_ph')},{label:T('o_ib'),value:v[3]},{label:T('o_id'),type:'textarea',value:v[4]},{label:T('o_isrc'),type:'checks',options:refOpts(),value:v[5]}],buttons:btns});
    if(r.action==='del'){if(await confirmDel()){CFG.inter.splice(i,1);changed()}return}
    if(r.action!=='ok')return;
    v=[r.values[0],r.values[1],r.values[2].trim(),r.values[3].trim(),r.values[4].trim(),r.values[5]];
    if(!v[2])v[2]=kname(v[0]);
    if(!v[3]||!v[4]){toast(T('o_ineed'));continue}
    if(!v[5].length){toast(T('o_srcneed'));continue}
    const item={k:v[0],sev:v[1],a:keep(o&&o.a,v[2]),b:keep(o&&o.b,v[3]),d:keep(o&&o.d,v[4]),r:v[5],rv:OWN.role==='owner'||OWN.local};if(o&&o.id!=null)item.id=o.id;
    if(isNew)CFG.inter.push(item);else CFG.inter[i]=item;changed();return;
  }
}
function approve(key){
  if(!(OWN.role==='owner'||OWN.local)){toast(T('o_onlyowner'));return}
  const [t,id]=[key.slice(0,1),key.slice(2)];
  if(t==='r'){const o=(CFG.refs||[]).find(x=>String(x.id)===id);if(o)o.rv=true}
  if(t==='i'){const o=(CFG.inter||[])[+id];if(o)o.rv=true}
  if(t==='n'){const o=NCUST().find(x=>x.id===id);if(o)o.rv=true}
  changed();toast(T('o_approved'));
}
async function approveAll(t){
  if(!CANAPPROVE())return;
  const list=t==='r'?(CFG.refs||[]):t==='i'?(CFG.inter||[]).filter(x=>{const iq=iTerms(normAr($('isearch').value));if(!(IF==='all'||x.k===IF))return false;if(!iq.length)return true;const h=normAr([x.a,x.b,x.d].map(o=>o?o.ar+' '+o.en:'').join(' '));return iq.some(q=>h.includes(q))}):NCUST();
  const n=list.filter(x=>x.rv===false).length;if(!n)return;
  const q=await dialog({title:T('o_approveall'),info:T('o_approveall_i').replace('{n}',n),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_approveall'),action:'ok',pri:1}]});
  if(q.action!=='ok')return;list.forEach(x=>{if(x.rv===false)x.rv=true});changed();toast(T('o_approved'));
}
const pendingCount=()=>(CFG.refs||[]).filter(x=>x.rv===false).length+(CFG.inter||[]).filter(x=>x.rv===false).length+NCUST().filter(x=>x.rv===false).length;
function toggleBuiltin(k){
  CFG.nut=CFG.nut||{hide:[],custom:[]};const h=CFG.nut.hide;const j=h.indexOf(k);
  if(j>=0)h.splice(j,1);else{if(KEYS.length<=2){toast(T('o_nlast'));return}h.push(k)}
  changed();
}
const fmtRows=rows=>(rows||[]).map(r=>`${r.a0}-${r.a1>=110?'+':r.a1} | ${(SEXES().find(s=>s[0]===r.sx)||SEXES()[0])[1]} | ${r.rda} | ${r.ul||'-'}`).join('\n');
function parseRows(txt){
  const sxMap={};SEXES().forEach(([k,l])=>{sxMap[l.trim()]=k;sxMap[k]=k});Object.assign(sxMap,{'الكل':'all','ذكر':'m','أنثى':'f','انثى':'f','حامل':'p','مرضع':'l','all':'all','male':'m','female':'f','pregnant':'p','lactating':'l'});
  const rows=[];const lines=txt.split('\n').map(x=>x.trim()).filter(Boolean);
  for(const [i,line] of lines.entries()){
    const p=line.split(/[|،]/).map(x=>x.trim());if(p.length<3)return {err:i+1};
    const m=p[0].replace(/\s/g,'').match(/^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?|\+))?$|^(\d+(?:\.\d+)?)\+$/);if(!m)return {err:i+1};
    let a0,a1;if(m[3]!=null){a0=+m[3];a1=110}else{a0=+m[1];a1=m[2]==null?a0:m[2]==='+'?110:+m[2]}
    const sx=sxMap[(p[1]||'').toLowerCase()]||sxMap[p[1]];if(!sx||a1<a0)return {err:i+1};
    const rda=p[2];const ul=p[3]&&p[3]!=='-'?p[3]:'';if(!rda)return {err:i+1};
    rows.push({a0,a1,sx,rda,ul});
  }
  return rows.length?{rows}:{err:1};
}
const UNITS=()=>[['mg',T('o_u_mg')],['mcg',T('o_u_mcg')],['g',T('o_u_g')],['iu',T('o_u_iu')]];
const UNITTXT={mg:{ar:'ملغ',en:'mg'},mcg:{ar:'ميكروغرام',en:'mcg'},g:{ar:'غرام',en:'g'},iu:{ar:'وحدة دولية',en:'IU'}};
async function editNut(id){
  CFG.nut=CFG.nut||{hide:[],custom:[]};const isNew=id==null,o=isNew?null:CFG.nut.custom.find(c=>c.id===id);if(!isNew&&!o)return;
  let v=o?[o.n.ar,(o.h&&o.h.ar)||'',o.uk||'mg',fmtRows(o.rows),(o.plan&&o.plan.ar)||'',(o.note&&o.note.ar)||'',(o.r||[]).slice()]:['','','mg','','','',[]];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'o_nadd':'o_nedit'),info:T('o_ninfo'),fields:[{label:T('o_nname'),value:v[0]},{label:T('o_nh'),value:v[1]},{label:T('o_nunit'),type:'select',options:UNITS(),value:v[2]},{label:T('o_nrows'),type:'textarea',value:v[3],ph:T('o_nrows_ph')},{label:T('o_nplan'),type:'textarea',value:v[4]},{label:T('o_nnote'),type:'textarea',value:v[5]},{label:T('o_isrc'),type:'checks',options:refOpts(),value:v[6]}],buttons:btns});
    if(r.action==='del'){if(await confirmDel(T('o_ndelinfo'))){CFG.nut.custom=CFG.nut.custom.filter(c=>c.id!==id);if(Array.isArray(CFG.inter))CFG.inter=CFG.inter.filter(x=>x.k!==id);changed()}return}
    if(r.action!=='ok')return;
    v=[r.values[0].trim(),r.values[1].trim(),r.values[2],r.values[3],r.values[4].trim(),r.values[5].trim(),r.values[6]];
    if(!v[0]){toast(T('o_nneedname'));continue}
    const pr=parseRows(v[3]);if(pr.err){toast(T('o_nbadrow')+' '+pr.err);continue}
    if(!v[6].length){toast(T('o_srcneed'));continue}
    const nid=isNew?'c'+Date.now().toString(36).slice(-8):id;
    const item={id:nid,n:keep(o&&o.n,v[0]),h:keep(o&&o.h,v[1]),uk:v[2],u:UNITTXT[v[2]],rows:pr.rows,plan:keep(o&&o.plan,v[4]),note:keep(o&&o.note,v[5]),r:v[6],rv:OWN.role==='owner'||OWN.local,hidden:!!(o&&o.hidden)};
    if(isNew)CFG.nut.custom.push(item);else CFG.nut.custom[CFG.nut.custom.findIndex(c=>c.id===id)]=item;
    if(isNew){K=nid}
    changed();return;
  }
}
document.addEventListener('click',e=>{
  if(!OWN.on)return;const t=e.target.closest('[data-redit],#radd,[data-iedit],#iadd,[data-nhide],[data-nedit],#nadd,[data-approve],[data-approveall]');if(!t)return;
  e.preventDefault();e.stopPropagation();
  if(t.dataset.approveall)approveAll(t.dataset.approveall);
  else if(t.dataset.approve)approve(t.dataset.approve);
  else if(t.dataset.redit)editRef(+t.dataset.redit);
  else if(t.id==='radd')editRef(null);
  else if(t.dataset.iedit!=null)editInter(+t.dataset.iedit);
  else if(t.id==='iadd')editInter(null);
  else if(t.dataset.nhide)toggleBuiltin(t.dataset.nhide);
  else if(t.dataset.nedit)editNut(t.dataset.nedit);
  else if(t.id==='nadd')editNut(null);
},true);

/* ----- login / session ----- */
function loadSupabaseLib(){return new Promise((ok,no)=>{if(window.supabase)return ok();const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)})}
async function openOwner(){
  history.replaceState(null,'',location.pathname+location.search+'#'+(cur||'calc'));
  if(OWN.on)return;
  if(!SBON()){
    const r=await dialog({title:T('o_login'),info:T('o_nosb'),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_trylocal'),action:'ok',pri:1}]});
    if(r.action==='ok'){let d=null;try{d=JSON.parse(localStorage.getItem('vw-draft')||'null')}catch(e){}startOwner({local:true,role:'owner',draft:d})}
    return;
  }
  try{await loadSupabaseLib()}catch(e){toast(T('o_neterr'));return}
  OWN.client=OWN.client||window.supabase.createClient(SB.url,SB.key);
  const {data:{session}}=await OWN.client.auth.getSession();
  if(session)return afterLogin();
  while(true){
    const r=await dialog({title:T('o_login'),fields:[{label:T('o_email'),type:'email',value:''},{label:T('o_pass'),type:'password',value:''}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_first'),action:'first'},{label:T('o_in'),action:'ok',pri:1}]});
    if(r.action==='first'){if(await firstSetup(r.values[0]))return afterLogin();continue}
    if(r.action!=='ok')return;
    const {error}=await OWN.client.auth.signInWithPassword({email:r.values[0].trim(),password:r.values[1]});
    if(!error)return afterLogin();
    toast(T('o_badlogin'));
  }
}
async function firstSetup(email0){
  while(true){
    const r=await dialog({title:T('o_firstt'),info:T('o_firsti'),fields:[{label:T('o_email'),type:'email',value:email0||''},{label:T('o_pass'),type:'password',value:''},{label:T('o_pass2'),type:'password',value:''}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return false;
    const email=r.values[0].trim(),p1=r.values[1],p2=r.values[2];email0=email;
    if(p1.length<8){toast(T('o_short'));continue}
    if(p1!==p2){toast(T('o_mismatch'));continue}
    let up;try{up=await OWN.client.auth.signUp({email,password:p1})}catch(e){up={error:e}}
    const {error}=await OWN.client.auth.signInWithPassword({email,password:p1});
    if(!error)return true;
    toast(T('o_notinvited'));
  }
}
async function afterLogin(){
  const c=OWN.client;const {data:{user}}=await c.auth.getUser();
  const {data:m}=await c.from('members').select('role').eq('user_id',user.id).maybeSingle();
  if(!m||!['owner','editor'].includes(m.role)){toast(T('o_norole'));await c.auth.signOut();return}
  const {data:dr}=await c.from('site_config').select('data').eq('id','draft').maybeSingle();
  const {data:ct,error}=await c.rpc('get_content');if(error||!ct){toast(T('o_neterr'));return}
  startOwner({local:false,role:m.role,draft:dr&&dr.data,content:ct});
}
function applyContent(ct){ct=clean(ct);CFG.refs=ct.refs||[];CFG.inter=ct.inter||[];CFG.nut={hide:(ct.nut&&ct.nut.hide)||[],custom:(ct.nut&&ct.nut.custom)||[]};OWN.nextRef=ct.next_ref||30}
const settingsOf=c=>({contact:c.contact,colors:c.colors,text:c.text,roadmap:c.roadmap});
function startOwner({local,role,draft,content}){
  OWN.on=true;OWN.local=local;OWN.role=role;OWN.saved=false;OWN.preview=false;
  CFG=mergeCfg(DEFAULT_CFG,draft||PUBLISHED);if(content)applyContent(content);
  OWN.base=cfgJSON();OWN.saved=!!draft&&JSON.stringify(draft)!==JSON.stringify(PUBLISHED);
  document.body.classList.add('owner');changed();
}
async function saveDraft(){
  const data=JSON.parse(cfgJSON());
  if(OWN.local){try{localStorage.setItem('vw-draft',JSON.stringify(data))}catch(e){}}
  else{
    const c=OWN.client;
    const {error}=await c.from('site_config').upsert({id:'draft',data:settingsOf(data),updated_at:new Date().toISOString()});if(error){toast(T('o_neterr'));return false}
    const {error:e2}=await c.rpc('save_content',{p:{refs:CFG.refs||[],inter:CFG.inter||[],nut:{hide:NHIDE(),custom:NCUST()}}});if(e2){console.error(e2);toast(T('o_saveerr'));return false}
    const {data:ct,error:e3}=await c.rpc('get_content');if(!e3&&ct){applyContent(ct);refreshAll()}
  }
  OWN.base=cfgJSON();OWN.saved=true;ownerBar();toast(T('o_savedone'));return true;
}
async function publish(){
  if(!(OWN.local||OWN.role==='owner')){toast(T('o_onlyowner'));return}
  const r=await dialog({title:T('o_pubq'),info:T('o_pubi'),fields:[{label:T('o_note'),value:''}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_publish'),action:'ok',pri:1}]});
  if(r.action!=='ok')return;
  if(!(await saveDraft()))return;
  const data=JSON.parse(cfgJSON());
  if(OWN.local){try{localStorage.setItem('vw-cfg',JSON.stringify(data))}catch(e){}}
  else{
    const {error}=await OWN.client.rpc('publish_site',{note:r.values[0]||''});if(error){console.error(error);toast(T('o_neterr'));return}
    const {data:pub}=await OWN.client.from('site_config').select('data').eq('id','published').maybeSingle();
    if(pub&&pub.data){PUBLISHED=pub.data;try{localStorage.setItem('vw-cfg',JSON.stringify(PUBLISHED))}catch(e){}}
    OWN.saved=false;ownerBar();toast(T('o_pubdone'));return;
  }
  PUBLISHED=data;OWN.saved=false;ownerBar();toast(T('o_pubdone'));
}
async function discard(){
  const q=await dialog({title:T('o_discq'),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_discard'),action:'ok',pri:1}]});if(q.action!=='ok')return;
  if(OWN.local){try{localStorage.removeItem('vw-draft')}catch(e){}CFG=mergeCfg(DEFAULT_CFG,PUBLISHED)}
  else{
    const c=OWN.client;const {data:dr}=await c.from('site_config').select('data').eq('id','draft').maybeSingle();
    const {data:ct,error}=await c.rpc('get_content');if(error||!ct){toast(T('o_neterr'));return}
    CFG=mergeCfg(DEFAULT_CFG,(dr&&dr.data)||PUBLISHED);applyContent(ct);
  }
  OWN.base=cfgJSON();OWN.saved=false;changed();toast(T('o_discdone'));
}
async function changePass(){
  while(true){
    const r=await dialog({title:T('o_chpt'),fields:[{label:T('o_newpass'),type:'password',value:''},{label:T('o_pass2'),type:'password',value:''}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return;
    const [p1,p2]=r.values;
    if(p1.length<8){toast(T('o_short'));continue}
    if(p1!==p2){toast(T('o_mismatch'));continue}
    const {error}=await OWN.client.auth.updateUser({password:p1});
    if(error){toast(T('o_neterr'));continue}
    toast(T('o_chdone'));return;
  }
}
$('o-pass').addEventListener('click',changePass);
async function logout(){
  if(dirty()){const q=await dialog({title:T('o_leave'),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_logout'),action:'ok',pri:1}]});if(q.action!=='ok')return}
  if(!OWN.local&&OWN.client)await OWN.client.auth.signOut();
  OWN.on=false;OWN.preview=false;document.body.classList.remove('owner','preview');CFG=mergeCfg(DEFAULT_CFG,PUBLISHED);refreshAll();
}
$('o-enter').addEventListener('click',openOwner);$('o-save').addEventListener('click',saveDraft);$('o-publish').addEventListener('click',publish);$('o-discard').addEventListener('click',discard);$('o-logout').addEventListener('click',logout);
$('o-preview').addEventListener('click',()=>{OWN.preview=true;document.body.classList.add('preview');refreshAll()});$('o-pvexit').addEventListener('click',()=>{OWN.preview=false;document.body.classList.remove('preview');refreshAll()});
addEventListener('beforeunload',e=>{if(OWN.on&&dirty()){e.preventDefault();e.returnValue=''}});
