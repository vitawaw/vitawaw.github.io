/* VITAWAW · js/ui.js
   Page behaviour: tabs/navigation, professional/patient mode, welcome card, patient card, theme, examples,
   language switch (setLang), event wiring, colors and refreshAll().
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== navigation ===================== */
const PAGES=['calc','tools','interactions','sources','roadmap','notif','sched','labs','ul','menu'];
let cur='calc',TOOLV=''; // TOOLV: the tool shown alone on the tools page ('' = the tiles)
function show(p,tv=''){
  if(!PAGES.includes(p)||(p==='menu'&&WIDE())||(navHidden(p)&&!SHOWALL()))p='calc'; // wide screens show the menu at the side; a page the owner hid is not shown
  cur=p;TOOLV=p==='tools'?tv:'';
  $('tools').classList.toggle('tv',!!TOOLV);document.querySelectorAll('#tools>section[id^="tool-"]').forEach(x=>x.classList.toggle('on',x.id===TOOLV));
  if(typeof rememberRecent==='function')rememberRecent(TOOLV||p);
  PAGES.forEach(x=>{$(x).hidden=x!==p;const t=$('t-'+x);if(t){t.setAttribute('aria-selected',x===p);t.tabIndex=x===p?0:-1}});
  if(p!=='sources'){$('back').hidden=true;document.querySelectorAll('ol.refs li.hl').forEach(l=>l.classList.remove('hl'))}
  if(p!=='menu'&&p!=='notif')try{localStorage.setItem('vw-p',p)}catch(e){}
  if(p==='notif'&&typeof renderNotif==='function')renderNotif(true);
  if(p==='roadmap'){$('rmnew').hidden=true;try{localStorage.setItem('vw-rm','3')}catch(e){}}
  updateBar();if(typeof renderNav==='function')renderNav();
}
function go(p){if(location.hash!=='#'+p)location.hash=p;else show(p);window.scrollTo(0,0)}
window.addEventListener('hashchange',()=>{if(routeSpecial())return;show(location.hash.slice(1));window.scrollTo(0,0)});
/* links that open something instead of a tab: #owner (sign in), #join=<email> (invited pharmacist), #info-<page> (info page) */
function routeSpecial(){
  let h=location.hash.slice(1);try{h=decodeURIComponent(h)}catch(e){}
  if(/^tool-(pill|d|ml|ca|gz|u)$/.test(h)){show('tools',h);window.scrollTo(0,0);return true} // one tool of the tools page
  if(h==='owner'){openOwner();return true}
  if(h==='join'||h.startsWith('join=')){const [em,k]=h.slice(5).split('&k=');openOwner({join:em||'',key:k||''});return true}
  if(h.startsWith('c=')){history.replaceState(null,'',location.pathname+location.search+'#calc');loadShared(h.slice(2));return true}
  if(h.startsWith('info-')){history.replaceState(null,'',location.pathname+location.search+'#'+cur);openPage(h.slice(5));return true}
  return false;
}
document.querySelectorAll('.tab[data-p]').forEach(t=>{
  t.addEventListener('click',()=>go(t.dataset.p));
  t.addEventListener('keydown',e=>{
    const vis=[...document.querySelectorAll('.tab[data-p]')].filter(x=>x.offsetParent!==null),i=vis.indexOf(t),rtl=document.documentElement.dir==='rtl';
    let j=null;if(e.key==='ArrowRight')j=rtl?i-1:i+1;if(e.key==='ArrowLeft')j=rtl?i+1:i-1;
    if(j!=null&&vis.length){e.preventDefault();const n=vis[(j+vis.length)%vis.length];go(n.dataset.p);n.focus()}
  });
});
document.addEventListener('click',e=>{
  const ex=e.target.closest('[data-ex]');if(ex){e.preventDefault();fillExample();return}
  const tl=e.target.closest('[data-tool]');if(tl){e.preventDefault();openTool(tl.dataset.tool);return}
  // interactions ↔ calculator ↔ daily schedule
  const gc=e.target.closest('[data-gocalc]');if(gc){e.preventDefault();K=gc.dataset.gocalc;try{localStorage.setItem('vw-k',K)}catch(e){}apply();go('calc');return}
  const gs=e.target.closest('[data-gosch]');if(gs){e.preventDefault();SCI.forEach(x=>{const c=$('sc-'+x[0]);if(c)c.checked=false});SCHSET=gs.dataset.gosch.split(',');openTool('sch');return}
  const gi=e.target.closest('[data-goint]');if(gi){e.preventDefault();IF=gi.dataset.goint;renderInter();go('interactions');return}
  const sr=e.target.closest('[data-isrc]');if(sr){e.preventDefault();ISRC=+sr.dataset.isrc;IF='all';renderInter();go('interactions');return}
  if(e.target.closest('[data-clrsrc]')){e.preventDefault();ISRC=null;renderInter();return}
  if(e.target.closest('[data-share]')){e.preventDefault();shareResult();return}
  if(e.target.closest('[data-report]')){e.preventDefault();openReport();return}
  if(e.target.closest('[data-lab]')){e.preventDefault();if(LAST&&LAST.lab){LAST.lab.forEach(([k,v])=>labAdd(k,v));toast(T('lb_saved'))}return}
  if(e.target.closest('[data-cal]')){e.preventDefault();if(LAST&&LAST.cal)icsDownload([LAST.cal]);return}
  const rg=e.target.closest('[data-rmgo]');if(rg){e.preventDefault();const f=GO[rg.dataset.rmgo];if(f)f();return}
  const dm=e.target.closest('[data-delmed]');if(dm){e.preventDefault();MEDS.splice(+dm.dataset.delmed,1);saveMeds();renderInter();return}
  const a=e.target.closest('[data-ref]');if(!a)return;e.preventDefault();
  const back=cur;SF='all';renderRefs();go('sources');
  $('back').hidden=back==='sources';$('back').dataset.to=back;
  const li=$('ref-'+a.dataset.ref);if(li){li.classList.add('hl');setTimeout(()=>li.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),30)}
});
$('back').addEventListener('click',()=>{const to=$('back').dataset.to||'calc';go(to);if(to==='calc'&&innerWidth<900)setTimeout(()=>$('resbox').scrollIntoView({block:'start'}),30)});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;IF=b.dataset.f;ISRC=null;renderInter()});
$('sfilters').addEventListener('click',e=>{const b=e.target.closest('[data-sf]');if(!b)return;SF=b.dataset.sf;renderRefs()});

/* mobile result bar */
let resVisible=false;
if('IntersectionObserver' in window){new IntersectionObserver(es=>{resVisible=es[0].isIntersecting;updateBar()},{threshold:.15}).observe($('resbox'))}
function updateBar(){const s=cur==='calc'&&!resVisible&&innerWidth<900&&!!LAST;$('rbar').hidden=!s;document.body.classList.toggle('has-bar',s)}
window.addEventListener('resize',updateBar);
const toRes=()=>{const y=$('resbox').getBoundingClientRect().top+scrollY-110;window.scrollTo({top:y,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
$('rbar').addEventListener('click',toRes);$('rbar').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toRes()}});

/* ===================== mode, welcome, text size ===================== */
function setMode(m,save=true){
  MODE=m;document.querySelectorAll('#modeg [data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===m));
  if(save)try{localStorage.setItem('vw-mode',m)}catch(e){}
  if(LAST)F[K]();if(typeof renderNav==='function')renderNav();
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);if(b.closest('#welcome'))closeWelcome()}));
function closeWelcome(){$('welcome').hidden=true;try{localStorage.setItem('vw-welcome','1')}catch(e){}}
$('wclose').addEventListener('click',closeWelcome);

/* ===================== patient card ===================== */
const MARKSVG=document.querySelector('.logo .mk svg').innerHTML;
let lastFocus=null;
function cardText(){
  const strip=plain;
  const r=LAST,name=document.querySelector('#picker [aria-pressed="true"] span').textContent;
  const lines=['VITAWAW · '+name,strip(r.pt||r.title)];
  (r.notes||[]).filter(n=>n.u).forEach(n=>lines.push('⚠ '+strip(n.t)));
  (r.plan||[]).forEach((x,i)=>lines.push((i+1)+'. '+strip(x.h)+(x.d?': '+strip(x.d):'')));
  if(srcLine())lines.push('',srcLine());
  lines.push('',T('pc_f'));return lines.join('\n');
}
function openCard(){
  if(!LAST)return;const r=LAST,strip=x=>String(x||'').replace(/<[^>]+>/g,'');
  const name=document.querySelector('#picker [aria-pressed="true"] span').textContent;
  const d=new Date().toLocaleDateString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB',{year:'numeric',month:'long',day:'numeric'});
  const urgent=(r.notes||[]).filter(n=>n.u);
  $('pcard').setAttribute('dir',LANG==='ar'?'rtl':'ltr');
  $('pcard').innerHTML=`<div class="pc-h"><div class="pc-logo"><svg viewBox="4 10 56 52" aria-hidden="true">${MARKSVG}</svg><span>VITA<em>WAW</em></span></div><div class="pc-date">${d}</div></div>
   <div class="pc-b"><div class="pc-k" id="pc-title">${name} · ${strip(r.badge)}</div><p class="pc-main">${strip(r.pt||r.title)}</p>
   ${urgent.map(n=>`<div class="pc-alert">${strip(n.t)}</div>`).join('')}
   ${(r.plan&&r.plan.length)?`<div class="pc-k">${T('pc_plan')}</div><ol class="pc-plan">${r.plan.map(x=>`<li><b>${strip(x.h)}</b>${x.d?' — '+strip(x.d):''}</li>`).join('')}</ol>`:''}</div>
   ${srcLine()?`<div class="pc-src">${esc(srcLine())}</div>`:''}<div class="pc-f">${T('pc_f')}${REV().name?'<br>'+T('rev')+' '+REV().name+(REV().date?' · '+REV().date:''):''}<br>${T('pc_shot')}</div>`;
  $('pc-wa').href='https://wa.me/?text='+encodeURIComponent(cardText());
  lastFocus=document.activeElement;$('ov').hidden=false;$('pc-close').focus();document.body.style.overflow='hidden';
}
function closeCard(){$('ov').hidden=true;document.body.style.overflow='';if(lastFocus)lastFocus.focus()}
$('pc-close').addEventListener('click',closeCard);
$('ov').addEventListener('click',e=>{if(e.target===$('ov')||e.target.classList.contains('ovw'))closeCard()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('ov').hidden){e.stopImmediatePropagation();closeCard()}});
$('pc-copy').addEventListener('click',()=>{const t=cardText(),b=$('pc-copy'),done=()=>{b.textContent=T('copied');setTimeout(()=>b.textContent=T('pc_cp'),1600)};try{navigator.clipboard.writeText(t).then(done).catch(()=>fallback(t,done))}catch(e){fallback(t,done)}});
document.addEventListener('click',e=>{if(e.target.closest('[data-card]')){e.preventDefault();openCard()}});

/* ===================== theme ===================== */
const SUN='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON='<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
function themeIcon(){if(typeof renderMenu==='function')renderMenu()}
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('vw-theme',t)}catch(e){}themeIcon()}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',themeIcon);

/* ===================== examples / clear ===================== */
const NUMS=['age','wt','ht','dlab','b12v','ab12','hb','fer','cadiet','mgv','mon'];
const EX={d:{age:45,sex:'f',wt:68,ht:162,dlab:14},b12:{age:55,sex:'f',b12v:160},fol:{age:28,sex:'f',folg:'plan'},fe:{age:30,sex:'f',wt:60,feg:'ida'},ca:{age:60,sex:'f',cadiet:400},mg:{age:50,sex:'m',mgv:1.4},c:{age:30,sex:'m',czg:'rda'},zn:{age:30,sex:'m',czg:'rda'},preg:{age:28,tri:'t2',hb:10.2},inf:{mon:5,wt:7,feed:'bf'},vac:{mon:18,vag:'prev'}};
function fillExample(){
  const e=EX[K];
  if($('dunit').value!=='ng')$('dunit').value='ng';if($('b12u').value!=='pg')$('b12u').value='pg';if($('mgu').value!=='mgdl')$('mgu').value='mgdl';
  Object.entries(e).forEach(([k,v])=>{$(k).value=v});
  syncSex();F[K]();
}
$('example').addEventListener('click',fillExample);
$('clear').addEventListener('click',()=>{$('fegw').hidden=false;NUMS.forEach(id=>{$(id).value='';$(id).classList.remove('bad');const er=$('e-'+id);if(er)er.hidden=true});['mal','med','ckd','neuro','mgsx','smk','infl','pre','ntd','lowca','veg'].forEach(id=>$(id).checked=false);syncSex();F[K]();($('age').offsetParent?$('age'):$('mon')).focus()});

/* hide pregnancy options for young ages */
function syncSex(){
  const a=parseFloat($('age').value),young=!isNaN(a)&&a<12;
  ['p','l'].forEach(v=>{const o=$('sex').querySelector(`option[value="${v}"]`);o.hidden=young;o.disabled=young});
  if(young&&['p','l'].includes($('sex').value))$('sex').value='f';
}

/* ===================== language ===================== */
function setLang(l){
  LANG=l;buildData();const html=document.documentElement;
  html.lang=l;html.dir=l==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-t]').forEach(el=>{if(I18N[el.dataset.t])el.textContent=T(el.dataset.t)});
  document.querySelectorAll('[data-ph]').forEach(el=>{const v=I18N[el.dataset.ph];if(v)el.placeholder=v[l==='ar'?0:1]});
  document.querySelectorAll('[data-th]').forEach(el=>{const v=I18N[el.dataset.th];if(v)el.innerHTML=v[l==='ar'?0:1]});
  $('backarrow').setAttribute('d',l==='ar'?'M9 6l6 6-6 6':'M15 6l-6 6 6 6');
  document.querySelectorAll('[aria-label="unit"],[aria-label="الوحدة"]').forEach(el=>el.setAttribute('aria-label',l==='ar'?'الوحدة':'unit'));
  document.querySelectorAll('.x,[aria-label="close"],[aria-label="إغلاق"]').forEach(el=>{if(el.getAttribute('aria-label'))el.setAttribute('aria-label',l==='ar'?'إغلاق':'Close')});
  {const md=document.querySelector('meta[name=description]');if(md)md.content=l==='ar'?'حاسبة جرعات الفيتامينات والمعادن المبنية على مصادر طبية، مع التداخلات الدوائية':'Vitamin and mineral dose calculator based on medical sources, with drug interactions'}
  NUMS.forEach(id=>{const er=$('e-'+id);if(er&&!er.hidden)val(id)});
  try{localStorage.setItem('vw-lang',l)}catch(e){}
  $('pc-wa').textContent=T('pc_wa');$('pc-copy').textContent=T('pc_cp');$('pc-close').textContent=T('pc_x');themeIcon();
  renderInter();renderRefs();renderRoadmap();renderContact();renderNav();
  if(typeof OWN!=='undefined'&&OWN.on){decorate();ownerBar()}saltBuild();conv();cca();gz();mlc();schBuild();labsBuild();ulBuild();ucvBuild();F[K]();
}

/* ===================== share a result by link =====================
   The link carries only the values typed in the calculator (in the part after #, which is never sent to any server);
   nothing is stored. Opening it fills the calculator and shows the same result. */
const b64u={enc:s=>btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec:s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))};
function shareLink(){
  const f={};
  FORMIDS.forEach(id=>{const el=$(id);if(!el||el.closest('[hidden]'))return;
    if(el.type==='checkbox'){if(el.checked)f[id]=1}else if(el.value!=='')f[id]=el.value});
  return location.origin+location.pathname+'#c='+b64u.enc(JSON.stringify({k:K,f}));
}
async function shareResult(){
  const url=shareLink(),title='VITAWAW · '+document.querySelector('#picker [aria-pressed="true"] span').textContent;
  try{if(navigator.share){await navigator.share({title,url});return}}catch(e){if(e&&e.name==='AbortError')return}
  const done=()=>toast(T('sh_rcopied'));try{await navigator.clipboard.writeText(url);done()}catch(e){fallback(url,done)}
}
function loadShared(code){
  let o=null;try{o=JSON.parse(b64u.dec(code))}catch(e){}
  if(!o||typeof o!=='object'||!F[o.k]||typeof o.f!=='object'){show('calc');return}
  K=o.k;FORMIDS.forEach(id=>{const el=$(id);if(!el)return;const v=o.f[id];
    if(el.type==='checkbox')el.checked=v===1;
    else if(el.tagName==='SELECT'){if(v!=null&&[...el.options].some(x=>x.value===String(v)))el.value=String(v)}
    else el.value=v!=null&&isFinite(parseFloat(v))?String(parseFloat(v)):''});
  syncSex();apply();show('calc');
}

/* ===================== wiring ===================== */
const F={d:fD,b12:fB12,fol:fFol,fe:fFe,ca:fCa,mg:fMg,c:fC,zn:fZn,preg:fPreg,inf:fInf,vac:fVA};
function apply(){
  showFor();
  document.querySelectorAll('#picker button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===K));
  F[K]();
}
$('nsearch').addEventListener('input',filterNuts);
$('isearch').addEventListener('input',renderInter);
// «أدويتي»: only medicines the site knows can be added (picked from the suggestions; Enter takes the first one)
$('medform').addEventListener('submit',e=>{e.preventDefault();const s=medSuggest($('medin').value);if(s.length)addMed(s[0].en);else renderSug()});
$('medin').addEventListener('input',renderSug);
$('medsug').addEventListener('click',e=>{const b=e.target.closest('[data-addmed]');if(b)addMed(b.dataset.addmed)});
$('picker').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;K=b.dataset.k;try{localStorage.setItem('vw-k',K)}catch(e){}apply()});
const FORMIDS=['age','sex','wt','ht','dlab','dunit','mal','med','ckd','b12v','b12u','b12c','neuro','ab12','folg','feg','hb','fer','infl','cadiet','mgv','mgu','mgsx','czg','smk','mon','feed','pre','vag','tri','ntd','lowca','veg'];
FORMIDS
  .forEach(i=>{$(i).addEventListener('input',()=>{if(i==='age')syncSex();F[K]()});$(i).addEventListener('change',()=>{if(i==='age')syncSex();F[K]()})});
$('wt').addEventListener('input',()=>{const w=nv('wt');if(w){$('gw').value=w;gz()}});
$('dunit').addEventListener('change',()=>{const v=nv('dlab');if(v!=null)$('dlab').value=$('dunit').value==='nmol'?Math.round(v*2.5):Math.round(v/2.5*10)/10;F[K]()});
$('mgu').addEventListener('change',()=>{const v=nv('mgv');if(v!=null)$('mgv').value=$('mgu').value==='mmol'?Math.round(v/2.43*100)/100:Math.round(v*2.43*100)/100;F[K]()});
$('b12u').addEventListener('change',()=>{const v=nv('b12v');if(v!=null)$('b12v').value=$('b12u').value==='pmol'?Math.round(v*0.738):Math.round(v/0.738);F[K]()});
['iu','cc','ampiu'].forEach(i=>{$(i).addEventListener('input',conv);$(i).addEventListener('change',conv)});
['mlwt','mlmgkg','mlfreq','mlconc','mlper','mldpm'].forEach(i=>{$(i).addEventListener('input',mlc);$(i).addEventListener('change',mlc)});
$('lbform').addEventListener('submit',e=>{e.preventDefault();if(labAdd($('lbk').value,nv('lbv'),$('lbd').value||today())){$('lbv').value='';toast(T('lb_saved'))}else toast(T('lb_bad'))});
$('lbk').addEventListener('change',labs);
$('lbout').addEventListener('click',async e=>{const d=e.target.closest('[data-lbdel]');if(d){LABS.splice(+d.dataset.lbdel,1);saveLabs();labs();return}
  if(e.target.closest('#lbclear')&&confirm(T('lb_clearq'))){LABS=[];saveLabs();labs()}});
$('schk').addEventListener('change',sch);$('schout').addEventListener('click',e=>{if(e.target.closest('#schcal'))schCalendar()});$('schw').addEventListener('change',sch);
$('tcau').addEventListener('change',()=>{const v=nv('tca');if(v!=null)$('tca').value=$('tcau').value==='mmol'?Math.round(v/4.008*100)/100:Math.round(v*4.008*10)/10;cca()});
$('albu').addEventListener('change',()=>{const v=nv('alb');if(v!=null)$('alb').value=$('albu').value==='gl'?Math.round(v*10):Math.round(v)/10;cca()});
['salt','tabmg','needmg'].forEach(i=>{$(i).addEventListener('input',pills);$(i).addEventListener('change',pills)});
['tca','alb'].forEach(i=>$(i).addEventListener('input',cca));
['gw','gha'].forEach(i=>$(i).addEventListener('input',gz));
$('ulage').addEventListener('change',ul);$('ulin').addEventListener('input',ul);$('ucv').addEventListener('change',ucv);$('uval').addEventListener('input',ucv);
$('ght').addEventListener('input',()=>{gtTouched=true;gz()});

/* ===================== colors ===================== */
function applyColors(){
  Object.entries(CFG.colors).forEach(([p,c])=>{const el=$(p);if(!el)return;el.style.setProperty('--pc',c[0]);el.style.setProperty('--pc2',c[1]);const t=$('t-'+p);if(t)t.style.setProperty('--ti',c[1])});
}
function refreshAll(){applyColors();setLang(LANG);decorate()}
