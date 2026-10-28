/* VITAWAW · js/tools.js
   Tools tab: unit converter, tablets count, corrected calcium, Ganzoni iron deficit.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== tools ===================== */
const nv=id=>{const v=parseFloat($(id).value);return isNaN(v)?null:v};
function pills(){
  const s=$('salt').value,t=nv('tabmg'),need=nv('needmg');
  $('tabmg-l').textContent=T(s==='direct'?'tab_el':'tab_salt');
  if(!(t>0)||!(need>0)){$('elper').textContent='—';$('ntabs').textContent='—';$('elperi').textContent='';$('ntabsi').textContent='';return}
  const el=s==='direct'?t:t*parseFloat(s),n=need/el,half=Math.round(n*2)/2;
  $('elper').textContent=fmt(Math.round(el*10)/10)+L(' ملغ',' mg');
  $('elperi').textContent=s==='direct'?'':L(`${fmt(t)} ملغ × ${Math.round(parseFloat(s)*100)}%`,`${fmt(t)} mg × ${Math.round(parseFloat(s)*100)}%`);
  $('ntabs').textContent=half<0.5?L('أقل من نصف حبة','Less than half a tablet'):fmt(half)+L(' حبة',' tablet(s)');
  $('ntabsi').textContent=L(`يعطي ${fmt(Math.round(half*el))} ملغ عنصري`,`Gives ${fmt(Math.round(half*el))} mg elemental`);
}
function conv(){
  let d=nv('iu');if(!(d>0))d=1000;const c=$('cc').value;
  $('dr').textContent=c==='ml400'?fmt(d/400)+L(' مل يومياً',' mL daily'):fmt(d/+c)+L(' قطرة يومياً',' drops daily');
  $('drs').textContent=fmt(d/40)+L(' mcg يومياً',' mcg daily');
  $('cp1').textContent=fmt(d/1000)+L(' كبسولة يومياً',' capsules daily');
  $('wk').textContent=fmt(d*7)+' IU';
  $('cp50').textContent=d*7>=35000?fmt(d*7/50000)+L(' كبسولة أسبوعياً',' capsules weekly'):L('كل ','Every ')+fmt(50000/d)+L(' يوماً',' days');
  $('amp').textContent=fmt(100000/d)+L(' يوماً',' days');
}
function cca(){
  const ca=nv('tca'),al=nv('alb');if(ca==null||al==null)return;
  const c=ca+0.8*(4-al);
  $('cca').textContent=fmt(Math.round(c*100)/100)+' mg/dL = '+fmt(Math.round(c*25)/100)+' mmol/L';
  $('ccat').textContent=c>10.5?L('أعلى من المدى المرجعي الشائع (8.5 – 10.5): لا تبدأ جرعات D العالية قبل تقييم السبب','Above the usual reference range (8.5–10.5): do not start high vitamin D doses before finding the cause'):c<8.5?L('أقل من المدى المرجعي الشائع (8.5 – 10.5)','Below the usual reference range (8.5–10.5)'):L('ضمن المدى المرجعي الشائع (8.5 – 10.5 mg/dL)','Within the usual reference range (8.5–10.5 mg/dL)');
}
let gtTouched=false;
function gz(){
  const w=nv('gw'),a=nv('gha');if(w==null||a==null)return;
  if(!gtTouched)$('ght').value=w<35?13:15;
  const t=nv('ght'),store=w<35?Math.round(w*15):500;
  const def=Math.max(0,Math.round(w*(t-a)*2.4+store));
  const fer=w<=66?Math.floor(def/100)*100:Math.ceil(def/100)*100,MG=L(' ملغ',' mg');
  $('gmg').textContent=fmt(def)+MG;
  $('gform').textContent=`${fmt(w)} × (${fmt(t)} − ${fmt(a)}) × 2.4 + ${fmt(store)}`+L(' مخزون',' stores');
  $('gven').textContent=Math.ceil(def/100)+L(' أمبولة',' ampoules');
  $('gfer').textContent=fmt(fer)+MG+' = '+fmt(fer/500)+L(' فيال',' vials');
  $('gfers').textContent=L(`بعد التقريب. أقصى جرعة مفردة ${fmt(Math.min(1000,Math.round(w*20)))} ملغ، ولا تتجاوز 1,000 ملغ أسبوعياً`,`After rounding. Maximum single dose ${fmt(Math.min(1000,Math.round(w*20)))} mg; no more than 1,000 mg per week`);
}
function openTool(kind){
  let sec='tool-d';
  if(kind==='pills'){sec='tool-pill';$('salt').value=PILL.k==='ca'?'0.40':'0.20';$('tabmg').value=PILL.k==='ca'?1250:325;$('needmg').value=PILL.dose;pills()}
  if(kind==='ganz')sec='tool-gz';
  openToolSheet(sec);
}
