-- VITAWAW 1.11.0: restore a previous published version (owner only) + the methodology and FAQ pages + «available now»
-- on the roadmap. Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site (1.10.0): it only adds a function and changes the draft, which the owner previews and publishes.

-- 1. Restore: puts an older published snapshot back for visitors. Medical content tables are not touched, so the next
--    «Publish» publishes the current approved content again. Every restore is itself kept in the history.
create or replace function public.restore_version(p_id bigint) returns jsonb
  language plpgsql security definer set search_path = '' as $$
declare d jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can restore'; end if;
  select data into d from public.config_history where id = p_id;
  if d is null then raise exception 'version not found'; end if;
  d := d || jsonb_build_object('published_at', now(), 'restored_from', p_id);
  update public.site_config set data = d, updated_at = now(), updated_by = auth.uid() where id = 'published';
  insert into public.config_history (data, note) values (d, 'restore of version ' || p_id);
  return jsonb_build_object('restored', p_id);
end $$;
revoke all on function public.restore_version(bigint) from public, anon;
grant execute on function public.restore_version(bigint) to authenticated;

-- 2. The draft gets the new pages and the roadmap statuses; the owner sees them in the preview and publishes.
insert into public.site_config (id, data)
  select 'draft', coalesce(data, '{}'::jsonb) - 'refs' - 'inter' - 'nut' - 'published_at' from public.site_config where id = 'published'
  on conflict (id) do nothing;

-- roadmap: features that now exist become «available now» with a «try it» button
update public.site_config set data = jsonb_set(data, '{roadmap}', (
  select coalesce(jsonb_agg(case
    when x ->> 'ic' = 'clock' then x || '{"st":"now","go":"sch"}'
    when x ->> 'ic' = 'pill'  then x || '{"st":"now","go":"meds"}'
    when x ->> 'ic' = 'baby'  then x || '{"st":"now","go":"preg"}'
    when x ->> 'ic' = 'chart' then x || '{"st":"now","go":"labs"}'
    when x ->> 'ic' = 'share' then x || '{"st":"now","go":"report"}'
    when x ->> 'ic' = 'bell'  then x || jsonb_build_object('st','now','go','sch','d',jsonb_build_object(
      'ar','من جدول المكملات أو خطة العلاج اضغط «أضف إلى التقويم» فتُضاف مواعيد الجرعات إلى تقويم هاتفك وينبّهك في وقتها.',
      'en','In the supplement schedule or the treatment plan, tap «Add to calendar» and the doses are added to your phone''s calendar with an alert.'))
    else x end order by n), '[]'::jsonb)
  from jsonb_array_elements(coalesce(data -> 'roadmap', '[]'::jsonb)) with ordinality as t(x, n)))
 where id = 'draft' and jsonb_typeof(data -> 'roadmap') = 'array';

-- pages: «طريقة الاستخدام والأسئلة الشائعة» and «المنهجية العلمية» (added once, at the top of the information pages)
update public.site_config set data = jsonb_set(data, '{pages}',
  (select jsonb_agg(p) from (
     select p from jsonb_array_elements(jsonb_build_array(
       jsonb_build_object('id','faq','t',jsonb_build_object('ar','طريقة الاستخدام والأسئلة الشائعة','en','How to use and FAQ'),'b',jsonb_build_object(
         'ar', E'طريقة الاستخدام\n١. اختر الفيتامين أو المعدن، أو حاسبة الحمل أو الرضيع.\n٢. أدخل العمر والجنس ونتيجة التحليل إن وُجدت.\n٣. تظهر النتيجة فوراً: الجرعة والخطة والتحذيرات، وكل رقم مرتبط بمصدره.\n\nللصيدلاني أو للمريض؟\nاختر «صيدلاني» لترى التفاصيل والمصادر والبدائل، أو «مريض» لترى كلاماً مبسطاً فقط. تجد الاختيار أعلى النتيجة وفي القائمة.\n\nهل تُحفظ بياناتي؟\nلا. ما تدخله يبقى على جهازك. سجل التحاليل وأدويتي وجدول المكملات تُحفظ على جهازك فقط ولا تُرسل لأي جهة.\n\nكيف أحوّل الجرعة إلى حبات أو قطرات أو مل؟\nتحت النتيجة أزرار تفتح الأداة المناسبة معبأة: كم حبة، كم قطرة، كم مل من الشراب.\n\nكيف أتذكر مواعيد الجرعات؟\nاضغط «أضف إلى التقويم» تحت النتيجة أو في جدول المكملات، فتُضاف المواعيد إلى تقويم هاتفك.\n\nكيف أعرض النتيجة على الطبيب؟\nاضغط «تقرير للطبيب» ثم «اطبع أو احفظ PDF»، أو «شارك برابط» ليفتح الطبيب الحاسبة بالقيم نفسها.\n\nهل تغني عن الطبيب؟\nلا. التطبيق يساعد الصيدلي والطبيب ولا يحل محلهما، خاصة للحامل والأطفال ومرضى الكلى.',
         'en', E'How to use\n1. Choose a vitamin or mineral, or the pregnancy or infant calculator.\n2. Enter age, sex and the lab result if you have one.\n3. The result appears at once: dose, plan and warnings, each number linked to its source.\n\nFor pharmacists or patients?\nChoose «Pharmacist» for details, sources and alternatives, or «Patient» for plain words only. The switch is above the result and in the menu.\n\nIs my data saved?\nNo. What you enter stays on your device. My lab results, my medicines and the supplement schedule are kept on your device only and are not sent anywhere.\n\nHow do I turn a dose into tablets, drops or mL?\nUnder the result, buttons open the right tool already filled in: tablets, drops, mL of syrup.\n\nHow do I remember the doses?\nTap «Add to calendar» under the result or in the supplement schedule, and the times are added to your phone''s calendar.\n\nHow do I show the result to a doctor?\nTap «Report for the doctor» then «Print or save as PDF», or «Share by link» so the doctor opens the calculator with the same values.\n\nDoes it replace a doctor?\nNo. The app supports pharmacists and doctors and does not replace them, especially in pregnancy, children and kidney disease.')),
       jsonb_build_object('id','method','t',jsonb_build_object('ar','المنهجية العلمية','en','Scientific method'),'b',jsonb_build_object(
         'ar', E'اختيار المصادر\nكل جرعة وكل حد مأخوذ من مصدر موثوق، ويظهر رقمه بجانب الرقم في النتيجة. الأولوية للإرشادات السريرية (Endocrine Society وNICE وWHO وAAP وBSG وKDIGO)، ثم المراجع الرسمية (NIH Office of Dietary Supplements للاحتياج والحد الأعلى)، ثم نشرات الأدوية الرسمية (FDA وSmPC) للتداخلات والفواصل، ثم المراجعات المنهجية (Cochrane). لا تُستخدم مواقع ثانوية عندما يوجد مصدر أصلي.\n\nعند اختلاف الإرشادات\nتذكر النتيجة الخلاف بوضوح، مثل الفرق بين إرشاد فيتامين D لعام 2011 ولعام 2024، ولا يُخفى أي رأي.\n\nالمراجعة والاعتماد\nكل إضافة أو تعديل يكتبه صيدلاني من الفريق يبقى غير ظاهر للزوار حتى يراجعه الصيدلاني المسؤول ويعتمده وينشره. قاعدة البيانات نفسها تفرض ذلك، ويُحفظ سجل لكل نسخة منشورة.\n\nالتحقق\nتُختبر الحاسبات آلياً على حالات طبية ثابتة تقارن النتيجة بما يقوله المصدر (44 حالة: فيتامين D وB12 والحديد والكالسيوم والمغنيسيوم والحمل والرضيع وفيتامين A)، وتُختبر الأدوات ومعادلاتها، وتُفحص روابط المصادر أسبوعياً.\n\nالحدود\nالتطبيق أداة مساعدة تعليمية، ولا يغني عن التقييم السريري. الحالات الخاصة (الحمل عالي الخطورة، القصور الكلوي، الأطفال) تُحال إلى الطبيب المختص.',
         'en', E'Choosing sources\nEvery dose and limit comes from a trusted source, whose number appears next to it in the result. Clinical guidelines come first (Endocrine Society, NICE, WHO, AAP, BSG, KDIGO), then official references (NIH Office of Dietary Supplements for needs and upper limits), then official drug labels (FDA, SmPC) for interactions and timing, then systematic reviews (Cochrane). Secondary websites are not used where a primary source exists.\n\nWhen guidelines differ\nThe result states the difference clearly, for example between the 2011 and 2024 vitamin D guidelines, and no view is hidden.\n\nReview and approval\nEvery addition or edit by a team pharmacist stays hidden from visitors until the responsible pharmacist reviews, approves and publishes it. The database itself enforces this, and every published version is kept.\n\nValidation\nThe calculators are tested automatically on fixed medical cases that compare the result with the source (44 cases: vitamin D, B12, iron, calcium, magnesium, pregnancy, infant and vitamin A); the tools and their formulas are tested too, and source links are checked every week.\n\nLimits\nThe app is an educational support tool and does not replace clinical assessment. Special situations (high-risk pregnancy, kidney disease, children) are referred to the specialist.'))
     )) as a(p) where not exists (select 1 from jsonb_array_elements(coalesce((select data -> 'pages' from public.site_config where id = 'draft'), '[]'::jsonb)) q where q ->> 'id' = a.p ->> 'id')
     union all
     select q from jsonb_array_elements(coalesce((select data -> 'pages' from public.site_config where id = 'draft'), '[]'::jsonb)) q
  ) z))
 where id = 'draft';
