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
