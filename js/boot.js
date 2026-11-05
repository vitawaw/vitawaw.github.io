/* VITAWAW · js/boot.js
   Start-up: restores saved preferences, shows the first page, loads published content, registers the offline worker.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== boot ===================== */
/** 1.16.0 three-size preview: the owner's page puts the draft in localStorage (vw-frame) just before opening the frame */
function frameDraft(){try{const d=JSON.parse(localStorage.getItem('vw-frame')||'null');if(d&&typeof d==='object'){CFG=mergeCfg(DEFAULT_CFG,d);buildData();refreshAll()}}catch(e){}}
let startLang='ar',startPage='calc',welcomeSeen=false;
try{
  const s=localStorage.getItem('vw-k');buildData();if(s&&Object.prototype.hasOwnProperty.call(F,s))K=s; // 1.17.1 only a real calculator name (not e.g. «constructor»)
  startLang=localStorage.getItem('vw-lang')||'ar';startPage=localStorage.getItem('vw-p')||'calc';
  localStorage.removeItem('vw-mode'); // 1.15.0: there is no patient mode any more
  welcomeSeen=!!localStorage.getItem('vw-welcome');
  const th=localStorage.getItem('vw-theme');if(th)document.documentElement.dataset.theme=th;
}catch(e){}
if(PAGES.includes(location.hash.slice(1)))startPage=location.hash.slice(1);
$('welcome').hidden=welcomeSeen;
try{$('rmnew').hidden=localStorage.getItem('vw-rm')==='3'}catch(e){}
showFor();
document.querySelectorAll('#picker button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===K));
applyColors();
setLang(startLang);
show(startPage);
// 1.16.3: «جرّب مثالاً» and the example numbers exist only on the test site
document.body.classList.toggle('demo',typeof IS_PREVIEW!=='undefined'&&IS_PREVIEW);
statHit('open',''); // 1.17.0 anonymous visit count (sent when the tab is hidden; never for the team, see stats.js)
toolActs(); // 1.16.4: «جرّب مثالاً» (test site) + «مسح البيانات» in every tool; fields stay empty until an example or the user fills them
if(FRAME){$('welcome').hidden=true;loadPublished().finally(frameDraft)}
else{loadPublished();const h0=location.hash;routeSpecial();if(!/^#(owner|join)|type=recovery|error_code=otp_expired/.test(h0))resumeSession()} // 1.17.1 also on #tool-… / #v-… / #info-… (it was skipped there)
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
