-- VITAWAW 1.17.0 privacy page (owner approved the anonymous visit counting: «نفذ المقترح الاول»).
-- In the owner's DRAFT only: the «بلا تتبّع» part of the privacy page now also says how visits are counted (anonymous totals,
-- no name / e-mail / IP / cookie, a code that changes every day, owner only). Nothing else changes; visitors see it after he publishes.
-- Exact-sentence replace, so a text he already changed by hand is left alone. Safe to run twice. Run it on BOTH projects.
insert into public.site_config (id, data, updated_at) select 'draft', data, now() from public.site_config where id = 'published'
  and not exists (select 1 from public.site_config where id = 'draft');
update public.site_config c set updated_at = now(), data = jsonb_set(c.data, '{pages}', (
  select jsonb_agg(case when o.p->>'id' = 'privacy' then
           jsonb_set(jsonb_set(o.p, '{b,ar}', to_jsonb(replace(coalesce(o.p->'b'->>'ar', ''), $o1$## بلا تتبّع
لا أدوات تتبّع ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.$o1$, $n1$## بلا تتبّع ولا إعلانات
لا أدوات تتبّع من شركات أخرى ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.

## عدّ الزيارات بلا هوية
نعدّ الزيارات بأرقام إجمالية فقط لنعرف ما يفيد الصيادلة: عدد الزيارات، والحاسبات والأدوات والصفحات التي فُتحت، ونوع الجهاز، واللغة، والدولة.
- لا نحفظ اسماً ولا بريداً ولا عنوان IP ولا ملف تعريف (كوكي).
- يُميَّز الشخص داخل اليوم الواحد فقط برمز يتغيّر كل يوم، فلا يمكن تتبّع أحد من يوم إلى آخر.
- لا يُعدّ شيء إذا طلب متصفحك عدم التتبّع.
- هذه الأرقام يراها مالك الموقع فقط.$n1$))),
                     '{b,en}', to_jsonb(replace(coalesce(o.p->'b'->>'en', ''), $o2$## No tracking
No trackers and no ads; fonts are served from our own site.$o2$, $n2$## No tracking, no ads
No third-party trackers and no ads; fonts are served from our own site.

## Anonymous visit counts
We count visits only as totals, to learn what helps pharmacists: number of visits, which calculators, tools and pages were opened, device type, language and country.
- No name, e-mail, IP address or cookie is stored.
- A person is told apart only within one day, by a code that changes every day, so nobody can be followed from day to day.
- Nothing is counted when your browser asks not to be tracked.
- Only the site owner sees these numbers.$n2$)))
         else o.p end order by o.n)
    from jsonb_array_elements(c.data->'pages') with ordinality as o(p, n)))
 where c.id = 'draft' and jsonb_typeof(c.data->'pages') = 'array' and jsonb_array_length(c.data->'pages') > 0
   and exists (select 1 from jsonb_array_elements(c.data->'pages') x where x->>'id' = 'privacy' and position($o3$## بلا تتبّع
لا أدوات تتبّع ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.$o3$ in coalesce(x->'b'->>'ar', '')) > 0);
