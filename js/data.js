/* VITAWAW · js/data.js
   Built-in medical content: sources (DEF_REFS), which sources belong to each nutrient (DEF_REFGROUP)
   and the default interactions (DEF_INTER). The live content comes from Supabase and replaces these.
   Files are plain scripts loaded in order by index.html (shared global scope, no build step). */
const DEF_REFS={
1:['Medscape','Vitamin D Deficiency and Related Disorders (Tangpricha V, et al.)','https://emedicine.medscape.com/article/128762-overview','مرجع سريري لنقص فيتامين D','Clinical reference on vitamin D deficiency'],
2:['Endocrine Society, 2011','Holick MF, et al. Evaluation, Treatment, and Prevention of Vitamin D Deficiency. J Clin Endocrinol Metab 2011;96(7):1911–1930','https://doi.org/10.1210/jc.2011-0385','بروتوكولات علاج نقص D حسب العمر وعوامل الخطورة','Treatment regimens by age and risk'],
3:['Endocrine Society, 2024','Demay MB, et al. Vitamin D for the Prevention of Disease. J Clin Endocrinol Metab 2024;109:1907–1947','https://doi.org/10.1210/clinem/dgae290','الوقاية وعدم الفحص الروتيني للأصحاء','Prevention; no routine testing in healthy people'],
4:['NIH Office of Dietary Supplements','Vitamin D: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/','الاحتياج اليومي والحد الأعلى والتداخلات','Daily needs, upper limit, interactions'],
5:['NICE NG239, 2024','Vitamin B12 Deficiency in Over 16s: Diagnosis and Management','https://www.nice.org.uk/guidance/ng239','حدود تشخيص نقص B12','B12 diagnostic thresholds'],
6:['Medscape','Pernicious Anemia: Treatment & Management','https://emedicine.medscape.com/article/204930-treatment','نظم الحقن والعلاج الفموي','Injection and oral regimens'],
7:['Medscape Drugs','Cyanocobalamin (Vitamin B12): Dosing','https://reference.medscape.com/drug/vitamin-b12-nascobal-cyanocobalamin-344418','جرعات Cyanocobalamin','Cyanocobalamin dosing'],
8:['NIH Office of Dietary Supplements','Vitamin B12: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/','الاحتياج اليومي والتداخلات','Daily needs, interactions'],
9:['Medscape Drugs','Folic acid (Folvite): Dosing','https://reference.medscape.com/drug/folvite-folic-acid-344419','جرعات حمض الفوليك','Folic acid dosing'],
10:['StatPearls (NCBI Bookshelf)','Folic Acid','https://www.ncbi.nlm.nih.gov/books/NBK554487/','جرعات العلاج والوقاية في الحمل','Treatment and pregnancy doses'],
11:['NIH Office of Dietary Supplements','Folate: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/','الاحتياج اليومي والحد الأعلى','Daily needs, upper limit'],
12:['Medscape','Iron Deficiency Anemia: Treatment & Management','https://emedicine.medscape.com/article/202333-treatment','علاج فقر الدم بعوز الحديد','Treating iron-deficiency anemia'],
13:['Lancet Haematology, 2017','Stoffel NU, et al. Iron absorption from oral iron supplements given on consecutive versus alternate days. Lancet Haematol 2017;4(11):e524–e533','https://doi.org/10.1016/S2352-3026(17)30182-5','جرعة الحديد يوماً بعد يوم','Alternate-day iron dosing'],
14:['American Academy of Pediatrics, Pediatrics 2026','Prevention, Screening, Diagnosis, and Treatment of Iron Deficiency and Iron Deficiency Anemia in Infants, Children, and Adolescents. AAP clinical report, July 2026','https://doi.org/10.1542/peds.2026-077414','جرعات الحديد للأطفال والمراهقين','Iron doses for children and adolescents'],
15:['NIH Office of Dietary Supplements','Iron: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/','الاحتياج اليومي والحد الأعلى ونسب الأملاح','Daily needs, upper limit, salt percentages'],
16:['Medsafe (official data sheet)','Ferinject (ferric carboxymaltose) Data Sheet: Ganzoni method and maximum single dose','https://www.medsafe.govt.nz/profs/datasheet/f/ferinjectinj.pdf','معادلة Ganzoni والحد الأقصى للجرعة','Ganzoni method, maximum dose'],
17:['Medsafe (official data sheet)','Venofer (iron sucrose) Data Sheet','https://medsafe.govt.nz/profs/Datasheet/v/venoferinf.pdf','معادلة Ganzoni لـ Venofer','Ganzoni method for Venofer'],
18:['NIH Office of Dietary Supplements','Calcium: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/','الاحتياج اليومي والحد الأعلى وطريقة الأخذ','Daily needs, upper limit, how to take'],
19:['BMJ, 1973','Payne RB, et al. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J 1973;4:643–646','https://doi.org/10.1136/bmj.4.5893.643','معادلة الكالسيوم المصحح','Corrected calcium formula'],
20:['NIH Office of Dietary Supplements','Magnesium: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/','الاحتياج اليومي والحد الأعلى والتداخلات','Daily needs, upper limit, interactions'],
21:['MSD Manual Professional','Hypomagnesemia','https://www.msdmanuals.com/professional/endocrine-and-metabolic-disorders/electrolyte-disorders/hypomagnesemia','تعريف نقص المغنيسيوم ودواعي العلاج','Definition and when to treat'],
22:['NHS Specialist Pharmacy Service','Treating acute hypomagnesaemia in adults','https://www.sps.nhs.uk/articles/treating-acute-hypomagnesaemia-in-adults/','الجرعة الفموية والمتابعة','Oral dosing and follow-up'],
23:['NIH Office of Dietary Supplements','Vitamin C: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/','الاحتياج اليومي والحد الأعلى','Daily needs, upper limit'],
24:['Cochrane Review, 2013','Hemilä H, Chalker E. Vitamin C for preventing and treating the common cold. CD000980','https://www.cochrane.org/CD000980/ARI_vitamin-c-for-the-common-cold','فيتامين C ونزلات البرد','Vitamin C and colds'],
25:['NIH Office of Dietary Supplements','Zinc: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/','الاحتياج اليومي والحد الأعلى والتداخلات','Daily needs, upper limit, interactions'],
26:['Cochrane Review, 2024','Nault D, et al. Zinc for prevention and treatment of the common cold. CD014914','https://doi.org/10.1002/14651858.CD014914.pub2','الزنك ونزلات البرد','Zinc and colds'],
27:['Pfizer (levothyroxine label)','LEVOXYL (levothyroxine sodium) Full Patient Information','https://www.pfizermedical.com/patient/levoxyl/full-patient-information','فاصل 4 ساعات عن الحديد والكالسيوم','4-hour gap from iron and calcium'],
28:['UK SmPC (electronic medicines compendium)','Folic acid 1 mg/ml oral solution: Summary of Product Characteristics','https://www.medicines.org.uk/emc/product/2449/smpc','مدة علاج نقص الفولات وتحذير B12','Treatment duration; B12 warning'],
29:['BNF (British National Formulary)','Hydroxocobalamin: indications and dose','https://bnf.nice.org.uk/drugs/hydroxocobalamin/','نظم حقن B12 العضلية','Intramuscular B12 regimens'],
51:['World Health Organization, 2024','Guideline on haemoglobin cutoffs to define anaemia in individuals and populations','https://www.who.int/publications/i/item/9789240088542','حدود الهيموغلوبين لفقر الدم حسب العمر والحمل','Haemoglobin cut-offs for anaemia by age and pregnancy'],
52:['World Health Organization, 2020','WHO guideline on use of ferritin concentrations to assess iron status in individuals and populations','https://www.who.int/publications/i/item/9789240000124','حدود Ferritin ومع وجود الالتهاب','Ferritin cut-offs, including with inflammation'],
53:['World Health Organization, 2011','Guideline: Vitamin A supplementation in infants and children 6–59 months of age','https://www.who.int/publications/i/item/9789241501767','جرعات فيتامين A الوقائية للأطفال','Preventive vitamin A doses for children'],
54:['WHO / UNICEF / IVACG, 1997','Vitamin A supplements: a guide to their use in the treatment and prevention of vitamin A deficiency and xerophthalmia, 2nd ed.','https://www.who.int/publications/i/item/9241545062','علاج جفاف العين والحصبة بفيتامين A','Vitamin A for xerophthalmia and measles'],
55:['American Academy of Pediatrics, 2008','Wagner CL, Greer FR. Prevention of rickets and vitamin D deficiency in infants, children, and adolescents. Pediatrics 2008;122(5):1142–1152','https://doi.org/10.1542/peds.2008-1862','فيتامين D 400 IU للرضّع','Vitamin D 400 IU for infants'],
56:['American Academy of Pediatrics, 2022','Hand I, et al. Vitamin K and the newborn infant. Pediatrics 2022;149(3):e2021056036','https://doi.org/10.1542/peds.2021-056036','فيتامين K عند الولادة','Vitamin K at birth'],
57:['World Health Organization, 2016','WHO recommendations on antenatal care for a positive pregnancy experience','https://www.who.int/publications/i/item/9789241549912','الحديد وحمض الفوليك والكالسيوم في الحمل','Iron, folic acid and calcium in pregnancy'],
58:["The Royal Children's Hospital Melbourne","Clinical Practice Guideline: Hypomagnesaemia",'https://www.rch.org.au/clinicalguide/guideline_index/Hypomagnesaemia/','جرعة المغنيسيوم الفموية للأطفال','Oral magnesium dose for children'],
59:['UK SmPC (electronic medicines compendium)','Ferinject (ferric carboxymaltose): Summary of Product Characteristics','https://www.medicines.org.uk/emc/product/5910/smpc','جدول جرعات Ferinject المبسّط','Simplified Ferinject dosing table'],
60:['U.S. FDA (Tivicay label)','TIVICAY (dolutegravir): Full Prescribing Information','https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/204790s031%2C213983s004lbl.pdf','فاصل Dolutegravir عن الحديد والكالسيوم ومضادات الحموضة','Spacing dolutegravir from iron, calcium and antacids']
};
let REFS=DEF_REFS;
const DEF_REFGROUP={d:[1,2,3,4],b12:[5,6,7,8,29],fol:[9,10,11,28],fe:[12,13,14,15,16,17,27,51,52,59],ca:[18,19,27],mg:[20,21,22,58],c:[23,24],zn:[25,26],
  preg:[57,10,11,15,37,4,3,18,44,42,30,51],inf:[55,14,56,4],vac:[53,54,30]};

const DEF_INTER=[
['fe',['الحديد','Iron'],['Levothyroxine','Levothyroxine'],['افصل بينهما 4 ساعات على الأقل','Separate by at least 4 hours'],[27]],
['ca',['الكالسيوم','Calcium'],['Levothyroxine','Levothyroxine'],['افصل بينهما 4 ساعات على الأقل','Separate by at least 4 hours'],[27]],
['fe',['الحديد','Iron'],['الزنك (حديد 25 ملغ فأكثر)','Zinc (iron 25 mg or more)'],['يقلل امتصاص الزنك إذا أُخذا معاً','Lowers zinc absorption when taken together'],[25]],
['zn',['الزنك','Zinc'],['الكينولونات والتتراسيكلينات','Quinolones and tetracyclines'],['المضاد الحيوي قبل الزنك بساعتين أو بعده بـ 4 إلى 6 ساعات','Take the antibiotic 2 hours before or 4–6 hours after zinc'],[25]],
['zn',['الزنك','Zinc'],['Penicillamine','Penicillamine'],['يقلل الزنك امتصاص Penicillamine وفعاليته','Zinc reduces penicillamine absorption and effect'],[25]],
['mg',['المغنيسيوم','Magnesium'],['البايفوسفونيت (Alendronate)','Bisphosphonates (alendronate)'],['افصل بينهما ساعتين على الأقل','Separate by at least 2 hours'],[20]],
['mg',['المغنيسيوم','Magnesium'],['الكينولونات والتتراسيكلينات','Quinolones and tetracyclines'],['المضاد الحيوي قبل المغنيسيوم بساعتين أو بعده بـ 4 إلى 6 ساعات','Take the antibiotic 2 hours before or 4–6 hours after magnesium'],[20]],
['mg',['المغنيسيوم','Magnesium'],['مدرات البول ومثبطات مضخة البروتون','Diuretics and proton pump inhibitors'],['قد تخفض المغنيسيوم مع الاستعمال الطويل، فيُراقب المستوى','May lower magnesium with long-term use; monitor levels'],[20]],
['ca',['الكالسيوم','Calcium'],['نوع الملح','Salt form'],['Carbonate مع الطعام، وCitrate مع الطعام أو بدونه، وبجرعة 500 ملغ أو أقل في المرة','Carbonate with food; citrate with or without food; 500 mg or less per dose'],[18]],
['d',['فيتامين D','Vitamin D'],['Orlistat وCholestyramine والكورتيزون','Orlistat, cholestyramine, glucocorticoids'],['تقلل امتصاص فيتامين D أو تأثيره','Reduce vitamin D absorption or effect'],[4]],
['d',['فيتامين D','Vitamin D'],['مدرات Thiazide','Thiazide diuretics'],['تزيد خطر ارتفاع الكالسيوم مع جرعات D العالية','Raise the risk of high calcium with high vitamin D doses'],[4]],
['b12',['فيتامين B12','Vitamin B12'],['Metformin ومثبطات مضخة البروتون وحاصرات H2','Metformin, PPIs, H2 blockers'],['تقلل B12 مع الاستعمال الطويل، فيُفحص المستوى دورياً','Lower B12 with long-term use; check levels periodically'],[8]],
['fol',['حمض الفوليك','Folic acid'],['Methotrexate ومضادات الصرع وSulfasalazine','Methotrexate, anticonvulsants, sulfasalazine'],['تداخل في الاتجاهين؛ يحدد الطبيب الجرعة','Two-way interaction; the doctor sets the dose'],[11,28]]
];
