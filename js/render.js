/* VITAWAW · js/render.js
   Draws the result card (headline, alerts, plan, details, sources) and copies the result as text.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== render ===================== */
const TONE={ok:'var(--ok)',warn:'var(--warn)',bad:'var(--bad)',info:'var(--royal)'};
const ICON={
 ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>',
 bad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>',
 info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/></svg>'};
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>';
function reviewHTML(){return REVIEW.name?`<div class="reviewed">${CHECK}${T('rev')} ${REVIEW.name}${REVIEW.role?' · '+REVIEW.role:''}${REVIEW.date?' · '+REVIEW.date:''}</div>`:''}
function render(r){
  LAST=r;
  const pt=MODE==='pt';
  const urgent=(r.notes||[]).filter(n=>n.u),rest=(r.notes||[]).filter(n=>!n.u);
  const all=[...new Set([...(r.refs||[]),...(r.opts||[]).flatMap(o=>o.r||[]),...(r.notes||[]).flatMap(o=>o.r||[]),...(r.plan||[]).flatMap(o=>o.r||[])])].sort((a,b)=>a-b);
  const acts=[];
  if(r.tool==='pills')acts.push(`<button class="btn" type="button" data-tool="pills">${T('pills')}</button>`);
  if(r.tool==='drops')acts.push(`<button class="btn" type="button" data-tool="drops">${T('drops')}</button>`);
  acts.push(`<button class="btn" type="button" data-card><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h10"/></svg>${T('card')}</button>`);
  if(r.tool2==='ganz')acts.push(`<button class="btn" type="button" data-tool="ganz">${T('ganz')}</button>`);
  $('res').innerHTML=
   `<div class="res-head"><span class="badge t-${r.tone}">${ICON[r.tone]}${r.badge}</span><button class="btn" id="copy" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>${T('copy')}</span></button></div>`+
   (pt&&r.pt?`<p class="ptxt">${r.pt}</p>`:`<h3>${r.title}${R(r.refs||[])}</h3><p class="sub">${r.sub||''}</p>`)+
   (urgent.length?`<div class="alerts">${urgent.map(n=>`<div class="alert">${ICON.bad}<div>${n.t}${pt?'':R(n.r||[])}</div></div>`).join('')}</div>`:'')+
   (r.plan&&r.plan.length?`<p class="plan-h">${T('plan')}</p><ol class="plan">${r.plan.map(s=>`<li><b>${s.h}</b><span>${s.d||''}</span></li>`).join('')}</ol>`:'')+
   (acts.length?`<div class="ract">${acts.join('')}</div>`:'')+
   `<details class="more"${pt?'':' open'}><summary>${T(pt?'more_pt':'more_pro')}</summary>`+
     (pt&&r.pt?`<h3 style="font-size:17px">${r.title}${R(r.refs||[])}</h3><p class="sub">${r.sub||''}</p>`:'')+
     (r.kv&&r.kv.length?`<div class="kv">${r.kv.map(x=>`<div>${x[0]}<b>${x[1]}</b></div>`).join('')}</div>`:'')+
     (r.opts&&r.opts.length?`<div class="opts">${r.opts.map(o=>`<div class="opt"><small>${o.h}</small><b>${o.b}${R(o.r||[])}</b>${o.d?`<span>${o.d}</span>`:''}</div>`).join('')}</div>`:'')+
     (rest.length?`<div class="notes">${rest.map(n=>`<div class="note${n.i?' i':''}">${n.t}${R(n.r||[])}</div>`).join('')}</div>`:'')+
     `<div class="src">${T('srcs')} ${all.filter(n=>REFS[n]).map(n=>`<a href="#" data-ref="${n}">${esc(REFS[n][0])}</a>`).join(' · ')}</div>`+
   `</details>`+
   `<p class="disc">${T(pt?'disc_pt':'disc_all')}</p>`+reviewHTML()+
   `<p class="flag"><a href="${esc(msgLink('VITAWAW – '+L('ملاحظة على نتيجة','Result feedback')+': '+document.querySelector('#picker [aria-pressed="true"] span').textContent, plain(r.title)))}" target="_blank" rel="noopener">${T('flag')}</a></p>`;
  $('copy').addEventListener('click',copyRes);
  $('rdot').style.background=TONE[r.tone];$('rtx').textContent=(pt&&r.ptShort)||plain(r.title);
  updateBar();
}
function copyRes(){
  if(!LAST)return;
  const strip=plain;
  const head='VITAWAW · '+document.querySelector('#picker [aria-pressed="true"] span').textContent;
  let lines;
  if(MODE==='pt'&&LAST.pt)lines=[head,strip(LAST.badge),strip(LAST.pt),...(LAST.notes||[]).filter(n=>n.u).map(n=>'! '+strip(n.t)),...(LAST.plan||[]).map((s,i)=>(i+1)+'. '+strip(s.h)+(s.d?': '+strip(s.d):'')),'',T('disc_pt')];
  else lines=[head,strip(LAST.badge),strip(LAST.title),strip(LAST.sub),...(LAST.plan||[]).map((s,i)=>(i+1)+'. '+strip(s.h)+(s.d?': '+strip(s.d):'')),
    ...(LAST.kv||[]).map(x=>x[0]+': '+x[1]),...(LAST.opts||[]).map(o=>'• '+strip(o.h)+': '+strip(o.b)+(o.d?' ('+strip(o.d)+')':'')),...(LAST.notes||[]).map(n=>'! '+strip(n.t))];
  const text=lines.filter(x=>x!==undefined).join('\n'),b=$('copy'),done=()=>{b.lastElementChild.textContent=T('copied');setTimeout(()=>{if(b.isConnected)b.lastElementChild.textContent=T('copy')},1600)};
  try{navigator.clipboard.writeText(text).then(done).catch(()=>fallback(text,done))}catch(e){fallback(text,done)}
}
function fallback(text,done){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done()}catch(e){}t.remove()}
const teen=a=>a>=14&&a<=18;
