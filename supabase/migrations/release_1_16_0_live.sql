-- VITAWAW 1.16.0 release: everything the live database needs, in one file (each part is safe to run twice).
-- 1) info pages without patient mode  2) new interactions + sources + roadmap (draft)  3) cleanup  4) activity log

-- ===================== content_1_15_0.sql =====================
-- VITAWAW 1.15.0 (owner: «اريد حذف وضع المريض»): the info pages no longer mention a patient mode.
-- Changes the owner's DRAFT only (he sees it, then publishes). Each line replaces an exact sentence, so it is safe to run twice
-- and changes nothing a person has already rewritten.
insert into public.site_config (id, data, updated_at) select 'draft', data, now() from public.site_config where id = 'published'
  and not exists (select 1 from public.site_config where id = 'draft');
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'faq' then jsonb_set(p, '{b,ar}', to_jsonb(replace(p->'b'->>'ar', $q$للصيدلي أو للمريض؟
اختر «صيدلي» لترى التفاصيل والمصادر والبدائل، أو «مريض» لترى كلاماً مبسطاً فقط. تجد الاختيار أعلى النتيجة وفي القائمة.

لماذا لا تظهر المصادر في وضع المريض؟
لتبقى النتيجة بسيطة وواضحة. المصادر كاملة في وضع الصيدلي وفي «تقرير للطبيب».

$q$, $q$لمن التطبيق؟
للصيادلة. تظهر النتيجة كاملة مع رقم مصدر كل جرعة والبدائل والتحذيرات، ومنها «بطاقة المريض» و«تقرير للطبيب» لتسليمهما للمريض أو الطبيب.

$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'faq' and strpos(p->'b'->>'ar', $q$للصيدلي أو للمريض؟
اختر «صيدلي» لترى التفاصيل والمصادر والبدائل، أو «مريض» لترى كلاماً مبسطاً فقط. تجد الاختيار أعلى النتيجة وفي القائمة.

لماذا لا تظهر المصادر في وضع المريض؟
لتبقى النتيجة بسيطة وواضحة. المصادر كاملة في وضع الصيدلي وفي «تقرير للطبيب».

$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'faq' then jsonb_set(p, '{b,en}', to_jsonb(replace(p->'b'->>'en', $q$For pharmacists or patients?
Choose «Pharmacist» for details, sources and alternatives, or «Patient» for plain words only. The switch is above the result and in the menu.

Why are the sources hidden in patient mode?
To keep the result simple and clear. The full sources are in pharmacist mode and in the «Report for the doctor».

$q$, $q$Who is the app for?
Pharmacists. The result shows everything, with the source number of each dose, alternatives and warnings, plus a «Patient card» and a «Report for the doctor» to hand to the patient or the doctor.

$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'faq' and strpos(p->'b'->>'en', $q$For pharmacists or patients?
Choose «Pharmacist» for details, sources and alternatives, or «Patient» for plain words only. The switch is above the result and in the menu.

Why are the sources hidden in patient mode?
To keep the result simple and clear. The full sources are in pharmacist mode and in the «Report for the doctor».

$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'about' then jsonb_set(p, '{b,ar}', to_jsonb(replace(p->'b'->>'ar', $q$في وضع الصيدلي يظهر بجانب كل رقم في النتيجة رقم مصدره، واضغطه لفتح المصدر. وفي وضع المريض تظهر النتيجة بكلام مبسط دون أرقام المصادر.$q$, $q$بجانب كل رقم في النتيجة رقم مصدره، اضغطه لفتح المصدر.$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'about' and strpos(p->'b'->>'ar', $q$في وضع الصيدلي يظهر بجانب كل رقم في النتيجة رقم مصدره، واضغطه لفتح المصدر. وفي وضع المريض تظهر النتيجة بكلام مبسط دون أرقام المصادر.$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'about' then jsonb_set(p, '{b,en}', to_jsonb(replace(p->'b'->>'en', $q$In pharmacist mode, every number in a result shows the number of its source; tap it to open the source. In patient mode the result is in plain words, without source numbers.$q$, $q$Every number in a result shows the number of its source; tap it to open the source.$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'about' and strpos(p->'b'->>'en', $q$In pharmacist mode, every number in a result shows the number of its source; tap it to open the source. In patient mode the result is in plain words, without source numbers.$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'method' then jsonb_set(p, '{b,ar}', to_jsonb(replace(p->'b'->>'ar', $q$ (في وضع الصيدلي)$q$, $q$$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'method' and strpos(p->'b'->>'ar', $q$ (في وضع الصيدلي)$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'method' then jsonb_set(p, '{b,en}', to_jsonb(replace(p->'b'->>'en', $q$ (in pharmacist mode)$q$, $q$$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'method' and strpos(p->'b'->>'en', $q$ (in pharmacist mode)$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'who' then jsonb_set(p, '{b,ar}', to_jsonb(replace(p->'b'->>'ar', $q$للصيادلة والمرضى$q$, $q$للصيادلة$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'who' and strpos(p->'b'->>'ar', $q$للصيادلة والمرضى$q$) > 0);
update public.site_config set updated_at = now(), data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when p->>'id' = 'who' then jsonb_set(p, '{b,en}', to_jsonb(replace(p->'b'->>'en', $q$for pharmacists and patients$q$, $q$for pharmacists$q$))) else p end order by o)
  from jsonb_array_elements(data->'pages') with ordinality as t(p, o)))
 where id = 'draft' and exists (select 1 from jsonb_array_elements(data->'pages') p where p->>'id' = 'who' and strpos(p->'b'->>'en', $q$for pharmacists and patients$q$) > 0);

-- ===================== content_1_16_0.sql =====================
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
update public.site_config set updated_at = now(), data = jsonb_set(data, '{roadmap}', $rm$[{"st": "now", "go": "sch", "ic": "clock", "t": {"ar": "جدول المكملات وتذكير الجرعات", "en": "Supplement schedule and dose reminders"}, "d": {"ar": "رتّب أوقات المكملات مع أدوية المريض بحيث تُحترم فواصل التداخلات تلقائياً، وأضف المواعيد إلى تقويم الهاتف.", "en": "Arrange supplement times with the patient's medicines so interaction gaps are respected automatically, and add the times to the phone calendar."}}, {"st": "now", "go": "meds", "ic": "pill", "t": {"ar": "أدوية المريض مرتبة أبجدياً", "en": "Patient medicines, sorted A–Z"}, "d": {"ar": "أضف أدوية المريض فتظهر التداخلات التي تخصها فقط. الأدوية مرتبة بالعربية أو الإنجليزية مع عنوان لكل حرف.", "en": "Add the patient's medicines to see only the interactions that concern them. Sorted in Arabic or English with a heading for each letter."}}, {"st": "now", "go": "preg", "ic": "baby", "t": {"ar": "حاسبات خاصة والزنك لإسهال الأطفال", "en": "Special calculators and zinc for childhood diarrhoea"}, "d": {"ar": "الحمل والرضاعة، الرضيع، فيتامين A للأطفال، بعد عمليات السمنة، نقص B1، وجديد: الزنك لإسهال الأطفال حسب WHO (10 أو 20 ملغ لمدة 10 – 14 يوماً).", "en": "Pregnancy and breastfeeding, infants, vitamin A for children, after weight-loss surgery, B1 deficiency, and new: zinc for childhood diarrhoea per WHO (10 or 20 mg for 10–14 days)."}}, {"st": "now", "go": "sources", "ic": "chart", "t": {"ar": "مصدر رسمي لكل رقم", "en": "An official source for every number"}, "d": {"ar": "كل جرعة وتداخل يحمل رقم مصدره من إرشادات ونشرات رسمية، وروابط المصادر تُفحص بانتظام.", "en": "Every dose and interaction carries the number of its source from official guidelines and labels, and the source links are checked regularly."}}, {"st": "now", "go": "labs", "ic": "chart", "t": {"ar": "سجل التحاليل ومتابعة التحسن", "en": "Lab results log and progress"}, "d": {"ar": "احفظ نتائج التحاليل وشاهد تغيّر المستوى على رسم بياني بين تحليل وآخر.", "en": "Save lab results and see the level change on a chart from one test to the next."}}, {"st": "now", "go": "report", "ic": "share", "t": {"ar": "تقرير للطبيب وبطاقة للمريض", "en": "Doctor report and patient card"}, "d": {"ar": "ملف مفصّل بالنتيجة والخطة والمصادر للطبيب، وبطاقة مبسطة يسلّمها الصيدلي للمريض.", "en": "A detailed file with the result, plan and sources for the doctor, and a simple card the pharmacist hands to the patient."}}, {"st": "now", "go": "calc", "ic": "plus", "t": {"ar": "واجهة أوضح", "en": "A clearer layout"}, "d": {"ar": "أربعة مربعات في كل سطر بالرمز والاسم، وبطاقات بارزة بحافة ملونة حسب الخطورة أو الحالة، على الهاتف والآيباد والكمبيوتر.", "en": "Four tiles per line with symbol and name, and cards that stand out with a coloured edge by severity or status, on phone, iPad and computer."}}, {"st": "dev", "ic": "plus", "t": {"ar": "تداخلات جديدة من نشرات الأدوية", "en": "New interactions from drug labels"}, "d": {"ar": "Raltegravir وCefdinir وMycophenolate وEntacapone وPenicillamine وIsotretinoin مع الفيتامينات والمعادن، من النشرات الرسمية، ويراجعها الصيدلي قبل نشرها.", "en": "Raltegravir, cefdinir, mycophenolate, entacapone, penicillamine and isotretinoin with vitamins and minerals, from the official labels, reviewed by the pharmacist before publishing."}}, {"st": "plan", "ic": "pill", "t": {"ar": "حاسبة الحديد الوريدي Monofer", "en": "IV iron calculator: Monofer"}, "d": {"ar": "جرعة Ferric derisomaltose حسب الوزن والهيموغلوبين من نشرة الدواء، بجانب Ferinject.", "en": "Ferric derisomaltose dose by weight and haemoglobin from the product label, next to Ferinject."}}, {"st": "plan", "ic": "baby", "t": {"ar": "B12 وحمض الفوليك للأطفال", "en": "B12 and folic acid for children"}, "d": {"ar": "جرعات علاج النقص للأطفال حسب العمر من BNF for Children.", "en": "Deficiency treatment doses for children by age from the BNF for Children."}}, {"st": "plan", "ic": "bell", "t": {"ar": "تنبيه مجموع المكملات", "en": "Combined supplement alert"}, "d": {"ar": "عند أخذ أكثر من مكمل فيه العنصر نفسه، يجمع التطبيق الكميات وينبّه إذا تجاوز المجموع الحد الأعلى الآمن.", "en": "When several supplements contain the same nutrient, the app adds them up and warns if the total passes the safe upper limit."}}, {"st": "idea", "ic": "cam", "t": {"ar": "قراءة العبوة بالكاميرا", "en": "Scan the pack with the camera"}, "d": {"ar": "صوّر علبة المكمل فيتعرّف التطبيق على التركيز ويحسب عدد الحبات مباشرة.", "en": "Photograph the supplement box and the app reads the strength and counts the tablets."}}]$rm$::jsonb)
 where id = 'draft' and data->'roadmap'->0->'t'->>'ar' = 'تذكير بمواعيد الجرعات';

-- ===================== cleanup_1_16_0.sql =====================
-- VITAWAW 1.16.0 cleanup from the full review (owner: «نفذ الاقتراحات»). Safe to run twice; compatible with every live version.
-- 1. The first owner invite was never marked used (the account was made before invites were tracked). It is closed now,
--    only when that e-mail already has an account, so nobody else can ever sign up with it. The owner's access does not
--    depend on this row (roles come from the members table).
update private.invites i set revoked = true
 where i.role = 'owner' and i.used_at is null and not i.revoked
   and exists (select 1 from auth.users u where lower(u.email) = lower(i.email));
-- 2. The old publish function from 1.0 is not used by any version since publish_site() (it was already closed to everyone).
drop function if exists public.publish_config(text);

-- ===================== activity_log_1_16_0.sql =====================
-- VITAWAW 1.16.0 activity log (owner: «اريد اضافه صفحه للاجرائات ... حتى اعرف مالذي حدث ومن غير و مالذي غير»).
-- The DATABASE writes every action itself (triggers), so no page can skip or fake it:
--   sources / interactions / added vitamins: add, edit (which fields), hide, show, delete, restore, approve, reject
--   the draft settings (texts, pages, menus, tools, look…): which parts were saved
--   publishing (with its note), and the team: invite, join, permissions, status, name.
-- Who can read it (row level security): the owner reads everything; an invited pharmacist reads only his own actions.
-- Nobody can write, change or delete a line from the page. Safe to run twice; nothing in the live page depends on it.

create table if not exists public.activity (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  user_id uuid,
  who     text,
  kind    text not null check (kind in ('src','int','nut','draft','publish','team')),
  action  text not null check (action in ('add','edit','del','hide','show','restore','approve','reject','save','publish','invite','join','perms','status','rename')),
  item    text check (item is null or length(item) <= 80),
  label   text check (label is null or (length(label) <= 300 and label !~ '[<>]')),
  detail  text check (detail is null or (length(detail) <= 600 and detail !~ '[<>]'))
);
create index if not exists activity_user_idx on public.activity (user_id, id desc);
alter table public.activity enable row level security;
revoke all on public.activity from public, anon, authenticated;
grant select on public.activity to authenticated;
drop policy if exists "activity: owner reads all, team reads own" on public.activity;
create policy "activity: owner reads all, team reads own" on public.activity for select to authenticated
  using ((select private.my_role()) = 'owner' or user_id = (select auth.uid()));

-- one line in the log (only the triggers below call it)
create or replace function private.log(p_kind text, p_action text, p_item text, p_label text, p_detail text) returns void
  language sql security definer set search_path = '' as $$
  insert into public.activity (user_id, who, kind, action, item, label, detail)
  values ((select auth.uid()), private.who((select auth.uid())), p_kind, p_action, left(p_item, 80),
          nullif(left(translate(coalesce(p_label, ''), '<>', '‹›'), 300), ''), nullif(left(translate(coalesce(p_detail, ''), '<>', '‹›'), 600), ''))
$$;
revoke all on function private.log(text, text, text, text, text) from public, anon, authenticated;

-- sources, interactions, nutrients
create or replace function private.log_content() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  k text := case tg_table_name when 'sources' then 'src' when 'interactions' then 'int' else 'nut' end;
  n jsonb := to_jsonb(new); o jsonb; lab text; ch text; act text;
  meta text[] := array['updated_at','updated_by','reviewed','reviewed_at','pub','sort','author','deleted','hidden'];
begin
  lab := case k when 'src' then (n->>'id') || '. ' || coalesce(n->>'org', '')
                when 'int' then coalesce(n->>'nutrient_id', '') || ' + ' || coalesce(nullif(n->>'with_ar', ''), n->>'with_en', '')
                else coalesce(nullif(n->>'name_ar', ''), n->>'name_en', n->>'id') end;
  if tg_op = 'INSERT' then perform private.log(k, 'add', n->>'id', lab, null); return null; end if;
  o := to_jsonb(old);
  select string_agg(e.key, ',' order by e.key) into ch from jsonb_each(n) e where e.key <> all (meta) and e.value is distinct from o->e.key;
  if coalesce((n->>'deleted')::boolean, false) and not coalesce((o->>'deleted')::boolean, false) then act := 'del';
  elsif not coalesce((n->>'deleted')::boolean, false) and coalesce((o->>'deleted')::boolean, false) then act := 'restore';
  elsif coalesce((n->>'reviewed')::boolean, false) and not coalesce((o->>'reviewed')::boolean, false) then act := case when ch is null then 'approve' else 'reject' end;
  elsif ch is not null then act := 'edit';
  elsif (n->>'hidden') is distinct from (o->>'hidden') then act := case when coalesce((n->>'hidden')::boolean, false) then 'hide' else 'show' end;
  else return null; -- saved again without a change: nothing to log
  end if;
  if act = 'edit' and (n->>'hidden') is distinct from (o->>'hidden') then ch := ch || ',hidden'; end if;
  perform private.log(k, act, n->>'id', lab, case when act in ('edit','reject') then ch end);
  return null;
end $$;
revoke all on function private.log_content() from public, anon, authenticated;
drop trigger if exists sources_log on public.sources;
create trigger sources_log after insert or update on public.sources for each row execute function private.log_content();
drop trigger if exists interactions_log on public.interactions;
create trigger interactions_log after insert or update on public.interactions for each row execute function private.log_content();
drop trigger if exists nutrients_log on public.nutrients;
create trigger nutrients_log after insert or update on public.nutrients for each row execute function private.log_content();

-- the draft settings: which parts changed (texts, pages, menus, tools, look, colours, roadmap, a pharmacist's proposals…)
create or replace function private.log_config() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare ch text;
begin
  if new.id <> 'draft' then return null; end if;
  select string_agg(x.key, ',' order by x.key) into ch from (
    select e.key from jsonb_each(coalesce(new.data, '{}'::jsonb)) e
     where tg_op = 'INSERT' or e.value is distinct from (old.data -> e.key)
    union select e.key from jsonb_each(case when tg_op = 'UPDATE' then coalesce(old.data, '{}'::jsonb) else '{}'::jsonb end) e
     where not (coalesce(new.data, '{}'::jsonb) ? e.key)) x;
  if ch is null then return null; end if;
  perform private.log('draft', 'save', 'draft', null, ch);
  return null;
end $$;
revoke all on function private.log_config() from public, anon, authenticated;
drop trigger if exists site_config_log on public.site_config;
create trigger site_config_log after insert or update on public.site_config for each row execute function private.log_config();

-- publishing (every publish adds a version to config_history)
create or replace function private.log_publish() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin perform private.log('publish', 'publish', new.id::text, new.note, null); return null; end $$;
revoke all on function private.log_publish() from public, anon, authenticated;
drop trigger if exists config_history_log on public.config_history;
create trigger config_history_log after insert on public.config_history for each row execute function private.log_publish();

-- the team: invitations and members (permissions, status, name)
create or replace function private.log_team() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  if tg_table_name = 'invites' then
    if tg_op = 'INSERT' then perform private.log('team', 'invite', null, coalesce(nullif(new.name, ''), new.email), null); end if;
    return null;
  end if;
  nm := coalesce(nullif(new.name, ''), new.email);
  if tg_op = 'INSERT' then perform private.log('team', 'join', new.user_id::text, nm, new.role); return null; end if;
  if new.perms is distinct from old.perms then
    perform private.log('team', 'perms', new.user_id::text, nm, (select string_agg(key, ',' order by key) from jsonb_each(coalesce(new.perms, '{}'::jsonb)) where value = 'true'::jsonb));
  end if;
  if new.status is distinct from old.status then perform private.log('team', 'status', new.user_id::text, nm, new.status); end if;
  if new.name is distinct from old.name then perform private.log('team', 'rename', new.user_id::text, nm, coalesce(old.name, '') || ' → ' || coalesce(new.name, '')); end if;
  return null;
end $$;
revoke all on function private.log_team() from public, anon, authenticated;
drop trigger if exists members_log on public.members;
create trigger members_log after insert or update on public.members for each row execute function private.log_team();
drop trigger if exists invites_log on private.invites;
create trigger invites_log after insert on private.invites for each row execute function private.log_team();
