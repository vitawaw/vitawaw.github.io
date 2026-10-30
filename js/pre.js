/* VITAWAW · js/pre.js
   Runs before the rest of the page is drawn (loaded without defer, right after the welcome card), so nothing jumps:
   the welcome card shows only on the first visit, and the saved theme and language direction apply at once. */
try{
  if(!localStorage.getItem('vw-welcome'))document.getElementById('welcome').hidden=false;
  const th=localStorage.getItem('vw-theme');if(th)document.documentElement.dataset.theme=th;
  if(localStorage.getItem('vw-lang')==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr'}
}catch(e){}
