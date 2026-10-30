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
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h13"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  page:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/></svg>',
  site:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/></svg>'
};
const CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const TOOLS=[['tool-pill','tl_pill','tt_t'],['tool-d','tl_d','td_t'],['tool-ca','tl_ca','tp_t'],['tool-gz','tl_gz','tg_t'],['tool-ml','tl_ml','ml_t'],['tool-sch','tl_sch','sc_t'],['tool-labs','tl_labs','lb_t'],['tool-ul','tl_ul','tl_t'],['tool-u','tl_u','tu_t']];
const tabIco=p=>{const s=$('t-'+p)&&$('t-'+p).querySelector('svg');return s?s.outerHTML:ICO.info};
/** true when the signed-in account may edit this part: 'nut' | 'inter' | 'refs' | 'text' */
const CAN=k=>typeof OWN!=='undefined'&&OWN.on&&(OWN.local||OWN.role==='owner'||!!(OWN.perms&&OWN.perms[k]));
const ISOWNER=()=>typeof OWN!=='undefined'&&OWN.on&&(OWN.local||OWN.role==='owner');
const colorVars=p=>CFG.colors[p]?`--pc:${CFG.colors[p][0]};--pc2:${CFG.colors[p][1]}`:'';
const paras=t=>String(t||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join('');
const visiblePages=(all=SHOWALL())=>(CFG.pages||[]).filter(p=>all||!p.hidden);

/* Every menu button stores its action here; data-na="d3" = side menu action 3, "m" = Menu page, "s" = floating window, "n" = notifications. */
const ACT={d:[],m:[],s:[],n:[]};
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
/* ===================== main pages (1.12.0): the owner orders them, picks the four in the bottom bar and hides some =====================
   CFG.nav = {order, bar, hide}. Calculator and notifications cannot be hidden; the bar keeps at least the calculator. */
const NAVIDS=['calc','interactions','tools','notif','sources','roadmap','sched','labs','ul'];
const SECKEY={calc:'tab_calc',tools:'tab_tools',interactions:'tab_int',sources:'tab_src',roadmap:'tab_rm',notif:'nt_t',sched:'tab_sch',labs:'tab_labs',ul:'tab_ul'};
const HEROKEY={calc:['hc_t','hc_l'],tools:['ht_t','ht_l'],interactions:['ti_t','hi_l'],sources:['ts_t','hs_l'],roadmap:['rm_t','rm_l'],sched:['hp_sch_t','hp_sch_l'],labs:['hp_lab_t','hp_lab_l'],ul:['hp_ul_t','hp_ul_l']};
function NAV(){
  const n=CFG.nav||{},ok=x=>NAVIDS.includes(x);
  const order=[...new Set([...(n.order||[]).filter(ok),...NAVIDS])];
  const hide=[...new Set((n.hide||[]).filter(x=>ok(x)&&x!=='calc'&&x!=='notif'))];
  let bar=order.filter(x=>(n.bar||[]).includes(x)&&!hide.includes(x)).slice(0,4);if(!bar.length)bar=['calc'];
  return {order,bar,hide};
}
const navHidden=p=>NAV().hide.includes(p);
/** pages shown in lists (hidden ones only for the team while editing) */
const navPages=()=>{const n=NAV();return n.order.filter(p=>!n.hide.includes(p)||SHOWALL())};
/** bottom bar: the owner's order, only the bar pages on phones (others are in ☰), ☰ always last */
function renderTabs(){
  const n=NAV();
  n.order.forEach((p,i)=>{const t=$('t-'+p);if(!t)return;t.style.order=i;t.classList.toggle('offbar',!n.bar.includes(p));t.hidden=n.hide.includes(p)&&!SHOWALL()});
  $('t-menu').style.order=99;
}
/** management groups for the signed-in team (what appears depends on the account's permissions) */
function adminGroups(){
  const A=[];
  if(!(typeof OWN!=='undefined'&&OWN.on&&!OWN.preview))return A;
  if(CAN('text'))A.push({id:'pages',label:T('ad_pages'),ico:ICO.page,chips:[{label:T('ad_newpage'),cls:'add',f:()=>editPage(null)},{label:T('pg_order'),f:openPagesOrder},
    ...(CFG.pages||[]).map(p=>({label:tx2(p.t)+(p.hidden?' · '+T('pg_hidden'):''),f:()=>editPage(p.id)}))]});
  if(ISOWNER()&&!OWN.local)A.push({id:'team',label:T('ad_team'),ico:ICO.team,n:TEAM.list?TEAM.list.members.filter(m=>m.role==='editor').length:0,chips:[
    {label:T('ad_invite'),cls:'add',f:()=>teamInvite()},{label:T('ad_accounts'),f:()=>openTeam()},{label:T('ad_invites'),f:()=>openTeam('inv')}]});
  if(ISOWNER())A.push({id:'site',label:T('ad_site'),ico:ICO.site,chips:[{label:T('o_contact'),f:()=>editContact()},{label:T('br_t'),f:()=>editBrand()},{label:T('rv_t'),f:()=>editReview()},{label:T('vh_t'),f:()=>openVersions()},
    ]});
  if(ISOWNER())A.splice(A.length-1,0,{id:'nav',label:T('nv_pages'),ico:ICO.menu,chips:[{label:T('nv_manage'),cls:'add',f:openNavManager}]});
  return A;
}
/** labels and the 🔔 count; redraws the menu page and the side menu */
function renderNav(){
  if(!$('side'))return;
  renderTabs();
  document.querySelectorAll('#sheet-x').forEach(x=>x.setAttribute('aria-label',L('إغلاق','Close')));
  $('hsearch').setAttribute('aria-label',T('gs_t'));
  const nc=notifCount();$('nt-count').hidden=!nc;$('nt-count').textContent=nc>99?'99+':nc;
  document.body.classList.toggle('team',typeof OWN!=='undefined'&&OWN.on);
  if(cur==='notif')renderNotif();
  renderMenu();
}
// older names (owner bar «awaiting review ›», tests)
const openNav=()=>go('notif');
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
    const inner=`<span class="di"${c.page?` style="${colorVars(c.page)}"`:''}>${c.ico||ICO.info}</span><span class="tl">${esc(c.label)}</span>${c.n?`<span class="tcount">${c.n}</span>`:''}`;
    if(c.href)return `<a class="mtile" href="${esc(c.href)}"${/^https?:/.test(c.href)?' target="_blank" rel="noopener"':''}>${inner}</a>`;
    return `<button type="button" class="mtile" data-na="${r}${ACT[r].push(c.f)-1}">${inner}</button>`;
  };
  const seg=(ico,label,cs)=>`<div class="mi seg"><span class="di">${ico}</span><span class="mt">${esc(label)}</span><div class="segc">${cs.map(x=>chipH(r,x)).join('')}</div></div>`;
  const grp=(title,body,cls='')=>body?`<div class="mg${cls?' '+cls:''}">${title?`<h3>${esc(title)}</h3>`:''}<div class="ml">${body}</div></div>`:'';
  let h='';
  // account card (Facebook: your profile at the top); publishing is in the bar at the top of every page
  h+=own
    ?`<div class="mcard solo"><span class="av">${MI2.shield}</span><div class="mt"><b>${esc(whoLabel())}</b><small>${esc(T('mn_team'))}</small></div></div>`
    :page?`<div class="mcard"><span class="av">${MI2.user}</span><div class="mt"><b>${esc(T('mr_account'))}</b><small>${esc(T('mn_guest'))}</small></div></div><div class="mcard-a"><div class="filters">${chipH(r,{label:T('o_login'),cls:'pri',f:()=>openOwner()})}${chipH(r,{label:T('mr_join'),f:()=>openOwner({join:''})})}</div></div>`:'';
  // sections (side menu only: on phones they are in the bottom bar)
  if(!page)h=`<div class="slogo"><span class="mk"><svg viewBox="4 10 56 52" aria-hidden="true">${MARKSVG}</svg></span><span class="wm">VITA<em>WAW</em></span></div>`+
    grp('',navPages().map(p=>row({label:T(SECKEY[p])+(navHidden(p)?' · '+T('pg_hidden'):''),ico:tabIco(p),page:p,on:cur===p,n:p==='notif'?notifCount():0,f:()=>go(p)})).join(''),'secs')+h;
  // one search for everything (calculators, tools, interactions, sources, pages)
  h+=`<button type="button" class="gsbtn" data-na="${r}${ACT[r].push(openSearch)-1}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>${esc(T('gs_ph'))}</span></button>`;
  const A=own?adminGroups():[];
  if(A.length)h+=grp(T('nv_admin'),A.map(g=>`<div class="mi grp"><span class="di">${g.ico}</span><span class="mt">${esc(g.label)}</span>${g.n?`<span class="cnt">${g.n}</span>`:''}</div><div class="filters mchips">${g.chips.map(c=>chipH(r,c)).join('')}</div>`).join(''),'admin');
  // shortcuts: information pages, app, contact
  // Menu page: the main pages that are not in the bottom bar come first (sources, coming next, schedule…), in the owner's order
  const bar=NAV().bar,secs=page?navPages().filter(p=>!bar.includes(p)).map(p=>({label:T(SECKEY[p])+(navHidden(p)?' · '+T('pg_hidden'):''),ico:tabIco(p),page:p,n:p==='notif'?notifCount():0,f:()=>go(p)})):[];
  const info=[...secs,...visiblePages().map(p=>({label:tx2(p.t)+(p.hidden?' · '+T('pg_hidden'):''),f:()=>openPage(p.id)}))];
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
    h+=grp(T('mr_mine'),[!OWN.local&&row({label:T('ac_t'),ico:MI.key,f:openAccount}),!ISOWNER()&&row({label:T('mr_myperms'),ico:ICO.check,f:showMyPerms})].filter(Boolean).join(''));
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

/* ===================== one search for everything ===================== */
const TOOLKIND={'tool-pill':'pills','tool-d':'drops','tool-ca':'ca','tool-gz':'ganz','tool-ml':'ml','tool-sch':'sch','tool-labs':'labs','tool-ul':'ul','tool-u':'units'};
function gsResults(q){
  const n=normAr(q);if(n.length<2)return '';
  const terms=iTerms(n),hit=t=>{const h=normAr(t);return terms.some(x=>h.includes(x))};
  const calc=KEYS.slice(1).filter(k=>hit(kname(k)+' '+(I18N['h_'+k]?I18N['h_'+k].join(' '):''))).slice(0,6);
  const tools=TOOLS.filter(t=>hit(T(t[1])+' '+T(t[2]))).slice(0,6);
  const inter=INTER.filter(x=>x[7]&&!x[8]&&hit([x[1][0],x[1][1],x[2][0],x[2][1],x[3][0],x[3][1]].join(' ')));
  const refs=Object.entries(REFS).filter(([i,x])=>!x[6]&&hit(x[0]+' '+x[1]+' '+x[3]+' '+x[4])).slice(0,6);
  const pages=visiblePages().filter(p=>hit(tx2(p.t)+' '+tx2(p.b))).slice(0,4);
  const sec=(t,items)=>items?`<h3 class="gsh">${esc(t)}</h3><div class="gsl">${items}</div>`:'';
  const it=(attr,label,sub)=>`<button type="button" class="gsi" ${attr}><b>${esc(label)}</b>${sub?`<small>${esc(sub)}</small>`:''}</button>`;
  const h=sec(T('gs_calc'),calc.map(k=>it(`data-gocalc="${esc(k)}"`,kname(k),I18N['h_'+k]?T('h_'+k):'')).join(''))+
    sec(T('gs_tools'),tools.map(t=>it(`data-tool="${TOOLKIND[t[0]]}"`,T(t[2]),'')).join(''))+
    sec(T('tab_int')+(inter.length?` (${inter.length})`:''),inter.slice(0,6).map(x=>it(`data-gsint="${esc(q)}"`,L(x[1][0],x[1][1])+' + '+L(x[2][0],x[2][1]),L(x[3][0],x[3][1]))).join(''))+
    sec(T('tab_src'),refs.map(([i,x])=>it(`data-ref="${i}"`,i+'. '+x[0],x[1])).join(''))+
    sec(T('nv_info'),pages.map(p=>it(`data-gspage="${esc(p.id)}"`,tx2(p.t),'')).join(''));
  return h||`<p class="inone">${T('gs_none')}</p>`;
}
function openSearch(){
  openSheet(T('gs_t'),`<div class="nsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="gsq" dir="auto" autocomplete="off" placeholder="${esc(T('gs_ph'))}"></div><div id="gsr" aria-live="polite"></div>`,{key:'search'});
  const q=$('gsq');q.addEventListener('input',()=>{$('gsr').innerHTML=gsResults(q.value)});setTimeout(()=>q.focus(),50);
  $('gsr').addEventListener('click',e=>{
    if(e.target.closest('[data-gocalc],[data-tool],[data-ref]'))closeSheet(false); // the global handlers open the item
    const gi=e.target.closest('[data-gsint]');if(gi){closeSheet(false);IF='all';ISRC=null;$('isearch').value=gi.dataset.gsint;renderInter();go('interactions')}
    const gp=e.target.closest('[data-gspage]');if(gp){closeSheet(false);openPage(gp.dataset.gspage)}
  });
}

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
$('hsearch').addEventListener('click',openSearch);
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))closeSheet()});
function openToolSheet(sec){const t=TOOLS.find(x=>x[0]===sec)||TOOLS[1];openSheet(T(t[2]),$(t[0]),{key:'tool'})}

/* ===================== «القوائم»: the owner arranges the main pages =====================
   drag to order · «in the bar» (up to 4 on phones) · show/hide · name, title and description · colors.
   Saved in CFG.nav and CFG.text like every other setting (save → publish). */
function navSave(n){CFG.nav={order:n.order,bar:n.bar,hide:n.hide};changed();drawNavManager()}
function openNavManager(){if(!ISOWNER())return;openSheet(T('nv_pages'),'',{key:'navmgr'});drawNavManager()}
function drawNavManager(){
  if(!SHEET||SHEET.key!=='navmgr')return;
  const n=NAV(),b=$('sheet-b');ACT.s=[];const S=c=>chipH('s',c);
  b.innerHTML=`<p class="hint">${T('nv_hint')}</p><div class="olist" id="nv-order">${n.order.map(p=>{const inBar=n.bar.includes(p),hid=n.hide.includes(p),fixed=p==='calc'||p==='notif';
    return `<div class="orow nvrow${hid?' off':''}" data-sid="${p}">${DRAG(T('o_drag'))}<span class="di" style="${colorVars(p)}">${tabIco(p)}</span><span class="nvn">${esc(T(SECKEY[p]))}${hid?` · ${T('pg_hidden')}`:''}${inBar?`<small>${T('nv_inbar')}</small>`:''}</span>
      <div class="filters">${S({label:T('nv_bar'),pressed:inBar,f:()=>{
        if(inBar){if(n.bar.length<2){toast(T('nv_min'));return}n.bar=n.bar.filter(x=>x!==p)}
        else{if(hid){toast(T('nv_hidbar'));return}if(n.bar.length>=4){toast(T('nv_max'));return}n.bar=[...n.bar,p]}navSave(n)}})}${
      fixed?'':S({label:T(hid?'o_nshow':'o_nhide'),f:()=>{n.hide=hid?n.hide.filter(x=>x!==p):[...n.hide,p];if(!hid)n.bar=n.bar.filter(x=>x!==p);navSave(n)}})}${
      S({label:T('o_edit'),f:()=>editNavText(p)})}${p==='notif'?'':S({label:T('ad_colors'),f:async()=>{await editColors(p);drawNavManager()}})}</div></div>`}).join('')}</div>
    <div class="filters">${S({label:T('o_reset'),f:()=>{CFG.nav=clone(DEFAULT_CFG.nav);changed();drawNavManager()}})}</div>`;
  sortable($('nv-order'),'.orow',ids=>{n.order=ids;navSave(n)});
}
/** a page's name in the menus (and its title and description at the top of the page) */
async function editNavText(p){
  const keys=[SECKEY[p],...(HEROKEY[p]||[])],cur=k=>CFG.text[k]||{ar:I18N[k][0],en:I18N[k][1]};
  const labels=[['nv_name','nv_name_en'],['o_ftitle','o_ftitle_en'],['o_fdesc','o_fdesc_en']];
  const fields=keys.flatMap((k,i)=>[{label:T(labels[i][0]),value:cur(k).ar,type:i===2?'textarea':'text'},{label:T(labels[i][1]),value:cur(k).en,ltr:1,type:i===2?'textarea':'text'}]);
  const r=await dialog({title:T(SECKEY[p]),fields,buttons:[{label:T('o_reset'),action:'reset'},{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}]});
  if(r.action==='ok')keys.forEach((k,i)=>{const d=I18N[k],ar=r.values[2*i].trim()||d[0],en=r.values[2*i+1].trim()||d[1];if(ar===d[0]&&en===d[1])delete CFG.text[k];else CFG.text[k]={ar,en}});
  if(r.action==='reset')keys.forEach(k=>delete CFG.text[k]);
  if(r.action!=='cancel')changed();
  if(SHEET&&SHEET.key==='navmgr')drawNavManager();else openNavManager();
}

/* ===================== information pages ===================== */
function openPage(id){
  const p=(CFG.pages||[]).find(x=>x.id===id);if(!p||(p.hidden&&!SHOWALL()))return;
  openSheet(tx2(p.t),`<div class="prose">${paras(tx2(p.b))}</div>`,{key:'page'});
  // the same buttons as every other item: edit, hide/show, delete
  if(CAN('text')&&!OWN.preview)$('sheet-b').insertAdjacentHTML('beforeend',`<div class="sact filters">${chipH('s',{label:T('o_edit'),f:()=>{closeSheet(false);editPage(id)}})}${
    chipH('s',{label:T(p.hidden?'o_nshow':'o_nhide'),f:()=>{p.hidden=!p.hidden;changed();openPage(id)}})}${
    chipH('s',{label:T('o_del'),cls:'danger',f:async()=>{if(await confirmDel(tx2(p.t))){CFG.pages=CFG.pages.filter(x=>x.id!==id);closeSheet(false);changed()}}})}</div>`);
}
/** drag the ⋮⋮ handle to change the order of the information pages (menu, footer links) */
function openPagesOrder(){
  if(!CAN('text'))return;
  if(!Array.isArray(CFG.pages))CFG.pages=clone(DEFAULT_CFG.pages);
  const draw=()=>{$('sheet-b').innerHTML=`<p class="hint">${T('o_drag_p')}</p><div class="olist" id="pg-order">${CFG.pages.map(p=>`<div class="orow${p.hidden?' off':''}" data-sid="${esc(p.id)}">${DRAG(T('o_drag'))}<span>${esc(tx2(p.t))}${p.hidden?` · ${T('pg_hidden')}`:''}</span></div>`).join('')}</div>`;
    sortable($('pg-order'),'.orow',ids=>{CFG.pages=ids.map(id=>CFG.pages.find(p=>p.id===id));changed();draw()})};
  openSheet(T('pg_order_t'),'',{key:'pgorder'});draw();
}
async function editPage(id){
  if(!CAN('text')){toast(T('tm_noperm'));return}
  if(!Array.isArray(CFG.pages))CFG.pages=clone(DEFAULT_CFG.pages);
  const isNew=id==null,o=isNew?{t:{ar:'',en:''},b:{ar:'',en:''},hidden:false}:CFG.pages.find(x=>x.id===id);if(!o)return;
  let v=[o.t.ar,o.t.en||'',o.b.ar,o.b.en||'',o.hidden?'h':'s'],err=null;
  while(true){
    const btns=[{label:T('o_cancel'),action:'cancel'},{label:T('o_ok'),action:'ok',pri:1}];
    const r=await dialog({err,title:T(isNew?'pg_new':'pg_edit'),fields:[{label:T('pg_t'),value:v[0]},{label:T('pg_ten'),value:v[1],ltr:1},{label:T('pg_b'),type:'textarea',value:v[2]},{label:T('pg_ben'),type:'textarea',value:v[3],ltr:1},
      {label:T('pg_vis'),type:'select',options:[['s',T('pg_shown')],['h',T('pg_hiddenv')]],value:v[4]}],buttons:btns});
    if(r.action!=='ok')return;
    v=r.values.map(x=>x.trim());
    if(!v[0]||!v[2]){err={i:v[0]?2:0,msg:T('pg_need')};continue}
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
