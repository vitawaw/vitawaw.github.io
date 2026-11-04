/* VITAWAW · js/boot.js
   Start-up: restores saved preferences, shows the first page, loads published content, registers the offline worker.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== boot ===================== */
/** 1.16.0 three-size preview: the owner's page puts the draft in localStorage (vw-frame) just before opening the frame */
function frameDraft(){try{const d=JSON.parse(localStorage.getItem('vw-frame')||'null');if(d&&typeof d==='object'){CFG=mergeCfg(DEFAULT_CFG,d);buildData();refreshAll()}}catch(e){}}
let startLang='ar',startPage='calc',welcomeSeen=false;
try{
  const s=localStorage.getItem('vw-k');buildData();if(s&&F[s])K=s;
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
if(typeof IS_PREVIEW!=='undefined'&&IS_PREVIEW){toolExamples();['tool-pill','tool-d','tool-ca','tool-gz','tool-ml','tool-u'].forEach(id=>{try{TOOLEX[id]()}catch(e){}})}
if(FRAME){$('welcome').hidden=true;loadPublished().finally(frameDraft)}
else{loadPublished();if(!routeSpecial())resumeSession()}
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
