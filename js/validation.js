/* VITAWAW · js/validation.js
   Input checks for the calculator fields (allowed ranges, error messages, the 'missing data' state).
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== input validation ===================== */
const RANGE={age:[0,110],wt:[2,250],ht:[40,230],b12v:[20,3000],cadiet:[0,4000],ab12:[5,300],hb:[3,25],fer:[1,5000]};
function rangeOf(id){
  if(id==='dlab')return $('dunit').value==='nmol'?[2,1000]:[1,400];
  if(id==='mgv')return $('mgu').value==='mmol'?[0.1,3]:[0.2,6];
  if(id==='b12v')return $('b12u').value==='pmol'?[15,2200]:[20,3000];
  if(id==='mon')return K==='vac'?[0,59]:[0,24];
  return RANGE[id];
}
function errEl(id){let e=$('e-'+id);if(!e){e=document.createElement('p');e.className='err';e.id='e-'+id;e.hidden=true;const host=$(id).closest('.unit')||$(id);host.after(e)}return e}
function val(id){
  const el=$(id),raw=el.value.trim(),e=errEl(id);
  if(raw===''){el.classList.remove('bad');e.hidden=true;return {s:'empty'}}
  const v=parseFloat(raw),rg=rangeOf(id);
  if(isNaN(v)||(rg&&(v<rg[0]||v>rg[1]))){el.classList.add('bad');e.hidden=false;e.textContent=`${T('e_range')} ${fmt(rg[0])} – ${fmt(rg[1])}`;return {s:'bad'}}
  el.classList.remove('bad');e.hidden=true;return {s:'ok',v};
}
/* returns values or null after rendering the empty/invalid state */
function req(list,opt=[]){
  const out={},missing=[],bad=[];
  [...list,...opt].forEach(id=>{const r=val(id);if(r.s==='ok')out[id]=r.v;else{out[id]=null;if(r.s==='bad')bad.push(id);else if(list.includes(id))missing.push(id)}});
  if(bad.length||missing.length){emptyState(missing,bad);return null}
  return out;
}
const FIELDNAME={age:'age',wt:'wt',ht:'ht',dlab:'dlab',b12v:'b12v',mgv:'mgv',cadiet:'cadiet',ab12:'ab12',hb:'hb',fer:'fer',mon:'mon'};
function emptyState(missing,bad){
  LAST=null;
  const items=[...missing.map(id=>`<li>${T(FIELDNAME[id])}</li>`),...bad.map(id=>`<li style="color:var(--bad)">${T(FIELDNAME[id])}: ${T('e_range').split(':')[0]}</li>`)].join('');
  $('res').dataset.h='';$('res').innerHTML=`<div class="empty"><b>${T('e_empty_t')}</b>${items?`<div>${T('e_need')}<ul>${items}</ul></div>`:''}<button class="btn pri" type="button" data-ex>${T('ex')}</button></div>`;
  $('rtx').textContent=T('e_empty_t');$('rdot').style.background='var(--mute)';
}
