/* VITAWAW · js/owner.js
   Owner/editor mode: login (Supabase Auth, invite-only), editing dialogs, review/approve, save draft,
   publish, preview, password change. The Supabase library is downloaded only when someone logs in.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== owner mode ===================== */
const OWN={on:false,local:false,role:null,client:null,base:'',preview:false};
// texts editable from their own page
const EDITABLE=['hc_t','hc_l','ht_t','ht_l','ti_t','hi_l','ts_t','hs_l','rm_t','rm_l','sg_t','sg_l','by','priv','w_t','foot2'];
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2200)}
function cfgJSON(){return JSON.stringify({nav:CFG.nav,pages:CFG.pages,brand:CFG.brand,review:CFG.review,contact:CFG.contact,colors:CFG.colors,text:CFG.text,roadmap:CFG.roadmap,refs:CFG.refs,inter:CFG.inter,nut:CFG.nut})}
function dirty(){return cfgJSON()!==OWN.base}
function ownerBar(){
  $('owho').textContent='VITAWAW · '+T(OWN.local?'o_local':OWN.role==='owner'?'o_owner':'o_editor');
  const d=dirty();$('odot').classList.toggle('dirty',d||OWN.saved);
  const pc=pendingCount();$('ostate').textContent=OWN.preview?T('o_pvnote'):T(d?'o_dirty_s':OWN.saved?'o_saved_s':'o_clean_s');
  $('ostt0').title=OWN.preview?'':T(d?'o_dirty':OWN.saved?'o_saved':'o_clean');
  $('ostt').hidden=!pc||OWN.preview;$('opend').innerHTML=`<b>${pc}</b><span class="lbl"> ${esc(T('o_pendn'))}</span>`;$('ostt').setAttribute('aria-label',pc+' '+T('o_pendn'));$('ostt').title=T('o_gopend');
  $('o-more-l').textContent=T('o_acc');$('o-more').setAttribute('aria-label',T('o_acc'));$('o-panel-l').textContent=T('o_panel');$('o-panel').setAttribute('aria-label',T('o_panel'));
  $('o-mfa').innerHTML=`${T('o_mfa')}<span class="soonb">${T('o_soon')}</span>`;$('o-phone').innerHTML=`${T('o_rphone')}<span class="soonb">${T('o_soon')}</span>`;$('o-logout-all').textContent=T('o_logout_all');
  renderPageTools();$('o-more').setAttribute('aria-label',T('o_more'));
  $('o-preview').textContent=T(OWN.preview?'o_pvexit':'o_preview');$('o-preview').setAttribute('aria-pressed',!!OWN.preview);$('o-discard').textContent=T('o_discall');$('o-logout').textContent=T('o_logout_here');$('o-save').textContent=T('o_save');
  $('o-publish').textContent=T('o_publish');$('o-logout').textContent=T('o_logout_here');$('o-pass').textContent=T('o_chpass');$('o-pass').hidden=OWN.local;$('o-pvexit').textContent=T('o_pvexit');
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
      if(f.type==='pair'){const ta=f.area,tag=(lang,v,sfx)=>ta?`<textarea id="${id}${sfx}"${lang==='en'?' dir="ltr"':''}>${esc(v)}</textarea>`:`<input type="text" id="${id}${sfx}" value="${esc(v)}"${lang==='en'?' dir="ltr"':''}>`;
        return `<fieldset class="pair"><legend class="l">${esc(f.label)}</legend><div class="cols"><div class="row"><label class="l2" for="${id}a">${T('o_ar')}</label>${tag('ar',f.value[0]||'','a')}</div><div class="row"><label class="l2" for="${id}b">English</label>${tag('en',f.value[1]||'','b')}</div></div></fieldset>`}
      if(f.type==='colors')return `<div class="cols"><div class="row"><label class="l" for="${id}a">${esc(f.labels[0])}</label><input type="color" id="${id}a" value="${f.value[0]}"></div><div class="row"><label class="l" for="${id}b">${esc(f.labels[1])}</label><input type="color" id="${id}b" value="${f.value[1]}"></div></div>`;
      return `<div class="row">${lab}<input type="${f.type||'text'}" id="${id}" value="${esc(f.value)}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${['tel','email','url','date'].includes(f.type)?' dir="ltr"':''}></div>`;
    }).join('');
    $('dlg-a').innerHTML=buttons.map((b,i)=>`<button class="btn${b.pri?' pri':''}" type="${b.pri?'submit':'button'}" data-bi="${i}" data-act="${esc(b.action)}">${esc(b.label)}</button>`).join('');
    const read=()=>fields.map((f,i)=>f.type==='pair'?[$('dlgf'+i+'a').value.trim(),$('dlgf'+i+'b').value.trim()]:f.type==='colors'?[$('dlgf'+i+'a').value,$('dlgf'+i+'b').value]:f.type==='checks'?[...$('dlgf'+i).querySelectorAll('input:checked')].map(x=>+x.value):$('dlgf'+i).value);
    const finish=v=>{$('dlg').hidden=true;$('dlgf').onsubmit=null;$('dlg-a').onclick=null;res(v)};
    $('dlg-a').onclick=e=>{const b=e.target.closest('[data-bi]');if(!b||b.type==='submit')return;finish({action:buttons[+b.dataset.bi].action,values:read()})};
    $('dlgf').onsubmit=e=>{e.preventDefault();const b=buttons.find(x=>x.pri);finish({action:b.action,values:read()})};
    dialog.msg=m=>{$('dlg-m').textContent=m;$('dlg-m').hidden=false};
    $('dlg').hidden=false;const first=$('dlg-b').querySelector('input,textarea,select');$('dlg').querySelector('.box').scrollTop=0;(first||$('dlg-a').querySelector('button')).focus();
  });
}
// Escape always means "cancel", never another button such as Delete
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dlg').hidden){e.preventDefault();$('dlg-a').querySelector('[data-act="cancel"]')?.click()}});

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
  const r=await dialog({title:T(isNew?'o_add':'o_feat'),fields:[{label:T('o_ftitle'),type:'pair',value:[x.t.ar,x.t.en]},{label:T('o_fdesc'),type:'pair',area:1,value:[x.d.ar,x.d.en]},{label:T('o_fst'),type:'select',options:STATUSES(),value:x.st},{label:T('o_fic'),type:'select',options:ICONS(),value:x.ic}],buttons:btns});
  if(r.action==='ok'){const [t,d,st,ic]=r.values;if(!t[0])return;
    const item={st,ic,t:{ar:t[0],en:t[1]},d:{ar:d[0],en:d[1]}};
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
async function confirmDel(info){const q=await dialog({title:T('o_delq'),info:info||'',buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_del'),action:'ok',pri:1}]});return q.action==='ok'}
const pairOf=o=>[(o&&o.ar)||'',(o&&o.en)||''];
const fromPair=p=>({ar:p[0],en:p[1]});
const KINDS=()=>[['',T('rt_auto')],['g',T('rt_g')],['o',T('rt_o')],['d',T('rt_d')],['s',T('rt_s')],['c',T('rt_c')],['x',T('rt_x')]];
/** Remove a source; it is also removed from every interaction / nutrient that cites it. */
async function delRef(id){
  const uses=[...(CFG.inter||[]).filter(x=>(x.r||[]).includes(id)).map(x=>x.a.ar+' + '+x.b.ar),...NCUST().filter(c=>(c.r||[]).includes(id)).map(c=>c.n.ar),...BUILTIN.filter(k=>(DEF_REFGROUP[k]||[]).includes(id)).map(k=>T('n_'+k))];
  if(!(await confirmDel(uses.length?T('o_rused')+' '+uses.join(L('، ',', ')):'')))return false;
  ensureRefs();CFG.refs=CFG.refs.filter(x=>x.id!==id);if(Array.isArray(CFG.inter))CFG.inter.forEach(x=>{x.r=(x.r||[]).filter(n=>n!==id)});NCUST().forEach(c=>{c.r=(c.r||[]).filter(n=>n!==id)});changed();return true}
function visRef(id){ensureRefs();const o=CFG.refs.find(x=>x.id===id);if(!o)return;o.hidden=!o.hidden;changed();toast(T(o.hidden?'o_hiddenok':'o_shownok'))}
async function editRef(id){
  ensureRefs();const isNew=id==null,o=isNew?{org:'',title:'',url:'',ar:'',en:'',kind:''}:CFG.refs.find(x=>x.id===id);if(!o)return;
  let v=[o.org,o.title,o.url,pairOf(o),o.kind||''];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'o_radd':'o_redit'),info:T('o_rinfo'),fields:[{label:T('o_rorg'),value:v[0]},{label:T('o_rtitle'),type:'textarea',value:v[1]},{label:T('o_rurl'),type:'url',value:v[2]},{label:T('o_ruse'),type:'pair',value:v[3]},{label:T('o_rkind'),type:'select',options:KINDS(),value:v[4]}],buttons:btns});
    if(r.action==='del'){await delRef(id);return}
    if(r.action!=='ok')return;
    v=[r.values[0].trim(),r.values[1].trim(),r.values[2].trim(),r.values[3],r.values[4]];
    if(!v[0]||!v[1]){toast(T('o_rneed'));continue}
    if(v[2]&&!/^https?:\/\//i.test(v[2])){toast(T('o_rbadurl'));continue}
    const item={id:isNew?Math.max(29,(OWN.nextRef||1)-1,...CFG.refs.map(x=>x.id))+1:id,org:v[0],title:v[1],url:v[2],ar:v[3][0],en:v[3][1],kind:v[4],hidden:!!o.hidden,rv:OWN.role==='owner'||OWN.local};
    if(isNew)CFG.refs.push(item);else CFG.refs[CFG.refs.findIndex(x=>x.id===id)]=item;
    changed();if(isNew)toast(T('o_radded')+' '+item.id);return;
  }
}
async function delInter(i){ensureInter();if(!CFG.inter[i])return;if(await confirmDel()){CFG.inter.splice(i,1);changed()}}
function visInter(i){ensureInter();const o=CFG.inter[i];if(!o)return;o.hidden=!o.hidden;changed();toast(T(o.hidden?'o_hiddenok':'o_shownok'))}
async function editInter(i){
  ensureInter();const isNew=i==null,o=isNew?null:CFG.inter[i];
  const nuts=KEYS.slice(1).map(k=>[k,kname(k)]);if(!nuts.length)return;
  let v=o?[o.k,o.sev||'moderate',pairOf(o.a),pairOf(o.b),pairOf(o.d),(o.r||[]).slice()]:[nuts[0][0],'moderate',['',''],['',''],['',''],[]];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'o_iadd':'o_iedit'),fields:[{label:T('o_inut'),type:'select',options:nuts,value:v[0]},{label:T('o_isev'),type:'select',options:[['major',T('sev_major')],['moderate',T('sev_moderate')],['minor',T('sev_minor')]],value:v[1]},{label:T('o_ia'),type:'pair',value:v[2]},{label:T('o_ib'),type:'pair',value:v[3]},{label:T('o_id'),type:'pair',area:1,value:v[4]},{label:T('o_isrc'),type:'checks',options:refOpts(),value:v[5]}],buttons:btns});
    if(r.action==='del'){await delInter(i);return}
    if(r.action!=='ok')return;
    v=[r.values[0],r.values[1],r.values[2],r.values[3],r.values[4],r.values[5]];
    if(!v[2][0])v[2]=[CUST[v[0]]?CUST[v[0]].n.ar:I18N['n_'+v[0]][0],v[2][1]||(CUST[v[0]]?CUST[v[0]].n.en:I18N['n_'+v[0]][1])];
    if(!v[3][0]||!v[4][0]){toast(T('o_ineed'));continue}
    if(!v[5].length){toast(T('o_srcneed'));continue}
    const item={k:v[0],sev:v[1],a:fromPair(v[2]),b:fromPair(v[3]),d:fromPair(v[4]),r:v[5],hidden:!!(o&&o.hidden),rv:OWN.role==='owner'||OWN.local};if(o&&o.id!=null)item.id=o.id;
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
/** Hide/show any nutrient card (built-in or added). Hidden ones disappear for visitors after publishing. */
function visNut(k){
  CFG.nut=CFG.nut||{hide:[],custom:[]};
  if(BUILTIN.includes(k)){toggleBuiltin(k);return}
  const c=NCUST().find(x=>x.id===k);if(!c)return;
  if(!c.hidden&&KEYS.length<=2){toast(T('o_nlast'));return}
  c.hidden=!c.hidden;changed();toast(T(c.hidden?'o_hiddenok':'o_shownok'))}
async function delNut(id){if(await confirmDel(T('o_ndelinfo'))){CFG.nut.custom=CFG.nut.custom.filter(c=>c.id!==id);if(Array.isArray(CFG.inter))CFG.inter=CFG.inter.filter(x=>x.k!==id);changed()}}
/** Built-in nutrients: the name and short description are editable texts (n_k, h_k); the dose logic stays in code. */
async function editBuiltin(k){
  const cur=key=>{const o=CFG.text[key];return [(o&&o.ar)||I18N[key][0],(o&&o.en)||I18N[key][1]]};
  const r=await dialog({title:T('o_bedit'),info:T('o_binfo'),fields:[{label:T('o_nname'),type:'pair',value:cur('n_'+k)},{label:T('o_nh'),type:'pair',value:cur('h_'+k)}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  const setT=(key,p)=>{const d=I18N[key];if(p[0]===d[0]&&p[1]===d[1])delete CFG.text[key];else CFG.text[key]={ar:p[0]||d[0],en:p[1]||d[1]}};
  if(r.action==='ok'){setT('n_'+k,r.values[0]);setT('h_'+k,r.values[1]);changed()}
  if(r.action==='reset'){delete CFG.text['n_'+k];delete CFG.text['h_'+k];changed()}
}
async function editNut(id){
  CFG.nut=CFG.nut||{hide:[],custom:[]};const isNew=id==null,o=isNew?null:CFG.nut.custom.find(c=>c.id===id);if(!isNew&&!o)return;
  let v=o?[pairOf(o.n),pairOf(o.h),o.uk||'mg',fmtRows(o.rows),pairOf(o.plan),pairOf(o.note),(o.r||[]).slice()]:[['',''],['',''],'mg','',['',''],['',''],[]];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'o_nadd':'o_nedit'),info:T('o_ninfo'),fields:[{label:T('o_nname'),type:'pair',value:v[0]},{label:T('o_nh'),type:'pair',value:v[1]},{label:T('o_nunit'),type:'select',options:UNITS(),value:v[2]},{label:T('o_nrows'),type:'textarea',value:v[3],ph:T('o_nrows_ph')},{label:T('o_nplan'),type:'pair',area:1,value:v[4]},{label:T('o_nnote'),type:'pair',area:1,value:v[5]},{label:T('o_isrc'),type:'checks',options:refOpts(),value:v[6]}],buttons:btns});
    if(r.action==='del'){await delNut(id);return}
    if(r.action!=='ok')return;
    v=[r.values[0],r.values[1],r.values[2],r.values[3],r.values[4],r.values[5],r.values[6]];
    if(!v[0][0]){toast(T('o_nneedname'));continue}
    const pr=parseRows(v[3]);if(pr.err){toast(T('o_nbadrow')+' '+pr.err);continue}
    if(!v[6].length){toast(T('o_srcneed'));continue}
    const nid=isNew?'c'+Date.now().toString(36).slice(-8):id;
    const item={id:nid,n:fromPair(v[0]),h:fromPair(v[1]),uk:v[2],u:UNITTXT[v[2]],rows:pr.rows,plan:fromPair(v[4]),note:fromPair(v[5]),r:v[6],rv:OWN.role==='owner'||OWN.local,hidden:!!(o&&o.hidden)};
    if(isNew)CFG.nut.custom.push(item);else CFG.nut.custom[CFG.nut.custom.findIndex(c=>c.id===id)]=item;
    if(isNew){K=nid}
    changed();return;
  }
}
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.ocard [role=button]')){e.preventDefault();e.target.click()}},true);
document.addEventListener('click',e=>{
  if(!OWN.on)return;const t=e.target.closest('[data-redit],#radd,[data-iedit],#iadd,[data-nhide],[data-nedit],#nadd,[data-approve],[data-approveall],[data-nvis],[data-ndel],[data-bedit],[data-ivis],[data-idel],[data-rvis],[data-rdel]');if(!t)return;
  e.preventDefault();e.stopPropagation();
  if(t.dataset.approveall)approveAll(t.dataset.approveall);
  else if(t.dataset.approve)approve(t.dataset.approve);
  else if(t.dataset.redit)editRef(+t.dataset.redit);
  else if(t.id==='radd')editRef(null);
  else if(t.dataset.iedit!=null)editInter(+t.dataset.iedit);
  else if(t.id==='iadd')editInter(null);
  else if(t.dataset.nhide)toggleBuiltin(t.dataset.nhide);
  else if(t.dataset.nvis)visNut(t.dataset.nvis);
  else if(t.dataset.ndel)delNut(t.dataset.ndel);
  else if(t.dataset.bedit)editBuiltin(t.dataset.bedit);
  else if(t.dataset.ivis!=null)visInter(+t.dataset.ivis);
  else if(t.dataset.idel!=null)delInter(+t.dataset.idel);
  else if(t.dataset.rvis)visRef(+t.dataset.rvis);
  else if(t.dataset.rdel)delRef(+t.dataset.rdel);
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
const settingsOf=c=>({nav:c.nav,pages:c.pages,brand:c.brand,review:c.review,contact:c.contact,colors:c.colors,text:c.text,roadmap:c.roadmap});
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
function setPreview(on){OWN.preview=on;document.body.classList.toggle('preview',on);closeMenu();refreshAll();ownerBar()}
$('o-preview').addEventListener('click',()=>setPreview(!OWN.preview));
/* "⋯" account menu (password, discard, log out) */
function closeMenu(){$('o-menu').hidden=true;$('o-more').setAttribute('aria-expanded','false')}
$('o-more').addEventListener('click',e=>{e.stopPropagation();const open=$('o-menu').hidden;$('o-menu').hidden=!open;$('o-more').setAttribute('aria-expanded',String(open));if(open)$('o-menu').querySelector('button:not([hidden])').focus()});
$('o-menu').addEventListener('click',closeMenu);
document.addEventListener('click',e=>{if(!e.target.closest('.omenu'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('o-menu').hidden){closeMenu();$('o-more').focus()}});
/* status button: jump to the first place with items awaiting review */
$('ostt').addEventListener('click',()=>{if(!pendingCount())return;const tab=NCUST().some(c=>c.rv===false)?'calc':(CFG.inter||[]).some(x=>x.rv===false)?'interactions':'sources';
  go(tab);setTimeout(()=>{const el=document.querySelector('#'+tab+' .bulk, #'+tab+' .pending');if(el){el.scrollIntoView({block:'center'})}},60)});$('o-pvexit').addEventListener('click',()=>setPreview(false));
addEventListener('beforeunload',e=>{if(OWN.on&&dirty()){e.preventDefault();e.returnValue=''}});

/* ===================== owner side panel (☰ لوحة المالك) =====================
   Opens from the side opposite the "⋯ More" menu. Groups the site-wide settings; edits go into the
   draft like everything else and reach visitors only after Publish. "Coming soon" lists planned sections. */
/* Owner side panel: main sections that open to show their sub-items (like WordPress / Shopify admin menus). */
const PANEL_OPEN=()=>{try{return JSON.parse(localStorage.getItem('vw-od')||'["site"]')}catch(e){return ['site']}};
function renderDrawer(){
  $('odrawer-t').textContent=T('o_panel');
  const open=PANEL_OPEN(),b=(id,label,cls='')=>`<button class="btn${cls}" type="button" data-pn="${id}">${label}</button>`;
  const row=(id,label,hint='',extra='')=>`<button class="odrow" type="button" data-pn="${id}"><span>${label}${hint?`<small>${hint}</small>`:''}</span>${extra}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>`;
  const soon=k=>`<div class="odrow soon"><span>${T(k)}</span><span class="soonb">${T('o_soon')}</span></div>`;
  const grp=(id,icon,title,body)=>`<details class="odg" data-g="${id}"${open.includes(id)?' open':''}><summary><span class="odi">${icon}</span>${title}</summary><div class="odsub">${body}</div></details>`;
  const I=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${p}</svg>`;
  const rs=reviewText(),pend=pendingCount();
  const navRows=(CFG.nav||[]).map((n,i)=>{const pg=n.id.startsWith('pg-')?(CFG.pages||[]).find(p=>'pg-'+p.id===n.id):null;if(n.id.startsWith('pg-')&&(!pg||!pg.nav))return '';
    const t=$('t-'+n.id),key=t&&t.querySelector('.full')?t.querySelector('.full').dataset.t:'',lb=txl(n.l)||(pg?pageTitle(pg):(key?T(key):n.id));
    return `<li class="${n.hidden?'off':''}"><span>${esc(lb)}${n.hidden?` <em class="ohtag">${T('o_hidden')}</em>`:''}</span><span class="mini">${b('nup:'+i,'↑',' sm')}${b('ndn:'+i,'↓',' sm')}${b('nren:'+i,T('o_rename'),' sm')}${n.id!=='calc'?b('nvis:'+i,T(n.hidden?'o_nshow':'o_nhide'),' sm'):''}</span></li>`}).join('');
  const pageRows=(CFG.pages||[]).map(p=>`<li class="${p.hidden?'off':''}"><span>${esc(pageTitle(p)||'—')}<small>${[p.nav?T('pg_where_nav'):'',p.foot?T('pg_where_foot'):''].filter(Boolean).join(' · ')||T('pg_where_none')}${p.hidden?' · '+T('o_hidden'):''}</small></span><span class="mini">${b('pedit:'+p.id,T('o_edit'),' sm')}${b('pvis:'+p.id,T(p.hidden?'o_nshow':'o_nhide'),' sm')}${b('pdel:'+p.id,T('o_del'),' sm odel')}</span></li>`).join('');
  $('odrawer-b').innerHTML=
   grp('site',I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),T('o_g_site'),
     `<div class="odcard"><h4>${T('o_p_brand')}</h4><div class="bprev" aria-hidden="true"><span class="mk">${markHTML()}</span><span class="wm">${wordHTML()}</span></div><p class="hint">${T('o_p_brand_h')}</p><div class="odbtns">${b('name',T('o_p_name'))}${b('logo',T('o_p_logo'))}${CFG.brand&&CFG.brand.logo?b('logo0',T('o_p_logo0')):''}</div></div>`+
     `<div class="odcard"><h4>${T('o_g_nav')}</h4><p class="hint">${T('o_g_nav_h')}</p><ul class="odlist">${navRows}</ul><div class="odbtns">${b('nreset',T('o_reset'))}</div></div>`+
     `<div class="odcard"><h4>${T('o_g_pages')}</h4><p class="hint">${T('o_g_pages_h')}</p><ul class="odlist">${pageRows||`<li class="off">${T('pg_none')}</li>`}</ul><div class="odbtns">${b('padd','+ '+T('pg_add'),' pri')}${b('preset',T('pg_restore'))}</div></div>`+
     row('t:by',T('o_g_footer'),T('o_p_by'))+row('colors',T('o_g_look'),T('o_g_look_h')))+
   grp('med',I('<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>'),T('o_g_med'),
     row('go:calc',T('o_g_nuts'),T('o_g_nuts_h'))+row('go:interactions',T('o_g_inter'),T('o_g_inter_h'))+row('go:sources',T('o_g_srcs'),T('o_g_srcs_h'))+
     row('review',T('o_p_review'),rs?esc(rs):T('o_p_review_none'))+row('t:disc_all',T('o_p_disc'))+(pend?row('pending',T('o_g_pending'),'',`<span class="cnt">${pend}</span>`):'')+soon('o_s_review'))+
   grp('contact',I('<path d="M4 5h16v12H7l-3 3z"/>'),T('o_g_contact'),row('contact',T('o_contact'),esc([EMAILF(),PHONEF()].filter(Boolean).join(' · '))))+
   grp('tools',I('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.5-.4-.4-2.5z"/>'),T('o_p_tools'),row('links',T('o_p_links'),T('o_p_links_h'))+soon('o_s_translate'))+
   grp('history',I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),T('o_g_history'),soon('o_s_history')+soon('o_s_trash'))+
   grp('team',I('<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.7"/>'),T('o_g_team'),soon('o_s_team'));
  $('odrawer-b').querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{const o=[...$('odrawer-b').querySelectorAll('details[open]')].map(x=>x.dataset.g);try{localStorage.setItem('vw-od',JSON.stringify(o))}catch(e){}}));
}
function openDrawer(){renderDrawer();$('odrawer').hidden=false;$('odrawer-bg').hidden=false;$('o-panel').setAttribute('aria-expanded','true');document.body.classList.add('drawer-open');$('odrawer-x').focus()}
function closeDrawer(){$('odrawer').hidden=true;$('odrawer-bg').hidden=true;$('o-panel').setAttribute('aria-expanded','false');document.body.classList.remove('drawer-open')}
$('o-panel').addEventListener('click',()=>{closeMenu();$('odrawer').hidden?openDrawer():closeDrawer()});
$('odrawer-x').addEventListener('click',closeDrawer);$('odrawer-bg').addEventListener('click',closeDrawer);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('odrawer').hidden&&$('dlg').hidden){closeDrawer();$('o-panel').focus()}});
$('odrawer-b').addEventListener('click',async e=>{
  const t=e.target.closest('[data-pn]');if(!t)return;const k=t.dataset.pn,[cmd,arg]=k.split(/:(.*)/s);
  if(k==='name')await editBrandName();
  else if(k==='logo')$('o-logo-file').click();
  else if(k==='logo0'){CFG.brand.logo='';changed()}
  else if(k==='review')await editReview();
  else if(cmd==='t')await editText(arg);
  else if(k==='contact')await editContact();
  else if(k==='colors')await pickColors();
  else if(k==='links')await runLinkCheck();
  else if(cmd==='go'){closeDrawer();go(arg);return}
  else if(k==='pending'){closeDrawer();$('ostt').click();return}
  else if(cmd==='nup'||cmd==='ndn')moveNav(+arg,cmd==='nup'?-1:1);
  else if(cmd==='nren')await renameNav(+arg);
  else if(cmd==='nvis'){const n=CFG.nav[+arg];if(n&&n.id!=='calc'){n.hidden=!n.hidden;changed()}}
  else if(k==='nreset'){CFG.nav=clone(DEFAULT_CFG.nav).concat((CFG.pages||[]).filter(p=>p.nav).map(p=>({id:'pg-'+p.id})));changed()}
  else if(k==='padd')await editPage(null);
  else if(cmd==='pedit')await editPage(arg);
  else if(cmd==='pvis'){const p=(CFG.pages||[]).find(x=>x.id===arg);if(p){p.hidden=!p.hidden;changed()}}
  else if(cmd==='pdel')await delPage(arg);
  else if(k==='preset'){const have=new Set((CFG.pages||[]).map(p=>p.id));CFG.pages=(CFG.pages||[]).concat(clone(DEFAULT_CFG.pages).filter(p=>!have.has(p.id)));changed();toast(T('pg_restored'))}
  if(!$('odrawer').hidden)renderDrawer();
});
/* ----- main menu builder ----- */
function moveNav(i,d){const a=CFG.nav;if(!a[i])return;
  // skip entries that are not listed in the panel (pages without a tab)
  let k=i+d;while(a[k]&&a[k].id.startsWith('pg-')&&!(CFG.pages||[]).some(p=>'pg-'+p.id===a[k].id&&p.nav))k+=d;
  if(k<0||k>=a.length)return;[a[i],a[k]]=[a[k],a[i]];changed()}
async function renameNav(i){const n=CFG.nav[i];if(!n)return;const t=$('t-'+n.id),key=t&&t.querySelector('.full')?t.querySelector('.full').dataset.t:'';
  const pg=n.id.startsWith('pg-')?(CFG.pages||[]).find(p=>'pg-'+p.id===n.id):null;
  const def=key?[I18N[key][0],I18N[key][1]]:pg?[pageTitle(pg),pageTitle(pg)]:['',''];
  const r=await dialog({title:T('o_rename'),info:T('o_rename_i'),fields:[{label:T('o_g_tabname'),type:'pair',value:[(n.l&&n.l.ar)||def[0],(n.l&&n.l.en)||def[1]]}],buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='reset'){delete n.l;changed();return}
  if(r.action!=='ok')return;const v=r.values[0];if(!v[0]){toast(T('o_p_name_need'));return}
  if(v[0]===def[0]&&v[1]===def[1])delete n.l;else n.l={ar:v[0],en:v[1]||v[0]};changed()}
/* ----- pages manager: add / edit / hide / delete pages (About, Privacy, Who we are, anything new) ----- */
const WHERE=()=>[['foot',T('pg_where_foot')],['nav',T('pg_where_nav')],['both',T('pg_where_both')],['none',T('pg_where_none')]];
async function editPage(id){
  CFG.pages=CFG.pages||[];const isNew=id==null,p=isNew?{id:'p'+Date.now().toString(36).slice(-7),t:{ar:'',en:''},b:{ar:'',en:''},foot:true}:CFG.pages.find(x=>x.id===id);if(!p)return;
  let tv,bv;
  if(p.sys){const g=k=>{const o=CFG.text[k];return [(o&&o.ar)||I18N[k][0],(o&&o.en)||I18N[k][1]]};tv=g(p.sys+'_t');bv=g(p.sys+'_b')}
  else{tv=[(p.t&&p.t.ar)||'',(p.t&&p.t.en)||''];bv=[(p.b&&p.b.ar)||'',(p.b&&p.b.en)||'']}
  const where=p.nav&&p.foot?'both':p.nav?'nav':p.foot?'foot':'none';
  const r=await dialog({title:T(isNew?'pg_add':'pg_edit'),info:T('pg_info'),fields:[{label:T('o_pt_title'),type:'pair',value:tv},{label:T('pg_body'),type:'pair',area:1,value:bv},{label:T('pg_where'),type:'select',options:WHERE(),value:where}],
    buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action!=='ok')return;const [t,bd,w]=r.values;if(!t[0]){toast(T('o_p_name_need'));return}
  if(p.sys){const setT=(k,v)=>{const d=I18N[k];if(v[0]===d[0]&&v[1]===d[1])delete CFG.text[k];else CFG.text[k]={ar:v[0]||d[0],en:v[1]||d[1]}};setT(p.sys+'_t',t);setT(p.sys+'_b',bd)}
  else{p.t={ar:t[0],en:t[1]};p.b={ar:bd[0],en:bd[1]}}
  p.foot=w==='foot'||w==='both';p.nav=w==='nav'||w==='both';if(isNew)p.hidden=false;
  CFG.nav=CFG.nav||clone(DEFAULT_CFG.nav);const nid='pg-'+p.id,has=CFG.nav.some(n=>n.id===nid);
  if(p.nav&&!has)CFG.nav.push({id:nid});if(!p.nav&&has)CFG.nav=CFG.nav.filter(n=>n.id!==nid);
  if(isNew)CFG.pages.push(p);changed();
}
async function delPage(id){if(!(await confirmDel(T('pg_delinfo'))))return;CFG.pages=(CFG.pages||[]).filter(p=>p.id!==id);CFG.nav=(CFG.nav||[]).filter(n=>n.id!=='pg-'+id);changed()}

async function editBrandName(){
  const b=CFG.brand||(CFG.brand={n1:'VITA',n2:'WAW',logo:''});
  const r=await dialog({title:T('o_p_name'),info:T('o_p_name_i'),fields:[{label:T('o_p_n1'),value:b.n1||''},{label:T('o_p_n2'),value:b.n2||''}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='reset'){b.n1='VITA';b.n2='WAW';changed();return}
  if(r.action!=='ok')return;const n1=r.values[0].trim(),n2=r.values[1].trim();
  if(!(n1+n2)){toast(T('o_p_name_need'));return}if([...(n1+n2)].length>16){toast(T('o_p_name_long'));return}
  b.n1=n1;b.n2=n2;changed();
}
/* logo: any picture is fitted (not stretched) into a square, saved small, and shown at the built-in mark's size */
$('o-logo-file').addEventListener('change',async()=>{
  const f=$('o-logo-file').files[0];$('o-logo-file').value='';if(!f)return;
  if(f.size>5*1024*1024){toast(T('o_p_logo_big'));return}
  try{
    const url=URL.createObjectURL(f),img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url});
    const S=128,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
    const sc=Math.min(S/img.naturalWidth,S/img.naturalHeight)||1,w=img.naturalWidth*sc,h=img.naturalHeight*sc;g.drawImage(img,(S-w)/2,(S-h)/2,w,h);URL.revokeObjectURL(url);
    let d=c.toDataURL('image/png');if(d.length>60000)d=c.toDataURL('image/webp',.86);
    if(d.length>110000){toast(T('o_p_logo_big'));return}
    CFG.brand=CFG.brand||{n1:'VITA',n2:'WAW'};CFG.brand.logo=d;changed();if(!$('odrawer').hidden)renderDrawer();toast(T('o_p_logo_ok'));
  }catch(err){toast(T('o_p_logo_bad'))}
});
async function editReview(){
  const v=CFG.review||(CFG.review={});const p=o=>[(o&&o.ar)||'',(o&&o.en)||''];
  const r=await dialog({title:T('o_p_review'),info:T('o_p_review_i'),fields:[{label:T('o_p_ph'),type:'pair',value:p(v.ph)},{label:T('o_p_phr'),type:'pair',value:p(v.phr)},{label:T('o_p_sup'),type:'pair',value:p(v.sup)},{label:T('o_p_supr'),type:'pair',value:p(v.supr)},{label:T('rev_date'),type:'date',value:v.date||''}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='reset'){CFG.review=clone(DEFAULT_CFG.review);changed();return}
  if(r.action!=='ok')return;const f=x=>({ar:x[0],en:x[1]});
  CFG.review={ph:f(r.values[0]),phr:f(r.values[1]),sup:f(r.values[2]),supr:f(r.values[3]),date:r.values[4]||''};changed();
}
async function pickColors(){
  const pages=BUILTIN_PAGES.filter(p=>!(CFG.nav||[]).some(n=>n.id===p&&n.hidden)).map(p=>[p,T('tab_'+({calc:'calc',interactions:'int',tools:'tools',sources:'src',roadmap:'rm'})[p])]);
  const r=await dialog({title:T('o_colors'),fields:[{label:T('o_p_page'),type:'select',options:pages,value:cur}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok')await editColors(r.values[0]);
}
/* link check runs on our worker (the browser cannot open other sites); only signed-in team members may use it */
async function runLinkCheck(){
  if(OWN.local||!OWN.client){toast(T('o_p_links_local'));return}
  const ids=Object.entries(REFS).filter(([,x])=>/^https?:\/\//.test(x[2]||'')).map(([n])=>+n);if(!ids.length)return;
  const {data}=await OWN.client.auth.getSession();const tok=data&&data.session&&data.session.access_token;if(!tok){toast(T('o_neterr'));return}
  toast(T('o_p_links_run'));const out=[];
  for(let i=0;i<ids.length;i+=15){
    try{const r=await fetch('/api/check-links',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({ids:ids.slice(i,i+15)})});
      if(!r.ok){toast(T('o_neterr'));return}out.push(...(await r.json()).results)}catch(e){toast(T('o_neterr'));return}
  }
  const bad=out.filter(x=>!x.ok),blocked=bad.filter(x=>x.status===401||x.status===403||x.status===429),broken=bad.filter(x=>!blocked.includes(x));
  const row=x=>`<li><b>${x.id}</b> · ${esc(REFS[x.id]?REFS[x.id][0]:'')} — <span class="${x.ok?'okc':'badc'}">${x.status||T('o_p_links_err')}</span><br><a href="${esc(REFS[x.id]?REFS[x.id][2]:'')}" target="_blank" rel="noopener">${esc(REFS[x.id]?REFS[x.id][1]:'')}</a></li>`;
  showInfo(T('o_p_links'),`<p>${T('o_p_links_sum').replace('{ok}',out.length-bad.length).replace('{n}',out.length)}</p>`+
    (broken.length?`<h3>${T('o_p_links_broken')}</h3><ul class="lchk">${broken.map(row).join('')}</ul>`:'')+
    (blocked.length?`<h3>${T('o_p_links_blocked')}</h3><p class="meta">${T('o_p_links_blocked_h')}</p><ul class="lchk">${blocked.map(row).join('')}</ul>`:''));
}

/* ===================== page toolbar (under the main tabs) =====================
   Each main page has its own tools; nothing here affects the other pages. */
const HEROKEYS={calc:['hc_t','hc_l'],tools:['ht_t','ht_l'],interactions:['ti_t','hi_l'],sources:['ts_t','hs_l'],roadmap:['rm_t','rm_l']};
const PT_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
function renderPageTools(){
  if(!OWN.on){$('ptools').innerHTML='';return}
  const p=cur,b=(id,label,extra='')=>`<button class="btn${extra}" type="button" data-pt="${id}">${label}</button>`;
  const pend=t=>{const n=t==='n'?NCUST().filter(c=>c.rv===false).length:t==='i'?(CFG.inter||[]).filter(x=>x.rv===false).length:(CFG.refs||[]).filter(x=>x.rv===false).length;
    return n&&CANAPPROVE()?b('appr:'+t,`${T('o_approveall')}<span class="cnt">${n}</span>`):''};
  const name=document.querySelector(`#t-${p} .full`);const head=`<span class="ptl">${PT_ICON}<span>${T('o_pt_edit').replace('{p}',esc(name?name.textContent:p))}</span></span>`;
  let items=[];
  if(p==='calc')items=[b('nadd','+ '+T('o_pt_nut')),pend('n')];
  else if(p==='interactions')items=[b('iadd','+ '+T('o_pt_inter')),pend('i'),b('pendonly',T('o_pt_pendonly'),OWN.pendOnly?' on':'')];
  else if(p==='sources')items=[b('radd','+ '+T('o_pt_src')),pend('r'),b('links',T('o_p_links'))];
  else if(p==='roadmap')items=[b('rmadd','+ '+T('o_pt_feat'))];
  if(HEROKEYS[p])items.push(b('hero',T('o_pt_hero')),b('color',T('o_colors')));
  $('ptools').innerHTML=head+items.join('');
}
$('ptools').addEventListener('click',async e=>{
  const t=e.target.closest('[data-pt]');if(!t)return;const k=t.dataset.pt,p=cur;
  if(k==='nadd')editNut(null);else if(k==='iadd')editInter(null);else if(k==='radd')editRef(null);else if(k==='rmadd')editFeature(null);
  else if(k.startsWith('appr:'))approveAll(k.slice(5));
  else if(k==='pendonly'){OWN.pendOnly=!OWN.pendOnly;renderInter();renderPageTools()}
  else if(k==='links')runLinkCheck();
  else if(k==='hero')editHero(p);
  else if(k==='color')editColors(p);
});
/** Page title + description, Arabic and English, in one window. */
async function editHero(p){
  const [kt,kl]=HEROKEYS[p],cur2=key=>{const o=CFG.text[key];return [(o&&o.ar)||I18N[key][0],(o&&o.en)||I18N[key][1]]};
  const r=await dialog({title:T('o_pt_hero'),fields:[{label:T('o_pt_title'),type:'pair',value:cur2(kt)},{label:T('o_pt_desc'),type:'pair',area:1,value:cur2(kl)}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  const setT=(key,v)=>{const d=I18N[key];if(v[0]===d[0]&&v[1]===d[1])delete CFG.text[key];else CFG.text[key]={ar:v[0]||d[0],en:v[1]||d[1]}};
  if(r.action==='ok'){setT(kt,r.values[0]);setT(kl,r.values[1]);changed()}
  if(r.action==='reset'){delete CFG.text[kt];delete CFG.text[kl];changed()}
}
/* ===================== account menu (👤) ===================== */
async function fillAccount(){
  $('o-acc-role').textContent=T(OWN.local?'o_local':OWN.role==='owner'?'o_owner':'o_editor');
  if(OWN.local||!OWN.client){$('o-acc-mail').textContent='';$('o-acc-last').textContent='';return}
  try{const {data}=await OWN.client.auth.getUser();const u=data&&data.user;if(!u)return;
    $('o-acc-mail').textContent=u.email||'';
    $('o-acc-last').textContent=u.last_sign_in_at?T('o_lastin')+' '+new Date(u.last_sign_in_at).toLocaleString(LANG==='ar'?'ar-u-nu-latn':'en-GB',{dateStyle:'medium',timeStyle:'short'}):''}catch(e){}
}
$('o-more').addEventListener('click',()=>{if(!$('o-menu').hidden)fillAccount()});
$('o-logout-all').addEventListener('click',async()=>{
  const q=await dialog({title:T('o_logout_all'),info:T('o_logout_all_i'),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_logout_all'),action:'ok',pri:1}]});
  if(q.action!=='ok')return;
  if(OWN.on&&dirty()&&!(await saveDraft()))return;
  try{if(OWN.client)await OWN.client.auth.signOut({scope:'global'})}catch(e){}
  OWN.client=null;await logout();toast(T('o_logout_all_ok'));
});
