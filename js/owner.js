/* VITAWAW · js/owner.js
   Owner/editor mode: login (Supabase Auth, invite-only), editing dialogs, review/approve, save draft,
   publish, preview, password change. The Supabase library is downloaded only when someone logs in.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== owner mode ===================== */
const OWN={on:false,local:false,role:null,client:null,base:'',preview:false,perms:{},name:''};
// texts editable from their own page
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2200)}
function cfgJSON(){return JSON.stringify({contact:CFG.contact,colors:CFG.colors,text:CFG.text,roadmap:CFG.roadmap,pages:CFG.pages,nutOrder:CFG.nutOrder,brand:CFG.brand,review:CFG.review,menus:CFG.menus,tools:CFG.tools,medcat:CFG.medcat||null,look:CFG.look,refs:CFG.refs,inter:CFG.inter,nut:CFG.nut})}
function dirty(){return cfgJSON()!==OWN.base}
function ownerBar(){
  $('owho').textContent=whoLabel();
  const d=dirty();$('odot').classList.toggle('dirty',d||OWN.saved);
  const st=d?'o_dirty':OWN.saved?'o_saved':'o_clean';$('ostate').textContent=T(innerWidth<600?st+'_s':st);
  const nar=innerWidth<600;$('o-save').textContent=T(nar?'o_save_s':ISOWNER()?'o_save':'mr_savemine');$('o-publish').textContent=T('o_publish');$('o-pvexit').textContent=T('o_pvexit');
  $('o-preview-l').textContent=T('o_preview');$('o-preview').title=$('o-preview').ariaLabel=T('o_preview');$('o-discard').title=$('o-discard').ariaLabel=T('o_discard');$('o-discard-l').textContent=T('o_discard_s');
  $('o-publish').hidden=$('o-preview').hidden=$('o-sizes').hidden=!ISOWNER();$('o-undo').disabled=!UNDO.length;$('o-undo').title=$('o-undo').ariaLabel=T('ud_t');$('o-undo-l').textContent=T('ud_s');$('o-sizes-l').textContent=T('sz_btn');$('o-sizes').title=T('sz_t');
  $('o-texts').hidden=!!OWN.preview;$('o-texts-l').textContent=T('o_texts');$('o-texts').title=T('o_texts_t');$('o-texts').setAttribute('aria-pressed',document.body.classList.contains('textedit'));
  // what this account may edit: hides the edit buttons it cannot use (the database refuses them anyway)
  ['nut','inter','refs','text'].forEach(k=>document.body.classList.toggle('cant-'+k,!CAN(k)));
  document.body.classList.toggle('not-owner',!ISOWNER());
  renderNav();
}
/** 1.16.0: the page as visitors will see it after publishing, on a phone, an iPad and a computer, side by side in one window.
   The frame loads this same site (?frame=1): it never signs in and shows the draft that is put in localStorage just before. */
const SZ=[['phone',390,844],['ipad',820,1180],['pc',1366,900]];let SZK='phone';
function openSizes(){
  try{localStorage.setItem('vw-frame',cfgJSON())}catch(e){toast(T('o_neterr'));return}
  let w=$('szwrap');if(!w){w=document.createElement('div');w.id='szwrap';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');document.body.appendChild(w)}
  w.innerHTML=`<div class="szbar"><div class="sztop"><b>${esc(T('sz_t'))}</b><button type="button" class="btn" id="szx" aria-label="${esc(L('إغلاق','Close'))}">✕</button></div><div class="filters szsizes">${SZ.map(([k])=>`<button type="button" data-szk="${k}" aria-pressed="${k===SZK}">${esc(T('sz_'+k))}</button>`).join('')}</div></div><div class="szstage"><iframe id="szf" title="${esc(T('sz_t'))}" src="./?frame=1#${esc(cur==='menu'?'calc':cur)}"></iframe></div>`;
  w.hidden=false;document.body.style.overflow='hidden';sizeFrame();$('szx').focus();
}
function sizeFrame(){const f=$('szf'),st=document.querySelector('#szwrap .szstage');if(!f||!st)return;const [,fw,fh]=SZ.find(x=>x[0]===SZK);
  const sc=Math.min(1,(st.clientWidth-16)/fw,(st.clientHeight-16)/fh);f.style.width=fw+'px';f.style.height=fh+'px';f.style.transform=`scale(${sc})`;f.parentNode.style.setProperty('--szh',Math.round(fh*sc)+'px')}
function closeSizes(){const w=$('szwrap');if(w){w.hidden=true;w.innerHTML=''}document.body.style.overflow='';try{localStorage.removeItem('vw-frame')}catch(e){}$('o-sizes').focus()}
document.addEventListener('click',e=>{const k=e.target.closest('[data-szk]');if(k){SZK=k.dataset.szk;document.querySelectorAll('[data-szk]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.szk===SZK));sizeFrame();return}if(e.target.closest('#szx'))closeSizes()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('szwrap')&&!$('szwrap').hidden&&$('dlg').hidden){e.stopImmediatePropagation();closeSizes()}},true);
addEventListener('resize',()=>{if($('szwrap')&&!$('szwrap').hidden)sizeFrame()});
function setPreview(on){OWN.preview=on;document.body.classList.toggle('preview',on);refreshAll()}
/* 1.16.0 «تراجع»: every change keeps the state before it (up to 30 steps), so the last change can be taken back.
   Auto-save: a minute after the last change the draft is saved by itself (never while a window or a save is open). */
let UNDO=[],UNDO_LAST=null,AUTOSAVE=null;
function undoReset(){UNDO=[];UNDO_LAST=null}
function changed(){
  if(OWN.on){const now=cfgJSON();if(UNDO_LAST==null)UNDO_LAST=OWN.base||now;if(now!==UNDO_LAST){UNDO.push(UNDO_LAST);if(UNDO.length>30)UNDO.shift();UNDO_LAST=now}}
  refreshAll();ownerBar();autoSave();
}
function undoLast(){
  if(!UNDO.length){toast(T('ud_none'));return}
  const prev=UNDO.pop(),o=JSON.parse(prev);Object.keys(o).forEach(k=>{CFG[k]=o[k]});UNDO_LAST=prev;
  refreshAll();ownerBar();autoSave();toast(T('ud_done'));
}
function autoSave(){
  clearTimeout(AUTOSAVE);if(!OWN.on||OWN.local||OWN.preview||!dirty())return;
  AUTOSAVE=setTimeout(()=>{if(!OWN.on||!dirty()||OWN.busy||!$('dlg').hidden||(SHEET&&SHEET.key==='look')){autoSave();return}
    locked(async()=>{if(await _saveDraft())toast(T('as_done'))})},60000);
}
function decorate(){
  document.querySelectorAll('.edp').forEach(b=>b.remove());
  document.querySelectorAll('[data-ed]').forEach(el=>el.removeAttribute('data-ed'));
  if(!OWN.on)return;
  // 1.13.0: a pen next to every heading and explanation with an interface text (inside buttons, links and labels the pen would
  // break the click: those texts are changed from Menu → Site appearance → «Edit every text in the app»)
  if(CAN('text'))[...new Set([...EDITABLE,...[...document.querySelectorAll('[data-t]')].map(e=>e.dataset.t).filter(TXOK)])].forEach(k=>document.querySelectorAll(`[data-t="${k}"]`).forEach(el=>{
    if(el.closest('.tabs'))return; // section names: Menu → Management → Arrange the menus
    if(!EDITABLE.includes(k)&&el.closest('button,a,label,select,option,summary,#picker,#sheet,#dlg,.obar,#obar'))return;
    el.setAttribute('data-ed','');
    const b=document.createElement('button');b.type='button';b.className='edp';b.innerHTML=PEN;b.title=T('o_edit');b.dataset.edtext=k;
    el.after(b);
  }));
  document.querySelectorAll('.hero .hi').forEach(h=>{const page=h.closest('.page').id;const b=document.createElement('button');b.type='button';b.className='edp';b.title=T('o_colors');b.dataset.edcolor=page;
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/></svg>';h.appendChild(b)});
  // contact details are edited from the roadmap's contact card (and Menu → management)
  const c=document.querySelector('#roadmap .contact h2');if(c){const b=document.createElement('button');b.type='button';b.className='edp';b.title=T('o_contact');b.dataset.edcontact='1';b.innerHTML=PEN;c.appendChild(b)}
  const fl=$('flogos');if(fl){const b3=document.createElement('button');b3.type='button';b3.className='edp';b3.title=T('br_t');b3.dataset.edbrand='1';b3.innerHTML=PEN;fl.after(b3)}
}

/* ----- generic dialog ----- */
/** err: {i: field index, msg} shows the problem under that field (or {msg} for the whole form) */
function dialog({title,fields=[],info='',buttons,err=null,two=false}){
  return new Promise(res=>{
    $('dlg-t').textContent=title;$('dlg-m').hidden=!(err&&err.i==null);$('dlg-m').textContent=err&&err.i==null?err.msg:'';
    $('dlg-b').innerHTML=(info?`<p class="info">${esc(info)}</p>`:'')+fields.map((f,i)=>{
      const id='dlgf'+i,lab=`<label class="l" for="${id}">${esc(f.label)}</label>`;
      if(f.type==='image')return `<div class="row">${lab}<div class="imgf"><span class="imgp">${f.value?`<img src="${esc(f.value)}" alt="">`:(f.empty||'')}</span><input type="file" id="${id}" accept="image/png,image/jpeg,image/webp">${f.value?`<label class="ck"><input type="checkbox" id="${id}x"><span>${esc(T('br_remove'))}</span></label>`:''}</div></div>`;
      if(f.type==='html')return f.html;
      if(f.type==='qr')return `<div class="row qr"><img src="${esc(f.value[0])}" alt="QR" width="180" height="180"><code dir="ltr">${esc(f.value[1])}</code></div>`;
      if(f.type==='textarea')return `<div class="row">${lab}<textarea id="${id}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.ltr?' dir="ltr"':''}>${esc(f.value)}</textarea></div>`;
      if(f.type==='checks')return `<div class="row"><label class="l" for="${id}">${esc(f.label)}</label><div class="checks" id="${id}">${f.options.map(o=>`<label class="ck"><input type="checkbox" value="${o[0]}"${f.value.includes(o[0])?' checked':''}><span>${esc(o[1])}</span></label>`).join('')}</div></div>`;
      if(f.type==='select')return `<div class="row">${lab}<select id="${id}">${f.options.map(o=>`<option value="${o[0]}"${o[0]===f.value?' selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;
      if(f.type==='colors')return `<div class="cols"><div class="row"><label class="l" for="${id}a">${esc(f.labels[0])}</label><input type="color" id="${id}a" value="${f.value[0]}"></div><div class="row"><label class="l" for="${id}b">${esc(f.labels[1])}</label><input type="color" id="${id}b" value="${f.value[1]}"></div></div>`;
      if(f.type==='password')return `<div class="row">${lab}<div class="pw"><input type="password" id="${id}" value="" dir="ltr" autocomplete="${f.rules?'new-password':f.ac||'current-password'}"${f.rules?' data-pwr="1"':''}><button type="button" class="btn peye" data-peye="${id}" aria-label="${esc(T('pw_show'))}" title="${esc(T('pw_show'))}">${EYE}</button></div>${f.rules?`<ul class="pwr" id="${id}r">${PWRULES.map(([k])=>`<li data-r="${k}">${esc(T('pwr_'+k))}</li>`).join('')}</ul>`:''}</div>`;
      return `<div class="row">${lab}<input type="${f.type||'text'}" id="${id}" value="${esc(f.value)}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.ltr||['tel','email','url'].includes(f.type)?' dir="ltr"':''}></div>`;
    }).join('');
    if(err&&err.i!=null){const f=$('dlgf'+err.i)||$('dlgf'+err.i+'a');const row=f&&f.closest('.row');if(row){row.classList.add('bad');row.insertAdjacentHTML('beforeend',`<p class="ferr" role="alert">${esc(err.msg)}</p>`)}}
    $('dlg-a').classList.toggle('two',!!two);
    $('dlg-a').innerHTML=buttons.map((b,i)=>`<button class="btn${b.pri?' pri':''}${b.danger?' danger':''}" type="${b.pri?'submit':'button'}" data-bi="${i}">${esc(b.label)}</button>`).join('');
    const read=()=>fields.map((f,i)=>f.type==='qr'||f.type==='html'?null:f.type==='image'?{file:$('dlgf'+i).files[0]||null,remove:!!($('dlgf'+i+'x')&&$('dlgf'+i+'x').checked)}:f.type==='colors'?[$('dlgf'+i+'a').value,$('dlgf'+i+'b').value]:f.type==='checks'?[...$('dlgf'+i).querySelectorAll('input:checked')].map(x=>+x.value):$('dlgf'+i).value);
    const finish=v=>{$('dlg').hidden=true;$('dlgf').onsubmit=null;$('dlg-a').onclick=null;res(v)};
    $('dlg-a').onclick=e=>{const b=e.target.closest('[data-bi]');if(!b||b.type==='submit')return;finish({action:buttons[+b.dataset.bi].action,values:read()})};
    $('dlgf').onsubmit=e=>{e.preventDefault();const b=buttons.find(x=>x.pri);finish({action:b.action,values:read()})};
    dialog.msg=m=>{$('dlg-m').textContent=m;$('dlg-m').hidden=false};
    dialog.cancel=()=>finish({action:'cancel',values:read()});
    $('dlg').hidden=false;const bad=$('dlg-b').querySelector('.row.bad input,.row.bad textarea,.row.bad select,.row.bad .checks input');const first=bad||$('dlg-b').querySelector('input,textarea,select');
    (first||$('dlg-a').querySelector('button')).focus();if(bad)bad.closest('.row').scrollIntoView({block:'center'});
  });
}
// Escape = Cancel (never Reset or Delete), and only the dialog closes, not the window underneath
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dlg').hidden&&dialog.cancel){e.stopImmediatePropagation();dialog.cancel()}});

/* ----- editors ----- */
async function editText(k){
  const cur=CFG.text[k]||{},defAr=I18N[k][0],defEn=I18N[k][1];
  const long=(cur.ar||defAr).length>60,ph=[...new Set((defAr+' '+defEn).match(/\{\w+\}/g)||[])];
  const info=[ph.length?T('tx_ph').replace('{p}',ph.join(' ')):'',/\d/.test(defAr)?T('tx_num'):''].filter(Boolean).join(' ');
  const r=await dialog({title:T('o_edit'),info,fields:[{label:T('o_text'),type:long?'textarea':'text',value:cur.ar||defAr},{label:T('o_texten'),type:long?'textarea':'text',value:cur.en||defEn}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok'){const ar=r.values[0].trim()||defAr,en=r.values[1].trim()||defEn;if(ph.some(p=>!ar.includes(p)||!en.includes(p))){toast(T('tx_ph').replace('{p}',ph.join(' ')));return editText(k)}if(ar===defAr&&en===defEn)delete CFG.text[k];else CFG.text[k]={ar,en};changed();if(ar!==defAr&&en===defEn)toast(T('o_enwarn'))}
  if(r.action==='reset'){delete CFG.text[k];changed()}
  if(SHEET&&SHEET.key==='texts')drawTexts();
}
/** every interface text: search what you see, tap to reword it (Arabic and English) */
let TXQ='';
function openTexts(){if(!ISOWNER())return;openSheet(T('tx_all'),'',{key:'texts'});drawTexts()}
function drawTexts(){
  if(!SHEET||SHEET.key!=='texts')return;
  const q=normAr(TXQ),keys=Object.keys(I18N).filter(k=>TXOK(k)||EDITABLE.includes(k)),hit=k=>{const t=CFG.text[k]||{};return normAr([I18N[k][0],I18N[k][1],t.ar||'',t.en||''].join(' ')).includes(q)};
  const list=q.length<2?keys.filter(k=>CFG.text[k]):keys.filter(hit);
  $('sheet-b').innerHTML=`<p class="hint">${esc(T('tx_all_s'))}</p><div class="nsearch"><input type="search" id="txq" dir="auto" autocomplete="off" placeholder="${esc(T('tx_q'))}" value="${esc(TXQ)}"></div>`+
    `<p class="hint">${esc(T('tx_n').replace('{n}',list.length))}</p><div class="ml">${list.slice(0,40).map(k=>`<button type="button" class="mi" data-edtext="${esc(k)}"><span class="mt">${esc(T(k))}${CFG.text[k]?` · <b>${esc(T('tx_changed'))}</b>`:''}<small dir="auto">${esc(LANG==='ar'?I18N[k][1]:I18N[k][0])}</small></span></button>`).join('')}</div>`;
  const i=$('txq');i.addEventListener('input',()=>{TXQ=i.value;drawTexts();const j=$('txq');j.focus();j.setSelectionRange(j.value.length,j.value.length)});
}
/** 1.16.0 «مظهر الموقع»: fonts, sizes (text, headings, tile names), the colours of every section and the logos in ONE floating
   window. Every change shows at once on the page behind it; «تراجع» puts back what was there when the window opened. */
let LOOK0=null;
const LOOKSEC=()=>Object.keys(CFG.colors).filter(p=>SECKEY[p]||p==='team');
function editLook(){
  if(!ISOWNER())return;
  LOOK0=JSON.stringify({look:CFG.look,colors:CFG.colors});
  openSheet(T('lk_win'),'',{key:'look',onClose:()=>{if(LOOK0&&JSON.stringify({look:CFG.look,colors:CFG.colors})!==LOOK0)changed();LOOK0=null}});
  drawLook();
}
function drawLook(){
  if(!SHEET||SHEET.key!=='look')return;
  const l={...DEFAULT_CFG.look,...(CFG.look||{})},F=[['tajawal','Tajawal'],['cairo','Cairo'],['system',T('lk_sys')]];
  const sel=(id,v)=>`<select id="${id}">${F.map(o=>`<option value="${o[0]}"${o[0]===v?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
  const rng=(id,v,lab)=>`<div class="lkrow"><label class="l" for="${id}">${esc(lab)} <b id="${id}v">${Math.round(v*100)}%</b></label><input type="range" id="${id}" min="0.85" max="1.3" step="0.05" value="${v}"></div>`;
  ACT.s=[];const S=c=>chipH('s',c);
  $('sheet-b').innerHTML=`<div class="lksample" aria-hidden="true"><h3>${esc(T('lk_s_h'))}</h3><p>${esc(T('lk_s_p'))}</p><div class="picker lktiles"><button type="button" tabindex="-1"><i class="tico">D</i><span>${esc(T('n_d'))}</span></button><button type="button" tabindex="-1"><i class="tico">Fe</i><span>${esc(T('n_fe'))}</span></button></div></div>
    <h4 class="lkh4">${esc(T('lk_fonts'))}</h4><div class="lkrow"><label class="l" for="lkfb">${esc(T('lk_fb'))}</label>${sel('lkfb',l.fb)}</div><div class="lkrow"><label class="l" for="lkfh">${esc(T('lk_fh'))}</label>${sel('lkfh',l.fh)}</div>
    <h4 class="lkh4">${esc(T('lk_sizes'))}</h4>${rng('lksb',l.sb,T('lk_sb'))}${rng('lksh',l.sh,T('lk_sh'))}${rng('lkst',l.st||1,T('lk_st'))}
    <h4 class="lkh4">${esc(T('lk_cols'))}</h4><div class="lkcols">${LOOKSEC().map(p=>`<div class="lkcol" style="${colorVars(p)}"><span class="lkn">${esc(p==='team'?T('ad_team'):T(SECKEY[p]))}</span><input type="color" data-lkc="${p}" data-i="0" value="${CFG.colors[p][0]}" aria-label="${esc(T('o_c1'))}"><input type="color" data-lkc="${p}" data-i="1" value="${CFG.colors[p][1]}" aria-label="${esc(T('o_c2'))}"></div>`).join('')}</div>
    <h4 class="lkh4">${esc(T('br_t'))}</h4><div class="filters">${S({label:T('lk_logos'),f:()=>{closeSheet(false);editBrand()}})}</div>
    <div class="lkact filters">${S({label:T('lk_undo'),f:()=>{if(!LOOK0)return;const o=JSON.parse(LOOK0);CFG.look=o.look;CFG.colors=o.colors;applyColors();drawLook()}})}${S({label:T('o_reset'),f:()=>{CFG.look=clone(DEFAULT_CFG.look);CFG.colors=clone(DEFAULT_CFG.colors);applyColors();drawLook()}})}${S({label:T('lk_done'),cls:'pri',f:()=>closeSheet()})}</div>`;
}
document.addEventListener('input',e=>{
  if(!SHEET||SHEET.key!=='look')return;const t=e.target;
  CFG.look={...DEFAULT_CFG.look,...(CFG.look||{})};
  if(t.id==='lkfb'||t.id==='lkfh')CFG.look[t.id==='lkfb'?'fb':'fh']=t.value;
  else if(/^lks[bht]$/.test(t.id)){CFG.look[t.id.slice(2)]=Math.round(+t.value*20)/20;const v=$(t.id+'v');if(v)v.textContent=Math.round(+t.value*100)+'%'}
  else if(t.dataset.lkc){const p=t.dataset.lkc,c=[...CFG.colors[p]];c[+t.dataset.i]=t.value;CFG.colors={...CFG.colors,[p]:c}}
  else return;
  applyColors(); // live: the page behind the window changes at once (saved as a draft when the window closes)
});
document.addEventListener('change',e=>{if(SHEET&&SHEET.key==='look'&&(e.target.id==='lkfb'||e.target.id==='lkfh'))e.target.dispatchEvent(new Event('input',{bubbles:true}))});
async function editColors(p){
  const r=await dialog({title:T('o_colors'),fields:[{type:'colors',labels:[T('o_c1'),T('o_c2')],value:CFG.colors[p]}],
    buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok'){CFG.colors[p]=r.values[0];changed()}
  if(r.action==='reset'){CFG.colors[p]=clone(DEFAULT_CFG.colors[p]);changed()}
}
/** a picture chosen by the owner, made small and round-ready: 160×160, center crop, WebP (or JPEG) */
function shrinkImage(file){return new Promise((ok,no)=>{const rd=new FileReader(),im=new Image(); // data: URL (the page's security rules allow no blob: pictures)
  im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=160;const s=Math.min(im.width,im.height),x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,160,160);x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,160,160);
    let d=c.toDataURL('image/webp',.85);if(!d.startsWith('data:image/webp'))d=c.toDataURL('image/jpeg',.85);ok(d)};
  im.onerror=no;rd.onload=()=>{im.src=rd.result};rd.onerror=no;rd.readAsDataURL(file)})}
/** owner: the two round logos in the footer and the link of the company that made the app */
async function editBrand(){
  if(!ISOWNER()){toast(T('o_onlyowner'));return}
  const b={...DEFAULT_CFG.brand,...(CFG.brand||{})};let err=null,url=b.url;
  while(true){
    const r=await dialog({err,title:T('br_t'),info:T('br_i'),fields:[{label:T('br_l1'),type:'image',value:b.l1,empty:`<svg viewBox="4 10 56 52" aria-hidden="true">${MARKSVG}</svg>`},
      {label:T('br_l2'),type:'image',value:b.l2,empty:'—'},{label:T('br_url'),type:'url',value:url,ph:'https://'}],
      buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return;
    url=r.values[2].trim();
    if(url&&!/^https?:\/\/[^\s"'<>]+$/i.test(url)){err={i:2,msg:T('o_rbadurl')};continue}
    try{
      for(const [i,k] of [[0,'l1'],[1,'l2']]){const v=r.values[i];if(v.remove)b[k]='';if(v.file)b[k]=await shrinkImage(v.file)}
    }catch(e){err={msg:T('br_bad')};continue}
    b.url=url;CFG.brand=b;changed();toast(T('br_done'));return;
  }
}
/** owner: earlier published versions (config_history) with «restore»; the restore itself is checked in the database */
async function openVersions(){
  if(!ISOWNER()){toast(T('o_onlyowner'));return}
  if(OWN.local||!OWN.client){toast(T('vh_local'));return}
  const {data,error}=await OWN.client.from('config_history').select('id,published_at,note').order('id',{ascending:false}).limit(30);
  if(error||!data){toast(T('o_neterr'));return}
  const fmtD=d=>{try{return new Date(d).toLocaleString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB',{dateStyle:'medium',timeStyle:'short'})}catch(e){return d}};
  ACT.v=[];const S=c=>chipH('v',c);
  openSheet(T('vh_t'),`<p class="hint">${T('vh_i')}</p>`+data.map((v,i)=>`<div class="ncard"><div class="nb"><div class="nh"><b>${i===0?esc(T('vh_now')):'#'+v.id}</b> · <bdi>${esc(fmtD(v.published_at))}</bdi></div>${v.note?`<div class="nw">${esc(clean(v.note))}</div>`:''}
    ${i===0?'':`<div class="filters">${S({label:T('vh_restore'),f:()=>restoreVersion(v.id,fmtD(v.published_at))})}</div>`}</div></div>`).join(''),{key:'versions'});
}
async function restoreVersion(id,when){
  const q=await dialog({title:T('vh_restore'),info:T('vh_q').replace('{d}',when),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('vh_restore'),action:'ok',pri:1,danger:1}]});
  if(q.action!=='ok')return;
  const {error}=await OWN.client.rpc('restore_version',{p_id:id});
  if(error){toast(T('o_neterr'));return}
  closeSheet(false);toast(T('vh_done'));loadPublished();
}
/** owner: the medical review stamp under every result («تمت المراجعة الطبية بواسطة …» and the date) */
/** owner: everything in one file kept on his device — the published site, the draft settings and all content (pending and hidden too).
   The file says what it is: backup name, file name, program name and version. */
function downloadBackup(){
  if(!ISOWNER())return;
  const now=new Date(),day=now.toISOString().slice(0,10),hm=now.toISOString().slice(11,16).replace(':','');
  const fileName=`VITAWAW-v${APP_VERSION}-backup-${day}-${hm}.json`;
  const data={program:'VITAWAW',programVersion:APP_VERSION,backupName:`VITAWAW backup ${day} ${now.toISOString().slice(11,16)} UTC`,fileName,
    createdAt:now.toISOString(),site:location.origin,createdBy:OWN.name||whoLabel(),
    published:PUBLISHED||null,draft:JSON.parse(cfgJSON()),content:{refs:CFG.refs||[],inter:CFG.inter||[],nut:CFG.nut||{}}};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  toast(T('bk_done'));
}
/** the medical review stamp: Dr. Saifaldeen or one of the invited pharmacists (or another name typed by the owner) */
async function editReview(){
  if(!ISOWNER()){toast(T('o_onlyowner'));return}
  if(!OWN.local&&OWN.client&&!TEAM.list)try{await teamLoad()}catch(e){}
  const v=CFG.review||DEFAULT_CFG.review,cur=REV0(v);
  const who=[[ 'owner',T('rv_owner') ],...((TEAM.list&&TEAM.list.members)||[]).filter(m=>m.role==='editor'&&m.status==='active'&&m.name).map(m=>['m:'+m.name,m.name]),['other',T('rv_other')],['none',T('rv_none')]];
  const pick=!cur.ar?'none':cur.ar===I18N.rv_owner[0]?'owner':who.some(o=>o[0]==='m:'+cur.ar)?'m:'+cur.ar:'other';
  let err=null,vals=[pick,pick==='other'?cur.ar:'',pick==='other'?cur.en||'':'',v.date||''];
  while(true){
    const r=await dialog({err,title:T('rv_t'),info:T('rv_i'),fields:[{label:T('rv_who'),type:'select',options:who,value:vals[0]},{label:T('rv_n'),value:vals[1],ph:T('rv_ph')},{label:T('rv_ne'),value:vals[2],ltr:1},{label:T('rv_d'),type:'date',value:vals[3],ltr:1}],
      buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return;
    vals=r.values.map(x=>x.trim());
    if(vals[3]&&!/^\d{4}-\d{2}-\d{2}$/.test(vals[3])){err={i:3,msg:T('rv_bad')};continue}
    if(vals[0]==='other'&&!vals[1]){err={i:1,msg:T('rv_needname')};continue}
    const n=vals[0]==='owner'?{ar:I18N.rv_owner[0],en:I18N.rv_owner[1]}:vals[0]==='none'?{ar:'',en:''}:vals[0]==='other'?{ar:vals[1],en:vals[2]}:{ar:vals[0].slice(2),en:vals[0].slice(2)};
    CFG.review={n,date:vals[3]};changed();refreshAll();toast(T('br_done'));return;
  }
}
async function editContact(){
  const c=CFG.contact;
  const r=await dialog({title:T('o_contact'),fields:[{label:T('o_email'),type:'email',value:c.email},{label:T('o_phone'),type:'tel',value:c.phone||''}],
    buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok'){const [e,ph]=r.values.map(x=>x.trim());if(!e&&!ph){toast(T('o_contact_need'));return editContact()}CFG.contact={email:e,phone:ph};changed()}
}
const STATUSES=()=>[['now',T('st_now')],['dev',T('st_dev')],['plan',T('st_plan')],['idea',T('st_idea')]];
const ICONS=()=>Object.keys(IC).map(k=>[k,{bell:'🔔',chart:'📈',plus:'➕',pill:'💊',clock:'⏰',share:'📤',cam:'📷',baby:'👶'}[k]+' '+k]);
async function editFeature(i){
  const isNew=i==null,x=isNew?{st:'plan',ic:'plus',t:{ar:'',en:''},d:{ar:'',en:''}}:CFG.roadmap[i];
  const r=await dialog({title:T(isNew?'o_add':'o_feat'),fields:[{label:T('o_ftitle'),value:x.t.ar},{label:T('o_ftitle_en'),value:x.t.en||'',ltr:1},{label:T('o_fdesc'),type:'textarea',value:x.d.ar},{label:T('o_fdesc_en'),type:'textarea',value:x.d.en||'',ltr:1},
    {label:T('o_fst'),type:'select',options:STATUSES(),value:x.st},{label:T('o_fic'),type:'select',options:ICONS(),value:x.ic},{label:T('o_fgo'),type:'select',options:GOLIST(),value:x.go||''}],buttons:EDB({isNew,hidden:!!x.hidden})});
  if(r.action==='hide')return hideFeature(i);if(r.action==='del')return delFeature(i);
  if(r.action!=='ok')return;
  const [t,te,d,de,st,ic,goTo]=r.values.map(v=>v.trim());if(!t)return;
  const item={st,ic,t:{ar:t,en:te},d:{ar:d,en:de},...(goTo?{go:goTo}:{}),...(x.hidden?{hidden:true}:{})};
  if(isNew)CFG.roadmap.push(item);else CFG.roadmap[i]=item;changed();
}
async function delFeature(i){if(await confirmDel(tx2(CFG.roadmap[i].t))){CFG.roadmap.splice(i,1);changed()}}
function hideFeature(i){const x=CFG.roadmap[i];if(!x)return;x.hidden=!x.hidden;changed()}
document.addEventListener('click',e=>{
  if(!OWN.on)return;const t=e.target.closest('[data-edtext],[data-edcolor],[data-edcontact],[data-edbrand],#rmadd');if(!t)return;
  e.preventDefault();e.stopPropagation();
  if(t.dataset.edtext?!CAN('text'):!ISOWNER()){toast(T('tm_noperm'));return}
  if(t.dataset.edtext)editText(t.dataset.edtext);
  else if(t.dataset.edcolor)editColors(t.dataset.edcolor);
  else if(t.dataset.edcontact)editContact();
  else if(t.dataset.edbrand)editBrand();
  else if(t.id==='rmadd')editFeature(null);
},true);


/* ----- sources, interactions, nutrients (owner) ----- */
const refOpts=()=>Object.entries(REFS).sort((a,b)=>a[0]-b[0]).map(([n,x])=>[+n,`${n}. ${x[0]} — ${x[1]}`]);
const ensureRefs=()=>{if(!Array.isArray(CFG.refs))CFG.refs=defRefList()};
const ensureInter=()=>{if(!Array.isArray(CFG.inter))CFG.inter=defInterList()};
async function confirmDel(info){const q=await dialog({title:T('o_delq2'),info:info||'',buttons:[{label:T('o_back'),action:'cancel'},{label:T('o_yesdel'),action:'ok',pri:1,danger:1}]});return q.action==='ok'}
const RTYPES=()=>[['',T('o_rt_auto')],...['g','o','d','s','c','x'].map(k=>[k,T('rt_'+k)])];
async function editRef(id){
  ensureRefs();const isNew=id==null,o=isNew?{org:'',title:'',url:'',ar:'',en:'',kind:RTORD[RTF]!=null?RTF:''}:CFG.refs.find(x=>x.id===id);if(!o)return;
  let v=[o.org,o.title,o.url,o.kind||'',o.ar||'',o.en||''],err=null;
  while(true){
    const r=await dialog({err,title:T(isNew?'o_radd':'o_redit'),info:T('o_rinfo'),fields:[{label:T('o_rorg'),value:v[0]},{label:T('o_rtitle'),type:'textarea',value:v[1]},{label:T('o_rurl'),type:'url',value:v[2]},
      {label:T('o_rtype'),type:'select',options:RTYPES(),value:v[3]},{label:T('o_ruse'),value:v[4]},{label:T('o_ruse_en'),value:v[5],ltr:1}],buttons:EDB({isNew,hidden:!!o.hidden})});
    if(r.action==='hide')return hideRef(id);if(r.action==='del')return delRef(id);
    if(r.action!=='ok')return;
    v=r.values.map(x=>x.trim());
    if(!v[0]||!v[1]){err={i:v[0]?1:0,msg:T('o_rneed')};continue}
    if(v[2]&&!/^https?:\/\//i.test(v[2])){err={i:2,msg:T('o_rbadurl')};continue}
    const item={...(isNew?{}:{hidden:!!o.hidden}),id:isNew?Math.max(29,(OWN.nextRef||1)-1,...CFG.refs.map(x=>x.id))+1:id,org:v[0],title:v[1],url:v[2],kind:v[3],ar:v[4],en:v[5],rv:CANAPPROVE()};
    if(isNew)CFG.refs.push(item);else CFG.refs[CFG.refs.findIndex(x=>x.id===id)]=item;
    changed();if(isNew)toast(T('o_radded')+' '+item.id);return;
  }
}
async function delRef(id){
  ensureRefs();
  const uses=[...(CFG.inter||[]).filter(x=>(x.r||[]).includes(id)).map(x=>tx2(x.a)+' + '+tx2(x.b)),...NCUST().filter(c=>(c.r||[]).includes(id)).map(c=>tx2(c.n)),...BUILTIN.filter(k=>(DEF_REFGROUP[k]||[]).includes(id)).map(k=>T('n_'+k))];
  if(!(await confirmDel(uses.length?T('o_rused')+' '+uses.join(L('، ',', ')):'')))return;
  CFG.refs=CFG.refs.filter(x=>x.id!==id);if(Array.isArray(CFG.inter))CFG.inter.forEach(x=>{x.r=(x.r||[]).filter(n=>n!==id)});NCUST().forEach(c=>{c.r=(c.r||[]).filter(n=>n!==id)});changed();
}
/** hide/show: the owner's choice is final; a pharmacist's waits for the owner's review */
function toggleHidden(o){if(!o)return;o.hidden=!o.hidden;if(!CANAPPROVE())o.rv=false;changed()}
const hideRef=id=>{ensureRefs();toggleHidden(CFG.refs.find(x=>x.id===id))};
async function editInter(i){
  ensureInter();const isNew=i==null,o=isNew?null:CFG.inter[i];
  const nuts=KEYS.slice(1).map(k=>[k,kname(k)]);if(!nuts.length)return;
  const g0=(o&&o.g)||{};
  let v=o?[o.k,o.sev||'moderate',o.a.ar,o.a.en||'',o.b.ar,o.b.en||'',o.d.ar,o.d.en||'',(o.r||[]).slice(),g0.d||'',g0.d?String(g0.b):'',g0.d?String(g0.a):'']:[nuts[0][0],'moderate','','','','','','',[],'','',''],err=null;
  while(true){
    const r=await dialog({err,title:T(isNew?'o_iadd':'o_iedit'),fields:[{label:T('o_inut'),type:'select',options:nuts,value:v[0]},{label:T('o_isev'),type:'select',options:[['major',T('sev_major')],['moderate',T('sev_moderate')],['minor',T('sev_minor')]],value:v[1]},
      {label:T('o_ia'),value:v[2],ph:T('o_ia_ph')},{label:T('o_ia_en'),value:v[3],ltr:1},{label:T('o_ib'),value:v[4]},{label:T('o_ib_en'),value:v[5],ltr:1},
      {label:T('o_id'),type:'textarea',value:v[6]},{label:T('o_id_en'),type:'textarea',value:v[7],ltr:1},{label:T('o_isrc'),type:'checks',options:refOpts(),value:v[8]},
      // timing for the daily supplement schedule (optional): which item it concerns and the minimum gaps in hours
      {label:T('o_ig'),type:'select',options:[['',T('o_ig_none')],...SCI.map(x=>[x[0],L(x[1],x[2])])],value:v[9]},{label:T('o_igb'),type:'number',value:v[10],ltr:1},{label:T('o_iga'),type:'number',value:v[11],ltr:1}],
      buttons:EDB({isNew,hidden:!!(o&&o.hidden)})});
    if(r.action==='hide')return hideInter(i);if(r.action==='del')return delInter(i);
    if(r.action!=='ok')return;
    v=[...r.values.slice(0,8).map(x=>x.trim()),r.values[8],...r.values.slice(9).map(x=>x.trim())];
    if(!v[2])v[2]=kname(v[0]);
    if(!v[4]||!v[6]){err={i:v[4]?6:4,msg:T('o_ineed')};continue}
    if(!v[8].length){err={i:8,msg:T('o_srcneed')};continue}
    const hb=parseFloat(v[10]),ha=parseFloat(v[11]),okH=n=>!isNaN(n)&&n>=0&&n<=24;
    if(v[9]&&!okH(hb)){err={i:10,msg:T('o_igbad')};continue}
    if(v[9]&&!okH(ha)){err={i:11,msg:T('o_igbad')};continue}
    const item={hidden:!!(o&&o.hidden),k:v[0],sev:v[1],a:{ar:v[2],en:v[3]},b:{ar:v[4],en:v[5]},d:{ar:v[6],en:v[7]},r:v[8],rv:CANAPPROVE(),g:v[9]?{d:v[9],b:hb,a:ha}:{}};if(o&&o.id!=null)item.id=o.id;
    if(isNew)CFG.inter.push(item);else CFG.inter[i]=item;changed();return;
  }
}
async function delInter(i){ensureInter();if(!CFG.inter[i])return;if(await confirmDel(tx2(CFG.inter[i].a)+' + '+tx2(CFG.inter[i].b))){CFG.inter.splice(i,1);changed()}}
const hideInter=i=>{ensureInter();toggleHidden(CFG.inter[i])};
/* ===================== notifications (🔔, team only) =====================
   Owner: every waiting change (new item, edit of an approved item, deletion request) as a card with
   Approve / Reject / View — the decision is saved at once (review_change); visitors see it after «Publish».
   Pharmacist: the owner's decisions on their work (table notifications) and what still waits for the owner. */
const DELS=()=>(typeof OWN!=='undefined'&&OWN.del)||{refs:[],inter:[],nut:[]};
const delCount=()=>{const d=DELS();return (d.refs||[]).length+(d.inter||[]).length+(d.nut||[]).length};
const NLBL={r:x=>`${x.id}. ${x.org} — ${x.title}`,i:x=>`${tx2(x.a)} + ${tx2(x.b)}`,n:x=>tx2(x.n)};
/** every waiting change: {t: r|i|n, id (database id), idx (interactions: list index), kind: new|edit|del, label, was, by} */
function notifList(){
  const d=DELS(),out=[];
  const add=(t,list,useIdx)=>list.forEach((x,i)=>{if(x.rv===false)out.push({t,id:x.id,idx:useIdx?i:null,kind:x.pv?'edit':'new',label:NLBL[t](x),was:x.pv?NLBL[t](x.pv):'',by:x.by||''})});
  add('n',NCUST());add('i',CFG.inter||[],true);add('r',CFG.refs||[]);
  ['nut','inter','refs'].forEach((k,j)=>(d[k]||[]).forEach(x=>out.push({t:'nir'[j],id:x.id,idx:null,kind:'del',label:NLBL['nir'[j]](x),was:'',by:x.by||''})));
  const tm=typeof OWN!=='undefined'&&OWN.team;
  if(tm){const m=TEAM.list&&TEAM.list.members.find(x=>x.id===tm.by);out.push({t:'x',id:'texts',idx:null,kind:'edit',label:T('nt_texts'),was:textChanges(tm).join(' · '),by:m?(m.name||m.email):''})}
  return out;
}
const pendingCount=()=>notifList().length;
const changeList=()=>notifList().filter(n=>n.kind!=='new');
const NOTE={mine:[],loaded:false}; // pharmacist: the owner's decisions
async function loadNotes(){
  if(OWN.local||ISOWNER()||!OWN.client)return;
  const {data,error}=await OWN.client.from('notifications').select('id,kind,item,label,at,read').order('at',{ascending:false}).limit(50);
  NOTE.mine=error?[]:clean(data||[]);NOTE.loaded=true;renderNav();
}
/** number on the 🔔 tab: owner = changes to decide, pharmacist = unread decisions, visitor = new features and lab reminders */
const notifCount=()=>!(typeof OWN!=='undefined'&&OWN.on)?pubNew().length:ISOWNER()?pendingCount():NOTE.mine.filter(n=>!n.read).length;
/* ----- notifications for everyone (kept on this device only): new features and lab results that are 3 months old ----- */
let SEEN=[];try{SEEN=JSON.parse(localStorage.getItem('vw-seen')||'[]').filter(x=>typeof x==='string').slice(-200)}catch(e){}
const LABDUE=90; // days after the last saved result before the reminder (a reminder to ask, not a medical rule)
function pubItems(){
  const out=[];
  (CFG.roadmap||[]).map((x,i)=>[x,i]).filter(([x])=>x.st==='now'&&!x.hidden).slice(-3).forEach(([x,i])=>out.push({key:'rm:'+String((x.t&&(x.t.en||x.t.ar))||i).slice(0,40),kind:'feat',x})); // 1.14.0: the 3 newest only
  LABT.forEach(t=>{const pts=LABS.filter(x=>x.k===t[0]),last=pts[pts.length-1];
    if(last&&(Date.now()-Date.parse(last.d))/864e5>=LABDUE)out.push({key:'lab:'+t[0]+':'+last.d,kind:'lab',t,last})});
  return out;
}
const pubNew=()=>pubItems().filter(n=>!SEEN.includes(n.key));
function pubSeen(){const k=pubItems().map(n=>n.key);if(k.every(x=>SEEN.includes(x)))return;SEEN=[...new Set([...SEEN,...k])].slice(-200);try{localStorage.setItem('vw-seen',JSON.stringify(SEEN))}catch(e){}}
function pubNotifHTML(){
  const it=pubItems(),isNew=n=>!SEEN.includes(n.key),labs=it.filter(n=>n.kind==='lab'),feats=it.filter(n=>n.kind==='feat');
  let h=`<h3 class="nsec">${T('nn_rem')}</h3>`;
  h+=labs.length?labs.map(n=>`<div class="ncard${isNew(n)?' unread':''}">${nico('edit')}<div class="nb"><div class="nh"><b>${esc(L(n.t[1],n.t[2]))}</b> · <span class="nby">${esc(T('nn_last'))} <bdi>${esc(n.last.d)}</bdi></span></div>
    <div class="nl">${esc(T('nn_lab'))}</div>${toolHidden('labs')?'':`<div class="filters"><button type="button" class="btn" data-tool="labs">${esc(T('lb_t'))}</button></div>`}</div></div>`).join('')
    :`<p class="inone">${T(LABS.length?'nn_labok':'nn_nolab')}</p>`;
  if(feats.length)h+=`<h3 class="nsec">${T('nn_new')}</h3>`+feats.map(n=>`<div class="ncard${isNew(n)?' unread':''}">${nico('new')}<div class="nb"><div class="nh"><b>${esc(tx2(n.x.t))}</b></div><div class="nl">${esc(tx2(n.x.d))}</div>
    ${GO[n.x.go]?`<div class="filters"><button type="button" class="btn pri" data-rmgo="${esc(n.x.go)}">${T('rm_try')}</button></div>`:''}</div></div>`).join('');
  return h;
}
const NKIND={r:'tab_src',i:'tab_int',n:'ad_vit',x:'nt_texts_k'};
/** what a pharmacist's texts proposal changes: page texts and info pages (titles) */
/** the medicines a pharmacist's proposal adds, renames or hides (compared with the owner's list) */
function medChanges(tm){
  if(!tm||!Array.isArray(tm.medcat))return[];
  const was=Object.fromEntries(medBase().map(m=>[m.en,JSON.stringify(m)]));
  return tm.medcat.filter(m=>was[m.en]!==JSON.stringify({en:m.en,ar:m.ar||[],hide:!!m.hide}));
}
function textChanges(tm){
  const out=[],cur=CFG.text||{},pg=CFG.pages||[],np=tm.pages||[];
  const tx=Object.keys({...cur,...(tm.text||{})}).filter(k=>JSON.stringify(cur[k]||null)!==JSON.stringify((tm.text||{})[k]||null));
  if(tx.length)out.push(T('nt_tx_n').replace('{n}',tx.length));
  const ch=np.filter(p=>JSON.stringify(pg.find(x=>x.id===p.id)||null)!==JSON.stringify(p)).length+pg.filter(p=>!np.some(x=>x.id===p.id)).length;
  if(ch)out.push(T('nt_pg_n').replace('{n}',ch));
  const mc=medChanges(tm);if(mc.length)out.push(T('nt_med_n').replace('{n}',mc.length));
  return out;
}
const NICO={new:'<path d="M12 5v14M5 12h14"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',del:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',approved:'<path d="M5 12l5 5 9-10"/>',rejected:'<path d="M6 6l12 12M18 6L6 18"/>'};
const nico=k=>`<span class="nic nic-${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">${NICO[k]}</svg></span>`;
function renderNotif(opening){
  if(!$('notif-b'))return;
  ACT.n=[];const S=c=>chipH('n',c);let h='';
  if(!OWN.on){} // visitors: only the part below
  else if(ISOWNER()){
    const list=notifList();
    h+=`<p class="hint">${T('nt_hint')}</p>`;
    if(list.length>1)h+=`<div class="ntop"><b>${list.length} ${T('nt_waiting')}</b><div class="filters">${S({label:T('nt_all'),cls:'pri',f:()=>decideAll(list)})}</div></div>`;
    h+=list.length?list.map(n=>`<div class="ncard">${nico(n.kind)}<div class="nb"><div class="nh"><b>${esc(T('nt_'+n.kind))}</b> · ${esc(T(NKIND[n.t]))}${n.by?` · <span class="nby">${esc(T('nt_by'))} ${esc(n.by)}</span>`:''}</div>
      <div class="nl" dir="auto">${esc(n.label)}</div>${n.was&&n.was!==n.label?`<div class="nw">${esc(T('rc_was'))} ${esc(n.was)}</div>`:''}
      <div class="filters">${S({label:T(n.kind==='del'?'rc_okdel':'o_approve'),cls:'pri',f:()=>decide(n,true)})}${S({label:T(n.kind==='del'?'rc_restore':'nt_reject'),f:()=>decide(n,false)})}${n.kind!=='del'?S({label:T('nt_view'),f:()=>viewItem(n)}):''}</div></div></div>`).join('')
      :`<div class="nempty">${nico('approved')}<b>${T('nt_none')}</b></div>`;
  }else{
    const mine=NOTE.mine,wait=notifList();
    h+=`<h3 class="nsec">${T('nt_mine')}</h3>`+(mine.length?mine.map(n=>`<div class="ncard${n.read?'':' unread'}">${nico(n.kind)}<div class="nb"><div class="nh"><b>${esc(T(n.kind==='approved'?'nt_ok':'nt_no'))}</b> · ${esc(T(NKIND[n.item]||'tab_src'))} · <span class="nby">${esc(fmtDate(n.at))}</span></div><div class="nl">${esc(n.label)}</div></div></div>`).join('')
      :`<p class="inone">${T('nt_none')}</p>`);
    h+=`<h3 class="nsec">${T('nt_wait')}</h3>`+(wait.length?wait.map(n=>`<div class="ncard">${nico(n.kind)}<div class="nb"><div class="nh"><b>${esc(T('nt_'+n.kind))}</b> · ${esc(T(NKIND[n.t]))}</div><div class="nl">${esc(n.label)}</div></div></div>`).join('')
      :`<p class="inone">${T('nt_nowait')}</p>`);
    if(opening&&mine.some(n=>!n.read)&&OWN.client&&!OWN.local){ // opening the page marks the owner's decisions as read
      OWN.client.from('notifications').update({read:true}).eq('read',false).then(r=>{if(r&&r.error)return;mine.forEach(n=>n.read=true);renderNav()});
    }
  }
  $('notif-b').innerHTML=h;$('notif-p').innerHTML=(OWN.on?`<div class="nsep"></div>`:'')+pubNotifHTML();
  if(opening){pubSeen();setTimeout(renderNav,0)}
}
/* ===================== source links (owner, in 🔔) =====================
   The worker checks the links of the published sources (/api/links, 25 per request). It runs by itself when 🔔 is opened
   and the last check is a week old; the result is kept on this device. «blocked» = the site refuses automatic checks
   (open it yourself), «broken» = page not found. */
let LINKS=null;try{LINKS=JSON.parse(localStorage.getItem('vw-links')||'null')}catch(e){}
let linksBusy=false;
async function linksCheck(){
  if(linksBusy)return;linksBusy=true;renderLinks();
  const ids=((PUBLISHED&&PUBLISHED.refs)||[]).filter(r=>/^https?:\/\//.test(r.url||'')).map(r=>r.id),out=[];
  try{
    // 1.16.0: the worker checks links only for the signed-in team, so the session token goes with the request
    const tok=OWN.client?((await OWN.client.auth.getSession()).data.session||{}).access_token:'',hd=tok?{Authorization:'Bearer '+tok}:{};
    for(let i=0;i<ids.length;i+=25){const r=await fetch('/api/links?ids='+ids.slice(i,i+25).join(','),{headers:hd,signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(r.status);out.push(...((await r.json()).links||[]))}
    LINKS={at:new Date().toISOString().slice(0,10),ok:out.filter(x=>x.state==='ok').map(x=>x.id),broken:out.filter(x=>x.state==='broken').map(x=>x.id),blocked:out.filter(x=>x.state==='blocked').map(x=>x.id),n:out.length};
    try{localStorage.setItem('vw-links',JSON.stringify(LINKS))}catch(e){}
  }catch(e){toast(T('o_neterr'))}
  linksBusy=false;renderRefs();
}
function linksAuto(){if(!OWN.local&&(!LINKS||Date.now()-Date.parse(LINKS.at)>7*864e5))linksCheck()}
/** top of the sources page (owner, and pharmacists who edit sources): the link check, like «My medicines» on interactions.
   The numbers filter the list: tap «not working» to see only those sources. */
let LKF=''; // '' | 'ok' | 'broken' | 'blocked'
function renderLinks(){
  const el=$('lkbox');if(!el)return;
  if(typeof OWN==='undefined'||!OWN.on||OWN.preview||!CAN('refs')){el.hidden=true;el.innerHTML='';LKF='';return}
  const L2=LINKS,ok=L2?L2.n-L2.broken.length-L2.blocked.length:0;
  const chip=(k,n,cls,label)=>`<button type="button" class="lkc ${cls}" data-lkf="${k}" aria-pressed="${LKF===k}"${n?'':' disabled'}><b>${n}</b> ${esc(label)}</button>`;
  el.hidden=false;if($('links'))$('links').classList.toggle('lkf',!!LKF);
  const btn=`<button type="button" class="btn${linksBusy?'':' pri'}" id="lknow"${linksBusy?' disabled':''}>${T(linksBusy?'lk_busy':'lk_now')}</button>`,
    rest=`<p class="hint">${L2?T('lk_last').replace('{d}','<bdi>'+esc(L2.at)+'</bdi>').replace('{n}',L2.n):T('lk_never')}</p>`+
    (L2?`<div class="lkcs">${chip('ok',ok,'ok',T('lk_ok'))}${chip('broken',L2.broken.length,'bad',T('lk_bad'))}${chip('blocked',L2.blocked.length,'warn',T('lk_hand'))}</div>`:'')+
    (LKF?`<p class="hint">${T(LKF==='ok'?'lk_ok_h':LKF==='broken'?'lk_broken_h':'lk_blocked_h')} <button type="button" class="linkbtn" data-lkf="">${T('lk_all')}</button></p>`:'');
  el.innerHTML=`<div class="lkh"><b>${T('lk_box')}</b>${btn}</div>`+rest; // 1.14.6: the link check lives only on its own page
}
document.addEventListener('click',e=>{
  if(e.target.closest('#lknow')){linksCheck();return}
  const b=e.target.closest('[data-lkf]');if(!b)return;LKF=LKF===b.dataset.lkf?'':b.dataset.lkf;renderRefs();
  if(LKF)setTimeout(()=>{const l=$('reflist');if(l)l.scrollIntoView({block:'start',behavior:'smooth'})},50); // straight to the sources it lists
});
/** the sources the filter keeps (null = all) */
const lkShow=()=>{if(!LKF||!LINKS)return null;if(LKF!=='ok')return LINKS[LKF]||[];
  // working links: those the check reached (older checks kept no list: every checked source that is not broken or blocked)
  return LINKS.ok||((PUBLISHED&&PUBLISHED.refs)||[]).filter(r=>/^https?:\/\//.test(r.url||'')).map(r=>r.id).filter(id=>!LINKS.broken.includes(id)&&!LINKS.blocked.includes(id))};
/** 1.16.0 «source check» page: every source shows the state of its link from the last check, with the link itself */
function lkState(n,x){if(!/^https?:\/\//.test(x[2]||''))return 'none';if(!LINKS)return 'new';
  if(LINKS.broken.includes(n))return 'broken';if(LINKS.blocked.includes(n))return 'blocked';
  return !LINKS.ok||LINKS.ok.includes(n)?'ok':'new'} // older checks kept no «working» list: every checked source that is not broken or blocked
function lkBadge(n,x){const s=lkState(n,x),cls={ok:'ok',broken:'bad',blocked:'warn',none:'',new:''}[s];
  return `<div class="lkst"><span class="lkb ${cls}">${esc(T('lks_'+s))}</span>${/^https?:\/\//.test(x[2]||'')?`<a class="lkurl" href="${esc(x[2])}" target="_blank" rel="noopener" dir="ltr">${esc(x[2].replace(/^https?:\/\/(www\.)?/,'').slice(0,60))}</a>`:''}</div>`}
/** show the item where it lives */
function viewItem(n){
  if(SHEET&&SHEET.key==='notif')closeSheet(false); // leave the 🔔 window to show the item
  if(n.t==='x'){const tm=OWN.team||{},cur=CFG.text||{},nt=tm.text||{};
    const rows=Object.keys({...cur,...nt}).filter(k=>JSON.stringify(cur[k]||null)!==JSON.stringify(nt[k]||null)).map(k=>`<div class="ncard"><div class="nb"><div class="nh">${esc(T('nt_was'))} ${esc((cur[k]&&cur[k].ar)||(I18N[k]||[''])[0])}</div><div class="nl">${esc((nt[k]&&nt[k].ar)||(I18N[k]||[''])[0])}</div></div></div>`);
    const pg=(tm.pages||[]).filter(p=>JSON.stringify((CFG.pages||[]).find(x=>x.id===p.id)||null)!==JSON.stringify(p)).map(p=>`<div class="ncard"><div class="nb"><div class="nh">${esc(T('ad_pages'))}</div><div class="nl">${esc(tx2(p.t))}</div><div class="nw">${esc(tx2(p.b)).slice(0,300)}</div></div></div>`);
    const md=medChanges(tm).map(m=>`<div class="ncard"><div class="nb"><div class="nh">${esc(T('mm_t'))}${m.hide?' · '+esc(T('pg_hidden')):''}</div><div class="nl">${esc(m.en)}</div><div class="nw">${esc((m.ar||[]).join('، '))}</div></div></div>`);
    openSheet(T('nt_texts'),rows.concat(pg,md).join('')||`<p class="inone">${T('nt_none')}</p>`);return}
  if(n.t==='r'){SF='all';RTF='all';renderRefs();go('sources');setTimeout(()=>{const el=$('ref-'+n.id);if(el){el.scrollIntoView({block:'center'});el.classList.add('hl')}},80);return}
  if(n.t==='i'){IF='all';$('isearch').value='';renderInter();go('interactions');setTimeout(()=>{const el=document.querySelector(`#ilist [data-act][data-kind="i"][data-id="${n.idx}"]`);if(el)el.closest('.icard').scrollIntoView({block:'center'})},80);return}
  pickNut(n.id);setTimeout(()=>{const el=document.querySelector(`#nadm [data-kind="n"][data-id="${n.id}"]`);if(el)el.scrollIntoView({block:'center'})},80);
}
/** decide on one change: saved in the database at once (unsaved edits are saved first) */
async function decide(n,accept,quiet){
  if(!ISOWNER()||(OWN.busy&&!quiet))return false;
  if(!accept&&!quiet){const q=await dialog({title:T(n.kind==='del'?'rc_restore':'nt_rejq'),info:T(n.kind==='del'?'nt_restore_i':'nt_rej_i'),buttons:[{label:T('o_back'),action:'cancel'},{label:T(n.kind==='del'?'rc_restore':'nt_reject'),action:'ok',pri:1,danger:n.kind!=='del'}]});if(q.action!=='ok')return false}
  if(OWN.local){ // no database: decide in the local draft
    const list=n.t==='r'?CFG.refs:n.t==='i'?CFG.inter:NCUST();const j=n.t==='i'?n.idx:list.findIndex(x=>x.id===n.id);const x=list[j];
    if(x){if(accept){x.rv=true;delete x.pv}else if(x.pv)list[j]={...x.pv,rv:true};else list.splice(j,1)}
    if(!quiet){changed();renderNotif();toast(T(accept?'o_approved':'rc_restored'))}return true;
  }
  if(!quiet)return locked(()=>_decide(n,accept));
  return _decide(n,accept,true);
}
async function _decide(n,accept,quiet){
  if(n.t==='x')return decideTexts(accept,quiet);
  if(dirty()&&!(await _saveDraft()))return false;
  const id=n.t==='i'&&n.id==null?(CFG.inter[n.idx]||{}).id:n.id;
  const {error}=await OWN.client.rpc('review_change',{p_kind:n.t,p_id:String(id),p_accept:accept});
  if(error){console.error(error);toast(T('o_neterr'));return false}
  if(!quiet)await reloadContent(accept?'o_approved':'rc_restored');
  return true;
}
/** approve: the pharmacist's texts/pages become the draft's; reject: they are dropped. Saved at once. */
async function decideTexts(accept,quiet){
  const tm=OWN.team;if(!tm)return true;
  if(dirty()&&!(await _saveDraft()))return false;
  if(accept){if(tm.text)CFG.text=clone(tm.text);if(Array.isArray(tm.pages))CFG.pages=clone(tm.pages);if(Array.isArray(tm.medcat))CFG.medcat=clone(tm.medcat)}
  if(!OWN.local){const data=JSON.parse(cfgJSON());const {error}=await OWN.client.from('site_config').upsert({id:'draft',data:{...settingsOf(data),team_done:true},updated_at:new Date().toISOString()});if(error){toast(T('o_neterr'));return false}}
  OWN.team=null;OWN.base=cfgJSON();OWN.parts=partsOf();OWN.saved=true;
  if(!quiet){changed();renderNotif();toast(T(accept?'o_approved':'rc_restored'))}
  return true;
}
async function reloadContent(msg){
  const {data:ct,error}=await OWN.client.rpc('get_content');if(error||!ct){toast(T('o_neterr'));return}
  applyContent(ct);OWN.base=cfgJSON();OWN.saved=true;undoReset();changed();renderNotif();if(msg)toast(T(msg));
}
async function decideAll(list){
  const q=await dialog({title:T('nt_all'),info:T('o_approveall_i').replace('{n}',list.length),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('nt_all'),action:'ok',pri:1}]});
  if(q.action!=='ok')return;
  return locked(async()=>{
  for(const n of list)if(!(await decide(n,true,true)))break;
  if(OWN.local){changed();renderNotif();toast(T('o_approved'))}else await reloadContent('o_approved');
  });
}
function toggleBuiltin(k){
  CFG.nut=CFG.nut||{hide:[],custom:[]};const h=CFG.nut.hide;const j=h.indexOf(k);
  if(j>=0)h.splice(j,1);else{if(KEYS.length<=2){toast(T('o_nlast'));return}h.push(k)}
  changed();
}
/** 1.16.0 ✎ on a built-in vitamin (owner): its Arabic and English name and description, hide/show; the dose rules stay in the code */
async function editBuiltin(k){
  if(!ISOWNER()){toast(T('o_onlyowner'));return}
  const keys=['n_'+k,'h_'+k],cur=x=>CFG.text[x]||{ar:I18N[x][0],en:I18N[x][1]},off=NHIDE().includes(k);
  const r=await dialog({title:kname(k),info:T('ed_builtin_i'),fields:[{label:T('nv_name'),value:cur(keys[0]).ar},{label:T('nv_name_en'),value:cur(keys[0]).en,ltr:1},{label:T('ed_desc'),value:cur(keys[1]).ar},{label:T('ed_desc_en'),value:cur(keys[1]).en,ltr:1}],
    buttons:EDB({hidden:off,del:false,reset:true})});
  if(r.action==='hide')return toggleBuiltin(k);
  if(r.action==='reset'){keys.forEach(x=>delete CFG.text[x]);changed();return}
  if(r.action!=='ok')return;
  keys.forEach((x,i)=>{const d=I18N[x],ar=r.values[2*i].trim()||d[0],en=r.values[2*i+1].trim()||d[1];if(ar===d[0]&&en===d[1])delete CFG.text[x];else CFG.text[x]={ar,en}});changed();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nedit]');if(!b||!OWN.on)return;e.preventDefault();e.stopPropagation();editBuiltin(b.dataset.nedit)},true);
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
  const g=(x,l)=>(x&&x[l])||'';
  let v=o?[o.n.ar,g(o.n,'en'),g(o.h,'ar'),g(o.h,'en'),o.uk||'mg',fmtRows(o.rows),g(o.plan,'ar'),g(o.plan,'en'),g(o.note,'ar'),g(o.note,'en'),(o.r||[]).slice()]:['','','','','mg','','','','','',[]],err=null;
  while(true){
    const r=await dialog({err,title:T(isNew?'o_nadd':'o_nedit'),info:T('o_ninfo'),fields:[{label:T('o_nname'),value:v[0]},{label:T('o_nname_en'),value:v[1],ltr:1},{label:T('o_nh'),value:v[2]},{label:T('o_nh_en'),value:v[3],ltr:1},
      {label:T('o_nunit'),type:'select',options:UNITS(),value:v[4]},{label:T('o_nrows'),type:'textarea',value:v[5],ph:T('o_nrows_ph')},
      {label:T('o_nplan'),type:'textarea',value:v[6]},{label:T('o_nplan_en'),type:'textarea',value:v[7],ltr:1},{label:T('o_nnote'),type:'textarea',value:v[8]},{label:T('o_nnote_en'),type:'textarea',value:v[9],ltr:1},
      {label:T('o_isrc'),type:'checks',options:refOpts(),value:v[10]}],buttons:EDB({isNew,hidden:!!(o&&o.hidden)})});
    if(r.action==='hide')return hideNut(id);if(r.action==='del')return delNut(id);
    if(r.action!=='ok')return;
    v=[...r.values.slice(0,10).map((x,j)=>j===4||j===5?x:x.trim()),r.values[10]];
    if(!v[0]){err={i:0,msg:T('o_nneedname')};continue}
    const pr=parseRows(v[5]);if(pr.err){err={i:5,msg:T('o_nbadrow')+' '+pr.err};continue}
    if(!v[10].length){err={i:10,msg:T('o_srcneed')};continue}
    const nid=isNew?'c'+Date.now().toString(36).slice(-8):id;
    const item={id:nid,n:{ar:v[0],en:v[1]},h:{ar:v[2],en:v[3]},uk:v[4],u:UNITTXT[v[4]],rows:pr.rows,plan:{ar:v[6],en:v[7]},note:{ar:v[8],en:v[9]},r:v[10],rv:CANAPPROVE(),hidden:!!(o&&o.hidden)};
    if(isNew)CFG.nut.custom.push(item);else CFG.nut.custom[CFG.nut.custom.findIndex(c=>c.id===id)]=item;
    if(isNew){K=nid}
    changed();return;
  }
}
async function delNut(id){
  CFG.nut=CFG.nut||{hide:[],custom:[]};if(!(await confirmDel(T('o_ndelinfo'))))return;
  CFG.nut.custom=CFG.nut.custom.filter(c=>c.id!==id);if(Array.isArray(CFG.inter))CFG.inter=CFG.inter.filter(x=>x.k!==id);changed();
}
const hideNut=id=>toggleHidden(NCUST().find(c=>c.id===id));
/* the same buttons on every item (actBtns in content.js): approve, edit, hide/show, delete */
document.addEventListener('click',e=>{if(OWN.on&&e.target.closest('[data-gonotif]')){e.preventDefault();e.stopPropagation();openNotif()}},true);
document.addEventListener('click',e=>{
  if(!OWN.on)return;const t=e.target.closest('[data-act]');if(!t)return;
  e.preventDefault();e.stopPropagation();
  const k=t.dataset.kind,id=t.dataset.id,a=t.dataset.act,need={r:'refs',i:'inter',n:'nut',m:'owner'}[k];
  if(need==='owner'?!ISOWNER():!CAN(need)){toast(T('tm_noperm'));return}
  const F={r:{edit:()=>editRef(+id),hide:()=>hideRef(+id),del:()=>delRef(+id)},i:{edit:()=>editInter(+id),hide:()=>hideInter(+id),del:()=>delInter(+id)},
    n:{edit:()=>editNut(id),hide:()=>hideNut(id),del:()=>delNut(id)},m:{edit:()=>editFeature(+id),hide:()=>hideFeature(+id),del:()=>delFeature(+id)}}[k];
  if(F&&F[a])F[a]();
},true);
// «add» buttons and the built-in vitamins' hide/show (item buttons are handled above)
document.addEventListener('click',e=>{
  if(!OWN.on)return;const t=e.target.closest('#radd,#iadd,[data-nhide],#nadd');if(!t)return;
  e.preventDefault();e.stopPropagation();
  const need=t.dataset.nhide?'owner':t.id==='radd'?'refs':t.id==='iadd'?'inter':'nut';
  if(need==='owner'?!ISOWNER():!CAN(need)){toast(T(need==='owner'?'o_onlyowner':'tm_noperm'));return}
  if(t.id==='radd')editRef(null);else if(t.id==='iadd')editInter(null);else if(t.dataset.nhide)toggleBuiltin(t.dataset.nhide);else editNut(null);
},true);

/* ----- login / session ----- */
// the library file must match this fingerprint exactly (Subresource Integrity), otherwise the browser refuses to run it
const SB_LIB={src:'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',sri:'sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o'};
/** a new password: at least 8 characters, a capital letter, a small letter, a number and a symbol (shown under the field, green when met) */
const PWRULES=[['len',p=>p.length>=8],['up',p=>/[A-Z]/.test(p)],['low',p=>/[a-z]/.test(p)],['num',p=>/[0-9]/.test(p)],['sym',p=>/[^A-Za-z0-9]/.test(p)]];
const pwOK=p=>PWRULES.every(([,f])=>f(p));
document.addEventListener('input',e=>{const f=e.target.closest&&e.target.closest('[data-pwr]');if(!f)return;const l=$(f.id+'r');if(!l)return;
  PWRULES.forEach(([k,ok])=>{const li=l.querySelector(`[data-r="${k}"]`);if(li)li.classList.toggle('ok',ok(f.value))})});
/** coming back from the «forgot password» e-mail: choose a new password (it goes straight to Supabase) */
async function recoverPassword(){
  try{await loadSupabaseLib()}catch(e){toast(T('o_neterr'));return}
  OWN.client=OWN.client||window.supabase.createClient(SB.url,SB.key); // reads the one-time link from the address
  let session=null;for(let i=0;i<20&&!session;i++){session=(await OWN.client.auth.getSession()).data.session;if(!session)await new Promise(r=>setTimeout(r,250))}
  history.replaceState(null,'',location.pathname+location.search+'#calc');
  if(!session){await dialog({title:T('pw_forgot'),info:T('pw_expired'),buttons:[{label:T('o_ok'),action:'ok',pri:1}]});return}
  let err=null;
  while(true){
    const r=await dialog({err,title:T('pw_new_t'),fields:[{label:T('o_newpass'),type:'password',rules:1},{label:T('o_pass2'),type:'password',ac:'new-password'}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok'){await OWN.client.auth.signOut();return}
    if(!pwOK(r.values[0])){err={i:0,msg:T('pw_weak')};continue}
    if(r.values[0]!==r.values[1]){err={i:1,msg:T('o_mismatch')};continue}
    const {error}=await OWN.client.auth.updateUser({password:r.values[0]});
    if(error){err={msg:T(/aal2|AAL2|factor/i.test(error.message||'')?'pw_need2':'o_neterr')};continue}
    toast(T('o_chdone'));return afterLogin();
  }
}
function loadSupabaseLib(){return new Promise((ok,no)=>{if(window.supabase)return ok();const sc=document.createElement('script');sc.src=SB_LIB.src;sc.integrity=SB_LIB.sri;sc.crossOrigin='anonymous';sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)})}
/** a signed-in owner or pharmacist stays signed in after refreshing the page (Supabase keeps the session in this browser) */
async function resumeSession(){
  let has=false;try{has=Object.keys(localStorage).some(k=>/^sb-.+-auth-token$/.test(k))}catch(e){}
  if(!has||!SBON()||OWN.on)return;
  try{await loadSupabaseLib()}catch(e){return}
  OWN.client=OWN.client||window.supabase.createClient(SB.url,SB.key);
  const {data:{session}}=await OWN.client.auth.getSession();if(session&&!OWN.on)await afterLogin();
  if(WANT&&!OWN.on){WANT=null;history.replaceState(null,'',location.pathname+location.search+'#'+cur)} // signed out meanwhile: the address follows the page shown
}
async function openOwner(opt={}){
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
  if(opt.join!=null){if(await firstSetup(opt.join,opt.key))return afterLogin();return}
  let err=null,em='';
  while(true){
    const r=await dialog({err,title:T('o_login'),fields:[{label:T('o_email'),type:'email',value:em},{label:T('o_pass'),type:'password',value:''}],two:true,buttons:[{label:T('o_in'),action:'ok',pri:1},{label:T('o_first'),action:'first'},{label:T('pw_forgot'),action:'forgot'},{label:T('o_cancel'),action:'cancel'}]});
    if(r.action==='first'){if(await firstSetup(r.values[0],''))return afterLogin();continue}
    if(r.action==='forgot'){em=r.values[0].trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){err={i:0,msg:T('pw_needmail')};continue}
      // Supabase sends the e-mail; the link brings the person back here to choose a new password (never seen by the page's owner)
      const {error}=await OWN.client.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
      if(error){err={msg:T('o_neterr')};continue}
      await dialog({title:T('pw_forgot'),info:T('pw_sent'),buttons:[{label:T('o_ok'),action:'ok',pri:1}]});return}
    if(r.action!=='ok')return;
    em=r.values[0].trim();
    const {error}=await OWN.client.auth.signInWithPassword({email:em,password:r.values[1]});
    if(!error)return afterLogin();
    err={msg:T('o_badlogin')};
  }
}
async function firstSetup(email0,key){
  let err=null;
  while(true){
    const r=await dialog({err,title:T('o_firstt'),info:T('o_firsti'),fields:[{label:T('o_email'),type:'email',value:email0||''},{label:T('o_pass'),type:'password',value:'',rules:1},{label:T('o_pass2'),type:'password',value:''}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return false;
    const email=r.values[0].trim(),p1=r.values[1],p2=r.values[2];email0=email;
    if(!pwOK(p1)){err={i:1,msg:T('pw_weak')};continue}
    if(p1!==p2){err={i:2,msg:T('o_mismatch')};continue}
    let up;try{up=await OWN.client.auth.signUp({email,password:p1,options:{data:{invite:key||''}}})}catch(e){up={error:e}}
    const {error}=await OWN.client.auth.signInWithPassword({email,password:p1});
    if(!error)return true;
    err={msg:T(key?'o_notinvited':'tm_needkey')};
  }
}
/** The draft as this account should see it. Texts/info pages a pharmacist changed wait under "team":
   the owner sees his own texts (and the proposal in 🔔), the pharmacist sees his proposal. */
function draftFor(d,role){
  OWN.team=d&&d.team?clean(d.team):null;
  if(!d||!d.team||role==='owner')return d&&d.team?Object.fromEntries(Object.entries(d).filter(([k])=>k!=='team')):d;
  return {...d,text:d.team.text||d.text,pages:d.team.pages||d.pages,medcat:d.team.medcat||d.medcat};
}
async function afterLogin(){
  const c=OWN.client;const {data:{user}}=await c.auth.getUser();if(!user){toast(T('o_badlogin'));return}
  if(!(await mfaGate())){await c.auth.signOut();return}
  const {data:m}=await c.from('members').select('role,status,perms,name').eq('user_id',user.id).maybeSingle();
  if(!m||!['owner','editor'].includes(m.role)||m.status==='removed'){toast(T('o_norole'));await c.auth.signOut();return}
  if(m.status!=='active'){toast(T('tm_susp_msg'));await c.auth.signOut();return}
  OWN.perms=clean(m.perms||{});OWN.name=clean(m.name||'');
  const {data:dr}=await c.from('site_config').select('data').eq('id','draft').maybeSingle();
  const {data:ct,error}=await c.rpc('get_content');if(error||!ct){toast(T('o_neterr'));return}
  startOwner({local:false,role:m.role,draft:draftFor(dr&&dr.data,m.role),content:ct});
  if(m.role==='owner')teamLoad().then(()=>renderNav());else loadNotes();
  if(WANT){const [p,v]=WANT;WANT=null;if(location.hash==='#'+p)show(p,v)} // 1.17.1 the team page the reload asked for
  wantVit(); // 1.17.1 a vitamin that only the team's content has
}
function applyContent(ct){ct=clean(ct);CFG.refs=ct.refs||[];CFG.inter=ct.inter||[];CFG.nut={hide:(ct.nut&&ct.nut.hide)||[],custom:(ct.nut&&ct.nut.custom)||[]};OWN.nextRef=ct.next_ref||30;OWN.del=ct.del||null;OWN.parts=partsOf()}
const settingsOf=c=>({contact:c.contact,colors:c.colors,text:c.text,roadmap:c.roadmap,pages:c.pages||DEFAULT_CFG.pages,nutOrder:c.nutOrder||[],brand:c.brand||DEFAULT_CFG.brand,review:c.review||DEFAULT_CFG.review,menus:c.menus||DEFAULT_CFG.menus,tools:c.tools||DEFAULT_CFG.tools,medcat:c.medcat||null,look:c.look||DEFAULT_CFG.look});
/** the page «How to use and FAQ» is split in two: «How to use» (the first part) and «FAQ» (the questions) */
function splitHowto(){const P=Array.isArray(CFG.pages)&&splitPages(CFG.pages);if(!P)return false;CFG.pages=P;return true}
function startOwner({local,role,draft,content}){
  OWN.on=true;OWN.local=local;OWN.role=role;OWN.saved=false;OWN.preview=false;
  CFG=mergeCfg(DEFAULT_CFG,draft||PUBLISHED);if(content)applyContent(content);
  OWN.base=cfgJSON();undoReset();OWN.saved=!!draft&&JSON.stringify(draft)!==JSON.stringify(PUBLISHED);
  if(ISOWNER()&&splitHowto())changed(); // 1.12.0: «How to use» and «FAQ» become two pages (saved and published by the owner)
  document.body.classList.add('owner');changed();
}
/** One save/publish/decision at a time: blocks double taps and edits while it runs, and shows «جارٍ الحفظ…» */
async function locked(fn){
  if(OWN.busy)return false;OWN.busy=true;document.body.classList.add('busy');$('ostate').textContent=T('o_busy');
  try{return await fn()}finally{OWN.busy=false;document.body.classList.remove('busy');ownerBar()}
}
/** what was last loaded from / saved to the database, per part — only changed parts are sent */
const partsOf=()=>({refs:JSON.stringify(CFG.refs||[]),inter:JSON.stringify(CFG.inter||[]),nut:JSON.stringify({hide:NHIDE(),custom:NCUST()}),set:JSON.stringify(settingsOf(JSON.parse(cfgJSON())))});
const saveDraft=()=>locked(_saveDraft);
async function _saveDraft(){
  const data=JSON.parse(cfgJSON());
  if(OWN.local){try{localStorage.setItem('vw-draft',JSON.stringify(data))}catch(e){}}
  else{
    const c=OWN.client;
    const now=partsOf(),was=OWN.parts||{};
    const p={};if(CAN('refs')&&now.refs!==was.refs)p.refs=CFG.refs||[];if(CAN('inter')&&now.inter!==was.inter)p.inter=CFG.inter||[];if(CAN('nut')&&now.nut!==was.nut)p.nut={hide:NHIDE(),custom:NCUST()};
    if(Object.keys(p).length){
      // someone else (another pharmacist or another device) saved since this page loaded: do not overwrite their work
      const {data:srv,error:e0}=await c.rpc('get_content');if(e0||!srv){toast(T('o_neterr'));return false}
      const cs=clean(srv),ps={refs:JSON.stringify(cs.refs||[]),inter:JSON.stringify(cs.inter||[]),nut:JSON.stringify({hide:(cs.nut&&cs.nut.hide)||[],custom:(cs.nut&&cs.nut.custom)||[]})};
      if(Object.keys(p).some(k=>was[k]!=null&&ps[k]!==was[k])){
        const q=await dialog({title:T('o_conflict_t'),info:T('o_conflict_i'),buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_reload'),action:'ok',pri:1}]});
        if(q.action==='ok'){applyContent(srv);OWN.base=cfgJSON();undoReset();changed()}
        return false;
      }
    }
    if((CAN('text')||CAN('inter'))&&now.set!==was.set){ // a pharmacist's write keeps only his proposed medicine list (draft_guard)
      if(!CAN('text'))toast(T('mc_sent'));const {error}=await c.from('site_config').upsert({id:'draft',data:settingsOf(data),updated_at:new Date().toISOString()});if(error){toast(T('o_neterr'));return false}}
    if(Object.keys(p).length){const {error:e2}=await c.rpc('save_content',{p});if(e2){console.error(e2);toast(T('o_saveerr'));return false}}
    const {data:ct,error:e3}=await c.rpc('get_content');if(!e3&&ct){applyContent(ct);refreshAll()}
  }
  OWN.base=cfgJSON();OWN.parts=partsOf();OWN.saved=true;undoReset();ownerBar();toast(T('o_savedone'));return true;
}
/** 1.16.0: the same comparison as pubSummary, one line per change, each with where to see it */
function pubList(){
  const st=v=>v&&typeof v==='object'?Array.isArray(v)?'['+v.map(st).join(',')+']':'{'+Object.keys(v).filter(k=>v[k]!==undefined&&v[k]!=='').sort().map(k=>JSON.stringify(k)+':'+st(v[k])).join(',')+'}':JSON.stringify(v??'');
  const ok=x=>x.rv===false?x.pv||null:x,live=x=>x&&!x.hidden,P=PUBLISHED||{},d=DELS(),out=[];
  const W=(kind,label,go)=>out.push({t:T('pb_'+kind)+' '+label,go});
  const cmp=(A,B,key,lab,go)=>{const a=new Map(A.map(x=>[key(x),x])),b=new Map(B.map(x=>[key(x),x]));
    a.forEach((x,k)=>{if(!b.has(k))W('add',lab(x),go(x));else if(st(x)!==st(b.get(k)))W('chg',lab(x),go(x))});
    b.forEach((x,k)=>{if(!a.has(k))W('del',lab(x),null)})};
  const norm=(x,f)=>{const y={};f.forEach(k=>{if(x[k]!==undefined&&!(k==='g'&&!(x.g&&x.g.d)))y[k]=x[k]});return y};
  const RF=['id','org','title','url','ar','en','kind'],IF=['k','a','b','d','sev','r','g'],NF=['id','n','h','uk','rows','plan','note','r'];
  cmp([...(CFG.refs||[]),...(d.refs||[])].map(ok).filter(live).map(x=>norm(x,RF)),(P.refs||[]).map(x=>norm(x,RF)),x=>x.id,x=>`${x.id}. ${x.org}`,x=>()=>{go('sources');setTimeout(()=>{const e=$('ref-'+x.id);if(e)e.scrollIntoView({block:'center'})},250)});
  cmp([...(CFG.inter||[]),...(d.inter||[])].map(ok).filter(live).map(x=>norm(x,IF)),(P.inter||[]).map(x=>norm(x,IF)),x=>x.k+'|'+((x.b&&(x.b.en||x.b.ar))||''),x=>`${kname(x.k)} + ${tx2(x.b)}`,()=>()=>go('interactions'));
  cmp([...NCUST(),...(d.nut||[])].map(ok).filter(live).map(x=>norm(x,NF)),((P.nut&&P.nut.custom)||[]).map(x=>norm(x,NF)),x=>x.id,x=>tx2(x.n),x=>()=>{go('calc');if(typeof openNut==='function')openNut(x.id)});
  if(st(NHIDE())!==st((P.nut&&P.nut.hide)||[]))W('chg',T('pb_nhide'),()=>go('calc'));
  const S=k=>st(CFG[k])!==st(P[k]??DEFAULT_CFG[k]);
  if(S('text')){const a=CFG.text||{},b=P.text||{};[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>st(a[k])!==st(b[k])&&I18N[k]).forEach(k=>W(a[k]?(b[k]?'chg':'add'):'del',`«${T(k).slice(0,50)}»`,null))}
  if(S('pages')){const a=CFG.pages||[],b=P.pages||DEFAULT_CFG.pages;cmp(a,b,x=>x.id,x=>T('pb_page')+' «'+tx2(x.t)+'»',x=>()=>openPage(x.id))}
  [['roadmap','pb_rm',()=>go('roadmap')],['look','lk_win',editLook],['colors','lk_cols',editLook],['menus','pb_menus',()=>go('menu')],['tools','pb_tools',()=>go('tools')],
   ['brand','br_t',()=>editBrand()],['review','pb_review',()=>editReview()],['contact','o_contact',()=>editContact()],['nutOrder','pb_order',()=>go('calc')],['medcat','pb_medcat',()=>go('meds')]]
    .forEach(([k,lab,g])=>{if(S(k))W('chg',T(lab),g)});
  return out;
}
/** what «Publish» will change for visitors (approved content and page settings) and what still waits for review */
function pubSummary(){
  const st=v=>v&&typeof v==='object'?Array.isArray(v)?'['+v.map(st).join(',')+']':'{'+Object.keys(v).filter(k=>v[k]!==undefined&&v[k]!=='').sort().map(k=>JSON.stringify(k)+':'+st(v[k])).join(',')+'}':JSON.stringify(v??'');
  const ok=x=>x.rv===false?x.pv||null:x,live=x=>x&&!x.hidden;
  const P=PUBLISHED||{},d=DELS();
  const nutHide=NHIDE(),nut=[...NCUST(),...(d.nut||[])].map(ok).filter(live);
  const keys=new Set(BUILTIN.filter(k=>!nutHide.includes(k)).concat(nut.map(c=>c.id)));
  const A={refs:[...(CFG.refs||[]),...(d.refs||[])].map(ok).filter(live).map(x=>st({id:x.id,org:x.org,title:x.title,url:x.url,ar:x.ar,en:x.en,kind:x.kind})),
    inter:[...(CFG.inter||[]),...(d.inter||[])].map(ok).filter(x=>live(x)&&keys.has(x.k)).map(x=>st({k:x.k,a:x.a,b:x.b,d:x.d,sev:x.sev,r:x.r,...(x.g&&x.g.d?{g:x.g}:{})})),
    nut:nut.map(c=>st({id:c.id,n:c.n,h:c.h,uk:c.uk,rows:c.rows,plan:c.plan,note:c.note,r:c.r}))};
  const B={refs:(P.refs||[]).map(st),inter:(P.inter||[]).map(x=>{const y={...x};if(!(y.g&&y.g.d))delete y.g;return st(y)}),nut:((P.nut&&P.nut.custom)||[]).map(st)};
  let n=0;for(const k of ['refs','inter','nut']){const a=new Set(A[k]),b=new Set(B[k]);n+=Math.max([...a].filter(x=>!b.has(x)).length,[...b].filter(x=>!a.has(x)).length)}
  if(st(nutHide)!==st((P.nut&&P.nut.hide)||[]))n++;
  for(const k of ['contact','colors','text','roadmap','pages','nutOrder','brand','review','menus','tools','medcat','look'])if(st(CFG[k])!==st(P[k]??DEFAULT_CFG[k]))n++;
  return {n,wait:pendingCount()};
}
let PBGO=[];
// «show me»: close the publish window and go to the change
document.addEventListener('click',e=>{const b=e.target.closest('[data-pbgo]');if(!b)return;e.preventDefault();const x=PBGO[+b.dataset.pbgo];if(dialog.cancel)dialog.cancel();if(x&&x.go)setTimeout(x.go,50)});
async function publish(){
  if(!(OWN.local||OWN.role==='owner')){toast(T('o_onlyowner'));return}
  if(OWN.busy)return;
  const sm=pubSummary(),info=(sm.n?T('o_pub_will').replace('{n}',sm.n):T('o_pub_none'))+(sm.wait?'\n'+T('o_pub_wait').replace('{n}',sm.wait):'');
  PBGO=pubList();
  const list=PBGO.length?{type:'html',html:`<div class="row"><span class="l">${esc(T('pb_list'))}</span><ul class="pblist">${PBGO.map((x,i)=>`<li><span>${esc(x.t)}</span>${x.go?`<button type="button" class="btn" data-pbgo="${i}">${esc(T('pb_go'))}</button>`:''}</li>`).join('')}</ul></div>`}:null;
  const r=await dialog({title:T('o_pubq'),info,fields:[...(list?[list]:[]),{label:T('o_note'),value:''}],buttons:[...(sm.wait?[{label:T('nt_open'),action:'notif'}]:[]),{label:T('o_cancel'),action:'cancel'},{label:T('o_publish'),action:'ok',pri:1}]});
  if(r.action==='notif'){openNotif();return}
  if(r.action!=='ok')return;
  const note=r.values[r.values.length-1]||'';
  return locked(async()=>{
  if(!(await _saveDraft()))return;
  const data=JSON.parse(cfgJSON());
  if(OWN.local){try{localStorage.setItem('vw-cfg',JSON.stringify(data))}catch(e){}}
  else{
    const {error}=await OWN.client.rpc('publish_site',{note});if(error){console.error(error);toast(T('o_neterr'));return}
    const {data:pub}=await OWN.client.from('site_config').select('data').eq('id','published').maybeSingle();
    if(pub&&pub.data){PUBLISHED=pub.data;try{localStorage.setItem('vw-cfg',JSON.stringify(PUBLISHED))}catch(e){}}
    OWN.saved=false;ownerBar();toast(T('o_pubdone'));return;
  }
  PUBLISHED=data;OWN.saved=false;ownerBar();toast(T('o_pubdone'));
  });
}
async function discard(){
  const q=await dialog({title:T('o_discq'),info:T('o_disc_i'),buttons:[{label:T('o_back'),action:'cancel'},{label:T('o_discyes'),action:'ok',pri:1,danger:1}]});if(q.action!=='ok')return;
  if(OWN.local){try{localStorage.removeItem('vw-draft')}catch(e){}CFG=mergeCfg(DEFAULT_CFG,PUBLISHED)}
  else{
    const c=OWN.client;const {data:dr}=await c.from('site_config').select('data').eq('id','draft').maybeSingle();
    const {data:ct,error}=await c.rpc('get_content');if(error||!ct){toast(T('o_neterr'));return}
    CFG=mergeCfg(DEFAULT_CFG,draftFor(dr&&dr.data,OWN.role)||PUBLISHED);applyContent(ct);
    OWN.saved=!!(dr&&dr.data);OWN.base=cfgJSON();undoReset();changed();toast(T('o_discdone'));return;
  }
  OWN.base=cfgJSON();OWN.saved=false;undoReset();changed();toast(T('o_discdone'));
}
/* ===================== 1.16.0 activity log («سجل الإجراءات») =====================
   The database writes every action itself (table public.activity, file activity_log_1_16_0.sql): added, edited (which fields),
   hidden, shown, deleted, approved, rejected content; saved draft parts; publishing; the team. The owner reads all of it,
   an invited pharmacist only his own (row level security). Under each action: who did it and when. */
let LOGF='all',LOGW='',LOGROWS=null;
const LOGKIND={all:null,content:['src','int','nut'],set:['draft'],pub:['publish'],team:['team']};
const LOGFIELD={org:'lf_org',title:'lf_title',url:'lf_url',use_ar:'lf_use',use_en:'lf_use',kind:'lf_kind',nutrient_id:'lf_nut',supp_ar:'lf_nut',supp_en:'lf_nut',
  with_ar:'lf_with',with_en:'lf_with',desc_ar:'lf_desc',desc_en:'lf_desc',severity:'lf_sev',source_ids:'lf_src',gap:'lf_gap',hidden:'lf_hidden',
  name_ar:'lf_name',name_en:'lf_name',hint_ar:'lf_hint',hint_en:'lf_hint',unit:'lf_unit',dose_rows:'lf_rows',plan_ar:'lf_plan',plan_en:'lf_plan',note_ar:'lf_note',note_en:'lf_note',
  text:'lf_text',pages:'lf_pages',menus:'pb_menus',tools:'pb_tools',look:'lk_win',colors:'lk_cols',roadmap:'pb_rm',brand:'br_t',review:'pb_review',contact:'o_contact',
  nutOrder:'pb_order',medcat:'pb_medcat',nut:'lf_nhide',team:'lf_team',team_done:'lf_teamdone'};
async function openLog(){
  if(!(typeof OWN!=='undefined'&&OWN.on))return;
  openSheet(T('lg_t'),`<p class="hint">${esc(T(ISOWNER()?'lg_i_own':'lg_i_team'))}</p><p class="hint">${esc(T('o_busy'))}</p>`,{key:'log'});
  LOGROWS=null;
  if(OWN.local||!OWN.client){LOGROWS=[];drawLog();return}
  const {data,error}=await OWN.client.from('activity').select('id,at,who,kind,action,item,label,detail').order('id',{ascending:false}).limit(300);
  LOGROWS=error?false:clean(data||[]);drawLog();
}
function drawLog(){
  if(!SHEET||SHEET.key!=='log')return;
  if(LOGROWS===false){$('sheet-b').innerHTML=`<p class="hint">${esc(T('lg_nodb'))}</p>`;return}
  const rows=LOGROWS||[],people=[...new Set(rows.map(r=>r.who||'').filter(Boolean))];
  const ks=LOGKIND[LOGF],list=rows.filter(r=>(!ks||ks.includes(r.kind))&&(!LOGW||r.who===LOGW));
  const fmtD=d=>{try{return new Date(d).toLocaleString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB',{dateStyle:'medium',timeStyle:'short'})}catch(e){return d}};
  const det=r=>{if(!r.detail)return '';if(r.kind==='team'&&r.action!=='perms')return r.detail;
    const parts=[...new Set(r.detail.split(',').map(k=>LOGFIELD[k]?T(LOGFIELD[k]):r.kind==='team'?(I18N['pl_'+k]?T('pl_'+k):k):k))];return T(r.kind==='team'?'lg_perms':'lg_what')+' '+parts.join(L('، ',', '))};
  const lab=r=>{let l=r.label||r.item||'';if(r.kind==='int'){const i=l.indexOf(' + '),k=i>0?l.slice(0,i):'';if(k&&(KEYS.includes(k)||I18N['n_'+k]))l=kname(k)+l.slice(i)}else if(r.kind==='nut'&&r.item&&(KEYS.includes(r.item)))l=kname(r.item);return l};
  const what=r=>{const kn=I18N['lk_'+r.kind]?T('lk_'+r.kind):r.kind;return r.kind==='publish'?(r.label?`«${r.label}»`:''):r.kind==='draft'?'':`${kn}: ${lab(r)}`};
  $('sheet-b').innerHTML=`<p class="hint">${esc(T(ISOWNER()?'lg_i_own':'lg_i_team'))}</p>`+
    `<div class="filters lgf">${Object.keys(LOGKIND).map(k=>`<button type="button" data-logf="${k}" aria-pressed="${k===LOGF}">${esc(T('lg_f_'+k))}<bdi class="fc">${rows.filter(r=>!LOGKIND[k]||LOGKIND[k].includes(r.kind)).length}</bdi></button>`).join('')}</div>`+
    (ISOWNER()&&people.length>1?`<div class="row lgw"><label class="l" for="logw">${esc(T('lg_who'))}</label><select id="logw"><option value="">${esc(T('all'))}</option>${people.map(p=>`<option${p===LOGW?' selected':''}>${esc(p)}</option>`).join('')}</select></div>`:'')+
    (list.length?`<ul class="lglist">${list.map(r=>`<li class="lga-${esc(r.action)}"><div class="lgh"><span class="lgc">${esc(T('la_'+r.action))}</span><b>${esc(what(r))}</b></div>${det(r)?`<div class="lgd">${esc(det(r))}</div>`:''}<div class="lgby">${esc(T('lg_by'))} <b>${esc(r.who||T('lg_unknown'))}</b> · <bdi>${esc(fmtD(r.at))}</bdi></div></li>`).join('')}</ul>`:`<p class="inone">${esc(T('lg_none'))}</p>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-logf]');if(!b)return;e.preventDefault();LOGF=b.dataset.logf;drawLog()});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='logw'){LOGW=e.target.value;drawLog()}});
/* ===================== account & security (owner and pharmacists) =====================
   Password (the current one is checked first), two-step verification with an authenticator app (TOTP),
   signing out other devices. With two-step verification on, the database also refuses edits until the code is given. */
async function changePass(){
  let err=null;
  while(true){
    const r=await dialog({err,title:T('o_chpt'),fields:[{label:T('ac_curpass'),type:'password',value:''},{label:T('o_newpass'),type:'password',value:'',rules:1},{label:T('o_pass2'),type:'password',value:''}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return;
    const [p0,p1,p2]=r.values;
    if(!pwOK(p1)){err={i:1,msg:T('pw_weak')};continue}
    if(p1!==p2){err={i:2,msg:T('o_mismatch')};continue}
    const {data:{user}}=await OWN.client.auth.getUser();
    const chk=await OWN.client.auth.signInWithPassword({email:user.email,password:p0});
    if(chk.error){err={i:0,msg:T('ac_badcur')};continue}
    if(!(await mfaGate()))return;
    const {error}=await OWN.client.auth.updateUser({password:p1});
    if(error){err={msg:T('o_neterr')};continue}
    toast(T('o_chdone'));return;
  }
}
/** asks for the 6-digit code when this account has two-step verification and the session is not verified yet */
async function mfaGate(){
  const c=OWN.client;if(!c||!c.auth.mfa)return true;
  const {data:l}=await c.auth.mfa.getAuthenticatorAssuranceLevel();
  if(!l||l.nextLevel!=='aal2'||l.currentLevel==='aal2')return true;
  const {data:f}=await c.auth.mfa.listFactors();const fac=f&&f.totp&&f.totp.find(x=>x.status==='verified');if(!fac)return true;
  let err=null;
  while(true){
    const r=await dialog({err,title:T('ac_code_t'),info:T('ac_code_i'),fields:[{label:T('ac_code'),value:'',ph:'123456',ltr:1}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
    if(r.action!=='ok')return false;
    const code=r.values[0].replace(/\D/g,'');
    const {error}=await c.auth.mfa.challengeAndVerify({factorId:fac.id,code});
    if(!error)return true;
    err={i:0,msg:T('ac_badcode')};
  }
}
const ACC={user:null,factors:[]};
async function openAccount(){
  if(OWN.local)return;
  openSheet(T('ac_t'),`<p class="inone">${T('o_busy')}</p>`,{key:'account'});
  const c=OWN.client;const {data:{user}}=await c.auth.getUser();ACC.user=user;
  const {data:f}=await c.auth.mfa.listFactors();ACC.factors=((f&&f.totp)||[]).filter(x=>x.status==='verified');
  renderAccount();
}
function renderAccount(){
  if(!SHEET||SHEET.key!=='account'||!ACC.user)return;
  ACT.s=[];const S=c=>chipH('s',c),u=ACC.user,on=ACC.factors.length>0;
  $('sheet-b').innerHTML=`<div class="tmc"><div class="tmh"><b>${esc(OWN.name||u.email)}</b><span class="st st-dev">${esc(T(ISOWNER()?'o_owner':'o_editor'))}</span></div>
    <div class="tmm" dir="ltr">${esc(u.email)}</div><div class="tmm">${T('tm_last')} ${esc(fmtDate(u.last_sign_in_at))}</div></div>
    <h4 class="tms">${T('ac_pass')}</h4><div class="filters">${S({label:T('o_chpass'),f:changePass})}</div>
    <h4 class="tms">${T('ac_mfa')} <span class="st ${on?'st-dev':'st-idea'}">${T(on?'ac_on':'ac_off')}</span></h4><p class="hint">${T('ac_mfa_i')}</p>
    <div class="filters">${on?S({label:T('ac_mfa_off'),cls:'danger',f:mfaDisable}):S({label:T('ac_mfa_on'),cls:'pri',f:mfaEnable})}</div>
    <h4 class="tms">${T('ac_devices')}</h4><p class="hint">${T('ac_devices_i')}</p><div class="filters">${S({label:T('ac_others'),f:signOutOthers})}</div>`;
}
async function mfaEnable(){
  const c=OWN.client;
  const {data:old}=await c.auth.mfa.listFactors();for(const x of ((old&&old.all)||[]).filter(x=>x.status!=='verified'))await c.auth.mfa.unenroll({factorId:x.id}); // unfinished tries
  const {data,error}=await c.auth.mfa.enroll({factorType:'totp',friendlyName:'VITAWAW'});if(error||!data){toast(T('o_neterr'));return}
  const qr=String(data.totp.qr_code||''),secret=String(data.totp.secret||'');
  let err=null;
  while(true){
    const r=await dialog({err,title:T('ac_mfa_on'),info:T('ac_scan'),fields:[{type:'qr',value:[qr,secret]},{label:T('ac_code'),value:'',ph:'123456',ltr:1}],buttons:[{label:T('o_cancel'),action:'cancel'},{label:T('ac_activate'),action:'ok',pri:1}]});
    if(r.action!=='ok'){await c.auth.mfa.unenroll({factorId:data.id});return}
    const {error:e2}=await c.auth.mfa.challengeAndVerify({factorId:data.id,code:r.values[1].replace(/\D/g,'')});
    if(!e2)break;
    err={i:1,msg:T('ac_badcode')};
  }
  toast(T('ac_mfa_done'));openAccount();
}
async function mfaDisable(){
  if(!(await confirmDel(T('ac_mfa_off_i'))))return;
  if(!(await mfaGate()))return;
  const c=OWN.client;for(const x of ACC.factors){const {error}=await c.auth.mfa.unenroll({factorId:x.id});if(error){toast(T('o_neterr'));return}}
  toast(T('ac_mfa_offdone'));openAccount();
}
async function signOutOthers(){
  const {error}=await OWN.client.auth.signOut({scope:'others'});toast(T(error?'o_neterr':'ac_others_done'));
}
async function logout(){
  if(dirty()){const q=await dialog({title:T('o_leave'),buttons:[{label:T('o_back'),action:'cancel'},{label:T('o_leaveyes'),action:'ok',pri:1,danger:1}]});if(q.action!=='ok')return}
  if(!OWN.local&&OWN.client)try{await OWN.client.auth.signOut()}catch(e){}
  closeSheet(false);TEAM.list=null;
  OWN.on=false;OWN.preview=false;OWN.perms={};OWN.name='';OWN.role=null;OWN.del=null;OWN.team=null;NOTE.mine=[];
  document.body.classList.remove('owner','preview','not-owner','cant-nut','cant-inter','cant-refs','cant-text');CFG=mergeCfg(DEFAULT_CFG,PUBLISHED);refreshAll();
}
$('o-save').addEventListener('click',saveDraft);$('o-publish').addEventListener('click',publish);
$('o-pvexit').addEventListener('click',()=>setPreview(false));
// page texts are edited only after «✎ النصوص» is switched on (the page stays calm otherwise)
$('o-texts').addEventListener('click',()=>{document.body.classList.toggle('textedit');refreshAll();if(typeof renderMedCat==='function')renderMedCat();ownerBar()});
addEventListener('resize',()=>{if(OWN.on)ownerBar()});$('o-preview').addEventListener('click',()=>setPreview(true));$('o-undo').addEventListener('click',undoLast);$('o-sizes').addEventListener('click',openSizes);$('o-discard').addEventListener('click',discard);
addEventListener('beforeunload',e=>{if(OWN.on&&dirty()){e.preventDefault();e.returnValue=''}});

// 👁 shows or hides what is typed in a password field
document.addEventListener('click',e=>{const b=e.target.closest('[data-peye]');if(!b)return;const f=$(b.dataset.peye);if(!f)return;
  const show=f.type==='password';f.type=show?'text':'password';b.innerHTML=show?EYEOFF:EYE;b.setAttribute('aria-label',T(show?'pw_hide':'pw_show'));b.title=T(show?'pw_hide':'pw_show');f.focus()});
