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
/* supplement total vs the upper limit (UL, NIH / Institute of Medicine); age groups 1–3, 4–8, 9–13, 14–18, 19–50, 51+.
   [id, name ar, name en, unit, ULs, source, note ar, note en] — the UL counts supplements only, except calcium (food + supplements) */
const ULT=[
 ['d','فيتامين D','Vitamin D','IU',[2500,3000,4000,4000,4000,4000],4],
 ['a','فيتامين A','Vitamin A','mcg RAE',[600,900,1700,2800,3000,3000],30,'فيتامين A الجاهز فقط، وليس Beta-carotene','Preformed vitamin A only, not beta-carotene'],
 ['e','فيتامين E','Vitamin E','mg',[200,300,600,800,1000,1000],31],
 ['c','فيتامين C','Vitamin C','mg',[400,650,1200,1800,2000,2000],23],
 ['b6','فيتامين B6','Vitamin B6','mg',[30,40,60,80,100,100],33],
 ['b3','النياسين (B3)','Niacin (B3)','mg',[10,15,20,30,35,35],35],
 ['fol','حمض الفوليك','Folic acid','mcg',[300,400,600,800,1000,1000],11],
 ['fe','الحديد','Iron','mg',[40,40,40,45,45,45],15,'لا ينطبق على جرعات العلاج بإشراف طبي','Does not apply to supervised treatment doses'],
 ['zn','الزنك','Zinc','mg',[7,12,23,34,40,40],25],
 ['ca','الكالسيوم (غذاء + مكمل)','Calcium (food + supplements)','mg',[2500,2500,3000,3000,2500,2000],18,'يُحسب الغذاء والمكمل معاً','Food and supplements together'],
 ['mg','المغنيسيوم (مكمل)','Magnesium (supplements)','mg',[65,110,350,350,350,350],20,'من المكملات والأدوية فقط، وليس من الطعام','From supplements and medicines only, not food'],
 ['se','السيلينيوم','Selenium','mcg',[90,150,280,400,400,400],39],
 ['io','اليود','Iodine','mcg',[200,300,600,900,1100,1100],37]];
function ulBuild(){
  const old=Object.fromEntries(ULT.map(x=>[x[0],$('ul-'+x[0])?$('ul-'+x[0]).value:'']));
  $('ulin').innerHTML=ULT.map(x=>`<div class="f"><label class="l" for="ul-${x[0]}">${L(x[1],x[2])} <small dir="ltr">${x[3]}</small></label><input type="number" id="ul-${x[0]}" min="0" step="any" inputmode="decimal" placeholder="—" value="${esc(old[x[0]]||'')}"></div>`).join('');
  ul();
}
function ul(){
  const g=+$('ulage').value,rows=ULT.map(x=>({x,v:nv('ul-'+x[0])})).filter(o=>o.v!=null&&o.v>0);
  if(!rows.length){$('ulout').innerHTML=`<p class="hint">${L('أدخل الكمية اليومية من كل المكملات معاً (اجمع ما في كل العبوات).','Enter the daily amount from all supplements together (add up every product).')}</p>`;return}
  const over=rows.filter(o=>o.v>o.x[4][g]);
  $('ulout').innerHTML=`<div class="ulsum ${over.length?'bad':'ok'}">${over.length?L('تجاوز الحد الأعلى: ','Above the upper limit: ')+over.map(o=>L(o.x[1],o.x[2])).join(L('، ',', ')):L('المجموع ضمن الحد الأعلى','The total is within the upper limit')}</div>`+
    rows.map(o=>{const u=o.x[4][g],pc=Math.round(o.v/u*100),cls=pc>100?'bad':pc>=80?'warn':'ok';
      return `<div class="ulr ${cls}"><div class="ulh"><b>${L(o.x[1],o.x[2])}</b><span dir="ltr">${fmt(o.v)} / ${fmt(u)} ${o.x[3]}</span></div><div class="ulbar"><i style="width:${Math.min(100,pc)}%"></i></div><small>${pc}% ${L('من الحد الأعلى','of the upper limit')}${o.x[6]?' · '+L(o.x[6],o.x[7]):''}${R([o.x[5]])}</small></div>`}).join('');
}
/* unit converter: [id, label ar, label en, factor, from unit, to unit, source] — to = from × factor */
const UCV=[
 ['d','فيتامين D: من IU إلى mcg','Vitamin D: IU → mcg',1/40,'IU','mcg',4],
 ['a','فيتامين A (Retinol): من IU إلى mcg RAE','Vitamin A (retinol): IU → mcg RAE',0.3,'IU','mcg RAE',30],
 ['abc','Beta-carotene (مكمل): من IU إلى mcg RAE','Beta-carotene (supplement): IU → mcg RAE',0.15,'IU','mcg RAE',30],
 ['en','فيتامين E طبيعي (d-alpha): من IU إلى mg','Vitamin E natural (d-alpha): IU → mg',0.67,'IU','mg',31],
 ['es','فيتامين E صناعي (dl-alpha): من IU إلى mg','Vitamin E synthetic (dl-alpha): IU → mg',0.45,'IU','mg',31],
 ['dl','تحليل فيتامين D: من ng/mL إلى nmol/L','Vitamin D test: ng/mL → nmol/L',2.496,'ng/mL','nmol/L',4],
 ['b12','B12: من pg/mL إلى pmol/L','B12: pg/mL → pmol/L',0.738,'pg/mL','pmol/L',8],
 ['fo','الفولات: من ng/mL إلى nmol/L','Folate: ng/mL → nmol/L',2.266,'ng/mL','nmol/L',11],
 ['mg','المغنيسيوم: من mg/dL إلى mmol/L','Magnesium: mg/dL → mmol/L',0.4114,'mg/dL','mmol/L',20],
 ['ca','الكالسيوم: من mg/dL إلى mmol/L','Calcium: mg/dL → mmol/L',0.2495,'mg/dL','mmol/L',18],
 ['hb','الهيموغلوبين: من g/dL إلى g/L','Hemoglobin: g/dL → g/L',10,'g/dL','g/L',51],
 ['fer','Ferritin: من ng/mL إلى µg/L','Ferritin: ng/mL → µg/L',1,'ng/mL','µg/L',52]];
function ucvBuild(){const v=$('ucv').value||'d';$('ucv').innerHTML=UCV.map(x=>`<option value="${x[0]}">${L(x[1],x[2])}</option>`).join('');$('ucv').value=v;ucv()}
function ucv(){
  const c=UCV.find(x=>x[0]===$('ucv').value)||UCV[0],v=nv('uval');
  if(v==null){$('uout').textContent='—';$('uouti').textContent='';return}
  const f=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:n<1?4:2});
  $('uout').textContent=`${f(v*c[3])} ${c[5]}`;
  $('uouti').innerHTML=`<bdi dir="ltr">${f(v)} ${c[4]} = ${f(v*c[3])} ${c[5]}</bdi><br>${L('وبالعكس','Reverse')}: <bdi dir="ltr">${f(v)} ${c[5]} = ${f(v/c[3])} ${c[4]}</bdi>${R([c[6]])}`;
}
