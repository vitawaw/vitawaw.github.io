-- VITAWAW content update after the scientific review of 2026-10-29 (approved by the owner: «اريدها كلها»).
-- Run in the Supabase SQL editor. Every change waits in 🔔 for the owner's final approval:
--   * new items are added with reviewed = false (shown as «إضافة جديدة»);
--   * changed items keep their approved version in "pub" (shown as «تعديل على محتوى معتمد»; visitors see the old one
--     until approval). Nothing reaches visitors before the owner approves and publishes.

-- 1. New sources -----------------------------------------------------------------------------------------------
insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed) values
 (45, 'U.S. FDA (Cipro label)', 'CIPRO (ciprofloxacin) tablets: Full Prescribing Information', 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2016/019537s086lbl.pdf',
      'فاصل المضاد عن الكالسيوم والحديد والمغنيسيوم والزنك', 'Spacing from calcium, iron, magnesium and zinc', 'd', false),
 (46, 'NIH Office of Dietary Supplements', 'Pantothenic Acid: Fact Sheet for Health Professionals', 'https://ods.od.nih.gov/factsheets/PantothenicAcid-HealthProfessional/',
      'الاحتياج اليومي', 'Daily needs', 'o', false),
 (47, 'NIH Office of Dietary Supplements', 'Chromium: Fact Sheet for Health Professionals', 'https://ods.od.nih.gov/factsheets/Chromium-HealthProfessional/',
      'الاحتياج اليومي والتداخلات', 'Daily needs, interactions', 'o', false),
 (48, 'NIH Office of Dietary Supplements', 'Manganese: Fact Sheet for Health Professionals', 'https://ods.od.nih.gov/factsheets/Manganese-HealthProfessional/',
      'الاحتياج اليومي والحد الأعلى', 'Daily needs, upper limit', 'o', false),
 (49, 'NIH Office of Dietary Supplements', 'Molybdenum: Fact Sheet for Health Professionals', 'https://ods.od.nih.gov/factsheets/Molybdenum-HealthProfessional/',
      'الاحتياج اليومي والحد الأعلى', 'Daily needs, upper limit', 'o', false),
 (50, 'NIH Office of Dietary Supplements', 'Phosphorus: Fact Sheet for Health Professionals', 'https://ods.od.nih.gov/factsheets/Phosphorus-HealthProfessional/',
      'الاحتياج اليومي والحد الأعلى والتداخلات', 'Daily needs, upper limit, interactions', 'o', false),
 -- sources of the new calculators in 1.7.0 (pregnancy, infant, vitamin A for children, iron by Hb + ferritin, magnesium for children)
 (51, 'World Health Organization, 2024', 'Guideline on haemoglobin cutoffs to define anaemia in individuals and populations', 'https://www.who.int/publications/i/item/9789240088542',
      'حدود الهيموغلوبين لفقر الدم حسب العمر والحمل', 'Haemoglobin cut-offs for anaemia by age and pregnancy', 'g', false),
 (52, 'World Health Organization, 2020', 'WHO guideline on use of ferritin concentrations to assess iron status in individuals and populations', 'https://www.who.int/publications/i/item/9789240000124',
      'حدود Ferritin ومع وجود الالتهاب', 'Ferritin cut-offs, including with inflammation', 'g', false),
 (53, 'World Health Organization, 2011', 'Guideline: Vitamin A supplementation in infants and children 6–59 months of age', 'https://www.who.int/publications/i/item/9789241501767',
      'جرعات فيتامين A الوقائية للأطفال', 'Preventive vitamin A doses for children', 'g', false),
 (54, 'WHO / UNICEF / IVACG, 1997', 'Vitamin A supplements: a guide to their use in the treatment and prevention of vitamin A deficiency and xerophthalmia, 2nd ed.', 'https://www.who.int/publications/i/item/9241545062',
      'علاج جفاف العين والحصبة بفيتامين A', 'Vitamin A for xerophthalmia and measles', 'g', false),
 (55, 'American Academy of Pediatrics, 2008', 'Wagner CL, Greer FR. Prevention of rickets and vitamin D deficiency in infants, children, and adolescents. Pediatrics 2008;122(5):1142–1152', 'https://doi.org/10.1542/peds.2008-1862',
      'فيتامين D 400 IU للرضّع', 'Vitamin D 400 IU for infants', 'g', false),
 (56, 'American Academy of Pediatrics, 2022', 'Hand I, et al. Vitamin K and the newborn infant. Pediatrics 2022;149(3):e2021056036', 'https://doi.org/10.1542/peds.2021-056036',
      'فيتامين K عند الولادة', 'Vitamin K at birth', 'g', false),
 (57, 'World Health Organization, 2016', 'WHO recommendations on antenatal care for a positive pregnancy experience', 'https://www.who.int/publications/i/item/9789241549912',
      'الحديد وحمض الفوليك والكالسيوم في الحمل', 'Iron, folic acid and calcium in pregnancy', 'g', false),
 (58, 'The Royal Children''s Hospital Melbourne', 'Clinical Practice Guideline: Hypomagnesaemia', 'https://www.rch.org.au/clinicalguide/guideline_index/Hypomagnesaemia/',
      'جرعة المغنيسيوم الفموية للأطفال', 'Oral magnesium dose for children', 'g', false)
on conflict (id) do nothing;

-- 2. Corrections to approved content (the approved version stays live until the owner approves) ------------------
-- Calcium + quinolones: the label says 2 hours before or 6 hours after (it said 2 hours after).
update public.interactions t set
  with_ar = 'الكينولونات (Ciprofloxacin وMoxifloxacin)', with_en = 'Quinolones (ciprofloxacin, moxifloxacin)',
  desc_ar = 'الكالسيوم يقلل امتصاص المضاد؛ يؤخذ Ciprofloxacin قبل الكالسيوم بساعتين أو بعده بـ 6 ساعات، ولباقي الكينولونات تُتبع نشرة الدواء',
  desc_en = 'Calcium lowers the antibiotic''s absorption; take ciprofloxacin 2 hours before or 6 hours after calcium, and follow the leaflet for other quinolones',
  source_ids = '{45,18}', pub = to_jsonb(t) - 'pub', reviewed = false
 where id = 43 and reviewed;
-- Source 14: the original AAP article instead of the summary site
update public.sources t set org = 'American Academy of Pediatrics, Pediatrics 2026', url = 'https://doi.org/10.1542/peds.2026-077414',
  pub = to_jsonb(t) - 'pub', reviewed = false
 where id = 14 and reviewed;
-- Source 27: the Pfizer page moved to a new address
update public.sources t set url = 'https://www.pfizermedical.com/patient/levoxyl/full-patient-information',
  pub = to_jsonb(t) - 'pub', reviewed = false
 where id = 27 and reviewed;

-- 3. New vitamins and minerals (NIH reference values; infants = first 6 months – 7 to 12 months) -----------------
insert into public.nutrients (id, builtin, sort, name_ar, name_en, hint_ar, hint_en, unit, dose_rows, note_ar, note_en, source_ids, reviewed) values
('b5', false, 230, 'فيتامين B5', 'Vitamin B5', 'حمض البانتوثينيك', 'Pantothenic acid', 'mg',
 '[{"a0":0,"a1":0,"sx":"all","rda":"1.7–1.8","ul":""},{"a0":1,"a1":3,"sx":"all","rda":"2","ul":""},{"a0":4,"a1":8,"sx":"all","rda":"3","ul":""},{"a0":9,"a1":13,"sx":"all","rda":"4","ul":""},{"a0":14,"a1":110,"sx":"all","rda":"5","ul":""},{"a0":14,"a1":50,"sx":"p","rda":"6","ul":""},{"a0":14,"a1":50,"sx":"l","rda":"7","ul":""}]',
 'قيم احتياج كافٍ (AI)، ولا يوجد حد أعلى لعدم تسجيل آثار ضارة. النقص نادر جداً لتوفره في معظم الأطعمة. للرضّع: 1.7 لأول 6 أشهر و1.8 من 7 إلى 12 شهراً.',
 'Adequate intake (AI) values; no upper limit, as no harm has been reported. Deficiency is very rare because it is in most foods. Infants: 1.7 for the first 6 months and 1.8 from 7 to 12 months.',
 '{46}', false),
('chromium', false, 240, 'الكروم', 'Chromium', 'استقلاب السكر', 'Glucose metabolism', 'mcg',
 '[{"a0":0,"a1":0,"sx":"all","rda":"0.2–5.5","ul":""},{"a0":1,"a1":3,"sx":"all","rda":"11","ul":""},{"a0":4,"a1":8,"sx":"all","rda":"15","ul":""},{"a0":9,"a1":13,"sx":"m","rda":"25","ul":""},{"a0":9,"a1":13,"sx":"f","rda":"21","ul":""},{"a0":14,"a1":18,"sx":"m","rda":"35","ul":""},{"a0":14,"a1":18,"sx":"f","rda":"24","ul":""},{"a0":14,"a1":18,"sx":"p","rda":"29","ul":""},{"a0":14,"a1":18,"sx":"l","rda":"44","ul":""},{"a0":19,"a1":50,"sx":"m","rda":"35","ul":""},{"a0":19,"a1":50,"sx":"f","rda":"25","ul":""},{"a0":19,"a1":50,"sx":"p","rda":"30","ul":""},{"a0":19,"a1":50,"sx":"l","rda":"45","ul":""},{"a0":51,"a1":110,"sx":"m","rda":"30","ul":""},{"a0":51,"a1":110,"sx":"f","rda":"20","ul":""}]',
 'قيم احتياج كافٍ (AI)، ولا يوجد حد أعلى. لم تثبت فائدة مكملات الكروم في علاج السكري أو إنقاص الوزن بأدلة كافية. للرضّع: 0.2 لأول 6 أشهر و5.5 من 7 إلى 12 شهراً.',
 'Adequate intake (AI) values; no upper limit. Chromium supplements have not been shown well enough to help diabetes or weight loss. Infants: 0.2 for the first 6 months and 5.5 from 7 to 12 months.',
 '{47}', false),
('manganese', false, 250, 'المنغنيز', 'Manganese', 'العظام والاستقلاب', 'Bones and metabolism', 'mg',
 '[{"a0":0,"a1":0,"sx":"all","rda":"0.003–0.6","ul":""},{"a0":1,"a1":3,"sx":"all","rda":"1.2","ul":"2"},{"a0":4,"a1":8,"sx":"all","rda":"1.5","ul":"3"},{"a0":9,"a1":13,"sx":"m","rda":"1.9","ul":"6"},{"a0":9,"a1":13,"sx":"f","rda":"1.6","ul":"6"},{"a0":14,"a1":18,"sx":"m","rda":"2.2","ul":"9"},{"a0":14,"a1":18,"sx":"f","rda":"1.6","ul":"9"},{"a0":14,"a1":18,"sx":"p","rda":"2.0","ul":"9"},{"a0":14,"a1":18,"sx":"l","rda":"2.6","ul":"9"},{"a0":19,"a1":110,"sx":"m","rda":"2.3","ul":"11"},{"a0":19,"a1":110,"sx":"f","rda":"1.8","ul":"11"},{"a0":19,"a1":50,"sx":"p","rda":"2.0","ul":"11"},{"a0":19,"a1":50,"sx":"l","rda":"2.6","ul":"11"}]',
 'قيم احتياج كافٍ (AI). الزيادة الكبيرة (مثل التعرض المهني أو مرض الكبد) قد تسبب أعراضاً عصبية تشبه باركنسون. للرضّع: 0.003 لأول 6 أشهر و0.6 من 7 إلى 12 شهراً، ولا يُحدد لهم حد أعلى.',
 'Adequate intake (AI) values. Large excess (for example occupational exposure or liver disease) can cause Parkinson-like nerve symptoms. Infants: 0.003 for the first 6 months and 0.6 from 7 to 12 months, with no upper limit set.',
 '{48}', false),
('molybdenum', false, 260, 'الموليبدنوم', 'Molybdenum', 'إنزيمات الجسم', 'Body enzymes', 'mcg',
 '[{"a0":0,"a1":0,"sx":"all","rda":"2–3","ul":""},{"a0":1,"a1":3,"sx":"all","rda":"17","ul":"300"},{"a0":4,"a1":8,"sx":"all","rda":"22","ul":"600"},{"a0":9,"a1":13,"sx":"all","rda":"34","ul":"1,100"},{"a0":14,"a1":18,"sx":"all","rda":"43","ul":"1,700"},{"a0":14,"a1":18,"sx":"p","rda":"50","ul":"1,700"},{"a0":14,"a1":18,"sx":"l","rda":"50","ul":"1,700"},{"a0":19,"a1":110,"sx":"all","rda":"45","ul":"2,000"},{"a0":19,"a1":50,"sx":"p","rda":"50","ul":"2,000"},{"a0":19,"a1":50,"sx":"l","rda":"50","ul":"2,000"}]',
 'النقص نادر جداً. للرضّع احتياج كافٍ: 2 لأول 6 أشهر و3 من 7 إلى 12 شهراً، ولا يُحدد لهم حد أعلى.',
 'Deficiency is very rare. Infants (adequate intake): 2 for the first 6 months and 3 from 7 to 12 months, with no upper limit set.',
 '{49}', false),
('phosphorus', false, 270, 'الفوسفور', 'Phosphorus', 'العظام والأسنان', 'Bones and teeth', 'mg',
 '[{"a0":0,"a1":0,"sx":"all","rda":"100–275","ul":""},{"a0":1,"a1":3,"sx":"all","rda":"460","ul":"3,000"},{"a0":4,"a1":8,"sx":"all","rda":"500","ul":"3,000"},{"a0":9,"a1":18,"sx":"all","rda":"1,250","ul":"4,000"},{"a0":14,"a1":18,"sx":"p","rda":"1,250","ul":"3,500"},{"a0":19,"a1":70,"sx":"all","rda":"700","ul":"4,000"},{"a0":19,"a1":50,"sx":"p","rda":"700","ul":"3,500"},{"a0":71,"a1":110,"sx":"all","rda":"700","ul":"3,000"}]',
 'للرضّع احتياج كافٍ: 100 لأول 6 أشهر و275 من 7 إلى 12 شهراً. الحد الأعلى في الحمل 3,500 ملغ، وفي الرضاعة 4,000. معظم الناس يحصلون على ما يكفي من الطعام، والزيادة مشكلة خاصة لدى مرضى الكلى.',
 'Infants (adequate intake): 100 for the first 6 months and 275 from 7 to 12 months. Upper limit 3,500 mg in pregnancy and 4,000 mg when breastfeeding. Most people get enough from food; excess is a concern mainly in kidney disease.',
 '{50}', false)
on conflict (id) do nothing;

-- 4. New interactions --------------------------------------------------------------------------------------------
insert into public.interactions (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed) values
('fe', 'الحديد', 'Iron', 'الكينولونات والتتراسيكلينات', 'Quinolones and tetracyclines',
 'الحديد يقلل امتصاص المضاد بشدة؛ يؤخذ Ciprofloxacin قبل الحديد بساعتين أو بعده بـ 6 ساعات، ولباقي المضادات تُتبع نشرة الدواء',
 'Iron greatly lowers the antibiotic''s absorption; take ciprofloxacin 2 hours before or 6 hours after iron, and follow the leaflet for other antibiotics', 'moderate', '{45}', 470, false),
('ca', 'الكالسيوم', 'Calcium', 'التتراسيكلينات (Doxycycline وTetracycline)', 'Tetracyclines (doxycycline, tetracycline)',
 'الكالسيوم يقلل امتصاص المضاد؛ يُفصل بينهما ساعتين على الأقل وتُتبع نشرة الدواء',
 'Calcium lowers the antibiotic''s absorption; separate them by at least 2 hours and follow the leaflet', 'moderate', '{18}', 480, false),
('ca', 'الكالسيوم', 'Calcium', 'البايفوسفونيت (Alendronate وRisedronate)', 'Bisphosphonates (alendronate, risedronate)',
 'يقلل الكالسيوم امتصاص الدواء؛ يؤخذ الدواء صباحاً على معدة فارغة مع ماء، والكالسيوم بعده بـ 30 دقيقة على الأقل والأفضل في وقت آخر من اليوم',
 'Calcium lowers the medicine''s absorption; take the medicine in the morning on an empty stomach with water, and calcium at least 30 minutes later, ideally at another time of day', 'moderate', '{18}', 490, false),
('ca', 'الكالسيوم', 'Calcium', 'مدرات Thiazide', 'Thiazide diuretics',
 'تقلل طرح الكالسيوم في البول، ومع المكملات قد يرتفع الكالسيوم في الدم؛ يُراقب مستواه',
 'They lower calcium loss in urine; with supplements blood calcium may rise, so it is monitored', 'moderate', '{18}', 500, false),
('ca', 'الكالسيوم', 'Calcium', 'الحديد', 'Iron',
 'الكالسيوم يقلل امتصاص الحديد إذا أُخذا معاً؛ يُفصل بينهما ساعتين',
 'Calcium lowers iron absorption when taken together; separate them by 2 hours', 'minor', '{15,18}', 510, false),
('c', 'فيتامين C', 'Vitamin C', 'الحديد', 'Iron',
 'يزيد امتصاص الحديد غير الهيمي (من النبات والمكملات)، فأخذهما معاً مفيد',
 'It increases absorption of non-heme iron (from plants and supplements), so taking them together helps', 'minor', '{23,15}', 520, false),
('c', 'فيتامين C', 'Vitamin C', 'العلاج الكيميائي والإشعاعي', 'Chemotherapy and radiotherapy',
 'يُنصح عادة بتجنب الجرعات العالية من مضادات الأكسدة أثناء العلاج إلا بإشراف طبيب الأورام، لاحتمال تقليل فعاليته، والأدلة غير حاسمة',
 'High-dose antioxidants are usually avoided during treatment unless the oncologist agrees, as they might reduce its effect; the evidence is inconclusive', 'moderate', '{23}', 530, false),
('c', 'فيتامين C', 'Vitamin C', 'Simvastatin مع Niacin', 'Simvastatin with niacin',
 'مزيج مضادات الأكسدة (فيتامين C وE والسيلينيوم وبيتا كاروتين) قلّل ارتفاع الكوليسترول النافع HDL',
 'An antioxidant mix (vitamins C and E, selenium, beta-carotene) blunted the rise in HDL ("good") cholesterol', 'minor', '{23}', 540, false),
('zn', 'الزنك', 'Zinc', 'مدرات Thiazide', 'Thiazide diuretics',
 'تزيد طرح الزنك في البول بنحو 60%، وقد يقل مخزونه مع الاستعمال الطويل',
 'They raise zinc loss in urine by about 60%, which may lower zinc stores with long-term use', 'minor', '{25}', 550, false),
('chromium', 'الكروم', 'Chromium', 'أدوية السكري (الإنسولين وغيره)', 'Diabetes medicines (insulin and others)',
 'قد يخفض الكروم السكر، فيُراقب السكر عند الجمع بينهما',
 'Chromium may lower blood sugar, so blood sugar is monitored when they are combined', 'minor', '{47}', 560, false),
('chromium', 'الكروم', 'Chromium', 'Levothyroxine', 'Levothyroxine',
 'قد يقلل الكروم امتصاص الدواء؛ يؤخذ الدواء قبل الكروم بنصف ساعة على الأقل أو بعده بـ 3 إلى 4 ساعات',
 'Chromium may lower the medicine''s absorption; take the medicine at least 30 minutes before or 3–4 hours after chromium', 'minor', '{47}', 570, false),
('phosphorus', 'الفوسفور', 'Phosphorus', 'مضادات الحموضة (الألومنيوم والكالسيوم)', 'Antacids (aluminium, calcium)',
 'ترتبط بالفوسفور وتقلل امتصاصه، وقد تسبب انخفاضه مع الاستعمال الطويل',
 'They bind phosphorus and lower its absorption, which can cause low phosphorus with long-term use', 'moderate', '{50}', 580, false);
