/* VITAWAW · js/boot.js
   Start-up: restores saved preferences, shows the first page, loads published content, registers the offline worker.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== boot ===================== */
let startLang='ar',startPage='calc',welcomeSeen=false;
try{
  const s=localStorage.getItem('vw-k');buildData();if(s&&F[s])K=s;
  startLang=localStorage.getItem('vw-lang')||'ar';startPage=localStorage.getItem('vw-p')||'calc';
  const m=localStorage.getItem('vw-mode');if(m)MODE=m;
  welcomeSeen=!!localStorage.getItem('vw-welcome');
  const th=localStorage.getItem('vw-theme');if(th)document.documentElement.dataset.theme=th;
}catch(e){}
if(PAGES.includes(location.hash.slice(1)))startPage=location.hash.slice(1);
$('welcome').hidden=welcomeSeen;
try{$('rmnew').hidden=localStorage.getItem('vw-rm')==='3'}catch(e){}
document.querySelectorAll('#modeg [data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===MODE));
document.querySelectorAll('[data-for]').forEach(el=>{el.hidden=!el.dataset.for.split(' ').includes(K)});
document.querySelectorAll('#picker button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===K));
applyColors();
setLang(startLang);
show(startPage);
loadPublished();
if(location.hash==='#owner')openOwner();
if('serviceWorker' in navigator&&location.protocol==='https:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
