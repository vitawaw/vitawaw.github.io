/* VITAWAW · js/nav.js
   The menus, like Facebook. Same contents for visitors, pharmacists and the owner:
   - Phones and tablets: tab bar at the bottom (four sections + ☰ «Menu»); «Menu» is a full page:
     account card, management (team, by permission), shortcut tiles, settings, log out.
   - Wide screens (≥1024px): the same menu is a fixed side menu, with the sections at its top.
   - Floating window (sheet) in the middle of the screen: tools, information pages, pharmacists.
   To add a menu entry, add it in menuHTML() (or a group in adminGroups() for the team).
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

/* ===================== tab bar + menu (like Facebook) ===================== */
// Phones and tablets: the tab bar at the bottom holds the four sections and ☰ «Menu», which opens a full page
// (account card, shortcuts, settings, log out). Wide screens (≥1024px): the same menu is a fixed side menu.
const WIDE=()=>matchMedia('(min-width:1024px)').matches;
function pickNut(k){K=k;try{localStorage.setItem('vw-k',k)}catch(e){}apply();go('calc')}
function goPending(p){
  if(p==='interactions'){IF='all';$('isearch').value='';renderInter()}
  if(p==='sources'){SF='all';renderRefs()}
  go(p);setTimeout(()=>{const el=$(p).querySelector('.pending');if(el)el.scrollIntoView({block:'center'})},60);
}
function pendCounts(){return {n:NCUST().filter(x=>x.rv===false).length,i:(CFG.inter||[]).filter(x=>x.rv===false).length,r:(CFG.refs||[]).filter(x=>x.rv===false).length,c:changeList().length,d:delCount()}}
const SECTIONS=['calc','tools','interactions','sources','roadmap'];
const SECKEY={calc:'tab_calc',tools:'tab_tools',interactions:'tab_int',sources:'tab_src',roadmap:'tab_rm'};
/** management groups for the signed-in team (what appears depends on the account's permissions) */
function adminGroups(){
  const A=[];
  if(!(typeof OWN!=='undefined'&&OWN.on&&!OWN.preview))return A;
  if(ISOWNER()){
    const c=pendCounts(),tot=c.n+c.i+c.r+c.d;
    A.push({id:'review',label:T('ad_review'),ico:ICO.check,n:tot,chips:tot?[
      c.n&&{label:T('ad_vit'),n:c.n,f:()=>goPending('calc')},c.i&&{label:T('tab_int'),n:c.i,f:()=>goPending('interactions')},c.r&&{label:T('tab_src'),n:c.r,f:()=>goPending('sources')},c.c&&{label:T('rc_t'),n:c.c,f:()=>openChanges()}].filter(Boolean)
      :[{label:T('ad_none'),cls:'muted',f:()=>{}}]});
  }
  if(CAN('text'))A.push({id:'pages',label:T('ad_pages'),ico:ICO.page,chips:[{label:T('ad_newpage'),cls:'add',f:()=>editPage(null)},
    ...(CFG.pages||[]).map(p=>({label:tx2(p.t)+(p.hidden?' · '+T('pg_hidden'):''),f:()=>editPage(p.id)}))]});
  if(ISOWNER()&&!OWN.local)A.push({id:'team',label:T('ad_team'),ico:ICO.team,n:TEAM.list?TEAM.list.members.filter(m=>m.role==='editor').length:0,chips:[
    {label:T('ad_invite'),cls:'add',f:()=>teamInvite()},{label:T('ad_accounts'),f:()=>openTeam()},{label:T('ad_invites'),f:()=>openTeam('inv')}]});
  if(ISOWNER())A.push({id:'site',label:T('ad_site'),ico:ICO.site,chips:[{label:T('o_contact'),f:()=>editContact()},
    ...SECTIONS.map(p=>({label:T('ad_colors')+': '+T(SECKEY[p]),f:()=>editColors(p)}))]});
  return A;
}
/** labels and the ☰ dot; redraws the menu page and the side menu */
function renderNav(){
  if(!$('side'))return;
  document.querySelectorAll('#sheet-x').forEach(x=>x.setAttribute('aria-label',L('إغلاق','Close')));
  $('nav-dot').hidden=!(ISOWNER()&&!OWN.preview&&pendingCount());
  renderMenu();
}
// older names (owner bar «awaiting review ›», tests)
const openNav=()=>{if(WIDE()){const b=$('side').querySelector('.mg.admin');if(b)b.scrollIntoView({block:'start'})}else go('menu')};
const openMore=openNav,closeNav=()=>{},closeMore=()=>{};

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
const MI={
  lang:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
  theme:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  mode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  install:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>',
  call:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 3.5h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.5 1.5V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/></svg>',
  login:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M4 12h11M11 8l4 4-4 4"/></svg>',
  invite:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 9v6M9 12h6"/></svg>',
  key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M20 12H9M16 8l4 4-4 4"/></svg>',
  pub:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>'
};
const MI2={
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"/></svg>'
};
const CHEVS='<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
/** The menu: on the «Menu» page (r='m', Facebook style: account card, shortcut tiles, lists) and in the side menu (r='d', lists). */
function menuHTML(r){
  const page=r==='m',own=typeof OWN!=='undefined'&&OWN.on;
  const row=(c)=>{
    const inner=`<span class="di"${c.page?` style="${colorVars(c.page)}"`:''}>${c.ico||ICO.info}</span><span class="mt">${esc(c.label)}${c.sub?`<small>${esc(c.sub)}</small>`:''}</span>${c.n?`<span class="cnt">${c.n}</span>`:''}${c.href||c.on!=null?'':CHEVS}`;
    if(c.href)return `<a class="mi" href="${esc(c.href)}"${/^https?:/.test(c.href)?' target="_blank" rel="noopener"':''}>${inner}</a>`;
    return `<button type="button" class="mi${c.cls?' '+c.cls:''}${c.on?' on':''}" data-na="${r}${ACT[r].push(c.f)-1}"${c.on?' aria-current="page"':''}>${inner}</button>`;
  };
  const tile=(c)=>{
    const inner=`<span class="di"${c.page?` style="${colorVars(c.page)}"`:''}>${c.ico||ICO.info}</span><span class="tl">${esc(c.label)}</span>`;
    if(c.href)return `<a class="mtile" href="${esc(c.href)}"${/^https?:/.test(c.href)?' target="_blank" rel="noopener"':''}>${inner}</a>`;
    return `<button type="button" class="mtile" data-na="${r}${ACT[r].push(c.f)-1}">${inner}</button>`;
  };
  const seg=(ico,label,cs)=>`<div class="mi seg"><span class="di">${ico}</span><span class="mt">${esc(label)}</span><div class="segc">${cs.map(x=>chipH(r,x)).join('')}</div></div>`;
  const grp=(title,body,cls='')=>body?`<div class="mg${cls?' '+cls:''}">${title?`<h3>${esc(title)}</h3>`:''}<div class="ml">${body}</div></div>`:'';
  const pubChips=()=>`<div class="filters">${(ISOWNER()
      ?[{label:T(OWN.preview?'o_pvexit':'o_preview'),pressed:OWN.preview,f:()=>setPreview(!OWN.preview)},{label:T('o_save'),f:saveDraft},{label:T('o_publish'),cls:'pri',f:publish},{label:T('o_discard'),cls:'danger',f:discard}]
      :[{label:T('mr_savemine'),cls:'pri',f:saveDraft},{label:T('o_discard'),cls:'danger',f:discard}]).map(x=>chipH(r,x)).join('')}</div>`;
  let h='';
  // account card (Facebook: your profile at the top)
  h+=own
    ?`<div class="mcard"><span class="av">${MI2.shield}</span><div class="mt"><b>${esc(whoLabel())}</b><small>${esc(T('mn_team'))}</small></div></div><div class="mcard-a">${pubChips()}</div>`
    :page?`<div class="mcard"><span class="av">${MI2.user}</span><div class="mt"><b>${esc(T('mr_account'))}</b><small>${esc(T('mn_guest'))}</small></div></div><div class="mcard-a"><div class="filters">${chipH(r,{label:T('o_login'),cls:'pri',f:()=>openOwner()})}${chipH(r,{label:T('mr_join'),f:()=>openOwner({join:''})})}</div></div>`:'';
  // sections (side menu only: on phones they are in the bottom bar)
  if(!page)h=`<div class="slogo"><span class="mk"><svg viewBox="4 10 56 52" aria-hidden="true">${MARKSVG}</svg></span><span class="wm">VITA<em>WAW</em></span></div>`+
    grp('',SECTIONS.map(p=>row({label:T(SECKEY[p]),ico:tabIco(p),page:p,on:cur===p,f:()=>go(p)})).join(''),'secs')+h;
  const A=own?adminGroups():[];
  if(A.length)h+=grp(T('nv_admin'),A.map(g=>`<div class="mi grp"><span class="di">${g.ico}</span><span class="mt">${esc(g.label)}</span>${g.n?`<span class="cnt">${g.n}</span>`:''}</div><div class="filters mchips">${g.chips.map(c=>chipH(r,c)).join('')}</div>`).join(''),'admin');
  // shortcuts: information pages, app, contact
  const info=[...(page?[{label:T('tab_rm'),ico:tabIco('roadmap'),page:'roadmap',f:()=>go('roadmap')}]:[]),
    ...visiblePages().map(p=>({label:tx2(p.t)+(p.hidden?' · '+T('pg_hidden'):''),f:()=>openPage(p.id)}))];
  const app=[{label:T('mr_share'),ico:MI.share,f:shareApp},{label:T('mr_install'),ico:MI.install,f:installApp}];
  if(PHONEF())app.push({label:T('mr_wa'),ico:MI.wa,href:waLink('VITAWAW')});
  if(EMAILF())app.push({label:T('mr_mail'),ico:MI.mail,href:mailto('VITAWAW – '+L('اقتراح','Suggestion'))});
  if(PHONEF())app.push({label:T('mr_call'),ico:MI.call,href:'tel:'+PHONEF().replace(/[^+\d]/g,'')});
  if(page)h+=`<div class="mg"><h3>${esc(T('mn_short'))}</h3><div class="mtiles">${[...info,...app].map(tile).join('')}</div></div>`;
  else h+=grp(T('nv_info'),info.map(row).join(''))+grp(T('mr_app'),app.map(row).join(''));
  h+=grp(T('mr_settings'),
    seg(MI.lang,T('mr_lang'),[{label:'العربية',pressed:LANG==='ar',f:()=>setLang('ar')},{label:'English',pressed:LANG==='en',f:()=>setLang('en')}])+
    seg(MI.theme,T('mr_theme'),[{label:T('mr_light'),pressed:!isDark(),f:()=>setTheme('light')},{label:T('mr_dark'),pressed:isDark(),f:()=>setTheme('dark')}])+
    seg(MI.mode,T('mr_mode'),[{label:T('m_pro'),pressed:MODE==='pro',f:()=>setMode('pro')},{label:T('m_pt'),pressed:MODE==='pt',f:()=>setMode('pt')}]));
  if(own){
    h+=grp(T('mr_mine'),[!OWN.local&&row({label:T('o_chpass'),ico:MI.key,f:changePass}),!ISOWNER()&&row({label:T('mr_myperms'),ico:ICO.check,f:showMyPerms})].filter(Boolean).join(''));
    h+=`<button type="button" class="mout" data-na="${r}${ACT[r].push(logout)-1}">${MI.out}<span>${esc(T('o_logout'))}</span></button>`;
  }else if(!page)h+=grp(T('mr_account'),row({label:T('o_login'),ico:MI.login,f:()=>openOwner()})+row({label:T('mr_join'),ico:MI.invite,f:()=>openOwner({join:''})}));
  return h;
}
function renderMenu(){
  if(!$('side'))return;
  ACT.d=[];const sb=$('side-b'),keep=sb.scrollTop;sb.innerHTML=menuHTML('d');sb.scrollTop=keep;
  ACT.m=[];$('menu-b').innerHTML=menuHTML('m');
}
// switching between phone and wide layouts (rotating a tablet): leave the menu page on wide screens
matchMedia('(min-width:1024px)').addEventListener('change',()=>{if(WIDE()&&cur==='menu')show('calc');renderNav()});

/* ===================== floating window (sheet) ===================== */
let SHEET=null;
/** content: HTML string, or an element that is moved in (and put back on close, keeping its events). */
function openSheet(title,content,opt={}){
  closeSheet(false);
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
});
