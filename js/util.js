/* VITAWAW · js/util.js
   Small helpers used everywhere: esc() (escape HTML), normAr() (Arabic-insensitive search), $(id), fmt(), R() (source badges).
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/** Escape text before putting it inside HTML (always use this for data from the database). */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normAr=x=>String(x||'').toLowerCase().replace(/[أإآا]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064B-\u0652]/g,'').replace(/\s+/g,' ').trim();
const $=id=>document.getElementById(id);
/** HTML → plain text for copying/sharing: removes tags and turns codes like &#39; back into characters */
const plain=x=>{const t=document.createElement('textarea');t.innerHTML=String(x||'').replace(/<[^>]+>/g,'');return t.value};
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYEOFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const TRASH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
const PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
const PLUS='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:1});
const R=a=>(a||[]).filter(n=>REFS[n]).map(n=>`<a class="ref" href="#" data-ref="${n}" title="${esc(REFS[n][0])}">${n}</a>`).join('');
let K='d',LAST=null;
