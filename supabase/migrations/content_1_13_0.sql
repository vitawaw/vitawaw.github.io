-- VITAWAW 1.13.0 content (approved by the owner: «طبقها كلها مع الملاحضات»).
-- Run once in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Every new item is added with reviewed = false: it waits in 🔔 for the owner's approval and reaches visitors only after he publishes.
-- Safe to run twice: sources use their fixed ids, interactions are skipped when the same pair already exists.

-- 1. New sources: the two new calculators (69–71), the drug labels of the new interactions (72–75) and the improved tools (76–78) ----------------------------
insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed) values
 (69, 'ASMBS, 2016', 'Parrott J, et al. American Society for Metabolic and Bariatric Surgery Integrated Health Nutritional Guidelines for the Surgical Weight Loss Patient 2016 Update: Micronutrients. Surg Obes Relat Dis 2017;13(5):727–741',
      'https://doi.org/10.1016/j.soard.2016.12.018', 'المكملات الوقائية بعد عمليات السمنة حسب نوع العملية', 'Preventive supplements after weight-loss surgery by procedure', 'g', false),
 (70, 'NHS Specialist Pharmacy Service, 2024', 'Using and prescribing thiamine in alcohol dependence',
      'https://www.sps.nhs.uk/articles/using-and-prescribing-thiamine-in-alcohol-dependence/', 'الثيامين بالحقن للوقاية من اعتلال فيرنيكه وعلاجه', 'Parenteral thiamine to prevent and treat Wernicke encephalopathy', 'g', false),
 (71, 'NHS Highland Formulary (BNF doses), 2026', 'Vitamin B group formulary: thiamine',
      'https://rightdecisions.scot.nhs.uk/tam-treatments-and-medicines-nhs-highland/formularies/highland-formulary/nutrition-and-blood/vitamins/vitamin-b-group-formulary', 'جرعات الثيامين الفموية', 'Oral thiamine doses', 'o', false),
 (72, 'Novartis, U.S. prescribing information', 'PROMACTA (eltrombopag) tablets: Prescribing information',
      'https://www.novartis.com/us-en/sites/novartis_us/files/promacta.pdf', 'الفصل بين Eltrombopag والمعادن', 'Separating eltrombopag from minerals', 'd', false),
 (73, 'U.S. FDA labeling, 2018', 'XOFLUZA (baloxavir marboxil) tablets: Prescribing information',
      'https://www.accessdata.fda.gov/drugsatfda_docs/nda/2018/210854Orig1s000lbl.pdf', 'تجنّب Baloxavir مع مكملات المعادن', 'Avoid baloxavir with mineral supplements', 'd', false),
 (74, 'UK package leaflet (emc)', 'Neurontin (gabapentin): Package leaflet, information for the user',
      'https://www.medicines.org.uk/emc/files/pil.3196.pdf', 'Gabapentin بعد مضادات الحموضة بساعتين', 'Gabapentin 2 hours after antacids', 'd', false),
 (75, 'Gilead, U.S. prescribing information', 'BIKTARVY (bictegravir, emtricitabine, tenofovir alafenamide): Prescribing information',
      'https://www.gilead.com/-/media/files/pdfs/medicines/hiv/biktarvy/biktarvy_pi.pdf', 'Bictegravir مع الكالسيوم والحديد والمغنيسيوم', 'Bictegravir with calcium, iron and magnesium', 'd', false),
 -- the improved tools: lab history (serum folate), tablet counter (zinc acetate), unit converter (serum zinc and copper)
 (76, 'World Health Organization, 2015', 'Serum and red blood cell folate concentrations for assessing folate status in populations (WHO/NMH/NHD/EPG/15.01)',
      'https://www.who.int/publications/i/item/WHO-NMH-NHD-EPG-15.01', 'حد نقص الفولات في الدم: أقل من 4 ng/mL (10 nmol/L)', 'Serum folate deficiency: below 4 ng/mL (10 nmol/L)', 'g', false),
 (77, 'American Family Physician, 2009', 'Saper RB, Rash R. Zinc: An Essential Micronutrient. Am Fam Physician 2009;79(9):768–772',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC2820120/', 'نسبة الزنك العنصري في أملاحه', 'Elemental zinc in zinc salts', 'o', false),
 (78, 'Nutrients, 2021', 'Zhang H, et al. Study on Reference Range of Zinc, Copper and Copper/Zinc Ratio in Childbearing Women of China. Nutrients 2021;13(3):946',
      'https://doi.org/10.3390/nu13030946', 'تحويل وحدات الزنك والنحاس في الدم', 'Converting serum zinc and copper units', 'o', false)
on conflict (id) do nothing;

-- 2. New interactions -------------------------------------------------------------------------------------------------------
insert into public.interactions (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed)
select v.* from (values
 -- eltrombopag: label «at least 2 hours before or 4 hours after» polyvalent cations
 ('fe','الحديد','Iron','Eltrombopag (Promacta)','Eltrombopag (Promacta)',
  'يقلل امتصاص Eltrombopag بشدة؛ يؤخذ الدواء قبل الحديد بساعتين على الأقل أو بعده بـ 4 ساعات','Greatly lowers eltrombopag absorption; take the drug at least 2 hours before or 4 hours after iron','major','{72}'::int[],500,false),
 ('ca','الكالسيوم','Calcium','Eltrombopag (Promacta)','Eltrombopag (Promacta)',
  'يقلل امتصاص Eltrombopag بشدة؛ يؤخذ الدواء قبل الكالسيوم بساعتين على الأقل أو بعده بـ 4 ساعات','Greatly lowers eltrombopag absorption; take the drug at least 2 hours before or 4 hours after calcium','major','{72}',510,false),
 ('mg','المغنيسيوم','Magnesium','Eltrombopag (Promacta)','Eltrombopag (Promacta)',
  'يقلل امتصاص Eltrombopag بشدة؛ يؤخذ الدواء قبل المغنيسيوم بساعتين على الأقل أو بعده بـ 4 ساعات','Greatly lowers eltrombopag absorption; take the drug at least 2 hours before or 4 hours after magnesium','major','{72}',520,false),
 ('zn','الزنك','Zinc','Eltrombopag (Promacta)','Eltrombopag (Promacta)',
  'يقلل امتصاص Eltrombopag بشدة؛ يؤخذ الدواء قبل الزنك بساعتين على الأقل أو بعده بـ 4 ساعات','Greatly lowers eltrombopag absorption; take the drug at least 2 hours before or 4 hours after zinc','major','{72}',530,false),
 -- baloxavir: label «avoid co-administration» (no interval given)
 ('fe','الحديد','Iron','Baloxavir (Xofluza)','Baloxavir (Xofluza)',
  'قد يقلل فعالية Baloxavir؛ تجنّب أخذهما معاً (النشرة لا تحدد فاصلاً زمنياً)','May reduce baloxavir''s effect; avoid taking them together (the label gives no time interval)','major','{73}',540,false),
 ('ca','الكالسيوم','Calcium','Baloxavir (Xofluza)','Baloxavir (Xofluza)',
  'قد يقلل فعالية Baloxavir؛ تجنّب أخذهما معاً، وكذلك الحليب والمشروبات المدعّمة بالكالسيوم (النشرة لا تحدد فاصلاً زمنياً)','May reduce baloxavir''s effect; avoid taking them together, and also dairy and calcium-fortified drinks (the label gives no time interval)','major','{73}',550,false),
 ('mg','المغنيسيوم','Magnesium','Baloxavir (Xofluza)','Baloxavir (Xofluza)',
  'قد يقلل فعالية Baloxavir؛ تجنّب أخذهما معاً، ومنها الملينات ومضادات الحموضة التي فيها مغنيسيوم','May reduce baloxavir''s effect; avoid taking them together, including magnesium laxatives and antacids','major','{73}',560,false),
 ('zn','الزنك','Zinc','Baloxavir (Xofluza)','Baloxavir (Xofluza)',
  'قد يقلل فعالية Baloxavir؛ تجنّب أخذهما معاً (النشرة لا تحدد فاصلاً زمنياً)','May reduce baloxavir''s effect; avoid taking them together (the label gives no time interval)','major','{73}',570,false),
 -- gabapentin: UK leaflet «taken at the earliest two hours after taking an antacid» (aluminium and magnesium)
 ('mg','المغنيسيوم','Magnesium','Gabapentin','Gabapentin',
  'مضادات الحموضة التي فيها مغنيسيوم وألومنيوم تقلل امتصاص Gabapentin؛ يؤخذ Gabapentin بعدها بساعتين على الأقل','Antacids with magnesium and aluminium lower gabapentin absorption; take gabapentin at least 2 hours after them','minor','{74}',580,false),
 -- bictegravir (Biktarvy): U.S. label
 ('ca','الكالسيوم','Calcium','Bictegravir (Biktarvy)','Bictegravir (Biktarvy)',
  'يؤخذان معاً مع الطعام. على معدة فارغة لا يؤخذان معاً؛ وفي الحمل يؤخذ Biktarvy قبل الكالسيوم بساعتين أو بعده بـ 6 ساعات','Take them together with food. Not together on an empty stomach; in pregnancy take Biktarvy 2 hours before or 6 hours after calcium','moderate','{75}',590,false),
 ('fe','الحديد','Iron','Bictegravir (Biktarvy)','Bictegravir (Biktarvy)',
  'يؤخذان معاً مع الطعام. على معدة فارغة لا يؤخذان معاً؛ وفي الحمل يؤخذ Biktarvy قبل الحديد بساعتين أو بعده بـ 6 ساعات','Take them together with food. Not together on an empty stomach; in pregnancy take Biktarvy 2 hours before or 6 hours after iron','moderate','{75}',600,false),
 ('mg','المغنيسيوم','Magnesium','Bictegravir (Biktarvy)','Bictegravir (Biktarvy)',
  'مضادات الحموضة التي فيها مغنيسيوم أو ألومنيوم: يؤخذ Biktarvy قبلها بساعتين على الأقل أو بعدها بـ 6 ساعات، مع الطعام أو بدونه','Antacids with magnesium or aluminium: take Biktarvy at least 2 hours before or 6 hours after them, with or without food','moderate','{75}',610,false)
) as v(nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed)
where not exists (select 1 from public.interactions i where i.nutrient_id = v.nutrient_id and i.with_en = v.with_en and not i.deleted);

-- 3. One name for each drug group in Arabic (review of 1.13.0). The approved text stays visible until the owner approves the edit in 🔔.
update public.interactions t set with_ar = 'Orlistat وCholestyramine والكورتيكوستيرويدات', pub = to_jsonb(t) - 'pub', reviewed = false
 where with_en = 'Orlistat, cholestyramine, glucocorticoids' and with_ar <> 'Orlistat وCholestyramine والكورتيكوستيرويدات' and reviewed and not deleted;
update public.interactions t set with_ar = replace(with_ar, 'البايفوسفونيت', 'البيسفوسفونات'), pub = to_jsonb(t) - 'pub', reviewed = false
 where with_ar like '%البايفوسفونيت%' and reviewed and not deleted;

-- 4. «Coming next» after 1.13.0 (owner's request: the page follows the updates). Only the roadmap of the draft changes;
--    the owner sees it in his draft and it reaches visitors when he publishes.
do $$
declare rm jsonb := $rm$[
 {"t":{"ar":"تذكير بمواعيد الجرعات","en":"Dose reminders"},"d":{"ar":"من جدول المكملات أو خطة العلاج اضغط «أضف إلى التقويم» فتُضاف مواعيد الجرعات إلى تقويم هاتفك وينبّهك في وقتها.","en":"In the supplement schedule or the treatment plan, tap «Add to calendar» and the doses are added to your phone's calendar with an alert."},"go":"sch","ic":"bell","st":"now"},
 {"t":{"ar":"جدول يومي ذكي للمكملات","en":"Smart daily schedule"},"d":{"ar":"ترتيب أوقات أخذ المكملات وأدويتك معاً بحيث تُحترم فواصل التداخلات تلقائياً.","en":"Arranges the times for your supplements and medicines so interaction gaps are respected automatically."},"go":"sch","ic":"clock","st":"now"},
 {"t":{"ar":"سجل التحاليل ومتابعة التحسن","en":"Lab history and progress"},"d":{"ar":"احفظ نتائج تحاليلك وشاهد تحسّن المستوى على رسم بياني بين تحليل وآخر.","en":"Save your test results and see your level improve on a chart from one test to the next."},"go":"labs","ic":"chart","st":"now"},
 {"t":{"ar":"أدويتي","en":"My medicines"},"d":{"ar":"صفحة خاصة تضيف فيها أدويتك الحالية فتظهر التداخلات التي تخصك فقط مع المكملات.","en":"A page of its own where you add the medicines you take and see only the interactions that apply to you."},"go":"meds","ic":"pill","st":"now"},
 {"t":{"ar":"تقرير PDF للطبيب","en":"PDF report for your doctor"},"d":{"ar":"ملف مفصّل بالنتيجة والخطة والمصادر لطباعته أو إرساله للطبيب.","en":"A detailed file with the result, plan and sources to print or send to your doctor."},"go":"report","ic":"share","st":"now"},
 {"t":{"ar":"قسم خاص للحمل والأطفال","en":"Pregnancy and children section"},"d":{"ar":"جرعات مفصّلة حسب ثلث الحمل وعمر الطفل ووزنه، يراجعها صيدلي.","en":"Detailed doses by trimester and by child age and weight, reviewed by a pharmacist."},"go":"preg","ic":"baby","st":"now"},
 {"t":{"ar":"بعد عمليات السمنة","en":"After weight-loss surgery"},"d":{"ar":"المكملات اليومية بعد التكميم وتحويل المسار والربط وتحويل الاثني عشر، حسب نوع العملية (ASMBS).","en":"Daily supplements after sleeve, bypass, band and duodenal switch, by type of surgery (ASMBS)."},"go":"bar","ic":"plus","st":"now"},
 {"t":{"ar":"نقص فيتامين B1","en":"Vitamin B1 deficiency"},"d":{"ar":"جرعات الثيامين للنقص، وللاعتماد على الكحول، وللوقاية من اعتلال فيرنيكه وعلاجه.","en":"Thiamine doses for deficiency, alcohol dependence, and preventing and treating Wernicke encephalopathy."},"go":"thi","ic":"pill","st":"now"},
 {"t":{"ar":"توسيع المحتوى باستمرار","en":"Content keeps growing"},"d":{"ar":"نضيف فيتامينات ومعادن وتداخلات دوائية جديدة باستمرار، ويراجع صيدلي كل إضافة قبل نشرها.","en":"We keep adding vitamins, minerals and drug interactions, and a pharmacist reviews every addition before it is published."},"ic":"plus","st":"dev"},
 {"t":{"ar":"قراءة العبوة بالكاميرا","en":"Scan the pack with your camera"},"d":{"ar":"صوّر علبة المكمل فيتعرّف التطبيق على التركيز ويحسب عدد الحبات مباشرة.","en":"Photograph the supplement box and the app reads the strength and counts the tablets for you."},"ic":"cam","st":"idea"}
]$rm$::jsonb;
begin
  if exists (select 1 from public.site_config where id = 'draft') then
    update public.site_config set data = jsonb_set(data, '{roadmap}', rm), updated_at = now() where id = 'draft';
  else
    insert into public.site_config (id, data, updated_at)
      select 'draft', coalesce(data, '{}'::jsonb) || jsonb_build_object('roadmap', rm), now() from public.site_config where id = 'published';
  end if;
end $$;

-- 5. Information pages corrected after the 1.13.0 review (owner's request: «صحح الملاحظات والشروحات… ومن نحن»).
--    Only these pages' title/text change in the draft; order, hidden flags and other pages stay as they are.
do $$
declare upd jsonb := $pg$
{"who":{"t":{"ar":"من نحن","en":"About us"},"b":{"ar":"VITAWAW مشروع أكاديمي في الصيدلة – جامعة الشرق الأوسط، بعنوان «حساب جرع الفيتامينات».\n\nفريق العمل: الصيدلي سيف الدين يحيى خليفة (قائد الفريق)، عبد الرزاق عبد الجليل علي، راكان علي شهاب، بلال خلف.\n\nهدفنا تبسيط حساب جرعات الفيتامينات والمعادن للصيادلة والمرضى، بالاعتماد على مصادر علمية موثوقة يراجعها صيدلي.","en":"VITAWAW is an academic pharmacy project at Middle East University, titled «Vitamin dose calculation».\n\nTeam: pharmacist Saifaldeen Yahya Khalifa (team leader), Abdulrazzaq Abduljaleel Ali, Rakan Ali Shehab and Bilal Khalaf.\n\nOur aim is to make vitamin and mineral dosing simpler for pharmacists and patients, based on trusted scientific sources reviewed by a pharmacist."}},
 "about":{"t":{"ar":"حول التطبيق","en":"About the app"},"b":{"ar":"VITAWAW حاسبة لجرعات الفيتامينات والمعادن مبنية على مصادر طبية موثوقة، مع التداخلات الدوائية وأدوات صيدلانية مساعدة.\n\nفي وضع الصيدلي يظهر بجانب كل رقم في النتيجة رقم مصدره، واضغطه لفتح المصدر. وفي وضع المريض تظهر النتيجة بكلام مبسط دون أرقام المصادر.\n\nيراجع صيدلي كل إضافة جديدة قبل أن تظهر للزوار.","en":"VITAWAW is a vitamin and mineral dose calculator based on trusted medical sources, with drug interactions and pharmacy tools.\n\nIn pharmacist mode, every number in a result shows the number of its source; tap it to open the source. In patient mode the result is in plain words, without source numbers.\n\nA pharmacist reviews every new addition before visitors can see it."}},
 "howto":{"t":{"ar":"طريقة الاستخدام","en":"How to use"},"b":{"ar":"١. اختر الفيتامين أو المعدن، أو إحدى الحاسبات الخاصة: الحمل والرضاعة، الرضيع، فيتامين A للأطفال، بعد عمليات السمنة، نقص فيتامين B1.\n٢. أدخل العمر والجنس ونتيجة التحليل إن وُجدت.\n٣. تظهر النتيجة فوراً: الجرعة والخطة والتحذيرات.\n٤. من أزرار تحت النتيجة افتح الأداة المناسبة: عدد الحبات أو القطرات أو المل، جدول المكملات، التقويم، تقرير للطبيب.\n٥. أضف أدويتك في «أدويتي» لترى تداخلاتها مع المكملات فقط.","en":"1. Choose a vitamin or mineral, or one of the special calculators: pregnancy and breastfeeding, infant, vitamin A for children, after weight-loss surgery, vitamin B1 deficiency.\n2. Enter age, sex and the lab result if you have one.\n3. The result appears at once: dose, plan and warnings.\n4. Use the buttons under the result to open the right tool: number of tablets, drops or mL, the supplement schedule, the calendar, a report for the doctor.\n5. Add your medicines in «My medicines» to see only their interactions with supplements."}},
 "faq":{"t":{"ar":"الأسئلة الشائعة","en":"Frequently asked questions"},"b":{"ar":"للصيدلي أو للمريض؟\nاختر «صيدلي» لترى التفاصيل والمصادر والبدائل، أو «مريض» لترى كلاماً مبسطاً فقط. تجد الاختيار أعلى النتيجة وفي القائمة.\n\nلماذا لا تظهر المصادر في وضع المريض؟\nلتبقى النتيجة بسيطة وواضحة. المصادر كاملة في وضع الصيدلي وفي «تقرير للطبيب».\n\nهل تُحفظ بياناتي؟\nلا. ما تدخله يبقى على جهازك. سجل التحاليل وأدويتي وجدول المكملات تُحفظ على جهازك فقط ولا تُرسل لأي جهة.\n\nكيف أحوّل الجرعة إلى حبات أو قطرات أو مل؟\nتحت النتيجة أزرار تفتح الأداة المناسبة معبأة: كم حبة، كم قطرة، كم مل من الشراب.\n\nكيف أتذكر مواعيد الجرعات؟\nاضغط «أضف إلى التقويم» تحت النتيجة أو في جدول المكملات، فتُضاف المواعيد إلى تقويم هاتفك.\n\nكيف أعرض النتيجة على الطبيب؟\nاضغط «تقرير للطبيب» ثم «اطبع أو احفظ PDF»، أو «شارك برابط» ليفتح الطبيب الحاسبة بالقيم نفسها.\n\nهل تغني عن الطبيب؟\nلا. التطبيق يساعد الصيدلي والطبيب ولا يحل محلهما، خاصة للحامل والأطفال ومرضى الكلى.","en":"For pharmacists or patients?\nChoose «Pharmacist» for details, sources and alternatives, or «Patient» for plain words only. The switch is above the result and in the menu.\n\nWhy are the sources hidden in patient mode?\nTo keep the result simple and clear. The full sources are in pharmacist mode and in the «Report for the doctor».\n\nIs my data saved?\nNo. What you enter stays on your device. My lab results, my medicines and the supplement schedule are kept on your device only and are not sent anywhere.\n\nHow do I turn a dose into tablets, drops or mL?\nUnder the result, buttons open the right tool already filled in: tablets, drops, mL of syrup.\n\nHow do I remember the doses?\nTap «Add to calendar» under the result or in the supplement schedule, and the times are added to your phone's calendar.\n\nHow do I show the result to a doctor?\nTap «Report for the doctor» then «Print or save as PDF», or «Share by link» so the doctor opens the calculator with the same values.\n\nDoes it replace a doctor?\nNo. The app supports pharmacists and doctors and does not replace them, especially in pregnancy, children and kidney disease."}},
 "method":{"t":{"ar":"المنهجية العلمية","en":"Scientific method"},"b":{"ar":"اختيار المصادر\nكل جرعة وكل حد مأخوذ من مصدر موثوق، ويظهر رقمه بجانب الرقم في النتيجة (في وضع الصيدلي). الأولوية للإرشادات السريرية (Endocrine Society وNICE وWHO وAAP وBSG وKDIGO وASMBS)، ثم المراجع الرسمية (NIH Office of Dietary Supplements للاحتياج والحد الأعلى، وNHS وBNF)، ثم نشرات الأدوية الرسمية (FDA وSmPC) للتداخلات والفواصل، ثم المراجعات المنهجية (Cochrane). لا تُستخدم مواقع ثانوية عندما يوجد مصدر أصلي.\n\nعند اختلاف الإرشادات\nتذكر النتيجة الخلاف بوضوح، مثل الفرق بين إرشاد فيتامين D لعام 2011 ولعام 2024، ولا يُخفى أي رأي.\n\nالمراجعة والاعتماد\nكل إضافة أو تعديل يكتبه صيدلي من الفريق يبقى غير ظاهر للزوار حتى يراجعه الصيدلي المسؤول ويعتمده وينشره. قاعدة البيانات نفسها تفرض ذلك، ويُحفظ سجل لكل نسخة منشورة.\n\nالتحقق\nتُختبر الحاسبات آلياً على 62 حالة طبية ثابتة تقارن النتيجة بما يقوله المصدر (فيتامين D وB12 والحديد والكالسيوم والمغنيسيوم والحمل والرضيع وفيتامين A وما بعد عمليات السمنة ونقص فيتامين B1)، وتُختبر الأدوات ومعادلاتها، وتُفحص روابط المصادر أسبوعياً.\n\nالحدود\nالتطبيق أداة مساعدة تعليمية، ولا يغني عن التقييم السريري. الحالات الخاصة (الحمل عالي الخطورة، القصور الكلوي، الأطفال) تُحال إلى الطبيب المختص.","en":"Choosing sources\nEvery dose and limit comes from a trusted source, whose number appears next to it in the result (in pharmacist mode). Clinical guidelines come first (Endocrine Society, NICE, WHO, AAP, BSG, KDIGO, ASMBS), then official references (NIH Office of Dietary Supplements for needs and upper limits, NHS and BNF), then official drug labels (FDA, SmPC) for interactions and timing, then systematic reviews (Cochrane). Secondary websites are not used where a primary source exists.\n\nWhen guidelines differ\nThe result states the difference clearly, for example between the 2011 and 2024 vitamin D guidelines, and no view is hidden.\n\nReview and approval\nEvery addition or edit by a team pharmacist stays hidden from visitors until the responsible pharmacist reviews, approves and publishes it. The database itself enforces this, and every published version is kept.\n\nValidation\nThe calculators are tested automatically on 62 fixed medical cases that compare the result with the source (vitamin D, B12, iron, calcium, magnesium, pregnancy, infant, vitamin A, after weight-loss surgery and vitamin B1 deficiency); the tools and their formulas are tested too, and source links are checked every week.\n\nLimits\nThe app is an educational support tool and does not replace clinical assessment. Special situations (high-risk pregnancy, kidney disease, children) are referred to the specialist."}}}
$pg$::jsonb;
begin
  update public.site_config set data = jsonb_set(data, '{pages}', (
      select coalesce(jsonb_agg(case when upd ? (e ->> 'id') then e || (upd -> (e ->> 'id')) else e end order by n), '[]'::jsonb)
        from jsonb_array_elements(coalesce(data -> 'pages', '[]'::jsonb)) with ordinality as x(e, n))), updated_at = now()
   where id = 'draft';
end $$;
