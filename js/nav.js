/* VITAWAW · js/nav.js
   The menus. Same design for visitors, pharmacists and the owner:
   - ☰ side menu: sections (tap a main item → its sub-items appear under it as chips), information pages,
     and a «الإدارة / Management» part for the team (what appears depends on the account's permissions).
   - ⋯ More menu (opposite side): language, appearance, view mode, share/install, contact, account, publishing.
   - Floating window (sheet) in the middle of the screen: tools, information pages, pharmacists.
   To add a menu entry, add one object to navGroups() or one row to renderMore().
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */

/* ===================== helpers ===================== */
const ICO={
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  page:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/></svg>',
  site:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/></svg>'
};
const CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const TOOLS=[['tool-pill','tl_pill','tt_t'],['tool-d','tl_d','td_t'],['tool-ca','tl_ca','tp_t'],['tool-gz','tl_gz','tg_t']];
const tabIco=p=>{const s=$('t-'+p)&&$('t-'+p).querySelector('svg');return s?s.outerHTML:ICO.info};
/** true when the signed-in account may edit this part: 'nut' | 'inter' | 'refs' | 'text' */
const CAN=k=>typeof OWN!=='undefined'&&OWN.on&&(OWN.local||OWN.role==='owner'||!!(OWN.perms&&OWN.perms[k]));
const ISOWNER=()=>typeof OWN!=='undefined'&&OWN.on&&(OWN.local||OWN.role==='owner');
const colorVars=p=>CFG.colors[p]?`--pc:${CFG.colors[p][0]};--pc2:${CFG.colors[p][1]}`:'';
const paras=t=>String(t||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join('');
const visiblePages=(all=SHOWALL())=>(CFG.pages||[]).filter(p=>all||!p.hidden);

/* Every menu button stores its action here; data-na="d3" = side menu action 3, "m" = More, "s" = sheet. */
const ACT={d:[],m:[],s:[]};
function chipH(r,c){
  if(c.href)return `<a class="chip${c.cls?' '+c.cls:''}" href="${esc(c.href)}"${/^https?:/.test(c.href)?' target="_blank" rel="noopener"':''}>${esc(c.label)}</a>`;
  const i=ACT[r].push(c.f)-1;
  return `<button type="button" class="${c.cls||''}" data-na="${r}${i}"${c.pressed!=null?` aria-pressed="${!!c.pressed}"`:''}>${esc(c.label)}${c.n?` <span class="cn">${c.n}</span>`:''}</button>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-na]');if(!b)return;
  const f=ACT[b.dataset.na[0]][+b.dataset.na.slice(1)];if(f){e.preventDefault();f(b)}
});

/* ===================== ☰ side menu ===================== */
let NAVG=null; // which main item is open (shows its chips)
function pickNut(k){K=k;try{localStorage.setItem('vw-k',k)}catch(e){}apply();go('calc')}
function goPending(p){
  closeNav();
  if(p==='interactions'){IF='all';$('isearch').value='';renderInter()}
  if(p==='sources'){SF='all';renderRefs()}
  go(p);setTimeout(()=>{const el=$(p).querySelector('.pending');if(el)el.scrollIntoView({block:'center'})},60);
}
function pendCounts(){return {n:NCUST().filter(x=>x.rv===false).length,i:(CFG.inter||[]).filter(x=>x.rv===false).length,r:(CFG.refs||[]).filter(x=>x.rv===false).length,c:changeList().length,d:delCount()}}
function navGroups(){
  const G=[{sec:'nv_sections'}];
  G.push({id:'calc',page:'calc',label:T('tab_calc'),chips:KEYS.slice(1).map(k=>({label:kname(k),pressed:cur==='calc'&&K===k,f:()=>{closeNav();pickNut(k)}}))});
  G.push({id:'interactions',page:'interactions',label:T('tab_int'),n:INTER.length,
    chips:KEYS.filter(k=>k==='all'||INTER.some(x=>x[0]===k)).map(k=>({label:kname(k),pressed:cur==='interactions'&&IF===k,f:()=>{closeNav();IF=k;renderInter();go('interactions')}}))});
  G.push({id:'tools',page:'tools',label:T('tab_tools'),chips:TOOLS.map(([sec,k])=>({label:T(k),f:()=>{closeNav();openToolSheet(sec)}}))});
  G.push({id:'sources',page:'sources',label:T('tab_src'),n:Object.keys(REFS).length,
    chips:KEYS.map(k=>({label:kname(k),pressed:cur==='sources'&&SF===k,f:()=>{closeNav();SF=k;renderRefs();go('sources')}}))});
  G.push({id:'roadmap',page:'roadmap',label:T('tab_rm')});
  const pg=visiblePages();
  if(pg.length){G.push({sec:'nv_info'});pg.forEach(p=>G.push({id:'pg-'+p.id,label:tx2(p.t),ico:ICO.info,hidden:p.hidden,f:()=>{closeNav();openPage(p.id)}}))}
  // management (owner, or a pharmacist with the matching permission)
  if(typeof OWN!=='undefined'&&OWN.on&&!OWN.preview){
    const A=[];
    if(ISOWNER()){
      const c=pendCounts(),tot=c.n+c.i+c.r+c.d;
      A.push({id:'review',label:T('ad_review'),ico:ICO.check,n:tot,chips:tot?[
        c.n&&{label:T('ad_vit'),n:c.n,f:()=>goPending('calc')},c.i&&{label:T('tab_int'),n:c.i,f:()=>goPending('interactions')},c.r&&{label:T('tab_src'),n:c.r,f:()=>goPending('sources')},c.c&&{label:T('rc_t'),n:c.c,f:()=>{closeNav(false);openChanges()}}].filter(Boolean)
        :[{label:T('ad_none'),cls:'muted',f:()=>{}}]});
    }
    if(CAN('text'))A.push({id:'pages',label:T('ad_pages'),ico:ICO.page,chips:[{label:T('ad_newpage'),cls:'add',f:()=>{closeNav();editPage(null)}},
      ...(CFG.pages||[]).map(p=>({label:tx2(p.t)+(p.hidden?' · '+T('pg_hidden'):''),f:()=>{closeNav();editPage(p.id)}}))]});
    if(ISOWNER()&&!OWN.local)A.push({id:'team',label:T('ad_team'),ico:ICO.team,n:TEAM.list?TEAM.list.members.filter(m=>m.role==='editor').length:0,chips:[
      {label:T('ad_invite'),cls:'add',f:()=>{closeNav();teamInvite()}},{label:T('ad_accounts'),f:()=>{closeNav();openTeam()}},{label:T('ad_invites'),f:()=>{closeNav();openTeam('inv')}}]});
    if(ISOWNER())A.push({id:'site',label:T('ad_site'),ico:ICO.site,chips:[{label:T('o_contact'),f:()=>{closeNav();editContact()}},
      ...PAGES.map(p=>({label:T('ad_colors')+': '+T({calc:'tab_calc',tools:'tab_tools',interactions:'tab_int',sources:'tab_src',roadmap:'tab_rm'}[p]),f:()=>{closeNav();editColors(p)}}))]});
    if(A.length)G.push({sec:'nv_admin'},...A);
  }
  return G;
}
function navMain(g){
  if(g.chips){
    NAVG=NAVG===g.id?null:g.id;
    if(g.page&&NAVG===g.id&&cur!==g.page)go(g.page);
    renderNav();const b=$('drawer-b').querySelector(`[data-g="${g.id}"]`);if(b)b.focus();
    return;
  }
  if(g.page){closeNav();go(g.page);return}
  if(g.f)g.f();
}
function renderNav(){
  if(!$('drawer'))return;
  $('nav-btn').setAttribute('aria-label',T('nav_menu'));$('nav-btn').title=T('nav_menu');
  $('more-btn').setAttribute('aria-label',T('nav_more'));$('more-btn').title=T('nav_more');
  $('drawer-t').textContent=T('nav_menu');$('more-t').textContent=T('nav_more');
  document.querySelectorAll('#drawer-x,#sheet-x').forEach(x=>x.setAttribute('aria-label',L('إغلاق','Close')));
  $('nav-dot').hidden=!(ISOWNER()&&!OWN.preview&&pendingCount());
  $('flinks').innerHTML=visiblePages(false).map(p=>`<a href="#info-${esc(p.id)}">${esc(tx2(p.t))}</a>`).join('<span aria-hidden="true"> · </span>');
  if($('drawer').hidden)return;
  ACT.d=[];let h='';
  for(const g of navGroups()){
    if(g.sec){h+=`<p class="dsec">${esc(T(g.sec))}</p>`;continue}
    const open=!!g.chips&&NAVG===g.id,on=!!g.page&&cur===g.page,i=ACT.d.push(()=>navMain(g))-1;
    h+=`<div class="dgrp${open?' open':''}" style="${colorVars(g.page)}"><button type="button" class="ditem${on?' on':''}" data-g="${esc(g.id)}" data-na="d${i}"${g.chips?` aria-expanded="${open}"`:''}${on?' aria-current="page"':''}>`+
       `<span class="di">${g.ico||tabIco(g.page)}</span><span class="dl">${esc(g.label)}</span>${g.n?`<span class="cnt">${g.n}</span>`:''}${g.hidden?`<span class="pend">${T('pg_hidden')}</span>`:''}${g.chips?CHEV:''}</button>`+
       (open?`<div class="filters dchips">${g.chips.map(c=>chipH('d',c)).join('')}</div>`:'')+`</div>`;
  }
  $('drawer-b').innerHTML=h;
}
function openNav(group){
  closeMore(false);NAVG=group||(PAGES.includes(cur)?cur:null);
  $('drawer').hidden=false;$('scrim').hidden=false;$('nav-btn').setAttribute('aria-expanded','true');document.body.classList.add('menu-open');
  renderNav();($('drawer-b').querySelector('.ditem.on')||$('drawer-b').querySelector('.ditem')||$('drawer')).focus();
}
function closeNav(focus=true){
  if($('drawer').hidden)return;
  $('drawer').hidden=true;$('drawer-b').innerHTML='';$('scrim').hidden=true;$('nav-btn').setAttribute('aria-expanded','false');document.body.classList.remove('menu-open');
  if(focus)$('nav-btn').focus();
}
$('nav-btn').addEventListener('click',()=>$('drawer').hidden?openNav():closeNav());
$('drawer-x').addEventListener('click',()=>closeNav());

/* ===================== ⋯ More menu ===================== */
let INSTALL=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();INSTALL=e});
function shareApp(){
  const url=location.origin+location.pathname;
  if(navigator.share){navigator.share({title:APPNAME(),text:T('sh_text'),url}).catch(()=>{});return}
  const done=()=>toast(T('sh_copied'));
  try{navigator.clipboard.writeText(url).then(done).catch(()=>fallback(url,done))}catch(e){fallback(url,done)}
}
function installApp(){
  if(INSTALL){INSTALL.prompt();INSTALL.userChoice.finally(()=>{INSTALL=null});return}
  openSheet(T('inst_t'),`<div class="prose">${paras(T('inst_b'))}</div>`);
}
const APPNAME=()=>'VITAWAW';
const whoLabel=()=>T(OWN.local?'o_local':OWN.role==='owner'?'o_owner':'o_editor')+(OWN.name?' · '+OWN.name:'');
function renderMore(){
  if(!$('more')||$('more').hidden)return;
  ACT.m=[];const own=typeof OWN!=='undefined'&&OWN.on;
  const shut=f=>()=>{closeMore(false);f()};
  const rows=[
    ['mr_lang',[{label:'العربية',pressed:LANG==='ar',f:()=>setLang('ar')},{label:'English',pressed:LANG==='en',f:()=>setLang('en')}]],
    ['mr_theme',[{label:T('mr_light'),pressed:!isDark(),f:()=>setTheme('light')},{label:T('mr_dark'),pressed:isDark(),f:()=>setTheme('dark')}]],
    ['mr_mode',[{label:T('m_pro'),pressed:MODE==='pro',f:()=>setMode('pro')},{label:T('m_pt'),pressed:MODE==='pt',f:()=>setMode('pt')}]],
    ['mr_app',[{label:T('mr_share'),f:shut(shareApp)},{label:T('mr_install'),f:shut(installApp)}]]];
  const c=[];if(PHONEF())c.push({label:T('mr_wa'),href:waLink('VITAWAW')});if(EMAILF())c.push({label:T('mr_mail'),href:mailto('VITAWAW – '+L('اقتراح','Suggestion'))});
  if(PHONEF())c.push({label:T('mr_call'),href:'tel:'+PHONEF().replace(/[^+\d]/g,'')});
  if(c.length)rows.push(['mr_contact',c]);
  if(!own)rows.push(['mr_account',[{label:T('o_login'),cls:'pri',f:shut(()=>openOwner())},{label:T('mr_join'),f:shut(()=>openOwner({join:''}))}]]);
  else{
    rows.push(['mr_pub',ISOWNER()
      ?[{label:T(OWN.preview?'o_pvexit':'o_preview'),pressed:OWN.preview,f:shut(()=>setPreview(!OWN.preview))},{label:T('o_save'),f:shut(saveDraft)},{label:T('o_publish'),cls:'pri',f:shut(publish)},{label:T('o_discard'),cls:'danger',f:shut(discard)}]
      :[{label:T('mr_savemine'),cls:'pri',f:shut(saveDraft)},{label:T('o_discard'),cls:'danger',f:shut(discard)}]]);
    const m=[];if(!OWN.local)m.push({label:T('o_chpass'),f:shut(changePass)});if(!ISOWNER())m.push({label:T('mr_myperms'),f:shut(showMyPerms)});m.push({label:T('o_logout'),f:shut(logout)});
    rows.push(['mr_mine',m]);
  }
  $('more-b').innerHTML=(own?`<p class="mwho">${esc(whoLabel())}</p>`:'')+rows.map(([k,cs])=>`<div class="mrow"><p class="ml">${esc(T(k))}</p><div class="filters">${cs.map(x=>chipH('m',x)).join('')}</div></div>`).join('');
}
function openMore(){
  closeNav(false);
  // sit right under the ⋯ button, on its side (works for wide screens where the button is not at the edge)
  const r=$('more-btn').getBoundingClientRect(),m=$('more').style,rtl=document.documentElement.dir==='rtl';
  m.top=Math.round(r.bottom+8)+'px';m.left=rtl?Math.max(12,Math.round(r.left))+'px':'auto';m.right=rtl?'auto':Math.max(12,Math.round(innerWidth-r.right))+'px';
  $('more').hidden=false;$('scrim').hidden=false;$('scrim').classList.add('light');$('more-btn').setAttribute('aria-expanded','true');
  renderMore();($('more-b').querySelector('button,a')||$('more')).focus();
}
function closeMore(focus=true){
  if($('more').hidden)return;
  $('more').hidden=true;$('more-b').innerHTML='';$('scrim').hidden=true;$('scrim').classList.remove('light');$('more-btn').setAttribute('aria-expanded','false');
  if(focus)$('more-btn').focus();
}
$('more-btn').addEventListener('click',()=>$('more').hidden?openMore():closeMore());
$('scrim').addEventListener('click',()=>{closeNav(false);closeMore(false)});

/* ===================== floating window (sheet) ===================== */
let SHEET=null;
/** content: HTML string, or an element that is moved in (and put back on close, keeping its events). */
function openSheet(title,content,opt={}){
  closeSheet(false);closeNav(false);closeMore(false);
  $('sheet-t').textContent=title;const b=$('sheet-b');b.innerHTML='';ACT.s=[];
  SHEET={last:opt.last||document.activeElement,onClose:opt.onClose,key:opt.key};
  if(typeof content==='string')b.innerHTML=content;
  else{const home=document.createComment('home');content.parentNode.insertBefore(home,content);b.appendChild(content);SHEET.node=content;SHEET.home=home}
  $('sheet').hidden=false;document.body.style.overflow='hidden';b.scrollTop=0;$('sheet-x').focus();
}
function closeSheet(focus=true){
  if($('sheet').hidden||!SHEET)return;
  const s=SHEET;SHEET=null;
  if(s.node){s.home.parentNode.insertBefore(s.node,s.home);s.home.remove()}
  $('sheet').hidden=true;$('sheet-b').innerHTML='';document.body.style.overflow='';
  if(s.onClose)s.onClose();if(focus&&s.last&&s.last.focus)s.last.focus();
}
$('sheet-x').addEventListener('click',()=>closeSheet());
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))closeSheet()});
function openToolSheet(sec){const t=TOOLS.find(x=>x[0]===sec)||TOOLS[1];openSheet(T(t[2]),$(t[0]),{key:'tool'})}

/* ===================== information pages ===================== */
function openPage(id){
  const p=(CFG.pages||[]).find(x=>x.id===id);if(!p||(p.hidden&&!SHOWALL()))return;
  openSheet(tx2(p.t),`<div class="prose">${paras(tx2(p.b))}</div>`,{key:'page'});
  if(CAN('text')&&!OWN.preview)$('sheet-b').insertAdjacentHTML('beforeend',`<div class="sact filters">${chipH('s',{label:T('o_edit'),f:()=>{closeSheet(false);editPage(id)}})}</div>`);
}
async function editPage(id){
  if(!CAN('text')){toast(T('tm_noperm'));return}
  if(!Array.isArray(CFG.pages))CFG.pages=clone(DEFAULT_CFG.pages);
  const isNew=id==null,o=isNew?{t:{ar:'',en:''},b:{ar:'',en:''},hidden:false}:CFG.pages.find(x=>x.id===id);if(!o)return;
  let v=[o.t.ar,o.t.en||'',o.b.ar,o.b.en||'',o.hidden?'h':'s'];
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];if(!isNew)btns.unshift({label:T('o_del'),action:'del'});
    const r=await dialog({title:T(isNew?'pg_new':'pg_edit'),fields:[{label:T('pg_t'),value:v[0]},{label:T('pg_ten'),value:v[1],ltr:1},{label:T('pg_b'),type:'textarea',value:v[2]},{label:T('pg_ben'),type:'textarea',value:v[3],ltr:1},
      {label:T('pg_vis'),type:'select',options:[['s',T('pg_shown')],['h',T('pg_hiddenv')]],value:v[4]}],buttons:btns});
    if(r.action==='del'){if(await confirmDel(T('pg_delq'))){CFG.pages=CFG.pages.filter(x=>x.id!==id);changed()}return}
    if(r.action!=='ok')return;
    v=r.values.map(x=>x.trim());
    if(!v[0]||!v[2]){toast(T('pg_need'));continue}
    const item={id:isNew?'p'+Date.now().toString(36).slice(-7):id,t:{ar:v[0],en:v[1]},b:{ar:v[2],en:v[3]},hidden:v[4]==='h'};
    if(isNew)CFG.pages.push(item);else CFG.pages[CFG.pages.findIndex(x=>x.id===id)]=item;
    changed();if(isNew||!item.hidden)openPage(item.id);return;
  }
}

/* ===================== keyboard ===================== */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!$('dlg').hidden||!$('ov').hidden)return;
  if(!$('sheet').hidden){closeSheet();return}
  if(!$('more').hidden){closeMore();return}
  if(!$('drawer').hidden)closeNav();
});
