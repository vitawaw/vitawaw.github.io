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
/** the medical review stamp chosen by the owner: «تمت المراجعة الطبية بواسطة الصيدلي سيف الدين · 2026-10-29» */
const REV=()=>{const v=CFG.review||{},n=v.n?tx2(v.n):'';return {name:n?esc(n):'',date:v.date||''}};
function reviewHTML(){const v=REV();return v.name?`<div class="reviewed">${CHECK}${T('rev')} ${v.name}${v.date?' · <span dir="ltr">'+v.date+'</span>':''}</div>`:''}
/** the interactions of the calculator on screen, read from the interactions page (so an approved edit shows here too) */
const IKEYS={preg:['fe','ca','fol','iodine','d','omega3','vita'],inf:['fe','d','vitk'],vac:['vita']};
function interHTML(){
  const ks=IKEYS[K]||[K],list=(typeof INTER!=='undefined'?INTER:[]).filter(x=>ks.includes(x[0])&&x[7]&&!x[8]).sort((a,b)=>SEVORD[a[6]]-SEVORD[b[6]]);
  if(!list.length)return '';
  return `<div class="rinter"><p class="plan-h">${T('ri_t')} (${list.length})</p>${list.map(x=>`<div class="ri sevb-${x[6]}"><span class="sev sev-${x[6]}">${T('sev_'+x[6])}</span><b>${ks.length>1?esc(L(x[1][0],x[1][1]))+' + ':''}${esc(L(x[2][0],x[2][1]))}</b><span>${esc(L(x[3][0],x[3][1]))}${R(x[4])}</span></div>`).join('')}
    <button class="btn" type="button" data-goint="${esc(ks.length>1?'all':K)}">${T('ri_all')}</button></div>`;
}
function render(r){
  LAST=r;
  const pt=MODE==='pt';
  const urgent=(r.notes||[]).filter(n=>n.u),rest=(r.notes||[]).filter(n=>!n.u);
  const all=r.srcs=[...new Set([...(r.refs||[]),...(r.opts||[]).flatMap(o=>o.r||[]),...(r.notes||[]).flatMap(o=>o.r||[]),...(r.plan||[]).flatMap(o=>o.r||[])])].sort((a,b)=>a-b);
  r.srcNames=[...new Set(all.filter(n=>REFS[n]).map(n=>REFS[n][0]))];
  const acts=[];
  // patient mode: the tablet counter and the IV-iron (Ganzoni) calculator are pharmacist tools
  if(r.tool==='pills'&&!pt)acts.push(`<button class="btn" type="button" data-tool="pills">${T('pills')}</button>`);
  if(r.tool==='drops')acts.push(`<button class="btn" type="button" data-tool="drops">${T('drops')}</button>`);
  acts.push(`<button class="btn" type="button" data-card><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h10"/></svg>${T('card')}</button>`);
  if(r.tool2==='ganz'&&!pt)acts.push(`<button class="btn" type="button" data-tool="ganz">${T('ganz')}</button>`);
  // more tools, opened already filled in from this result (patient mode keeps the ones a patient can use)
  const tb=k=>`<button class="btn" type="button" data-tool="${k}">${T('tb_'+k)}</button>`;
  acts.push(`<button class="btn" type="button" data-report="1">${T('rp_btn')}</button>`,`<button class="btn" type="button" data-share="1">${T('sh_btn')}</button>`);
  if(r.lab&&r.lab.length)acts.push(`<button class="btn" type="button" data-lab="1">${T('lb_save')}</button>`);
  if(r.cal)acts.push(`<button class="btn" type="button" data-cal="1">${CALIC}${T('cal_add')}</button>`);
  if(r.ml){ML=r.ml;acts.push(tb('ml'))}
  if(r.sch){SCHSET=r.sch;acts.push(tb('sch'))}
  if(r.ca&&!pt)acts.push(tb('ca'));
  if(r.units&&!pt){UCVSET=r.units;acts.push(tb('units'))}
  if(r.ul&&!pt){const a=parseFloat($('age').value);ULSET={g:ulGroup(isNaN(a)?30:a),v:r.ul};acts.push(tb('ul'))}
  // same result as on screen (e.g. the 'change' event when a field loses focus): keep the buttons, so the tap that caused the blur still lands
  const html=
   `<div class="res-head"><span class="badge t-${r.tone}">${ICON[r.tone]}${r.badge}</span><button class="btn" id="copy" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>${T('copy')}</span></button></div>`+
   (pt&&r.pt?`<p class="ptxt">${r.pt}</p>`:`<h3>${r.title}${R(r.refs||[])}</h3><p class="sub">${r.sub||''}</p>`)+
   (urgent.length?`<div class="alerts">${urgent.map(n=>`<div class="alert">${ICON.bad}<div>${n.t}${pt?'':R(n.r||[])}</div></div>`).join('')}</div>`:'')+
   (r.plan&&r.plan.length?`<p class="plan-h">${T('plan')}</p><ol class="plan">${r.plan.map(s=>`<li><b>${s.h}</b><span>${s.d||''}</span></li>`).join('')}</ol>`:'')+
   (acts.length?`<div class="ract">${acts.join('')}</div>`:'')+
   `<details class="more"${pt?'':' open'}><summary>${T(pt?'more_pt':'more_pro')}</summary>`+
     (pt&&r.pt?`<h3 style="font-size:17px">${r.title}${R(r.refs||[])}</h3><p class="sub">${r.sub||''}</p>`:'')+
     (r.kv&&r.kv.length?`<div class="kv">${r.kv.map(x=>`<div>${x[0]}<b>${x[1]}</b></div>`).join('')}</div>`:'')+
     (r.opts&&r.opts.length?`<div class="opts">${r.opts.map(o=>`<div class="opt"><small>${o.h}</small><b>${o.b}${R(o.r||[])}</b>${o.d?`<span>${o.d}</span>`:''}</div>`).join('')}</div>`:'')+
     interHTML()+
     (rest.length?`<div class="notes">${rest.map(n=>`<div class="note${n.i?' i':''}">${n.t}${R(n.r||[])}</div>`).join('')}</div>`:'')+
     `<div class="src">${T('srcs')} ${all.filter(n=>REFS[n]).map(n=>`<a href="#" data-ref="${n}">${esc(REFS[n][0])}</a>`).join(' · ')}</div>`+
   `</details>`+
   `<p class="disc">${T(pt?'disc_pt':'disc_all')}</p>`+reviewHTML()+
   `<p class="flag"><a href="${esc(msgLink('VITAWAW – '+L('ملاحظة على نتيجة','Result feedback')+': '+document.querySelector('#picker [aria-pressed="true"] span').textContent, plain(r.title)))}" target="_blank" rel="noopener">${T('flag')}</a></p>`;
  if(html!==$('res').dataset.h||!$('copy')){$('res').innerHTML=html;$('res').dataset.h=html;$('copy').addEventListener('click',copyRes)}
  $('rdot').style.background=TONE[r.tone];$('rtx').textContent=(pt&&r.ptShort)||plain(r.title);
  updateBar();
}
/** one line naming the sources of the result (for the copied text and the patient card) */
const srcLine=()=>LAST&&LAST.srcNames&&LAST.srcNames.length?T('srcs')+' '+LAST.srcNames.join(' · '):'';
function copyRes(){
  if(!LAST)return;
  const strip=plain;
  const head='VITAWAW · '+document.querySelector('#picker [aria-pressed="true"] span').textContent;
  let lines;
  if(MODE==='pt'&&LAST.pt)lines=[head,strip(LAST.badge),strip(LAST.pt),...(LAST.notes||[]).filter(n=>n.u).map(n=>'! '+strip(n.t)),...(LAST.plan||[]).map((s,i)=>(i+1)+'. '+strip(s.h)+(s.d?': '+strip(s.d):'')),'',srcLine(),T('disc_pt')];
  else lines=[head,strip(LAST.badge),strip(LAST.title),strip(LAST.sub),...(LAST.plan||[]).map((s,i)=>(i+1)+'. '+strip(s.h)+(s.d?': '+strip(s.d):'')),
    ...(LAST.kv||[]).map(x=>x[0]+': '+x[1]),...(LAST.opts||[]).map(o=>'• '+strip(o.h)+': '+strip(o.b)+(o.d?' ('+strip(o.d)+')':'')),...(LAST.notes||[]).map(n=>'! '+strip(n.t)),srcLine()];
  const text=lines.filter(x=>x!==undefined).join('\n'),b=$('copy'),done=()=>{b.lastElementChild.textContent=T('copied');setTimeout(()=>{if(b.isConnected)b.lastElementChild.textContent=T('copy')},1600)};
  try{navigator.clipboard.writeText(text).then(done).catch(()=>fallback(text,done))}catch(e){fallback(text,done)}
}
function fallback(text,done){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done()}catch(e){}t.remove()}
const teen=a=>a>=14&&a<=18;

/* ===================== report for the doctor (print / save as PDF) =====================
   A plain page with the patient's inputs, the result, the plan, the warnings, the interactions and the full sources.
   It is shown in a floating window; «اطبع أو احفظ PDF» prints only this page (the phone offers «Save as PDF»). */
function repInputs(){
  const out=[];
  document.querySelectorAll('#calc input, #calc select').forEach(el=>{
    if(el.id==='nsearch'||!el.offsetParent&&!el.closest('.f,.block,.chk'))return;
    const box=el.closest('[data-for],[data-not],.f,.block,.chk');if(box&&box.closest('[hidden]'))return;if(el.closest('[hidden]'))return;
    if(el.type==='checkbox'){if(el.checked){const t=el.closest('.chk');out.push([plain(t.querySelector('span span, span').textContent),'✓'])}return}
    if(el.tagName==='SELECT'&&(el.id==='dunit'||el.id==='b12u'||el.id==='mgu'))return;
    const v=el.tagName==='SELECT'?el.options[el.selectedIndex]?.textContent:el.value;if(!v)return;
    const lab=document.querySelector(`label[for="${el.id}"]`);let name=lab?plain(lab.textContent).replace(/\*/g,'').trim():el.id;
    const unit=el.parentElement&&el.parentElement.classList.contains('unit')?(el.parentElement.querySelector('select')?el.parentElement.querySelector('select').value.replace('mgdl','mg/dL').replace('nmol','nmol/L').replace('ng','ng/mL').replace('pg','pg/mL').replace('pmol','pmol/L').replace('mmol','mmol/L'):(el.parentElement.querySelector('.u')||{}).textContent||''):'';
    out.push([name,v+(unit?' '+unit:'')]);
  });
  return out;
}
function repHTML(){
  const r=LAST;if(!r)return '';
  const name=document.querySelector('#picker [aria-pressed="true"] span').textContent,d=new Date().toLocaleDateString(LANG==='ar'?'ar-IQ-u-nu-latn':'en-GB',{year:'numeric',month:'long',day:'numeric'});
  const ks=IKEYS[K]||[K],inter=(typeof INTER!=='undefined'?INTER:[]).filter(x=>ks.includes(x[0])&&x[7]&&!x[8]);
  const srcs=(r.srcs||[]).filter(n=>REFS[n]),rv=REV();
  return `<div class="rp" dir="${LANG==='ar'?'rtl':'ltr'}">
   <div class="rp-h"><div><b>VITAWAW</b> · ${esc(T('rp_t'))}</div><div>${esc(d)}</div></div>
   <h1>${esc(name)}</h1>
   <h2>${esc(T('rp_in'))}</h2><table>${repInputs().map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
   <h2>${esc(T('rp_res'))}</h2><p class="rp-b">${esc(plain(r.badge))}</p><p><b>${esc(plain(r.title))}</b></p>${r.sub?`<p>${esc(plain(r.sub))}</p>`:''}
   ${(r.notes||[]).filter(n=>n.u).map(n=>`<p class="rp-u">⚠ ${esc(plain(n.t))}</p>`).join('')}
   ${r.plan&&r.plan.length?`<h2>${esc(T('plan'))}</h2><ol>${r.plan.map(s=>`<li><b>${esc(plain(s.h))}</b>${s.d?' — '+esc(plain(s.d)):''}</li>`).join('')}</ol>`:''}
   ${r.opts&&r.opts.length?`<h2>${esc(T('rp_opts'))}</h2><ul>${r.opts.map(o=>`<li><b>${esc(plain(o.h))}:</b> ${esc(plain(o.b))}${o.d?' ('+esc(plain(o.d))+')':''}</li>`).join('')}</ul>`:''}
   ${r.kv&&r.kv.length?`<table>${r.kv.map(x=>`<tr><th>${esc(plain(x[0]))}</th><td>${esc(plain(x[1]))}</td></tr>`).join('')}</table>`:''}
   ${(r.notes||[]).filter(n=>!n.u).length?`<h2>${esc(T('rp_notes'))}</h2><ul>${r.notes.filter(n=>!n.u).map(n=>`<li>${esc(plain(n.t))}</li>`).join('')}</ul>`:''}
   ${inter.length?`<h2>${esc(T('ri_t'))}</h2><ul>${inter.map(x=>`<li><b>${esc(L(x[2][0],x[2][1]))}</b> (${esc(T('sev_'+x[6]))}): ${esc(L(x[3][0],x[3][1]))}</li>`).join('')}</ul>`:''}
   <h2>${esc(T('rp_src'))}</h2><ol class="rp-s">${srcs.map(n=>`<li value="${n}">${esc(REFS[n][0])} — ${esc(REFS[n][1])}${REFS[n][2]?` <span dir="ltr">${esc(REFS[n][2])}</span>`:''}</li>`).join('')}</ol>
   <p class="rp-f">${rv.name?esc(T('rev'))+' '+rv.name+(rv.date?' · '+esc(rv.date):'')+'<br>':''}${esc(T('disc_all'))}</p></div>`;
}
function openReport(){
  if(!LAST)return;const h=repHTML();$('rep').innerHTML=h;
  openSheet(T('rp_t'),`<div class="rpwrap">${h}</div><div class="sact filters"><button class="btn pri" type="button" id="rpprint">${esc(T('rp_print'))}</button></div>`,{key:'report'});
  $('rpprint').addEventListener('click',()=>{document.body.classList.add('printrep');window.print();setTimeout(()=>document.body.classList.remove('printrep'),500)});
}
