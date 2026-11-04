/* VITAWAW · js/pre.js
   Runs before the rest of the page is drawn (loaded without defer, right after the welcome card), so nothing jumps:
   the welcome card shows only on the first visit, and the saved theme and language direction apply at once. */
const FRAME=/[?&]frame=1\b/.test(location.search)&&window.parent!==window; // 1.16.0: inside the owner's three-size preview
if(FRAME)document.documentElement.classList.add('frame');
try{
  if(!FRAME&&!localStorage.getItem('vw-welcome'))document.getElementById('welcome').hidden=false;
  const th=localStorage.getItem('vw-theme');if(th)document.documentElement.dataset.theme=th;
  if(localStorage.getItem('vw-lang')==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr'}
  const lk=JSON.parse(localStorage.getItem('vw-look')||'null');if(lk&&typeof lk==='object')Object.entries(lk).forEach(([k,v])=>{if(/^--(f-body|f-display|fsb|fsh|fst)$/.test(k)&&typeof v==='string'&&!/[<>;{}]/.test(v))document.documentElement.style.setProperty(k,v)});
}catch(e){}
/* preview links (Cloudflare previews of a branch) use the SAME database as the live site: a red bar says so */
try{
  const h=location.hostname;
  if(!FRAME&&/\.workers\.dev$/.test(h)&&h!=='billowing-glade-6627.vitawaw26.workers.dev'){
    const b=document.createElement('div');b.className='pvbar';b.setAttribute('role','note');
    b.textContent=localStorage.getItem('vw-lang')==='en'?'Test version — uses a separate test database; nothing here changes the live site':'نسخة تجريبية — قاعدة بيانات تجريبية منفصلة، لا شيء هنا يغيّر الموقع الرسمي';
    document.body.prepend(b);
  }
}catch(e){}
