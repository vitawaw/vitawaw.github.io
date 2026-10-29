/* VITAWAW · js/calculators.js
   Dose logic for the built-in calculators: fD (vitamin D), fB12, fFol, fFe, fCa, fMg, fC, fZn,
   and the groups fPreg (pregnancy/breastfeeding), fInf (infant 0–24 months), fVA (WHO vitamin A for children).
   Each function reads the form, applies the cited guideline and calls render(). Medical changes go here.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
/* ===================== Vitamin D ===================== */
function fD(){
  const x=req(['age','dlab'],['wt','ht']);
  const u=$('dunit').value,rv=$('dlab').value.trim();
  $('dconv').textContent='';
  if(!x)return;
  const age=x.age,w=x.wt,h=x.ht,v=x.dlab,ng=u==='nmol'?v/2.5:v;
  $('dconv').textContent=u==='nmol'?L(`يعادل ${fmt(ng)} ng/mL`,`Equals ${fmt(ng)} ng/mL`):L(`يعادل ${fmt(ng*2.5)} nmol/L`,`Equals ${fmt(ng*2.5)} nmol/L`);
  const bmi=(w&&h)?w/((h/100)**2):null,adult=age>=19 /* Endocrine Society 2011: children 1–18, adults from 19 */,mal=$('mal').checked,med=$('med').checked;
  const obese=adult&&bmi!=null&&bmi>=30,risk=obese||mal||med;
  const rda=age<1?'400 IU':age<=70?'600 IU':'800 IU';
  const ul=age<1?'1,000 – 1,500 IU':age<=3?'2,500 IU':age<=8?'3,000 IU':'4,000 IU';
  const day=L(' / يوم',' / day');
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+day],[L('الحد الأعلى اليومي (UL)','Upper limit (UL)'),ul+day]];
  if(bmi)kv.push([L('مؤشر كتلة الجسم','BMI'),fmt(bmi)+(obese?L(' (سمنة)',' (obesity)'):'')]);
  const notes=[];let r,rec=null;
  if($('ren').checked)notes.push({t:L('في القصور الكلوي المتقدم يحدد طبيب الكلى العلاج، وقد يلزم الشكل النشط من فيتامين D مع مراقبة الكالسيوم والفوسفور.','In advanced kidney disease the nephrologist decides treatment; an active form of vitamin D may be needed, with calcium and phosphate monitoring.'),r:[1],u:1});
  if($('sex').value==='p')notes.push({t:L('في الحمل يوصى بمكمل فيتامين D وقائياً، ويحدد طبيب النساء جرعة العلاج.','In pregnancy, preventive vitamin D is recommended; the obstetrician sets any treatment dose.'),r:[3]});
  const DEF=L('نقص (أقل من 20 ng/mL)','Deficient (below 20 ng/mL)');
  const retest={h:L('إعادة التحليل','Retest'),d:L('للتأكد من تجاوز 30 ng/mL قبل الانتقال للصيانة','To confirm the level is above 30 ng/mL before maintenance')};
  if(ng<20){
    if(age<1){rec=2000;r={badge:DEF,tone:'bad',title:L('2,000 IU يومياً لمدة 6 أسابيع','2,000 IU daily for 6 weeks'),sub:L('ثم صيانة 400 إلى 1,000 IU يومياً بعد تجاوز 30 ng/mL','Then 400–1,000 IU daily once above 30 ng/mL'),refs:[2],
      pt:L('قطرات فيتامين D بجرعة 2,000 وحدة يومياً لمدة 6 أسابيع، بإشراف طبيب الأطفال.','Vitamin D drops, 2,000 units a day for 6 weeks, under the pediatrician’s care.'),
      plan:[{h:L('العلاج: 6 أسابيع','Treatment: 6 weeks'),d:'2,000 IU / '+L('يوم','day')},retest,{h:L('الصيانة','Maintenance'),d:'400 – 1,000 IU / '+L('يوم','day')}],
      opts:[{h:L('الخيار اليومي','Daily option'),b:L('2,000 IU يومياً (قطرات)','2,000 IU daily (drops)'),r:[2]},{h:L('الخيار الأسبوعي','Weekly option'),b:L('50,000 IU مرة أسبوعياً لمدة 6 أسابيع','50,000 IU once weekly for 6 weeks'),d:L('بديل في الإرشاد نفسه، بقرار طبيب الأطفال','An alternative in the same guideline, as the pediatrician decides'),r:[2]}]}}
    else if(!adult){rec=2000;r={badge:DEF,tone:'bad',title:L('2,000 IU يومياً لمدة 6 أسابيع على الأقل','2,000 IU daily for at least 6 weeks'),sub:L('أو 50,000 IU أسبوعياً لمدة 6 أسابيع، ثم صيانة 600 إلى 1,000 IU يومياً','Or 50,000 IU weekly for 6 weeks, then 600–1,000 IU daily'),refs:[2],
      pt:L('فيتامين D بجرعة 2,000 وحدة يومياً لمدة 6 أسابيع على الأقل، ثم جرعة يومية أقل يحددها الطبيب.','Vitamin D 2,000 units a day for at least 6 weeks, then a lower daily dose set by the doctor.'),
      plan:[{h:L('العلاج: 6 أسابيع على الأقل','Treatment: at least 6 weeks'),d:L('2,000 IU يومياً أو 50,000 IU أسبوعياً','2,000 IU daily or 50,000 IU weekly')},retest,{h:L('الصيانة','Maintenance'),d:'600 – 1,000 IU / '+L('يوم','day')}],
      opts:[{h:L('الخيار اليومي','Daily option'),b:L('2,000 IU يومياً','2,000 IU daily'),r:[2]},{h:L('الخيار الأسبوعي','Weekly option'),b:L('50,000 IU مرة أسبوعياً','50,000 IU once weekly'),r:[2]}]}}
    else if(risk){rec=6000;const why=[obese?L('سمنة','obesity'):null,mal?L('سوء امتصاص','malabsorption'):null,med?L('أدوية مؤثرة','interacting medicines'):null].filter(Boolean).join(L('، ',', '));
      r={badge:L('نقص مع عامل خطورة','Deficient, with a risk factor'),tone:'bad',title:L('6,000 – 10,000 IU يومياً','6,000–10,000 IU daily'),sub:L('السبب: ','Reason: ')+why,refs:[2],
      pt:L('تحتاج جرعة أعلى من المعتاد: 6,000 إلى 10,000 وحدة فيتامين D يومياً حسب ما يحدده الطبيب، ثم جرعة صيانة.','You need a higher dose than usual: 6,000–10,000 units of vitamin D a day as your doctor decides, then a maintenance dose.'),
      plan:[{h:L('العلاج','Treatment'),d:'6,000 – 10,000 IU / '+L('يوم','day')},retest,{h:L('الصيانة','Maintenance'),d:'3,000 – 6,000 IU / '+L('يوم','day')}]}}
    else{rec=6000;const daily={h:L('الخيار اليومي','Daily option'),b:L('6,000 IU يومياً لمدة 8 أسابيع','6,000 IU daily for 8 weeks'),d:L('يعادل 15 قطرة من عيار 400 IU','Equals 15 drops of a 400 IU/drop product'),r:[2]},weekly={h:L('الخيار الأسبوعي','Weekly option'),b:L('50,000 IU مرة أسبوعياً لمدة 8 أسابيع','50,000 IU once weekly for 8 weeks'),d:L('في يوم ثابت مع وجبة','Same day each week, with a meal'),r:[2,1]};
      r={badge:DEF,tone:'bad',title:L('50,000 IU أسبوعياً أو 6,000 IU يومياً لمدة 8 أسابيع','50,000 IU weekly or 6,000 IU daily for 8 weeks'),sub:L('ثم صيانة 1,500 – 2,000 IU يومياً بعد الوصول فوق 30 ng/mL','Then 1,500–2,000 IU daily once above 30 ng/mL'),refs:[2],opts:age>=50?[daily,weekly]:[weekly,daily],
      pt:age>=50?L('حبة فيتامين D بجرعة 6,000 وحدة يومياً لمدة 8 أسابيع مع وجبة، ثم جرعة يومية أقل.','Vitamin D 6,000 units a day with a meal for 8 weeks, then a lower daily dose.'):L('كبسولة فيتامين D بجرعة 50,000 وحدة مرة واحدة أسبوعياً لمدة 8 أسابيع، في نفس اليوم كل أسبوع مع وجبة. بعدها جرعة يومية أقل.','One 50,000-unit vitamin D capsule once a week for 8 weeks, on the same day each week with a meal. Then a lower daily dose.'),
      plan:[{h:L('العلاج: 8 أسابيع','Treatment: 8 weeks'),d:L('50,000 IU أسبوعياً أو 6,000 IU يومياً','50,000 IU weekly or 6,000 IU daily')},retest,{h:L('الصيانة','Maintenance'),d:'1,500 – 2,000 IU / '+L('يوم','day')}]};
      if(age>=50)notes.push({t:L('لمن عمرهم 50 سنة فأكثر تُفضَّل الجرعة اليومية على الجرعات الكبيرة المتباعدة.','For adults 50 and older, daily dosing is preferred over large intermittent doses.'),r:[3],i:1});}
    notes.push({t:L('التصنيف والجرعات العلاجية هنا من إرشاد Endocrine Society 2011. إرشاد 2024 لم يحدد مستوى مستهدفاً، وتعتبر NIH أن 20 ng/mL فأكثر كافٍ لصحة العظام لدى معظم الأصحاء.','The categories and treatment doses here follow the Endocrine Society 2011 guideline. The 2024 guideline sets no target level, and NIH considers 20 ng/mL or more adequate for bone health in most healthy people.'),r:[2,3,4],i:1});
    if(ng<10)notes.push({t:L('المستوى منخفض جداً: يُنصح بفحص الكالسيوم والفوسفور وPTH وتقييم لين العظام.','Very low level: check calcium, phosphate and PTH, and assess for osteomalacia.'),r:[1],u:1});
  }else if(ng<30){
    notes.push({t:L('مستوى 20 – 29 ng/mL تعتبره Endocrine Society 2011 «غير كافٍ»، بينما تعتبره NIH كافياً لصحة العظام لدى معظم الأصحاء. القرار للطبيب حسب الحالة وعوامل الخطورة.','Endocrine Society 2011 calls 20–29 ng/mL "insufficient", while NIH considers it adequate for bone health in most healthy people. The doctor decides based on the person and risk factors.'),r:[2,4],i:1});
    const INS=L('عدم كفاية (20 – 29 ng/mL)','Insufficient (20–29 ng/mL)');
    if(age<1){rec=400;r={badge:INS,tone:'warn',title:L('400 – 1,000 IU يومياً','400–1,000 IU daily'),sub:L('بإشراف طبيب الأطفال','Under pediatric supervision'),refs:[2],pt:L('قطرات فيتامين D من 400 إلى 1,000 وحدة يومياً حسب طبيب الأطفال.','Vitamin D drops, 400–1,000 units a day as the pediatrician advises.')}}
    else if(!adult){rec=1000;r={badge:INS,tone:'warn',title:L('1,000 IU يومياً على الأقل','At least 1,000 IU daily'),sub:L('لرفع المستوى فوق 30 ng/mL بشكل ثابت','To keep the level consistently above 30 ng/mL'),refs:[2],pt:L('فيتامين D بجرعة 1,000 وحدة يومياً على الأقل.','Vitamin D, at least 1,000 units a day.')}}
    else{rec=risk?3000:1500;r={badge:INS,tone:'warn',title:risk?L('3,000 – 6,000 IU يومياً','3,000–6,000 IU daily'):L('1,500 – 2,000 IU يومياً','1,500–2,000 IU daily'),sub:risk?L('عوامل الخطورة ترفع الاحتياج مرتين إلى ثلاث مرات','Risk factors raise the need two to three times'):L('لرفع المستوى فوق 30 ng/mL بشكل ثابت','To keep the level consistently above 30 ng/mL'),refs:[2],
      pt:risk?L('فيتامين D من 3,000 إلى 6,000 وحدة يومياً حسب الطبيب.','Vitamin D 3,000–6,000 units a day as your doctor advises.'):L('فيتامين D من 1,500 إلى 2,000 وحدة يومياً مع وجبة.','Vitamin D 1,500–2,000 units a day with a meal.')}}
  }else if(ng<=100){
    const rk=risk&&adult;rec=rk?3000:(age<1?400:age<=70?600:800);
    r={badge:L('مستوى كافٍ','Sufficient'),tone:'ok',title:rk?L('صيانة 3,000 – 6,000 IU يومياً','Maintenance 3,000–6,000 IU daily'):L('لا حاجة لجرعة علاجية','No treatment dose needed'),sub:rk?L('لاستمرار عامل الخطورة','Because the risk factor persists'):L('الاحتياج اليومي ','Daily need ')+rda+L(' من الغذاء والمكملات',' from food and supplements'),refs:rk?[2]:[4],
      pt:rk?L('مستواك جيد. استمر على جرعة صيانة يحددها الطبيب.','Your level is good. Keep a maintenance dose your doctor sets.'):L('مستواك جيد ولا تحتاج جرعة علاجية.','Your level is good; no treatment dose is needed.')};
    if(ng>50)notes.unshift({t:L('مستوى أعلى من 50 ng/mL (125 nmol/L): تربطه NIH بآثار سلبية محتملة، خاصة فوق 60 ng/mL، فلا فائدة من رفعه أكثر.','Above 50 ng/mL (125 nmol/L): NIH links this to potential adverse effects, particularly above 60 ng/mL, so there is no benefit in raising it further.'),r:[4],u:1});
    notes.push({t:L('لا يوصى بفحص فيتامين D روتينياً للأصحاء. توصي Endocrine Society 2024 بالمكمل وقائياً للأطفال والمراهقين (1 – 18 سنة) والحوامل ومن تجاوزوا 75 سنة والبالغين المعرّضين بشدة للسكري (مرحلة ما قبل السكري).','Routine vitamin D testing is not advised in healthy people. Endocrine Society 2024 advises preventive supplements for ages 1–18, pregnancy, adults over 75 and adults with high-risk prediabetes.'),r:[3,4],i:1});
  }else{
    r={badge:L('أعلى من 100 ng/mL','Above 100 ng/mL'),tone:'bad',title:L('أوقف مكملات فيتامين D','Stop vitamin D supplements'),sub:L('وافحص الكالسيوم المصحح والفوسفور. المستويات فوق 100 ng/mL تتجاوز الحد الآمن في إرشادات Endocrine Society','Check corrected calcium and phosphate. Levels above 100 ng/mL exceed the safe limit in Endocrine Society guidance'),refs:[2],
      pt:L('مستواك مرتفع. أوقف حبوب فيتامين D وراجع الطبيب لفحص الكالسيوم.','Your level is high. Stop vitamin D tablets and see your doctor to check calcium.')};
    notes.push({t:L('أوقف المكملات وافحص الكالسيوم قبل أي جرعة جديدة.','Stop supplements and check calcium before any new dose.'),r:[2],u:1});
    notes.push({t:L('حسب NIH يرتبط التسمم عادة بمستويات أعلى من 150 ng/mL (375 nmol/L)، ومع ذلك لا مبرر لاستمرار الجرعات العالية.','Per NIH, toxicity is typically associated with levels above 150 ng/mL (375 nmol/L); even so, continuing high doses is not justified.'),r:[4]});
    if(ng>150)notes.unshift({t:L('المستوى ضمن نطاق التسمم المحتمل: يحتاج تقييماً طبياً عاجلاً للكالسيوم ووظائف الكلى.','This level is in the possible toxicity range: urgent medical assessment of calcium and kidney function is needed.'),r:[4],u:1});
  }
  r.kv=kv;r.notes=notes;if(rec)r.tool='drops';if(rec&&age>=1)r.ul=[['d',rec]];if(ng>100)r.ca=1;render(r);
  if(rec){$('iu').value=rec;conv()}
}

/* ===================== B12 ===================== */
function fB12(){
  const x=req(['age'],['b12v','ab12']);if(!x)return;
  if(x.b12v==null&&x.ab12==null){emptyState(['b12v'],[]);return}
  const age=x.age,v=x.b12v,ab=x.ab12,pg=v==null?null:$('b12u').value==='pmol'?v/0.738:v,sx=$('sex').value,cause=$('b12c').value,neuro=$('neuro').checked;
  // NICE NG239: total B12 <180 ng/L or active B12 (holotranscobalamin) <25 pmol/L = deficiency; 180–350 / 25–70 = indeterminate;
  // active B12 is also the second test after an indeterminate total B12, so it decides unless total B12 is already low
  const sT=pg==null?null:pg<180?'conf':pg<=350?'ind':'norm',sA=ab==null?null:ab<25?'conf':ab<=70?'ind':'norm',st=sT==='conf'?'conf':sA||sT;
  const rda=sx==='p'?2.6:sx==='l'?2.8:age<1?'0.4 – 0.5':age<=3?0.9:age<=8?1.2:age<=13?1.8:2.4;
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+L(' mcg / يوم',' mcg / day')],[L('الحد الأعلى','Upper limit'),L('غير محدد','Not established')],...(pg!=null?[[L('القيمة بوحدة pg/mL','Value in pg/mL'),fmt(pg)]]:[]),...(ab!=null?[['Active B12',fmt(ab)+' pmol/L']]:[])];
  const notes=[{t:L('لا يُعطى حمض الفوليك وحده بجرعات علاجية قبل استبعاد نقص B12، لأنه قد يخفي فقر الدم بينما يتفاقم الضرر العصبي.','Do not give treatment-dose folic acid alone before excluding B12 deficiency: it can mask anemia while nerve damage progresses.'),r:[28]}];
  if(age<16)notes.unshift({t:L('حدود NICE المستخدمة هنا لمن عمرهم 16 سنة فأكثر. علاج الأطفال يحدده طبيب الأطفال.','The NICE thresholds used here apply from age 16. A pediatrician decides treatment for children.'),r:[5],u:1});
  const CONF=sT==='conf'?L('نقص مؤكد (أقل من 180 ng/L)','Confirmed deficiency (below 180 ng/L)'):L('نقص مؤكد (Active B12 أقل من 25 pmol/L)','Confirmed deficiency (active B12 below 25 pmol/L)');let r;
  if(st==='conf'){
    if(neuro){r={badge:L('نقص مؤكد مع أعراض عصبية','Confirmed deficiency with neurological symptoms'),tone:'bad',title:L('حقن عضلية عاجلة وتحويل للطبيب','Urgent IM injections and medical referral'),sub:L('Hydroxocobalamin 1 ملغ عضلياً يوماً بعد يوم حتى يتوقف التحسن، ثم 1 ملغ كل شهرين','Hydroxocobalamin 1 mg IM on alternate days until no further improvement, then 1 mg every 2 months'),refs:[29],
      pt:L('راجع الطبيب اليوم. تحتاج حقن B12 عاجلة لأن الأعراض العصبية قد تصبح دائمة إذا تأخر العلاج.','See a doctor today. You need urgent B12 injections, because nerve symptoms can become permanent if treatment is delayed.'),
      plan:[{h:L('البداية','Start'),d:L('حقنة 1 ملغ يوماً بعد يوم حتى يتوقف التحسن','1 mg every other day until no further improvement')},{h:L('الاستمرار','Continue'),d:L('حقنة 1 ملغ كل شهرين','1 mg every 2 months')}],
      opts:[{h:L('البديل (Cyanocobalamin)','Alternative (cyanocobalamin)'),b:L('1,000 mcg عضلياً يومياً لأسبوع، ثم أسبوعياً لشهر، ثم شهرياً','1,000 mcg IM daily for 1 week, weekly for 1 month, then monthly'),r:[7]}]};
      notes.unshift({t:L('أعراض عصبية مع نقص B12: لا يؤخَّر العلاج.','Neurological symptoms with low B12: do not delay treatment.'),r:[29,5],u:1})}
    else if(cause==='malab')r={badge:CONF,tone:'bad',title:L('Hydroxocobalamin 1 ملغ عضلياً 3 مرات أسبوعياً لمدة أسبوعين','Hydroxocobalamin 1 mg IM three times a week for 2 weeks'),sub:L('ثم 1 ملغ كل 2 إلى 3 أشهر مدى الحياة غالباً','Then 1 mg every 2–3 months, usually lifelong'),refs:[29],
      pt:L('تحتاج حقن B12 لأن جسمك لا يمتصه جيداً من الطعام: 3 حقن في الأسبوع لمدة أسبوعين، ثم حقنة كل 2 إلى 3 أشهر.','You need B12 injections because your body does not absorb it well: 3 injections a week for 2 weeks, then one every 2–3 months.'),
      plan:[{h:L('التحميل: أسبوعان','Loading: 2 weeks'),d:L('1 ملغ 3 مرات أسبوعياً','1 mg three times a week')},{h:L('الاستمرار','Continue'),d:L('1 ملغ كل 2 – 3 أشهر، غالباً مدى الحياة','1 mg every 2–3 months, usually lifelong')}],
      opts:[{h:L('بديل فموي بقرار الطبيب','Oral alternative, if the doctor chooses'),b:L('1,000 – 2,000 mcg يومياً','1,000–2,000 mcg daily'),d:L('نجح العلاج الفموي عالي الجرعة لدى معظم مرضى فقر الدم الخبيث في دراسة متابعة','High-dose oral therapy corrected deficiency in most pernicious anemia patients in a cohort study'),r:[6,7]}]};
    else if(cause==='diet')r={badge:CONF,tone:'bad',title:L('Cyanocobalamin فموياً 50 – 150 mcg يومياً','Oral cyanocobalamin 50–150 mcg daily'),sub:L('للنقص الغذائي، مع استمرار المكمل ما دام النظام الغذائي نباتياً','For dietary deficiency; continue while the diet stays vegan'),refs:[29],
      pt:L('حبة B12 يومياً (50 إلى 150 ميكروغرام)، واستمر عليها ما دمت نباتياً.','Take a B12 tablet daily (50–150 micrograms), and keep taking it while you follow a vegan diet.'),
      opts:[{h:L('بديل بجرعة أعلى','Higher-dose alternative'),b:L('1,000 mcg فموياً يومياً','1,000 mcg orally daily'),r:[7]}]};
    else r={badge:CONF,tone:'bad',title:L('1,000 mcg فموياً يومياً أو حقن عضلية','1,000 mcg orally daily, or IM injections'),sub:L('مع البحث عن السبب، ومنه فحص فقر الدم الخبيث','And look for the cause, including pernicious anemia'),refs:[5,7],
      pt:L('لديك نقص في B12. يحدد الطبيب بين حبة يومية بجرعة 1,000 ميكروغرام أو الحقن، بعد معرفة السبب.','You have low B12. Your doctor will choose between a 1,000-microgram daily tablet or injections after finding the cause.'),
      opts:[{h:L('الفموي','Oral'),b:L('1,000 mcg يومياً','1,000 mcg daily'),r:[7]},{h:L('العضلي','Intramuscular'),b:L('Hydroxocobalamin 1 ملغ 3 مرات أسبوعياً لأسبوعين، ثم كل 2 – 3 أشهر','Hydroxocobalamin 1 mg three times a week for 2 weeks, then every 2–3 months'),r:[29]}]};
  }else if(st==='ind'){
    r={badge:sA==='ind'?L('نتيجة غير حاسمة (Active B12 بين 25 و70 pmol/L)','Indeterminate (active B12 25–70 pmol/L)'):L('نتيجة غير حاسمة (180 – 350 ng/L)','Indeterminate (180–350 ng/L)'),tone:'warn',title:sA==='ind'?L('افحص MMA للتأكيد','Confirm with MMA'):L('افحص Active B12 أو MMA للتأكيد','Confirm with active B12 or MMA'),sub:neuro?L('مع وجود أعراض لا يؤخَّر العلاج انتظاراً للنتيجة','With symptoms, do not delay treatment while waiting'):L('إذا وجدت أعراض أو عوامل خطورة فناقش العلاج مع الطبيب','If symptoms or risk factors are present, discuss treatment with the doctor'),refs:[5],
      pt:L('النتيجة على الحد. يحتاج الطبيب تحليلاً إضافياً للتأكد قبل تحديد العلاج.','The result is borderline. Your doctor needs one more test to confirm before deciding treatment.'),
      opts:neuro?[{h:L('عند وجود أعراض عصبية','With neurological symptoms'),b:L('Hydroxocobalamin 1 ملغ عضلياً يوماً بعد يوم حتى يتوقف التحسن','Hydroxocobalamin 1 mg IM on alternate days until no further improvement'),r:[29]}]:[{h:L('إن قرر الطبيب العلاج','If the doctor decides to treat'),b:L('1,000 mcg فموياً يومياً','1,000 mcg orally daily'),r:[7]}]};
    if(neuro)notes.unshift({t:L('توجد أعراض عصبية: راجع الطبيب دون تأخير.','Neurological symptoms present: see a doctor without delay.'),r:[5],u:1});
  }else r={badge:sT==='ind'?L('نقص غير مرجّح (Active B12 أعلى من 70 pmol/L)','Deficiency unlikely (active B12 above 70 pmol/L)'):L('ضمن الطبيعي','Normal'),tone:'ok',title:L(`الاحتياج اليومي ${rda} mcg`,`Daily need ${rda} mcg`),sub:L('من الغذاء أو متعدد الفيتامينات','From food or a multivitamin'),refs:sA?[5,8]:[8],pt:L('مستوى B12 طبيعي، ولا تحتاج علاجاً.','Your B12 level is normal; no treatment is needed.')};
  if(st==='ind'&&sA==='ind')notes.push({t:L('حسب NICE: عند Active B12 بين 25 و70 pmol/L مع أعراض، يُفحص MMA وتُفسَّر نتيجته حسب حدود المختبر.','Per NICE: with active B12 of 25–70 pmol/L and symptoms, test MMA and read it against the laboratory limits.'),r:[5]});
  if(sT==='ind'&&sA==null)notes.push({t:L('أدخل نتيجة Active B12 إن توفرت: أقل من 25 pmol/L يؤكد النقص، وأعلى من 70 يجعله غير مرجّح.','Enter an active B12 result if available: below 25 pmol/L confirms deficiency, above 70 makes it unlikely.'),r:[5],i:1});
  notes.push({t:L('Metformin ومثبطات مضخة البروتون تخفض B12 مع الاستعمال الطويل.','Metformin and proton pump inhibitors lower B12 with long-term use.'),r:[8],i:1});
  r.kv=kv;r.notes=notes;render(r);
}

/* ===================== Folate ===================== */
function fFol(){
  const x=req(['age']);if(!x)return;
  const age=x.age,sx=$('sex').value,g=$('folg').value;
  const rda=sx==='p'?600:sx==='l'?500:age<1?'65 – 80':age<=3?150:age<=8?200:age<=13?300:400;
  const ul=age<1?null:age<=3?300:age<=8?400:age<=13?600:age<=18?800:1000;
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+' mcg DFE'],[L('الحد الأعلى لحمض الفوليك المصنّع','Upper limit for synthetic folic acid'),ul?fmt(ul)+L(' mcg / يوم',' mcg / day'):L('غير محدد','Not established')]];
  const notes=[];let r;
  if(g==='rda')r={badge:L('الاحتياج اليومي','Daily requirement'),tone:'info',title:L(`${rda} mcg DFE يومياً`,`${rda} mcg DFE daily`),sub:L('من الغذاء والأغذية المدعّمة','From food and fortified foods'),refs:[11],pt:L(`تحتاج ${rda} ميكروغرام يومياً، ويكفي غالباً الطعام المتوازن.`,`You need ${rda} micrograms a day, which a balanced diet usually provides.`)};
  else if(g==='plan')r={badge:L('التخطيط للحمل','Planning pregnancy'),tone:'info',title:L('400 mcg حمض فوليك يومياً','400 mcg folic acid daily'),sub:L('قبل الحمل وحتى نهاية الأسبوع 12 للوقاية من عيوب الأنبوب العصبي','From before conception to the end of week 12, to prevent neural tube defects'),refs:[10,11],
    pt:L('حبة حمض فوليك 400 ميكروغرام يومياً، ابدئي قبل الحمل واستمري حتى نهاية الأسبوع 12.','One 400-microgram folic acid tablet a day; start before pregnancy and continue to the end of week 12.'),
    plan:[{h:L('قبل الحمل','Before pregnancy'),d:'400 mcg / '+L('يوم','day')},{h:L('حتى الأسبوع 12','Until week 12'),d:L('استمري على الجرعة نفسها','Continue the same dose')}]};
  else if(g==='ntd'){r={badge:L('خطورة عالية','High risk'),tone:'warn',title:L('4 – 5 ملغ حمض فوليك يومياً','4–5 mg folic acid daily'),sub:L('لمن لديها حمل سابق بعيب في الأنبوب العصبي أو عوامل خطورة أخرى، بوصفة طبية','For a previous pregnancy affected by a neural tube defect or other risk factors, on prescription'),refs:[10],
    pt:L('تحتاجين جرعة عالية (4 إلى 5 ملغ يومياً) بوصفة من الطبيب.','You need a high dose (4–5 mg a day) prescribed by your doctor.')};
    notes.push({t:L('هذه الجرعة أعلى من الحد الأعلى العام (1,000 mcg) وتؤخذ بإشراف طبي فقط.','This exceeds the general upper limit (1,000 mcg) and is for medical supervision only.'),r:[11],u:1})}
  else{
    if(age<18)r={badge:L('فقر دم بعوز الفولات','Folate-deficiency anemia'),tone:'bad',title:L('جرعة الأطفال يحددها طبيب الأطفال','A pediatrician sets the child dose'),sub:L('تختلف حسب العمر والسبب','It varies with age and cause'),refs:[28],pt:L('يحدد طبيب الأطفال الجرعة.','The pediatrician will set the dose.')};
    else r={badge:L('فقر دم بعوز الفولات','Folate-deficiency anemia'),tone:'bad',title:L('1 – 5 ملغ يومياً','1–5 mg daily'),sub:L('في الممارسة البريطانية 5 ملغ يومياً لمدة 4 أشهر، وقد يلزم حتى 15 ملغ في سوء الامتصاص','UK practice is 5 mg daily for 4 months; up to 15 mg may be needed in malabsorption'),refs:[9,10,28],
      pt:L('حمض الفوليك من 1 إلى 5 ملغ يومياً لمدة نحو 4 أشهر، بعد أن يتأكد الطبيب أن فيتامين B12 طبيعي.','Folic acid 1–5 mg a day for about 4 months, after your doctor confirms your B12 is normal.'),
      plan:[{h:L('قبل البدء','Before starting'),d:L('استبعاد نقص B12','Exclude B12 deficiency')},{h:L('العلاج: 4 أشهر','Treatment: 4 months'),d:L('1 – 5 ملغ يومياً','1–5 mg daily')},{h:L('بعدها','Afterwards'),d:L('معالجة السبب وإعادة التقييم','Treat the cause and reassess')}],
      opts:[{h:L('البداية الشائعة','Common starting dose'),b:L('1 ملغ يومياً','1 mg daily'),d:L('الحالات المقاومة قد تحتاج أكثر','Resistant cases may need more'),r:[9]},{h:L('البروتوكول البريطاني','UK regimen'),b:L('5 ملغ يومياً لمدة 4 أشهر','5 mg daily for 4 months'),r:[28]}]};
    notes.push({t:L('استبعد نقص B12 قبل البدء بالجرعات العلاجية.','Exclude B12 deficiency before starting treatment doses.'),r:[28],u:1});
  }
  notes.push({t:L('Methotrexate ومضادات الصرع وSulfasalazine تتداخل مع حمض الفوليك.','Methotrexate, anticonvulsants and sulfasalazine interact with folic acid.'),r:[11,28],i:1});
  if(g==='plan'){r.tool='pills';PILL={k:'fol',dose:0.4,tab:0.4};r.ul=[['fol',400]]}
  else if(g==='ntd'||(g==='def'&&age>=18)){r.tool='pills';PILL={k:'fol',dose:5,tab:5}}
  r.kv=kv;r.notes=notes;render(r);
}

/* ===================== Iron ===================== */
function ironRDA(a,sx){
  if(sx==='p')return 27; if(sx==='l')return teen(a)?10:9;
  if(a<1)return '0.27 – 11'; if(a<=3)return 7; if(a<=8)return 10; if(a<=13)return 8;
  if(a<=18)return sx==='m'?11:15; if(a<=50)return sx==='m'?8:18; return 8;
}
/** WHO 2024 haemoglobin cut-offs for anaemia, g/dL (age in years; tri = pregnancy trimester 1–3). null = no WHO cut-off (under 6 months). */
function hbCut(age,sx,tri,months){
  const m=months!=null?months:age*12;
  if(m<6)return null; if(m<24)return 10.5; if(m<60)return 11; if(age<12)return 11.5; if(age<15)return 12;
  if(sx==='p')return tri===2?10.5:11; return sx==='m'?13:12;
}
/** ferritin at or below which iron deficiency is likely, ng/mL (= µg/L): AAP 2026 for children and adolescents,
    WHO 2020 with infection or inflammation, and 30 for adults (Medscape; WHO's 15 is the population cut-off) */
function ferCut(age,infl){return infl?(age<5?30:70):age<12?20:30}
let PILL={k:'fe',dose:60};
function fFe(){
  const hasFer=$('fer').value.trim()!=='';
  const x0=req(['age'],['wt','hb','fer']);if(!x0)return;
  const age=x0.age,sx=$('sex').value,hb=x0.hb,fer=x0.fer,infl=$('infl').checked;
  // with a ferritin result the state comes from the labs (WHO 2024 Hb cut-offs + ferritin), otherwise from the list
  const hc=hbCut(age,sx),fc=ferCut(age,infl),anem=hb!=null&&hc!=null&&hb<hc,lowF=fer!=null&&fer<=fc;
  const g=hasFer?(lowF?(anem?'ida':'id'):(anem?'other':'ok')):$('feg').value;
  $('fegw').hidden=hasFer;
  const young=age<12&&(g==='ida'||g==='id');
  const x=young?req(['age','wt'],['hb','fer']):x0;if(!x)return;
  const w=x0.wt,rda=ironRDA(age,sx),ul=age<14?40:45,EL=L(' ملغ حديد عنصري',' mg elemental iron');
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+EL],[L('الحد الأعلى (UL)','Upper limit (UL)'),ul+L(' ملغ / يوم',' mg / day')]];
  if(hb!=null){kv.push([L('الهيموغلوبين','Hemoglobin'),fmt(hb)+' g/dL']);if(hc!=null)kv.push([L('فقر الدم تحت (WHO)','Anemia below (WHO)'),fmt(hc)+' g/dL'])}
  if(fer!=null)kv.push(['Ferritin',fmt(fer)+' ng/mL'],[L('نقص الحديد عند','Iron deficiency at'),L(`${fmt(fc)} ng/mL أو أقل`,`${fmt(fc)} ng/mL or less`)]);
  const notes=[{t:L('الجرعات كلها بالحديد العنصري، وليس بوزن الملح المكتوب على العبوة.','All doses are elemental iron, not the salt weight on the pack.'),r:[15],i:1}];let r,dose=null;
  if(hb!=null&&hc==null)notes.push({t:L('لا يوجد حد لفقر الدم من منظمة الصحة العالمية تحت عمر 6 أشهر؛ يفسّر طبيب الأطفال النتيجة.','WHO sets no anemia cut-off under 6 months; the pediatrician interprets the result.'),r:[51]});
  if(hasFer)notes.push({t:L('حدود Ferritin: 20 ng/mL أو أقل للأطفال و30 للمراهقين (AAP)، و30 للبالغين، و70 عند وجود التهاب أو عدوى (30 تحت 5 سنوات، WHO) لأن الالتهاب يرفع Ferritin. حدود فقر الدم من WHO 2024.','Ferritin limits: 20 ng/mL or less in children and 30 in adolescents (AAP), 30 in adults, and 70 with inflammation or infection (30 under 5 years, WHO) because inflammation raises ferritin. Anemia cut-offs: WHO 2024.'),r:[14,12,52,51],i:1});
  if(!hasFer&&hb!=null&&hc!=null&&g!=='rda')notes.push(anem?{t:L('الهيموغلوبين أقل من حد WHO لهذا العمر: أكّد نقص الحديد بتحليل Ferritin قبل العلاج.','Hemoglobin is below the WHO cut-off for this age: confirm iron deficiency with ferritin before treatment.'),r:[51,52]}:
    {t:L('الهيموغلوبين ليس أقل من حد WHO لهذا العمر، فلا يوجد فقر دم. أدخل Ferritin لتأكيد نقص المخزون.','Hemoglobin is not below the WHO cut-off for this age, so there is no anemia. Enter ferritin to confirm low stores.'),r:[51],u:g==='ida'?1:0});
  if(hasFer&&hb==null&&lowF)notes.push({t:L('أدخل الهيموغلوبين لمعرفة وجود فقر دم.','Enter hemoglobin to check for anemia.'),r:[51],i:1});
  if(g==='other'){r={badge:L('فقر دم مع Ferritin طبيعي','Anemia with normal ferritin'),tone:'warn',title:L('لا تبدأ الحديد قبل معرفة السبب','Do not start iron before finding the cause'),sub:L('فقر الدم هنا لا يفسّره نقص الحديد: يُبحث عن نقص B12 أو الفولات، والالتهاب المزمن، والثلاسيميا، وأمراض الكلى','This anemia is not explained by iron deficiency: look for B12 or folate deficiency, chronic inflammation, thalassemia and kidney disease'),refs:[51,52],
    pt:L('عندك فقر دم لكن مخزون الحديد طبيعي. يحتاج الطبيب فحوصاً إضافية لمعرفة السبب قبل أي علاج.','You have anemia, but your iron stores are normal. The doctor needs more tests to find the cause before any treatment.')};
    r.kv=kv;r.notes=notes;render(r);return}
  if(g==='ok'){r={badge:L('مخزون الحديد طبيعي','Normal iron stores'),tone:'ok',title:L(`لا حاجة لعلاج؛ الاحتياج ${rda} ملغ يومياً`,`No treatment needed; daily need ${rda} mg`),sub:L('من الغذاء، دون مكملات علاجية','From food, without treatment supplements'),refs:[15,52],
    pt:L('مستوى الحديد عندك طبيعي ولا تحتاج حبوب حديد.','Your iron level is normal; you do not need iron tablets.')};
    r.kv=kv;r.notes=notes;render(r);return}
  if(age<1)notes.push({t:L('للرضّع: 0.27 ملغ من الولادة حتى 6 أشهر (احتياج كافٍ من حليب الأم)، و11 ملغ من 7 إلى 12 شهراً.','Infants: 0.27 mg from birth to 6 months (adequate intake from breast milk), and 11 mg from 7 to 12 months.'),r:[15]});
  if(g==='rda'){dose=typeof rda==='number'?rda:11;r={badge:L('الاحتياج الوقائي','Preventive requirement'),tone:'info',title:L(`${rda} ملغ حديد عنصري يومياً`,`${rda} mg elemental iron daily`),sub:L('من الغذاء أو المكملات، دون جرعات علاجية ما لم يثبت النقص مخبرياً','From food or supplements; no treatment doses unless deficiency is confirmed by tests'),refs:[15],pt:L(`تحتاج ${rda} ملغ حديد يومياً، والأفضل من الطعام. لا تأخذ جرعات علاجية دون تحليل.`,`You need ${rda} mg of iron a day, ideally from food. Do not take treatment doses without a blood test.`)}}
  else if(age<12){
    dose=Math.round(w*3);
    r={badge:g==='ida'?L('فقر دم بعوز الحديد (طفل)','Iron-deficiency anemia (child)'):L('نقص الحديد (طفل)','Iron deficiency (child)'),tone:g==='ida'?'bad':'warn',title:L(`${fmt(dose)} ملغ حديد عنصري مرة يومياً`,`${fmt(dose)} mg elemental iron once daily`),sub:L('3 ملغ/كغم/يوم (Ferrous sulfate غالباً) لمدة 3 أشهر','3 mg/kg/day (usually ferrous sulfate) for 3 months'),refs:[14],
      pt:L(`شراب أو قطرات حديد بجرعة ${fmt(dose)} ملغ مرة واحدة يومياً لمدة 3 أشهر.`,`Iron syrup or drops, ${fmt(dose)} mg once a day for 3 months.`),
      plan:[{h:L('العلاج: 3 أشهر على الأقل','Treatment: at least 3 months'),d:L(`${fmt(dose)} ملغ مرة يومياً`,`${fmt(dose)} mg once daily`)},{h:L('المتابعة','Follow-up'),d:L('مراجعة بعد شهر وبعد 3 أشهر','Visits at 1 month and at 3 months')},{h:L('بعد 3 أشهر','At 3 months'),d:L('إذا بقي Ferritin أقل من 20 ng/mL يستمر العلاج 3 أشهر إضافية','If ferritin is still below 20 ng/mL, continue 3 more months')}]};
    if(g==='id')notes.push({t:L('حسب AAP يتوافق Ferritin بقيمة 20 ng/mL أو أقل مع نقص الحديد لدى الأطفال.','Per AAP, ferritin of 20 ng/mL or less is consistent with iron deficiency in children.'),r:[14]});
    if(dose>65)notes.unshift({t:L(`الجرعة المحسوبة (${fmt(dose)} ملغ) أعلى من جرعة المراهقين في الإرشاد نفسه (65 ملغ). راجع طبيب الأطفال قبل تجاوزها.`,`The calculated dose (${fmt(dose)} mg) is higher than the adolescent dose in the same guideline (65 mg). Check with the pediatrician before exceeding it.`),r:[14],u:1});
  }else if(age<18){
    dose=65;
    r={badge:g==='ida'?L('فقر دم بعوز الحديد (مراهق)','Iron-deficiency anemia (adolescent)'):L('نقص الحديد (مراهق)','Iron deficiency (adolescent)'),tone:g==='ida'?'bad':'warn',title:L('65 ملغ حديد عنصري مرة يومياً','65 mg elemental iron once daily'),sub:L('لمدة 3 أشهر على الأقل','For at least 3 months')+(g==='id'?L('، عند Ferritin بقيمة 30 ng/mL أو أقل','; when ferritin is 30 ng/mL or less'):''),refs:[14],
      pt:L('حبة حديد تحتوي 65 ملغ حديد مرة يومياً لمدة 3 أشهر.','One iron tablet with 65 mg of iron once a day for 3 months.'),
      plan:[{h:L('العلاج: 3 أشهر','Treatment: 3 months'),d:L('65 ملغ مرة يومياً','65 mg once daily')},{h:L('المتابعة','Follow-up'),d:L('مراجعة بعد شهر وبعد 3 أشهر','Visits at 1 month and at 3 months')}]};
  }else if(g==='ida'){
    dose=60;
    r={badge:L('فقر دم بعوز الحديد','Iron-deficiency anemia'),tone:'bad',title:L('60 – 120 ملغ حديد عنصري صباحاً، يوماً بعد يوم','60–120 mg elemental iron in the morning, every other day'),sub:L('الجرعة الواحدة يوماً بعد يوم تُمتص أفضل من الجرعات اليومية المتتالية أو المقسّمة','A single dose on alternate days is absorbed better than daily or split doses'),refs:[13,12],tool2:'ganz',
      pt:L('حبة حديد صباحاً يوماً بعد يوم (60 إلى 120 ملغ حديد)، لمدة 3 إلى 6 أشهر.','One iron tablet in the morning every other day (60–120 mg of iron) for 3–6 months.'),
      plan:[{h:L('العلاج','Treatment'),d:L('حتى يعود الهيموغلوبين طبيعياً','Until hemoglobin is normal')},{h:L('تعويض المخزون','Refill stores'),d:L('الاستمرار ليصبح المجموع 3 – 6 أشهر','Continue for 3–6 months in total')}],
      opts:[{h:L('البديل اليومي','Daily alternative'),b:L('جرعة واحدة يومياً','One dose daily'),d:L('الجرعات الأقل قد تكون بنفس الفعالية مع آثار هضمية أقل','Lower doses may work as well with fewer stomach side effects'),r:[12]},
            {h:L('الحديد الوريدي','IV iron'),b:L('عند عدم التحمل أو سوء الامتصاص أو الحاجة لتصحيح سريع','For intolerance, malabsorption or when rapid correction is needed'),r:[12,16]}]};
  }else{
    dose=60;
    r={badge:L('نقص مخزون بدون فقر دم','Low iron stores without anemia'),tone:'warn',title:L('60 ملغ حديد عنصري صباحاً، يوماً بعد يوم','60 mg elemental iron in the morning, every other day'),sub:L('هذا النظام هو الذي دُرس في النساء ذوات المخزون المنخفض، مع إعادة Ferritin بعد 3 أشهر','This is the regimen studied in iron-depleted women; recheck ferritin after 3 months'),refs:[13],
      pt:L('حبة حديد (60 ملغ حديد) صباحاً يوماً بعد يوم، ثم تحليل Ferritin بعد 3 أشهر.','One iron tablet (60 mg of iron) in the morning every other day, then a ferritin test after 3 months.'),
      plan:[{h:L('العلاج: 3 أشهر','Treatment: 3 months'),d:L('60 ملغ يوماً بعد يوم','60 mg every other day')},{h:L('إعادة التحليل','Retest'),d:'Ferritin'}]};
  }
  notes.push({t:L('افصل الحديد عن Levothyroxine بـ 4 ساعات على الأقل.','Separate iron from levothyroxine by at least 4 hours.'),r:[27]});
  if(sx==='p')notes.push({t:L('في الحمل الاحتياج 27 ملغ يومياً، ويحدد طبيب النساء جرعة العلاج.','In pregnancy the need is 27 mg daily; the obstetrician sets any treatment dose.'),r:[15]});
  r.kv=kv;r.notes=notes;r.tool='pills';PILL={k:'fe',dose};r.sch=['fe'];
  if(g==='rda'&&typeof rda==='number'&&age>=1)r.ul=[['fe',rda]];
  if(young&&w)r.ml={wt:w,mgkg:3,q:1};
  render(r);
  if(w){$('gw').value=w;gz()}
  if(hb!=null){$('gha').value=hb;gz()}
}

/* ===================== Calcium ===================== */
function fCa(){
  const x=req(['age'],['cadiet']);if(!x)return;
  const age=x.age,sx=$('sex').value,known=x.cadiet!=null,diet=x.cadiet||0,MG=L(' ملغ',' mg');
  let rda;
  if(sx==='p'||sx==='l')rda=teen(age)?1300:1000;
  else rda=age<1?'200 – 260':age<=3?700:age<=8?1000:age<=18?1300:age<=50?1000:age<=70?(sx==='m'?1000:1200):1200;
  const rdaT=typeof rda==='number'?fmt(rda):rda;
  const ul=age<1?'1,000 – 1,500':age<=8?'2,500':age<=18?'3,000':age<=50?'2,500':'2,000';
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rdaT+MG],[L('الحد الأعلى (UL)','Upper limit (UL)'),ul+L(' ملغ / يوم',' mg / day')]];
  let r;
  if(!known){r={badge:L('الاحتياج اليومي','Daily requirement'),tone:'info',title:L(`${rdaT} ملغ كالسيوم يومياً من الغذاء والمكملات معاً`,`${rdaT} mg calcium daily from food and supplements combined`),sub:L('أدخل الكالسيوم من الطعام لحساب كمية المكمل اللازمة بالضبط','Enter dietary calcium to calculate the exact supplement needed'),refs:[18],
    pt:L(`تحتاج ${rdaT} ملغ كالسيوم يومياً من الطعام والمكملات معاً.`,`You need ${rdaT} mg of calcium a day from food and supplements together.`)}}
  else{
    const gap=Math.max(0,(typeof rda==='number'?rda:260)-diet),doses=Math.ceil(gap/500);kv.push([L('من الغذاء','From food'),fmt(diet)+MG]);
    if(gap===0)r={badge:L('الغذاء يغطي الاحتياج','Diet covers the need'),tone:'ok',title:L('لا حاجة لمكمل كالسيوم','No calcium supplement needed'),sub:L('المدخول الغذائي المدخل يساوي الاحتياج أو يزيد عليه','The entered dietary intake meets or exceeds the need'),refs:[18],pt:L('طعامك يكفي، ولا تحتاج حبوب كالسيوم.','Your diet is enough; you do not need calcium tablets.')};
    else{r={badge:L('نقص في المدخول','Intake below need'),tone:'warn',title:L(`مكمل ${fmt(gap)} ملغ كالسيوم عنصري يومياً`,`Supplement ${fmt(gap)} mg elemental calcium daily`),sub:doses>1?L(`مقسّمة على ${doses===2?'جرعتين':doses+' جرعات'}، لا تزيد الجرعة الواحدة على 500 ملغ`,`Split into ${doses} doses, no more than 500 mg each`):L('جرعة واحدة لا تزيد على 500 ملغ','One dose of no more than 500 mg'),refs:[18],
      pt:doses>1?L(`تحتاج ${fmt(gap)} ملغ كالسيوم إضافية يومياً، مقسّمة على ${doses===2?'مرتين':doses+' مرات'} (لا تزيد كل مرة على 500 ملغ).`,`You need ${fmt(gap)} mg more calcium a day, split into ${doses} doses (no more than 500 mg each).`):L(`تحتاج ${fmt(gap)} ملغ كالسيوم إضافية يومياً في جرعة واحدة.`,`You need ${fmt(gap)} mg more calcium a day in one dose.`),
      opts:[{h:'Calcium carbonate',b:L('مع الطعام','With food'),d:L('يحتاج حمض المعدة للامتصاص','Needs stomach acid to be absorbed'),r:[18]},{h:'Calcium citrate',b:L('مع الطعام أو بدونه','With or without food'),d:L('أنسب لمن يتناول أدوية تقلل حمض المعدة','Better for people on acid-reducing medicines'),r:[18]}]};
      r.tool='pills';PILL={k:'ca',dose:Math.min(500,Math.ceil(gap/doses))};r.sch=doses>1?['ca','ca2']:['ca'];if(age>=1)r.ul=[['ca',diet+gap]];}
  }
  r.notes=[{t:L('الإجمالي (غذاء + مكمل) يجب ألا يتجاوز الحد الأعلى. افصل الكالسيوم عن Levothyroxine بـ 4 ساعات.','Total intake (food + supplement) should stay under the upper limit. Separate calcium from levothyroxine by 4 hours.'),r:[18,27]}];
  if(sx==='p')r.notes.push({t:L('توصي منظمة الصحة العالمية بـ 1,500 – 2,000 ملغ يومياً للحوامل ذوات المدخول المنخفض لتقليل خطر تسمم الحمل.','WHO recommends 1,500–2,000 mg daily for pregnant women with low intake to reduce pre-eclampsia risk.'),r:[18],i:1});
  r.kv=kv;render(r);
}

/* ===================== Magnesium ===================== */
function fMg(){
  const kid=parseFloat($('age').value)<18&&!$('mgsx').checked;
  const x=req(kid?['age','mgv','wt']:['age','mgv']);if(!x)return;
  const age=x.age,w=x.wt,v=x.mgv,sx=$('sex').value,mgdl=$('mgu').value==='mmol'?v*2.43:v,sev=$('mgsx').checked,ren=$('mgren').checked,MG=L(' ملغ',' mg');
  let rda;
  if(sx==='p')rda=teen(age)?400:age<=30?350:360;
  else if(sx==='l')rda=teen(age)?360:age<=30?310:320;
  else rda=age<1?'30 – 75':age<=3?80:age<=8?130:age<=13?240:age<=18?(sx==='m'?410:360):age<=30?(sx==='m'?400:310):(sx==='m'?420:320);
  const ul=age<1?L('غير محدد','Not established'):(age<=3?'65':age<=8?'110':'350')+MG;
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+L(' ملغ (غذاء ومكملات)',' mg (food + supplements)')],[L('الحد الأعلى من المكملات','Upper limit from supplements'),ul],[L('القيمة','Value'),fmt(mgdl)+' mg/dL = '+fmt(mgdl/2.43)+' mmol/L']];
  const notes=[];let r;
  if(sev){r={badge:L('أعراض شديدة','Severe symptoms'),tone:'bad',title:L('تحويل فوري للمستشفى','Refer to hospital now'),sub:L('المغنيسيوم الوريدي للأعراض الشديدة مثل التشنجات واضطراب النظم','IV magnesium for severe symptoms such as seizures or arrhythmia'),refs:[21,22],pt:L('اذهب إلى الطوارئ الآن. هذه الأعراض تحتاج علاجاً وريدياً في المستشفى.','Go to the emergency department now. These symptoms need IV treatment in hospital.')};
    notes.push({t:L('حالة طارئة: لا يُعتمد على العلاج الفموي.','Emergency: oral treatment is not enough.'),r:[21],u:1})}
  else if(mgdl<1.22){r={badge:L('منخفض بشدة (أقل من 0.5 mmol/L)','Severely low (below 0.5 mmol/L)'),tone:'bad',title:L('المغنيسيوم الوريدي في المستشفى','IV magnesium in hospital'),sub:L('العلاج الفموي غير مناسب لهذا المستوى','Oral replacement is not suitable at this level'),refs:[22,21],pt:L('مستوى المغنيسيوم منخفض جداً. راجع الطوارئ أو الطبيب اليوم لأنك تحتاج علاجاً وريدياً.','Your magnesium level is very low. Go to the emergency department or see a doctor today: you need IV treatment.')};
    notes.push({t:L('حسب NHS SPS: النقص الشديد (أقل من 0.5 mmol/L) يُعالج بـ Magnesium sulfate وريدياً في المستشفى.','Per NHS SPS: severe deficiency (below 0.5 mmol/L) is treated with IV magnesium sulfate in hospital.'),r:[22],u:1})}
  else if(mgdl>=1.8)r={badge:L('ضمن الطبيعي','Normal'),tone:'ok',title:L('لا حاجة لعلاج','No treatment needed'),sub:L(`الاحتياج اليومي ${rda} ملغ، ولا تتجاوز مكملات المغنيسيوم ${ul} يومياً`,`Daily need ${rda} mg; magnesium supplements should not exceed ${ul} a day`),refs:[20,21],pt:L('مستوى المغنيسيوم طبيعي، ولا تحتاج علاجاً.','Your magnesium level is normal; no treatment is needed.')};
  else if(age<18){
    // RCH (Melbourne) clinical guideline: 0.1–0.2 mmol/kg (2.5–5 mg/kg) elemental magnesium orally three times a day, not above the adult dose
    const lo=Math.min(Math.round(w*2.5),195),hi=Math.min(Math.round(w*5),195);
    r={badge:L('منخفض (أقل من 1.8 mg/dL)','Low (below 1.8 mg/dL)'),tone:'warn',title:L(`${fmt(lo)} – ${fmt(hi)} ملغ مغنيسيوم عنصري 3 مرات يومياً`,`${fmt(lo)}–${fmt(hi)} mg elemental magnesium three times a day`),sub:L('2.5 – 5 ملغ/كغم (0.1 – 0.2 mmol/كغم) في الجرعة، فموياً مع الطعام، بإشراف طبيب الأطفال','2.5–5 mg/kg (0.1–0.2 mmol/kg) per dose, by mouth with food, under pediatric supervision'),refs:[58],
      pt:L(`مغنيسيوم بالفم 3 مرات يومياً مع الطعام (${fmt(lo)} إلى ${fmt(hi)} ملغ في المرة) حسب ما يحدده طبيب الأطفال. قد يسبب إسهالاً.`,`Magnesium by mouth three times a day with food (${fmt(lo)}–${fmt(hi)} mg each time) as the pediatrician decides. It can cause diarrhea.`),
      plan:[{h:L('العلاج','Treatment'),d:L(`${fmt(lo)} – ${fmt(hi)} ملغ 3 مرات يومياً`,`${fmt(lo)}–${fmt(hi)} mg three times a day`)},{h:L('إعادة التحليل','Retest'),d:L('حسب طبيب الأطفال والسبب','As the pediatrician decides, depending on the cause')}],
      opts:[{h:L('الأثر الجانبي الأشيع','Most common side effect'),b:L('الإسهال','Diarrhea'),d:L('ابدأ بالجرعة الأقل','Start with the lower dose'),r:[58]}]};
    if(hi>=195)notes.push({t:L('الجرعة محددة بجرعة البالغين (24 mmol يومياً تقريباً 580 ملغ مقسّمة على 3).','The dose is capped at the adult dose (about 24 mmol, 580 mg a day, in 3 doses).'),r:[22]});
    r.tool='pills';PILL={k:'mg',dose:lo};r.sch=['mg'];
    if(age<1)notes.unshift({t:L('للرضّع تحت سنة: العلاج والجرعة بقرار طبيب الأطفال فقط.','Infants under 1 year: treatment and dose are for the pediatrician only.'),r:[58],u:1});}
  else r={badge:L('منخفض (0.5 – 0.74 mmol/L)','Low (0.5–0.74 mmol/L)'),tone:'warn',title:L('10 – 24 mmol مغنيسيوم فموياً يومياً','10–24 mmol oral magnesium daily'),sub:L('أي نحو 240 – 580 ملغ مغنيسيوم عنصري، مقسّمة على جرعات مع الطعام','About 240–580 mg elemental magnesium, in divided doses with meals'),refs:[22],
    pt:L('حبوب مغنيسيوم مقسّمة على اليوم مع الطعام حسب ما يحدده الطبيب، ثم تحليل جديد خلال أسبوع تقريباً. قد تسبب إسهالاً خفيفاً.','Magnesium tablets split through the day with meals, as your doctor sets, then a new blood test in about a week. They can cause mild diarrhea.'),
    plan:[{h:L('العلاج: حتى 7 أيام','Treatment: up to 7 days'),d:L('10 – 24 mmol يومياً مقسّمة مع الطعام','10–24 mmol daily, divided, with meals')},{h:L('إعادة التحليل','Retest'),d:L('بعد 7 أيام، ثم بعد 1 – 3 أشهر حسب السبب','After 7 days, then after 1–3 months depending on the cause')},{h:L('بعد التصحيح','After correction'),d:L('الاستمرار يوماً أو يومين بعد عودة المستوى طبيعياً','Continue 1–2 days after the level normalises')}],
    opts:[{h:L('متى يكون العلاج ضرورياً','When treatment is needed'),b:L('عند وجود أعراض أو استمرار انخفاض المستوى','With symptoms, or a persistently low level'),r:[21]},{h:L('الأثر الجانبي الأشيع','Most common side effect'),b:L('الإسهال','Diarrhea'),d:L('ابدأ بجرعة منخفضة وارفعها تدريجياً','Start low and increase gradually'),r:[22]}]};
  if(r.refs&&r.refs.includes(22)&&!sev&&mgdl>=1.22){r.tool='pills';PILL={k:'mg',dose:243};r.sch=['mg']}
  if(r.refs&&r.refs.includes(22)&&!sev&&mgdl>=1.22)notes.push({t:L('الجرعة العلاجية أعلى من الحد الأعلى للمكملات (350 ملغ) لأنها علاج مؤقت بإشراف طبي، وليست مكملاً دائماً.','The treatment dose is above the supplement upper limit (350 mg) because it is short-term treatment under medical supervision, not a long-term supplement.'),r:[20,22]});
  if(ren)notes.push({t:L('في القصور الكلوي يرتفع خطر تراكم المغنيسيوم، فتُراقب المستويات عن قرب وتُخفض الجرعة الوريدية.','Kidney impairment raises the risk of magnesium build-up: monitor closely and reduce IV doses.'),r:[20,22],u:1});
  notes.push({t:L('مدرات البول ومثبطات مضخة البروتون قد تسبب نقص المغنيسيوم.','Diuretics and proton pump inhibitors can cause low magnesium.'),r:[20],i:1});
  r.kv=kv;r.notes=notes;render(r);
}

/* ===================== Vitamin C ===================== */
function fC(){
  const x=req(['age']);if(!x)return;
  const age=x.age,sx=$('sex').value,g=$('czg').value,smk=$('smk').checked,MG=L(' ملغ',' mg');
  let rda=sx==='p'?(teen(age)?80:85):sx==='l'?(teen(age)?115:120):age<1?'40 – 50':age<=3?15:age<=8?25:age<=13?45:age<=18?(sx==='m'?75:65):(sx==='m'?90:75);
  if(smk&&age>=14&&typeof rda==='number')rda+=35;
  const ul=age<1?L('غير محدد','Not established'):(age<=3?'400':age<=8?'650':age<=13?'1,200':age<=18?'1,800':'2,000')+MG+L(' / يوم',' / day');
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+MG+(smk?L(' (شامل إضافة المدخن)',' (includes smoker addition)'):'')],[L('الحد الأعلى (UL)','Upper limit (UL)'),ul]];
  let r;
  if(g==='rda')r={badge:L('الاحتياج اليومي','Daily requirement'),tone:'info',title:L(`${rda} ملغ فيتامين C يومياً`,`${rda} mg vitamin C daily`),sub:L('من الفواكه والخضار أو المكملات','From fruit and vegetables or supplements'),refs:[23],pt:L(`تحتاج ${rda} ملغ فيتامين C يومياً، ويوفرها غالباً تناول الفواكه والخضار.`,`You need ${rda} mg of vitamin C a day, which fruit and vegetables usually provide.`)};
  else r={badge:L('نزلات البرد','Common cold'),tone:'info',title:L('لا توجد جرعة علاجية مثبتة بعد بدء البرد','No proven treatment dose once a cold starts'),sub:L('تجارب أخذ فيتامين C بعد ظهور الأعراض لم تُظهر أثراً ثابتاً','Trials of vitamin C started after symptoms showed no consistent effect'),refs:[24],
    pt:L('أخذ فيتامين C بعد بدء البرد لم يثبت أنه يفيد. أخذه بانتظام قد يقصّر البرد قليلاً.','Taking vitamin C after a cold starts has not been shown to help. Taking it regularly may shorten colds a little.'),
    opts:[{h:L('الاستعمال المنتظم (200 ملغ يومياً فأكثر)','Regular use (200 mg daily or more)'),b:L('لا يقلل عدد مرات الإصابة لدى عامة الناس','Does not reduce how often people catch colds'),d:L('لكنه قصّر مدة البرد قليلاً بشكل ثابت في التجارب','But it consistently shortened colds slightly in trials'),r:[24]}]};
  if(g==='rda'&&typeof rda==='number'&&age>=1)r.ul=[['c',rda]];
  r.kv=kv;r.notes=[{t:L('الجرعات العالية قد تسبب اضطراباً هضمياً، ويرتبط الاستعمال العالي بخطر حصى الكلى لدى بعض الأشخاص.','High doses can upset the stomach, and high intake is linked to kidney stone risk in some people.'),r:[23]}];render(r);
}

/* ===================== Zinc ===================== */
function fZn(){
  const x=req(['age']);if(!x)return;
  const age=x.age,sx=$('sex').value,g=$('czg').value,MG=L(' ملغ',' mg');
  const rda=sx==='p'?(teen(age)?12:11):sx==='l'?(teen(age)?13:12):age<1?'2 – 3':age<=3?3:age<=8?5:age<=13?8:age<=18?(sx==='m'?11:9):(sx==='m'?11:8);
  const ul=(age<1?'4 – 5':age<=3?'7':age<=8?'12':age<=13?'23':age<=18?'34':'40')+MG+L(' / يوم',' / day');
  const kv=[[L('الاحتياج اليومي (RDA)','Daily need (RDA)'),rda+L(' ملغ زنك عنصري',' mg elemental zinc')],[L('الحد الأعلى (UL)','Upper limit (UL)'),ul]];
  let r;
  if(g==='rda')r={badge:L('الاحتياج اليومي','Daily requirement'),tone:'info',title:L(`${rda} ملغ زنك يومياً`,`${rda} mg zinc daily`),sub:L('من الغذاء أو المكملات','From food or supplements'),refs:[25],pt:L(`تحتاج ${rda} ملغ زنك يومياً من الطعام أو المكملات.`,`You need ${rda} mg of zinc a day from food or supplements.`)};
  else r={badge:L('نزلات البرد','Common cold'),tone:'warn',title:L('فائدة محتملة لكنها غير مؤكدة','Possible benefit, not proven'),sub:L('مراجعة Cochrane 2024: قد يقصّر الزنك مدة البرد بنحو يومين، والثقة في الأدلة منخفضة، ولم يثبت أنه يمنع الإصابة','Cochrane 2024: zinc may shorten colds by about 2 days, with low-certainty evidence; it has not been shown to prevent colds'),refs:[26],
    pt:L('الزنك قد يقصّر البرد يومين تقريباً، لكن الدليل ضعيف. إن استخدمته فلأيام قليلة فقط، فقد يسبب غثياناً وتغيراً في الطعم.','Zinc may shorten a cold by about 2 days, but the evidence is weak. If you use it, only for a few days; it can cause nausea and a changed taste.'),
    opts:[{h:L('إن استُخدم','If used'),b:L('دورة قصيرة فقط','Short course only'),d:L('الجرعات المدروسة في أقراص الاستحلاب تتجاوز غالباً الحد الأعلى اليومي، ومن آثارها الغثيان وتغير الطعم','Doses studied in lozenges often exceed the daily upper limit; side effects include nausea and altered taste'),r:[26,25]}]};
  if(g==='rda'&&typeof rda==='number'&&age>=1){r.ul=[['zn',rda]];r.sch=['zn']}
  r.kv=kv;r.notes=[{t:L('الاستعمال الطويل فوق الحد الأعلى قد يسبب نقص النحاس. والحديد بجرعة 25 ملغ فأكثر يقلل امتصاص الزنك إذا أُخذا معاً.','Long-term use above the upper limit can cause copper deficiency. Iron at 25 mg or more lowers zinc absorption when taken together.'),r:[25]},
    {t:L('المضاد الحيوي (كينولون أو تتراسيكلين) قبل الزنك بساعتين أو بعده بـ 4 إلى 6 ساعات.','Take quinolone or tetracycline antibiotics 2 hours before or 4–6 hours after zinc.'),r:[25],i:1}];render(r);
}

/* ===================== Infant (0–24 months): vitamin K, vitamin D, iron ===================== */
function fInf(){
  const x=req(['mon'],['wt']);if(!x)return;
  const m=x.mon,w=x.wt,feed=$('feed').value,pre=$('pre').checked,bf=feed!=='ff',day=L(' / يوم',' / day');
  const kv=[[L('العمر','Age'),fmt(m)+L(' شهر',' months')]];
  const plan=[],notes=[];
  // vitamin K: one IM dose at birth (AAP 2022)
  if(m<1)plan.push({h:L('فيتامين K عند الولادة','Vitamin K at birth'),d:L('1 ملغ عضلياً جرعة واحدة (0.3 – 0.5 ملغ/كغم لمن وزنه أقل من 1,500 غ)','1 mg IM, single dose (0.3–0.5 mg/kg if under 1,500 g)')});
  else notes.push({t:L('فيتامين K يُعطى مرة واحدة عند الولادة (1 ملغ عضلياً). تأكد أنه أُعطي.','Vitamin K is given once at birth (1 mg IM). Make sure it was given.'),r:[56],i:1});
  // vitamin D: 400 IU for breastfed and partially breastfed infants (AAP 2008); 600 IU from 12 months (NIH RDA)
  if(m<12)plan.push({h:L('فيتامين D','Vitamin D'),d:bf?'400 IU'+day+L(' من الأيام الأولى',' from the first days'):L('400 IU يومياً إذا شرب أقل من لتر حليب صناعي مدعّم يومياً','400 IU daily if drinking less than 1 litre of fortified formula a day')});
  else plan.push({h:L('فيتامين D','Vitamin D'),d:'600 IU'+day+L(' (الاحتياج اليومي)',' (daily need)')});
  // iron (AAP 2026): exclusively breastfed term infants 1 mg/kg/day by 4 months; preterm 2–3 mg/kg/day from 2 weeks
  if(pre){const d=w?L(`${fmt(Math.round(w*2*10)/10)} – ${fmt(Math.round(w*3*10)/10)} ملغ يومياً`,`${fmt(Math.round(w*2*10)/10)}–${fmt(Math.round(w*3*10)/10)} mg daily`):L('2 – 3 ملغ/كغم يومياً','2–3 mg/kg daily');
    plan.push({h:L('الحديد (خديج)','Iron (preterm)'),d:d+L(' من عمر أسبوعين مع التغذية الكاملة',' from 2 weeks of age on full feeds')})}
  else if(feed==='bf'&&m<12){if(m>=4){const d=w?L(`${fmt(Math.round(w*10)/10)} ملغ يومياً`,`${fmt(Math.round(w*10)/10)} mg daily`):L('1 ملغ/كغم يومياً','1 mg/kg daily');
      plan.push({h:L('الحديد','Iron'),d:d+L(' من عمر 4 أشهر حتى يأكل أطعمة غنية بالحديد',' from 4 months until eating iron-rich foods')})}
    else plan.push({h:L('الحديد','Iron'),d:L('يبدأ عند عمر 4 أشهر: 1 ملغ/كغم يومياً','Starts at 4 months: 1 mg/kg daily')});}
  else if(feed==='mix'&&m<12)plan.push({h:L('الحديد','Iron'),d:L('يحدده طبيب الأطفال حسب نسبة الحليب الصناعي المدعّم','The pediatrician decides, depending on the share of iron-fortified formula')});
  else if(m<12)plan.push({h:L('الحديد','Iron'),d:L('الحليب الصناعي المدعّم بالحديد يكفي، دون مكمل','Iron-fortified formula is enough; no supplement')});
  else plan.push({h:L('الحديد','Iron'),d:L('7 ملغ يومياً من الغذاء (الاحتياج)','7 mg daily from food (daily need)')});
  if(!w&&(pre||feed==='bf'))notes.push({t:L('أدخل الوزن لحساب جرعة الحديد بالملغ.','Enter the weight to calculate the iron dose in mg.'),i:1});
  if(feed==='bf'&&!pre&&m>=4&&m<12)notes.push({t:L('حسب AAP 2026 يمكن للأهل الانتظار حتى 6 أشهر وبدء أطعمة تحتوي الحديد بدلاً من المكمل.','Per AAP 2026, parents may instead wait until 6 months and start iron-containing foods.'),r:[14]});
  notes.push({t:L('فحص فقر الدم: بين 9 و12 شهراً للرضاعة الطبيعية، وبين 15 و18 شهراً للحليب الصناعي (AAP 2026).','Anemia screening: at 9–12 months if breastfed, and at 15–18 months if formula-fed (AAP 2026).'),r:[14],i:1});
  notes.push({t:L('لا يُعطى الرضيع حليب البقر قبل 12 شهراً، ولا أي مكمل آخر دون طبيب الأطفال.','No cow’s milk before 12 months, and no other supplement without the pediatrician.'),r:[14]});
  const fe=pre||(feed==='bf'&&m>=4&&m<12),DI=m<12?'400':'600';
  const r={badge:L('المكملات الوقائية للرضيع','Infant preventive supplements'),tone:'info',title:bf||m>=12?L(`فيتامين D ${DI} IU يومياً`+(fe?' + حديد':''),`Vitamin D ${DI} IU daily`+(fe?' + iron':'')):L('فيتامين D حسب كمية الحليب الصناعي','Vitamin D depending on formula intake'),
    sub:pre?L('خديج: الحديد من عمر أسبوعين','Preterm: iron from 2 weeks of age'):feed==='bf'?L('رضاعة طبيعية كاملة','Exclusively breastfed'):feed==='mix'?L('رضاعة مختلطة','Mixed feeding'):L('حليب صناعي','Formula-fed'),refs:[55,14,56],plan,
    pt:L(`قطرات فيتامين D ${DI} وحدة يومياً`+(fe?'، وقطرات حديد يومياً بالجرعة التي يحددها طبيب الأطفال حسب الوزن.':'.'),`Vitamin D drops, ${DI} units a day`+(fe?', and iron drops daily at the dose the pediatrician sets by weight.':'.'))};
  if(fe&&w)r.ml={wt:w,mgkg:pre?2:1,q:1};
  r.kv=kv;r.notes=notes;r.tool='drops';render(r);$('iu').value=m<12?400:600;conv();
}

/* ===================== Vitamin A for children 6–59 months (WHO) ===================== */
function fVA(){
  const x=req(['mon']);if(!x)return;
  const m=x.mon,g=$('vag').value,dose=m<6?50000:m<12?100000:200000,D=fmt(dose)+' IU',mcg=fmt(dose*0.3)+' mcg RAE';
  const kv=[[L('الجرعة حسب العمر','Dose for this age'),D+' = '+mcg],[L('الحد الأعلى اليومي (فيتامين A الجاهز)','Daily upper limit (preformed vitamin A)'),L('600 mcg (2,000 IU) حتى 3 سنوات','600 mcg (2,000 IU) up to 3 years')]];
  const notes=[{t:L('هذه جرعات كبيرة تُعطى بالفم على فترات متباعدة بإشراف صحي، وليست جرعة يومية. تجاوزها يسبب تسمماً.','These are large oral doses given at long intervals under health-worker supervision, not a daily dose. Exceeding them causes toxicity.'),r:[53,30],u:1}];let r;
  if(g==='prev'){
    if(m<6)r={badge:L('أقل من 6 أشهر','Under 6 months'),tone:'info',title:L('لا يوصى بالجرعة الوقائية','Preventive dosing is not recommended'),sub:L('برنامج WHO الوقائي يبدأ من عمر 6 أشهر','The WHO preventive programme starts at 6 months'),refs:[53],pt:L('لا يحتاج الطفل جرعة فيتامين A وقائية قبل 6 أشهر.','The child does not need a preventive vitamin A dose before 6 months.')};
    else r={badge:L('الوقاية (WHO)','Prevention (WHO)'),tone:'info',title:m<12?L('100,000 IU بالفم مرة واحدة','100,000 IU by mouth, once'):L('200,000 IU بالفم كل 4 – 6 أشهر','200,000 IU by mouth every 4–6 months'),sub:L('فقط في المناطق التي يشكّل فيها نقص فيتامين A مشكلة صحية عامة','Only where vitamin A deficiency is a public health problem'),refs:[53],
      pt:m<12?L('جرعة فيتامين A واحدة بالفم (100,000 وحدة) يعطيها المركز الصحي.','One oral vitamin A dose (100,000 units) given by the health centre.'):L('جرعة فيتامين A بالفم (200,000 وحدة) كل 4 إلى 6 أشهر في المركز الصحي.','An oral vitamin A dose (200,000 units) every 4–6 months at the health centre.')};
    notes.push({t:L('لا تُعطى للأطفال الأصحاء جيدي التغذية في المناطق التي يندر فيها النقص؛ يكفيهم الغذاء.','Not for well-nourished children where deficiency is rare; food is enough.'),r:[53,30],i:1});
  }else{
    const xer=g==='xer',days=xer?L('اليوم 1 واليوم 2 واليوم 14','Day 1, day 2 and day 14'):L('اليوم 1 واليوم 2','Day 1 and day 2');
    r={badge:xer?L('علاج جفاف العين (Xerophthalmia)','Treating xerophthalmia'):L('الحصبة','Measles'),tone:'bad',title:L(`${D} بالفم: ${days}`,`${D} by mouth: ${days}`),sub:xer?L('ثلاث جرعات حسب WHO، مع تحويل لطبيب العيون','Three doses per WHO, with referral to an eye doctor'):L('جرعتان في يومين متتاليين حسب WHO لتقليل مضاعفات الحصبة','Two doses on consecutive days per WHO, to reduce measles complications'),refs:[54],
      plan:[{h:L('اليوم 1','Day 1'),d:D},{h:L('اليوم 2','Day 2'),d:D},...(xer?[{h:L('اليوم 14','Day 14'),d:D}]:[{h:L('بعد 2 – 4 أسابيع','After 2–4 weeks'),d:L('جرعة ثالثة إذا ظهرت علامات نقص فيتامين A في العين','A third dose if eye signs of vitamin A deficiency appear')}])],
      pt:L(`جرعة فيتامين A بالفم (${D}) في اليوم الأول والثاني`+(xer?' واليوم 14':'')+'، يعطيها الطبيب أو المركز الصحي.',`An oral vitamin A dose (${D}) on day 1 and day 2`+(xer?' and day 14':'')+', given by the doctor or health centre.')};
    if(xer)notes.push({t:L('جفاف العين بسبب نقص فيتامين A حالة طارئة قد تسبب العمى: لا يؤخَّر العلاج.','Xerophthalmia from vitamin A deficiency is an emergency that can cause blindness: do not delay treatment.'),r:[54],u:1});
  }
  r.units=['a',dose];
  if(m>59)notes.unshift({t:L('هذه الجرعات لعمر 6 – 59 شهراً. للأكبر يحدد الطبيب الجرعة.','These doses are for 6–59 months. For older children the doctor decides.'),r:[53],u:1});
  r.kv=kv;r.notes=notes;render(r);
}

/* ===================== Pregnancy and breastfeeding: daily supplements ===================== */
function fPreg(){
  const x=req(['age'],['hb']);if(!x)return;
  const age=x.age,hb=x.hb,st=$('tri').value,ntd=$('ntd').checked,lowca=$('lowca').checked,veg=$('veg').checked;
  const preg=st==='t1'||st==='t2'||st==='t3',lac=st==='lac',tn=teen(age)||age<14,tri=preg?+st[1]:null,day=L(' / يوم',' / day');
  const plan=[],notes=[],kv=[];
  // folic acid (WHO ANC 2016, NIH, StatPearls): 400 mcg from before conception; 4–5 mg with a previous neural tube defect
  if(!lac)plan.push({h:L('حمض الفوليك','Folic acid'),d:ntd?L('4 – 5 ملغ يومياً بوصفة طبية','4–5 mg daily on prescription'):'400 mcg'+day+(st==='plan'||st==='t1'?L(' (قبل الحمل بشهر على الأقل وحتى الأسبوع 12)',' (from at least a month before conception to week 12)'):'')});
  // iron: WHO ANC 30–60 mg elemental daily in pregnancy; 120 mg if anemic
  const hc=preg?hbCut(age,'p',tri):null,anem=hb!=null&&hc!=null&&hb<hc;
  if(preg)plan.push({h:L('الحديد','Iron'),d:anem?L('120 ملغ حديد عنصري يومياً حتى يعود الهيموغلوبين طبيعياً','120 mg elemental iron daily until hemoglobin is normal'):L('30 – 60 ملغ حديد عنصري يومياً','30–60 mg elemental iron daily')});
  else plan.push({h:L('الحديد','Iron'),d:(lac?(tn?'10':'9'):(tn?'15':'18'))+L(' ملغ يومياً من الغذاء (الاحتياج)',' mg daily from food (daily need)')});
  // iodine: 150 mcg potassium iodide (American Thyroid Association, in NIH)
  plan.push({h:L('اليود','Iodine'),d:L('150 mcg يومياً كمكمل (يوديد البوتاسيوم)','150 mcg daily as a supplement (potassium iodide)')});
  plan.push({h:L('فيتامين D','Vitamin D'),d:'600 IU'+day});
  plan.push({h:L('الكالسيوم','Calcium'),d:preg&&lowca?L('1,500 – 2,000 ملغ يومياً مقسّمة (غذاء قليل الكالسيوم)','1,500–2,000 mg daily, divided (low-calcium diet)'):(tn?'1,300':'1,000')+L(' ملغ يومياً من الغذاء والمكمل',' mg daily from food and supplements')});
  plan.push({h:L('الكولين','Choline'),d:(lac?'550':preg?'450':'425')+L(' ملغ يومياً (بيض، لحوم، أسماك)',' mg daily (eggs, meat, fish)')});
  plan.push({h:L('أوميغا-3 (DHA)','Omega-3 (DHA)'),d:L('225 – 340 غ سمك قليل الزئبق أسبوعياً','225–340 g of low-mercury fish a week')});
  if(veg)plan.push({h:'B12',d:(lac?'2.8':preg?'2.6':'2.4')+L(' mcg يومياً كمكمل (نظام نباتي)',' mcg daily as a supplement (vegan diet)')});
  if(hb!=null){kv.push([L('الهيموغلوبين','Hemoglobin'),fmt(hb)+' g/dL']);if(hc!=null)kv.push([L('فقر الدم تحت (WHO)','Anemia below (WHO)'),fmt(hc)+' g/dL'])}
  kv.push([L('الحد الأعلى لفيتامين A الجاهز','Upper limit for preformed vitamin A'),tn?'2,800 mcg (9,333 IU)':'3,000 mcg (10,000 IU)']);
  if(anem)notes.push({t:L(`الهيموغلوبين أقل من ${fmt(hc)} g/dL: فقر دم في الحمل حسب WHO. افحص Ferritin، وتحدد طبيبة النساء العلاج.`,`Hemoglobin below ${fmt(hc)} g/dL: anemia in pregnancy per WHO. Check ferritin; the obstetrician decides treatment.`),r:[51,57],u:1});
  if(ntd)notes.push({t:L('جرعة 4 – 5 ملغ أعلى من الحد الأعلى العام (1,000 mcg) وتؤخذ بإشراف طبي فقط.','4–5 mg exceeds the general upper limit (1,000 mcg) and is for medical supervision only.'),r:[10,11],u:1});
  notes.push({t:L('تجنبي مكملات فيتامين A (Retinol) بجرعات عالية في الحمل لأنها قد تسبب تشوهات؛ لا تتجاوزي الحد الأعلى.','Avoid high-dose vitamin A (retinol) supplements in pregnancy because they can cause birth defects; stay under the upper limit.'),r:[30],u:preg?1:0});
  notes.push({t:L('افصلي الحديد عن الكالسيوم بساعتين على الأقل لأن الكالسيوم يقلل امتصاص الحديد.','Take iron and calcium at least 2 hours apart, because calcium lowers iron absorption.'),r:[18,15]});
  if(preg&&lowca)notes.push({t:L('توصي WHO بالكالسيوم 1.5 – 2 غ يومياً للحوامل ذوات المدخول المنخفض لتقليل خطر تسمم الحمل.','WHO recommends 1.5–2 g calcium daily for pregnant women with low intake to reduce the risk of pre-eclampsia.'),r:[57,18],i:1});
  notes.push({t:L('لا يُفحص فيتامين D روتينياً في الحمل؛ توصي Endocrine Society 2024 بالمكمل وقائياً للحوامل.','Vitamin D is not tested routinely in pregnancy; Endocrine Society 2024 suggests a preventive supplement in pregnancy.'),r:[3,4],i:1});
  if(age<12)notes.unshift({t:L('العمر المدخل لا يناسب الحمل؛ تأكدي من العمر.','The age entered does not fit pregnancy; check the age.'),u:1});
  const badge=st==='plan'?L('التخطيط للحمل','Planning pregnancy'):lac?L('الرضاعة الطبيعية','Breastfeeding'):L(`الحمل: الثلث ${['الأول','الثاني','الثالث'][tri-1]}`,`Pregnancy: trimester ${tri}`);
  const r={badge,tone:anem?'warn':'info',title:lac?L('يود 150 mcg يومياً + غذاء متوازن','Iodine 150 mcg daily + a balanced diet'):preg?L('حمض الفوليك + الحديد + اليود يومياً','Folic acid + iron + iodine daily'):L('حمض الفوليك + اليود يومياً','Folic acid + iodine daily'),
    sub:L('مع فيتامين D والكالسيوم والكولين والأوميغا-3 من الغذاء أو المكملات','With vitamin D, calcium, choline and omega-3 from food or supplements'),refs:[57,10,11,15,37,4,18,44,42],plan,
    pt:lac?L('حبة يود 150 ميكروغرام يومياً، مع غذاء متوازن وسمك قليل الزئبق مرتين أسبوعياً.','A 150-microgram iodine tablet a day, with a balanced diet and low-mercury fish twice a week.'):
      preg?L('يومياً: حمض الفوليك، وحبة حديد، ويود 150 ميكروغرام، حسب ما تحدده طبيبة النساء. افصلي الحديد عن الكالسيوم بساعتين.','Every day: folic acid, an iron tablet and 150 micrograms of iodine, as your obstetrician advises. Take iron and calcium 2 hours apart.'):
      L('ابدئي حمض الفوليك 400 ميكروغرام ويود 150 ميكروغرام يومياً قبل الحمل بشهر على الأقل.','Start folic acid 400 micrograms and iodine 150 micrograms a day at least a month before pregnancy.')};
  if(preg){r.tool='pills';PILL={k:'fe',dose:anem?120:60}}
  r.sch=preg||lac?['fe','ca',...(preg&&lowca?['ca2']:[])]:['ca'];
  r.ul=[...(st!=='lac'&&!ntd?[['fol',400]]:[]),['io',150],['d',600]];
  r.kv=kv;r.notes=notes;render(r);
}
