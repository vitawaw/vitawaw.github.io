-- VITAWAW 1.16.0 content (owner: «هل هنالك ادوية لها علاقه بالفيتامينات تتداخل معها اذا كانت موجوده ضيفها مع المصادر»).
-- Six interactions found missing in the full review, each from the medicine's official label (data sheet / prescribing information).
-- Every new item is added with reviewed = false: it waits in 🔔 for the owner's approval and reaches visitors only after he publishes.
-- Safe to run twice: sources use fixed ids, interactions are skipped when the same pair already exists.

-- 1. Sources: the labels of the six medicines ---------------------------------------------------------------------------
insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed) values
 (79, 'Medsafe (official data sheet)', 'ISENTRESS (raltegravir) film-coated tablets: Data Sheet',
      'https://www.medsafe.govt.nz/profs/Datasheet/i/Isentresstab.pdf', 'Raltegravir مع مضادات الحموضة والكالسيوم', 'Raltegravir with antacids and calcium', 'd', false),
 (80, 'U.S. FDA labeling (DailyMed)', 'Cefdinir capsules and oral suspension: Prescribing information (Drug interactions: iron supplements, antacids)',
      'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=cefdinir', 'الفصل بين Cefdinir والحديد ومضادات الحموضة', 'Separating cefdinir from iron and antacids', 'd', false),
 (81, 'U.S. FDA labeling (DailyMed)', 'CELLCEPT (mycophenolate mofetil): Prescribing information (Drug interactions: antacids with magnesium or aluminum hydroxide)',
      'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=cellcept', 'Mycophenolate ومضادات الحموضة', 'Mycophenolate and antacids', 'd', false),
 (82, 'U.S. FDA labeling (DailyMed)', 'COMTAN (entacapone) tablets: Prescribing information (Drug interactions: iron preparations)',
      'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=entacapone', 'الفصل بين Entacapone والحديد', 'Separating entacapone from iron', 'd', false),
 (83, 'Medsafe (official data sheet)', 'D-PENAMINE (penicillamine) tablets: Data Sheet',
      'https://www.medsafe.govt.nz/profs/Datasheet/d/dpenaminetab.pdf', 'الفصل بين Penicillamine والحديد', 'Separating penicillamine from iron', 'd', false),
 (84, 'U.S. FDA labeling (DailyMed)', 'Isotretinoin capsules: Prescribing information (Drug interactions: vitamin A)',
      'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=isotretinoin', 'Isotretinoin ومكملات فيتامين A', 'Isotretinoin and vitamin A supplements', 'd', false)
on conflict (id) do nothing;

-- 2. New interactions -------------------------------------------------------------------------------------------------------
insert into public.interactions (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed)
select v.* from (values
 -- raltegravir: Al/Mg antacids not recommended; calcium carbonate: no change with 400 mg twice daily, not recommended with 1200 mg once daily
 ('mg','المغنيسيوم','Magnesium','Raltegravir (Isentress)','Raltegravir (Isentress)',
  'مضادات الحموضة التي فيها مغنيسيوم أو ألومنيوم تخفض مستوى Raltegravir، ولا يُنصح بأخذها معه','Antacids with magnesium or aluminium lower raltegravir levels; taking them with it is not recommended','major','{79}'::int[],700,false),
 ('ca','الكالسيوم','Calcium','Raltegravir (Isentress)','Raltegravir (Isentress)',
  'كربونات الكالسيوم مقبولة مع جرعة 400 ملغ مرتين يومياً، ولا يُنصح بها مع جرعة 1200 ملغ مرة واحدة يومياً','Calcium carbonate is fine with 400 mg twice daily, but not recommended with 1200 mg once daily','moderate','{79}',710,false),
 -- cefdinir: iron 60 mg cut absorption by 80%; take cefdinir 2 hours before or after iron or Al/Mg antacids
 ('fe','الحديد','Iron','Cefdinir','Cefdinir',
  'الحديد يقلل امتصاص المضاد كثيراً؛ يؤخذ Cefdinir قبل الحديد أو بعده بساعتين على الأقل، وقد يحمرّ لون البراز','Iron greatly lowers the antibiotic''s absorption; take cefdinir at least 2 hours before or after iron. Stools may turn reddish','moderate','{80}',720,false),
 ('mg','المغنيسيوم','Magnesium','Cefdinir','Cefdinir',
  'مضادات الحموضة التي فيها مغنيسيوم أو ألومنيوم تقلل امتصاص المضاد؛ يؤخذ Cefdinir قبلها أو بعدها بساعتين','Antacids with magnesium or aluminium lower the antibiotic''s absorption; take cefdinir 2 hours before or after them','moderate','{80}',730,false),
 -- mycophenolate: Mg/Al hydroxide antacids lower MPA exposure; give the antacid at least 2 hours after the dose
 ('mg','المغنيسيوم','Magnesium','Mycophenolate (CellCept)','Mycophenolate (CellCept)',
  'مضادات الحموضة التي فيها هيدروكسيد المغنيسيوم أو الألومنيوم تقلل مستوى الدواء وقد تضعف فعاليته؛ تؤخذ بعده بساعتين على الأقل','Antacids with magnesium or aluminium hydroxide lower the drug''s levels and may weaken it; take them at least 2 hours after it','moderate','{81}',740,false),
 -- entacapone: chelates iron; take at least 2–3 hours apart
 ('fe','الحديد','Iron','Entacapone (Comtan)','Entacapone (Comtan)',
  'يرتبط بالحديد في الأمعاء؛ يُفصل بينهما ساعتان إلى ثلاث ساعات على الأقل','Binds iron in the gut; take them at least 2–3 hours apart','moderate','{82}',750,false),
 -- penicillamine: iron reduces its absorption; two hours between them
 ('fe','الحديد','Iron','Penicillamine','Penicillamine',
  'الحديد يقلل امتصاص Penicillamine؛ يُفصل بينهما ساعتان على الأقل','Iron lowers penicillamine absorption; separate them by at least 2 hours','moderate','{83}',760,false),
 -- isotretinoin: avoid vitamin A supplements (additive toxicity)
 ('vita','فيتامين A','Vitamin A','Isotretinoin','Isotretinoin',
  'تجنّب مكملات فيتامين A أثناء العلاج لأن سميتهما تتضاعف','Avoid vitamin A supplements during treatment because their toxic effects add up','major','{84}',770,false)
) as v(nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed)
where exists (select 1 from public.sources s where s.id = (v.source_ids)[1])
  and not exists (select 1 from public.interactions i where i.nutrient_id = v.nutrient_id and i.with_en = v.with_en and not i.deleted);

-- 3. Source of the new zinc option in the calculator (childhood diarrhoea). Until it is published the page uses the copy in the code.
insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed) values
 (85, 'World Health Organization / UNICEF, 2004', 'Clinical management of acute diarrhoea: WHO/UNICEF joint statement (WHO/FCH/CAH/04.7)',
      'https://www.who.int/publications/i/item/WHO_FCH_CAH_04.7', 'الزنك لإسهال الأطفال: 10 ملغ تحت 6 أشهر و20 ملغ من 6 أشهر لمدة 10 – 14 يوماً', 'Zinc for childhood diarrhoea: 10 mg under 6 months, 20 mg from 6 months, for 10–14 days', 'g', false)
on conflict (id) do nothing;

-- 4. The owner's DRAFT (he sees it, then publishes): pharmacist wording on the privacy page, and the refreshed roadmap
--    (only while the draft still has the old roadmap, so nothing he changed himself is overwritten).
insert into public.site_config (id, data, updated_at) select 'draft', data, now() from public.site_config where id = 'published'
  and not exists (select 1 from public.site_config where id = 'draft');
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'privacy' then jsonb_set(jsonb_set(p, '{b,ar}', to_jsonb(replace(p->'b'->>'ar', 'في «سجل تحاليلي» و«أدويتي»', 'في «سجل التحاليل» و«أدوية المريض»'))),
    '{b,en}', to_jsonb(replace(p->'b'->>'en', 'in «My lab results» and «My medicines»', 'in «Lab results log» and «Patient medicines»'))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'privacy' and strpos(p->'b'->>'ar', 'في «سجل تحاليلي» و«أدويتي»') > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{roadmap}', $rm$[{"st": "now", "go": "sch", "ic": "clock", "t": {"ar": "جدول المكملات وتذكير الجرعات", "en": "Supplement schedule and dose reminders"}, "d": {"ar": "رتّب أوقات المكملات مع أدوية المريض بحيث تُحترم فواصل التداخلات تلقائياً، وأضف المواعيد إلى تقويم الهاتف.", "en": "Arrange supplement times with the patient's medicines so interaction gaps are respected automatically, and add the times to the phone calendar."}}, {"st": "now", "go": "labs", "ic": "chart", "t": {"ar": "سجل التحاليل ومتابعة التحسن", "en": "Lab results log and progress"}, "d": {"ar": "احفظ نتائج التحاليل وشاهد تغيّر المستوى على رسم بياني بين تحليل وآخر.", "en": "Save lab results and see the level change on a chart from one test to the next."}}, {"st": "now", "go": "meds", "ic": "pill", "t": {"ar": "أدوية المريض", "en": "Patient medicines"}, "d": {"ar": "أضف أدوية المريض فتظهر التداخلات التي تخصها فقط مع المكملات. الأدوية مرتبة أبجدياً بالعربية أو الإنجليزية.", "en": "Add the patient's medicines to see only the interactions that concern them. Medicines are sorted A–Z in Arabic or English."}}, {"st": "now", "go": "report", "ic": "share", "t": {"ar": "تقرير للطبيب وبطاقة للمريض", "en": "Doctor report and patient card"}, "d": {"ar": "ملف مفصّل بالنتيجة والخطة والمصادر للطبيب، وبطاقة مبسطة يسلّمها الصيدلي للمريض.", "en": "A detailed file with the result, plan and sources for the doctor, and a simple card the pharmacist hands to the patient."}}, {"st": "now", "go": "preg", "ic": "baby", "t": {"ar": "حاسبات خاصة", "en": "Special calculators"}, "d": {"ar": "الحمل والرضاعة، الرضيع، فيتامين A للأطفال، بعد عمليات السمنة، نقص فيتامين B1، والزنك لإسهال الأطفال (WHO).", "en": "Pregnancy and breastfeeding, infants, vitamin A for children, after weight-loss surgery, vitamin B1 deficiency, and zinc for childhood diarrhoea (WHO)."}}, {"st": "dev", "ic": "plus", "t": {"ar": "تداخلات جديدة من نشرات الأدوية", "en": "New interactions from drug labels"}, "d": {"ar": "نضيف تداخلات الأدوية مع الفيتامينات والمعادن من النشرات الرسمية، ويراجع الصيدلي كل إضافة قبل نشرها.", "en": "We add drug interactions with vitamins and minerals from official labels, and a pharmacist reviews every addition before it is published."}}, {"st": "plan", "ic": "pill", "t": {"ar": "حاسبة الحديد الوريدي Monofer", "en": "IV iron calculator: Monofer"}, "d": {"ar": "جرعة Ferric derisomaltose حسب الوزن والهيموغلوبين من نشرة الدواء، بجانب Ferinject.", "en": "Ferric derisomaltose dose by weight and haemoglobin from the product label, next to Ferinject."}}, {"st": "plan", "ic": "baby", "t": {"ar": "B12 وحمض الفوليك للأطفال", "en": "B12 and folic acid for children"}, "d": {"ar": "جرعات علاج النقص للأطفال حسب العمر من BNF for Children.", "en": "Deficiency treatment doses for children by age from the BNF for Children."}}, {"st": "idea", "ic": "cam", "t": {"ar": "قراءة العبوة بالكاميرا", "en": "Scan the pack with the camera"}, "d": {"ar": "صوّر علبة المكمل فيتعرّف التطبيق على التركيز ويحسب عدد الحبات مباشرة.", "en": "Photograph the supplement box and the app reads the strength and counts the tablets."}}]$rm$::jsonb)
 where id = 'draft' and data->'roadmap'->0->'t'->>'ar' = 'تذكير بمواعيد الجرعات';
