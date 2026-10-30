/* VITAWAW · js/tools.js
   Tools tab: tablets count, vitamin D converter, corrected calcium, IV iron (Ganzoni + Ferinject table), syrup volume,
   daily supplement schedule, upper-limit check, unit converter. The calculator opens them already filled in (openTool).
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== tools ===================== */
const nv=id=>{const v=parseFloat($(id).value);return isNaN(v)?null:v};
/* tablet counter: [id, element, ar, en, elemental fraction] — NIH ODS percentages; magnesium and zinc salts by formula weight */
const SALTS=[['direct','',  'أعرف الكمية العنصرية من العبوة','I know the elemental amount from the pack',1],
 ['fs','fe','Ferrous sulfate (حديد 20%)','Ferrous sulfate (20% iron)',0.20],
 ['fsd','fe','Ferrous sulfate مجفف (حبة 200 ملغ = 65 ملغ حديد، 32%)','Dried ferrous sulfate (200 mg tablet = 65 mg iron, 32%)',0.325],
 ['ff','fe','Ferrous fumarate (حديد 33%)','Ferrous fumarate (33% iron)',0.33],
 ['fg','fe','Ferrous gluconate (حديد 12%)','Ferrous gluconate (12% iron)',0.12],
 ['cc','ca','Calcium carbonate (كالسيوم 40%)','Calcium carbonate (40% calcium)',0.40],
 ['ci','ca','Calcium citrate (كالسيوم 21%)','Calcium citrate (21% calcium)',0.21],
 ['cl','ca','Calcium lactate (كالسيوم 13%)','Calcium lactate (13% calcium)',0.13],
 ['cg','ca','Calcium gluconate (كالسيوم 9%)','Calcium gluconate (9% calcium)',0.09],
 ['mo','mg','Magnesium oxide (مغنيسيوم 60%)','Magnesium oxide (60% magnesium)',0.60],
 ['mc','mg','Magnesium citrate (مغنيسيوم 16%)','Magnesium citrate (16% magnesium)',0.16],
 ['mgl','mg','Magnesium glycinate (مغنيسيوم 14%)','Magnesium glycinate (14% magnesium)',0.14],
 ['mcl','mg','Magnesium chloride (مغنيسيوم 12%)','Magnesium chloride (12% magnesium)',0.12],
 ['zs','zn','Zinc sulfate (زنك 23%)','Zinc sulfate (23% zinc)',0.23],
 ['zg','zn','Zinc gluconate (زنك 14%)','Zinc gluconate (14% zinc)',0.14]];
const SALTGRP={fe:['الحديد','Iron'],ca:['الكالسيوم','Calcium'],mg:['المغنيسيوم','Magnesium'],zn:['الزنك','Zinc']};
function saltBuild(){
  const v=$('salt').value||'direct';
  $('salt').innerHTML=`<option value="direct">${esc(L(SALTS[0][2],SALTS[0][3]))}</option>`+Object.keys(SALTGRP).map(g=>`<optgroup label="${esc(L(...SALTGRP[g]))}">${SALTS.filter(x=>x[1]===g).map(x=>`<option value="${x[0]}">${esc(L(x[2],x[3]))}</option>`).join('')}</optgroup>`).join('');
  $('salt').value=v;pills();
}
function pills(){
  const sx=SALTS.find(x=>x[0]===$('salt').value)||SALTS[0],s=sx[0],f=sx[4],t=nv('tabmg'),need=nv('needmg');
  $('tabmg-l').textContent=T(s==='direct'?'tab_el':'tab_salt');
  if(!(t>0)||!(need>0)){$('elper').textContent='—';$('ntabs').textContent='—';$('elperi').textContent='';$('ntabsi').textContent='';return}
  const el=t*f,n=need/el,half=Math.round(n*2)/2,mmol=sx[1]==='mg'?L(` = ${fmt(Math.round(el/24.3*10)/10)} mmol`,` = ${fmt(Math.round(el/24.3*10)/10)} mmol`):'';
  $('elper').textContent=fmt(Math.round(el*100)/100)+L(' ملغ',' mg');
  $('elperi').textContent=(s==='direct'?'':L(`${fmt(t)} ملغ × ${Math.round(f*1000)/10}%`,`${fmt(t)} mg × ${Math.round(f*1000)/10}%`))+mmol;
  $('ntabs').textContent=half<0.5?L('أقل من نصف حبة','Less than half a tablet'):fmt(half)+L(' حبة',' tablet(s)');
  $('ntabsi').textContent=L(`يعطي ${fmt(Math.round(half*el*10)/10)} ملغ عنصري`,`Gives ${fmt(Math.round(half*el*10)/10)} mg elemental`)+(sx[1]==='mg'?` (${fmt(Math.round(half*el/24.3*10)/10)} mmol)`:'');
}
function conv(){
  let d=nv('iu');if(!(d>0))d=1000;const c=$('cc').value,amp=+$('ampiu').value;
  $('dr').textContent=c==='ml400'?fmt(d/400)+L(' مل يومياً',' mL daily'):fmt(d/+c)+L(' قطرة يومياً',' drops daily');
  $('drs').textContent=fmt(d/40)+L(' mcg يومياً',' mcg daily');
  $('cp1').textContent=fmt(d/1000)+L(' كبسولة يومياً',' capsules daily');
  $('wk').textContent=fmt(d*7)+' IU';
  // a 50,000 IU capsule: whole or half capsules a week when that is close (within 15%), otherwise one capsule every N days
  const n=d*7/50000,half=Math.round(n*2)/2;
  $('cp50').textContent=half>=1&&Math.abs(half-n)/n<=0.15?fmt(half)+L(' كبسولة أسبوعياً',' capsule(s) weekly'):L(`كبسولة كل ${fmt(Math.round(50000/d))} يوماً`,`One capsule every ${fmt(Math.round(50000/d))} days`);
  $('ampl').textContent=L(`أمبولة ${fmt(amp)} IU`,`${fmt(amp)} IU ampoule`);
  $('amp').textContent=fmt(Math.round(amp/d))+L(' يوماً',' days');
}
function cca(){
  let ca=nv('tca'),al=nv('alb');if(ca==null||al==null)return;
  if($('tcau').value==='mmol')ca*=4.008; if($('albu').value==='gl')al/=10; // work in mg/dL and g/dL (Payne 1973)
  const c=ca+0.8*(4-al);
  const f2=n=>Number(n.toFixed(2)).toLocaleString('en-US');
  $('cca').textContent=f2(c)+' mg/dL = '+f2(c/4.008)+' mmol/L';
  $('ccat').textContent=c>10.5?L('أعلى من المدى المرجعي الشائع (8.5 – 10.5): لا تبدأ جرعات D العالية قبل تقييم السبب','Above the usual reference range (8.5–10.5): do not start high vitamin D doses before finding the cause'):c<8.5?L('أقل من المدى المرجعي الشائع (8.5 – 10.5)','Below the usual reference range (8.5–10.5)'):L('ضمن المدى المرجعي الشائع (8.5 – 10.5 mg/dL)','Within the usual reference range (8.5–10.5 mg/dL)');
}
let gtTouched=false;
/** Ferinject simplified dosing table of the EU/UK SmPC (cumulative iron, mg) by Hb (g/dL) and weight, for 35 kg and above */
function ferTable(w,hb){
  if(w<35)return null; // the table is for 35 kg and above; below that the label uses Ganzoni
  const hi=w>=70;return {mg:hb<10?(hi?2000:1500):hb<14?(hi?1500:1000):500};
}
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
  const mx=Math.min(1000,Math.round(w*20));
  $('gfers').textContent=L(`بعد التقريب. أقصى جرعة مفردة ${fmt(mx)} ملغ، ولا تتجاوز 1,000 ملغ أسبوعياً`,`After rounding. Maximum single dose ${fmt(mx)} mg; no more than 1,000 mg per week`);
  const ft=ferTable(w,a);
  if(!ft){$('gtab').textContent='—';$('gtabi').textContent=L('الجدول لوزن 35 كغم فأكثر؛ تحت ذلك تُستعمل معادلة Ganzoni أعلاه','The table is for 35 kg and above; below that use the Ganzoni result above');return}
  const doses=Math.ceil(ft.mg/mx);
  $('gtab').textContent=fmt(ft.mg)+MG;
  $('gtabi').textContent=L(`على ${doses===1?'جرعة واحدة':doses+' جرعات'} لا تتجاوز كل منها ${fmt(mx)} ملغ، بفاصل أسبوع على الأقل`,`In ${doses} dose(s) of no more than ${fmt(mx)} mg each, at least a week apart`);
}
/* syrup / drops volume: dose (mg/kg) × weight → mL from the strength on the pack */
function mlc(){
  const w=nv('mlwt'),k=nv('mlmgkg'),q=+$('mlfreq').value,c=nv('mlconc'),per=nv('mlper'),dpm=nv('mldpm');
  if(!(w>0)||!(k>0)||!(c>0)||!(per>0)){$('mldose').textContent='—';$('mlvol').textContent='—';$('mldosei').textContent='';$('mlvoli').textContent='';return}
  const mg=w*k,ml=mg/(c/per),r1=n=>Math.round(n*10)/10;
  $('mldose').textContent=fmt(r1(mg))+L(' ملغ في المرة',' mg per dose');
  $('mldosei').textContent=L(`${fmt(w)} كغم × ${fmt(k)} ملغ/كغم · ${fmt(r1(mg*q))} ملغ يومياً`,`${fmt(w)} kg × ${fmt(k)} mg/kg · ${fmt(r1(mg*q))} mg a day`);
  const mlT=Number(ml.toFixed(ml<1?2:1)).toLocaleString('en-US')+L(' مل',' mL'),qT=L(['مرة واحدة يومياً','مرتين يومياً','3 مرات يومياً'][q-1],['once a day','twice a day','3 times a day'][q-1]);
  $('mlvol').textContent=dpm?fmt(Math.round(ml*dpm))+L(' قطرة',' drops'):mlT;
  $('mlvoli').textContent=(dpm?mlT+' · ':'')+qT+' · '+L(`التركيز ${fmt(c)} ملغ لكل ${fmt(per)} مل`,`strength ${fmt(c)} mg per ${fmt(per)} mL`);
}
let ML={wt:10,mgkg:3,q:1};
/* the calculator opens a tool already filled in: PILL (tablets), ML (syrup), UCVSET (units), ULSET (upper limit), SCHSET (daily schedule) */
let UCVSET=null,ULSET=null,SCHSET=null;
function openTool(kind){
  let sec='tool-d';
  if(kind==='pills'){sec='tool-pill';const k=PILL.k;
    const def={fe:['fsd',200],ca:['cc',1250],mg:['mo',400],zn:['zs',220],fol:['direct',PILL.tab||5]}[k]||['direct',PILL.dose];
    $('salt').value=def[0];$('tabmg').value=def[1];$('needmg').value=PILL.dose;pills()}
  if(kind==='ganz')sec='tool-gz';
  if(kind==='ca')sec='tool-ca';
  if(kind==='ml'){sec='tool-ml';$('mlwt').value=ML.wt;$('mlmgkg').value=ML.mgkg;$('mlfreq').value=String(ML.q);mlc()}
  if(kind==='units'){sec='tool-u';if(UCVSET){$('ucv').value=UCVSET[0];$('uval').value=UCVSET[1]}ucv()}
  if(kind==='ul'){sec='tool-ul';if(ULSET){$('ulage').value=String(ULSET.g);ULSET.v.forEach(([id,v])=>{const e=$('ul-'+id);if(e)e.value=v})}ul()}
  if(kind==='labs'){sec='tool-labs';labs()}
  if(kind==='sch'){sec='tool-sch';if(SCHSET)SCHSET.forEach(id=>{const e=$('sc-'+id);if(e)e.checked=true});sch()}
  openToolSheet(sec);
}
/** age in years → the UL age group (1–3, 4–8, 9–13, 14–18, 19–50, 51+) */
const ulGroup=a=>a<=3?0:a<=8?1:a<=13?2:a<=18?3:a<=50?4:5;
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
/* ===================== daily supplement schedule =====================
   Times are minutes after waking (W). Meals are assumed at W+1 h (breakfast), W+6 h (lunch), W+12 h (dinner), bed at W+15 h.
   Each item: [id, ar, en, candidate times (best first), how to take ar, en, sources]. The search tries every combination
   and keeps the one with the best-ranked times that respects every minimum gap (schRules). */
const H=60;
const SCI=[
 ['levo','Levothyroxine','Levothyroxine',[0,30],'على معدة فارغة مع الماء، قبل الفطور بـ 30 – 60 دقيقة','On an empty stomach with water, 30–60 minutes before breakfast',[27]],
 ['bis','Alendronate (أسبوعي)','Alendronate (weekly)',[0],'عند الاستيقاظ بكوب ماء كامل، وابقَ جالساً أو واقفاً 30 دقيقة قبل أي طعام أو دواء','On waking with a full glass of water; stay upright 30 minutes before any food or medicine',[20]],
 ['fe','الحديد','Iron',[3*H,4*H,9*H,10*H,1*H,6*H,12*H],'بين الوجبات مع ماء أو عصير فيه فيتامين C؛ ومع قليل من الطعام إن سبّب اضطراباً','Between meals with water or juice containing vitamin C; with a little food if it upsets the stomach',[15,12]],
 ['ca','الكالسيوم','Calcium',[6*H,12*H,1*H],'مع الوجبة (Carbonate)، ولا تزيد الجرعة الواحدة على 500 ملغ','With a meal (carbonate); no more than 500 mg at a time',[18]],
 ['ca2','الكالسيوم (الجرعة الثانية)','Calcium (second dose)',[12*H,6*H,1*H],'مع وجبة أخرى','With another meal',[18]],
 ['mg','المغنيسيوم','Magnesium',[12*H,15*H,6*H],'مع الطعام أو قبل النوم','With food or at bedtime',[20]],
 ['zn','الزنك','Zinc',[6*H,12*H,1*H],'مع الوجبة إن سبّب غثياناً','With a meal if it causes nausea',[25]],
 ['d','فيتامين D','Vitamin D',[6*H,12*H,1*H],'مع أكبر وجبة فيها دهون','With the largest meal containing fat',[4]],
 ['abx','مضاد حيوي (Ciprofloxacin أو Doxycycline) مرتين يومياً','Antibiotic (ciprofloxacin or doxycycline) twice a day',[1*H,2*H,3*H,0],'كل 12 ساعة؛ إذا وُصف 3 مرات يومياً فاسأل الصيدلاني','Every 12 hours; if prescribed three times a day, ask the pharmacist',[45]],
 ['dtg','Dolutegravir','Dolutegravir',[0,1*H,2*H,15*H],'مرة يومياً في وقت ثابت؛ ويمكن أخذه مع الحديد أو الكالسيوم إذا كان مع وجبة','Once a day at a fixed time; it can be taken with iron or calcium if taken with a meal',[60]]];
/* built-in gaps, used when no interaction in the content sets one: [x, y, b, a, sources] = x at least b hours before y or a hours after it
   (b = a for a simple gap; a = 24 means x must come first). The owner sets the same thing on an interaction («التوقيت في الجدول»):
   its "g" {d: x, b, a} with the interaction's supplement as y — that one replaces the built-in rule for the pair. */
const SCDEF=[['levo','fe',4,4,[27]],['levo','ca',4,4,[27]],['levo','mg',4,4,[27]],['fe','ca',2,2,[18,15]],['zn','fe',2,2,[25]],
 ...['levo','fe','zn','d','abx','dtg'].map(m=>['bis',m,0.5,24,[20]]),['bis','ca',2,24,[20]],['bis','mg',2,24,[20]],
 ...['fe','ca','mg','zn'].map(m=>['abx',m,2,6,[45]]),...['fe','ca','mg'].map(m=>['dtg',m,2,6,[60]])];
const SCIDS=()=>SCI.map(x=>x[0]);
/** the rules in force: interactions with timing (INTER[i][9]) win over the built-in ones; the second calcium dose follows calcium */
function schRules(){
  const by={},key=(x,y)=>x+'|'+y;
  SCDEF.forEach(([x,y,b,a,r])=>{by[key(x,y)]={x,y,b,a,r,def:1}});
  const own={};
  (typeof INTER!=='undefined'?INTER:[]).forEach(t=>{const g=t[9];if(!g||!SCIDS().includes(g.d)||!SCIDS().includes(t[0])||g.d===t[0])return;
    const k=key(g.d,t[0]),o=own[k]||{x:g.d,y:t[0],b:0,a:0,r:[]};o.b=Math.max(o.b,+g.b||0);o.a=Math.max(o.a,+g.a||0);o.r=[...new Set([...o.r,...t[4]])];own[k]=o});
  Object.entries(own).forEach(([k,o])=>{by[k]=o;delete by[key(o.y,o.x)]});
  const out=Object.values(by);
  out.filter(o=>o.y==='ca'||o.x==='ca').forEach(o=>out.push({...o,x:o.x==='ca'?'ca2':o.x,y:o.y==='ca'?'ca2':o.y}));
  return out;
}
const hhmm=(m,W)=>{const t=((W*60+m)%1440+1440)%1440;return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`};
const CALIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4"/></svg>';
function schBuild(){
  const was=Object.fromEntries(SCI.map(x=>[x[0],$('sc-'+x[0])?$('sc-'+x[0]).checked:false]));
  $('schk').innerHTML=SCI.map(x=>`<label class="chk"><input type="checkbox" id="sc-${x[0]}"${was[x[0]]?' checked':''}><span>${esc(L(x[1],x[2]))}</span></label>`).join('');
  sch();
}
function schSolve(ids){
  const items=ids.map(id=>SCI.find(x=>x[0]===id)),rules=schRules();let best=null;
  const doses=(id,t)=>id==='abx'?[t,t+12*H]:[t];       // the antibiotic is taken twice, 12 hours apart
  const fits=(asg,id,t)=>rules.every(({x,y,b,a})=>{
    const other=id===x?y:id===y?x:null;if(other==null||asg[other]==null)return true;
    const tx=id===x?t:asg[x],ty=id===y?t:asg[y];
    return doses(x,tx).every(u=>doses(y,ty).every(m=>u<=m-b*H||u>=m+a*H));
  });
  const go=(i,asg,cost)=>{
    if(best&&cost>=best.cost)return;
    if(i===items.length){best={cost,asg:{...asg}};return}
    const it=items[i];
    it[3].forEach((t,rank)=>{
      if(it[0]==='ca2'&&asg.ca===t)return;                // the two calcium doses go with different meals
      if(fits(asg,it[0],t)){asg[it[0]]=t;go(i+1,asg,cost+rank);delete asg[it[0]]}
    });
  };
  go(0,{},0);return best&&best.asg;
}
function sch(){
  const W=+$('schw').value,ids=SCI.map(x=>x[0]).filter(id=>$('sc-'+id)&&$('sc-'+id).checked);
  if(!ids.length){$('schout').innerHTML=`<p class="hint">${T('sc_none')}</p>`;return}
  const asg=schSolve(ids);
  if(!asg){$('schout').innerHTML=`<div class="ulsum bad">${T('sc_fail')}</div>`;return}
  const meals=[[0,L('الاستيقاظ','Wake up')],[H,L('الفطور','Breakfast')],[6*H,L('الغداء','Lunch')],[12*H,L('العشاء','Dinner')],[15*H,L('النوم','Bed')]];
  const rows=[...meals.map(([t,n])=>({t,meal:n})),...ids.flatMap(id=>{const x=SCI.find(y=>y[0]===id),t=asg[id];
    return (id==='abx'?[t,t+12*H]:[t]).map(tt=>({t:tt,x}))})].sort((a,b)=>a.t-b.t||(a.meal?-1:1));
  const pairs=schRules().filter(o=>ids.includes(o.x)&&ids.includes(o.y)&&!(o.x==='ca2'||o.y==='ca2'));
  $('schout').innerHTML=`<div class="ract"><button class="btn pri" type="button" id="schcal">${CALIC}${T('cal_add')}</button></div><ol class="sched">${rows.map(r=>r.meal?`<li class="meal"><time>${hhmm(r.t,W)}</time><span>${esc(r.meal)}</span></li>`:
    `<li><time>${hhmm(r.t,W)}</time><div><b>${esc(L(r.x[1],r.x[2]))}</b><small>${esc(L(r.x[4],r.x[5]))}${R(r.x[6])}</small></div></li>`).join('')}</ol>`+
    (pairs.length?`<p class="hint">${T('sc_gaps')}</p><ul class="gaps">${pairs.map(o=>{const n=k=>L(...SCI.find(y=>y[0]===k).slice(1,3)).replace(/ \(.*\)$/,'').replace(/ مرتين يومياً| twice a day/,'');
      const h=v=>v<1?L(`${v*60} دقيقة`,`${v*60} min`):v===1?L('ساعة','1 h'):v===2?L('ساعتين','2 h'):L(`${fmt(v)} ساعات`,`${fmt(v)} h`);
      const t=o.a>=24?L(`${n(o.x)} أولاً، و${n(o.y)} بعده بـ ${h(o.b)} على الأقل`,`${n(o.x)} first, ${n(o.y)} at least ${h(o.b)} later`):o.a===o.b?L(`فاصل ${h(o.b)} على الأقل`,`at least ${h(o.b)} apart`):L(`${n(o.x)} قبله بـ ${h(o.b)} أو بعده بـ ${h(o.a)}`,`${n(o.x)} ${h(o.b)} before or ${h(o.a)} after`);
      return `<li><b>${esc(n(o.x))} ↔ ${esc(n(o.y))}</b> ${esc(t)}${R(o.r)}${o.def?'':` <span class="own">${T('sc_own')}</span>`}</li>`}).join('')}</ul>`:'');
}
/* ===================== reminders in the phone's calendar (.ics) =====================
   Builds a standard calendar file with repeating events and an alarm at the dose time; the phone's calendar app
   imports it. Nothing is sent anywhere. ev: {title, desc, time:'HH:MM', freq:'DAILY'|'WEEKLY', interval, count} */
const icsEsc=t=>String(t||'').replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const icsFold=l=>{const out=[];let s=l;while(s.length>70){out.push(s.slice(0,70));s=' '+s.slice(70)}out.push(s);return out.join('\r\n')};
function icsFile(events){
  const d=new Date(),day=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const stamp=d.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//VITAWAW//Reminders//AR','CALSCALE:GREGORIAN'];
  events.forEach((e,i)=>{
    const [h,m]=(e.time||'09:00').split(':').map(Number),rr=['FREQ='+(e.freq||'DAILY'),...(e.interval>1?['INTERVAL='+e.interval]:[]),...(e.count?['COUNT='+e.count]:[])].join(';');
    lines.push('BEGIN:VEVENT','UID:'+day+'-'+i+'-'+Math.random().toString(36).slice(2)+'@vitawaw','DTSTAMP:'+stamp,
      `DTSTART:${day}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`,'DURATION:PT15M','RRULE:'+rr,
      'SUMMARY:'+icsEsc(e.title),'DESCRIPTION:'+icsEsc((e.desc?e.desc+'\n':'')+T('cal_foot')),
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(e.title),'TRIGGER:PT0M','END:VALARM','END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n')+'\r\n';
}
function icsDownload(events,name='vitawaw-reminders'){
  if(!events.length)return;
  const url=URL.createObjectURL(new Blob([icsFile(events)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=name+'.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  if(typeof toast==='function')toast(T('cal_done'));
}
/** the daily schedule on screen → one daily event per item (the antibiotic twice) */
function schCalendar(){
  const W=+$('schw').value,ids=SCI.map(x=>x[0]).filter(id=>$('sc-'+id)&&$('sc-'+id).checked),asg=ids.length&&schSolve(ids);if(!asg)return;
  icsDownload(ids.flatMap(id=>{const x=SCI.find(y=>y[0]===id),t=asg[id];
    return (id==='abx'?[t,t+12*H]:[t]).map(tt=>({title:'VITAWAW · '+L(x[1],x[2]),desc:L(x[4],x[5]),time:hhmm(tt,W),freq:id==='bis'?'WEEKLY':'DAILY'}))}),'vitawaw-schedule');
}
/* ===================== my lab results (on this device only) =====================
   [id, ar, en, unit, reference lines [value, ar, en]] — the lines are the limits the calculators use */
const LABT=[['d','فيتامين D','Vitamin D','ng/mL',[[20,'نقص','deficient'],[30,'كافٍ','sufficient']]],
 ['b12','B12','B12','pg/mL',[[180,'نقص','deficient'],[350,'طبيعي','normal']]],
 ['hb','الهيموغلوبين','Hemoglobin','g/dL',[]],
 ['fer','Ferritin','Ferritin','ng/mL',[[45,'حد البالغين','adult limit']]],
 ['mg','المغنيسيوم','Magnesium','mg/dL',[[1.8,'منخفض تحته','low below']]]];
let LABS=[];try{LABS=JSON.parse(localStorage.getItem('vw-labs')||'[]').filter(x=>x&&LABT.some(t=>t[0]===x.k)&&isFinite(x.v)&&/^\d{4}-\d{2}-\d{2}$/.test(x.d)).slice(-300)}catch(e){}
const saveLabs=()=>{try{localStorage.setItem('vw-labs',JSON.stringify(LABS))}catch(e){}};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function labAdd(k,v,d){if(!LABT.some(t=>t[0]===k)||!(v>0))return false;LABS.push({k,v:Math.round(v*100)/100,d:d||today()});LABS.sort((a,b)=>a.d.localeCompare(b.d));saveLabs();labs();return true}
function labsBuild(){
  const v=$('lbk').value||'d';$('lbk').innerHTML=LABT.map(t=>`<option value="${t[0]}">${esc(L(t[1],t[2]))} (${t[3]})</option>`).join('');$('lbk').value=v;
  if(!$('lbd').value)$('lbd').value=today();labs();
}
/** a small line chart: dates on the bottom, values on the side, the reference lines dashed */
function labChart(t,pts){
  const W=320,Hh=150,pl=34,pr=10,pt=12,pb=26,vals=pts.map(p=>p.v),refs=t[4].map(r=>r[0]);
  let lo=Math.min(...vals,...refs),hi=Math.max(...vals,...refs);if(hi===lo){hi+=1;lo=Math.max(0,lo-1)}const pad=(hi-lo)*.12;lo=Math.max(0,lo-pad);hi+=pad;
  const ts=pts.map(p=>Date.parse(p.d)),t0=Math.min(...ts),t1=Math.max(...ts),X=x=>pts.length<2||t1===t0?(pl+W-pr)/2:pl+(x-t0)/(t1-t0)*(W-pl-pr),Y=v=>pt+(hi-v)/(hi-lo)*(Hh-pt-pb);
  const ref=t[4].map(([v,a,e])=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" class="lbref"/><text x="${W-pr}" y="${Y(v)-3}" text-anchor="end" class="lbrt">${fmt(v)} · ${esc(L(a,e))}</text>`).join('');
  const line=pts.length>1?`<polyline points="${pts.map(p=>X(Date.parse(p.d))+','+Y(p.v)).join(' ')}" class="lbln"/>`:'';
  const dots=pts.map(p=>`<circle cx="${X(Date.parse(p.d))}" cy="${Y(p.v)}" r="4" class="lbpt"/><text x="${X(Date.parse(p.d))}" y="${Y(p.v)-8}" text-anchor="middle" class="lbvt">${fmt(p.v)}</text>`).join('');
  const dl=[pts[0],pts.length>1?pts[pts.length-1]:null].filter(Boolean).map((p,i)=>`<text x="${X(Date.parse(p.d))}" y="${Hh-6}" text-anchor="${pts.length>1?(i?'end':'start'):'middle'}" class="lbdt">${p.d}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" class="lbsvg" role="img" aria-label="${esc(L(t[1],t[2]))}" direction="ltr"><line x1="${pl}" x2="${pl}" y1="${pt}" y2="${Hh-pb}" class="lbax"/><line x1="${pl}" x2="${W-pr}" y1="${Hh-pb}" y2="${Hh-pb}" class="lbax"/><text x="${pl-4}" y="${pt+8}" text-anchor="end" class="lbdt">${fmt(Math.round(hi*10)/10)}</text><text x="${pl-4}" y="${Hh-pb}" text-anchor="end" class="lbdt">${fmt(Math.round(lo*10)/10)}</text>${ref}${line}${dots}${dl}</svg>`;
}
function labs(){
  const out=$('lbout');if(!out)return;const t0=LABT.find(t=>t[0]===$('lbk').value);if(t0)$('lbv-l').textContent=T('lb_val')+' ('+t0[3]+')';
  if(!LABS.length){out.innerHTML=`<p class="hint">${T('lb_none')}</p>`;return}
  out.innerHTML=LABT.filter(t=>LABS.some(x=>x.k===t[0])).map(t=>{const pts=LABS.filter(x=>x.k===t[0]),last=pts[pts.length-1],prev=pts[pts.length-2];
    const ch=prev?Math.round((last.v-prev.v)*10)/10:null;
    return `<div class="lbcard"><div class="lbh"><b>${esc(L(t[1],t[2]))}</b><span dir="ltr">${fmt(last.v)} ${t[3]}${ch!=null?` <small class="${ch>=0?'up':'down'}">${ch>=0?'▲':'▼'} ${fmt(Math.abs(ch))}</small>`:''}</span></div>${labChart(t,pts)}
      <details><summary>${T('lb_all')} (${pts.length})</summary><ul class="lbl">${pts.map(x=>`<li><bdi>${x.d}</bdi><b dir="ltr">${fmt(x.v)} ${t[3]}</b><button type="button" data-lbdel="${LABS.indexOf(x)}" aria-label="${esc(T('o_del'))}">×</button></li>`).join('')}</ul></details></div>`}).join('')+
    `<div class="ract"><button class="btn danger" type="button" id="lbclear">${T('lb_clear')}</button></div>`;
}
