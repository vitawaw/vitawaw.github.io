-- VITAWAW 1.9.0: timing on interactions + the interactions review (approved by the owner: «كلها»).
-- Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site: pages that do not send the new field keep the stored value.

-- 1. Timing: which item of the daily schedule it concerns and the minimum gaps, in hours.
--    gap = {"d": "<schedule item: levo, bis, abx, dtg, fe, ca, mg, zn, d>", "b": <hours that item must be taken BEFORE the supplement>,
--           "a": <hours it must be taken AFTER the supplement>} ; {} = not used by the schedule.
alter table public.interactions add column if not exists gap jsonb not null default '{}'::jsonb;
alter table public.interactions drop constraint if exists interactions_gap_check;
alter table public.interactions add constraint interactions_gap_check check (
  jsonb_typeof(gap) = 'object' and (gap = '{}'::jsonb or (
    gap - 'd' - 'b' - 'a' = '{}'::jsonb and coalesce(gap ->> 'd', '') ~ '^[a-z0-9]{1,12}$'
    and jsonb_typeof(gap -> 'b') = 'number' and jsonb_typeof(gap -> 'a') = 'number'
    and (gap ->> 'b')::numeric between 0 and 24 and (gap ->> 'a')::numeric between 0 and 24)));

create or replace function private.j_inter(i public.interactions) returns jsonb
  language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',i.id,'k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),
    'd',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'rv',i.reviewed,'hidden',i.hidden,'g',coalesce(i.gap,'{}'::jsonb))
$$;

create or replace function public.save_content(p jsonb) returns void
  language plpgsql set search_path = 'public' as $$
declare x jsonb; keep_ids bigint[];
begin
  if coalesce(private.my_role(), '') not in ('owner','editor') then raise exception 'not allowed'; end if;
  if p ? 'refs'  and not private.can_edit('refs')  then raise exception 'no permission: sources'; end if;
  if p ? 'nut'   and not private.can_edit('nut')   then raise exception 'no permission: vitamins'; end if;
  if p ? 'inter' and not private.can_edit('inter') then raise exception 'no permission: interactions'; end if;

  if p ? 'refs' then
    for x in select * from jsonb_array_elements(p->'refs') loop
      insert into sources(id, org, title, url, use_ar, use_en, reviewed, hidden, kind)
      values ((x->>'id')::int, x->>'org', x->>'title', coalesce(x->>'url',''), coalesce(x->>'ar',''), coalesce(x->>'en',''), coalesce((x->>'rv')::boolean, false),
              coalesce((x->>'hidden')::boolean, false), coalesce(x->>'kind',''))
      on conflict (id) do update set org = excluded.org, title = excluded.title, url = excluded.url, use_ar = excluded.use_ar, use_en = excluded.use_en,
        reviewed = excluded.reviewed, hidden = excluded.hidden, kind = excluded.kind, deleted = false
      where (sources.org, sources.title, sources.url, sources.use_ar, sources.use_en, sources.reviewed, sources.hidden, sources.kind, sources.deleted)
        is distinct from (excluded.org, excluded.title, excluded.url, excluded.use_ar, excluded.use_en, excluded.reviewed, excluded.hidden, excluded.kind, false);
    end loop;
  end if;

  if p ? 'nut' then
    if private.my_role() = 'owner' then
      update nutrients set hidden = (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))))
        where builtin and hidden is distinct from (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))));
    end if;
    for x in select * from jsonb_array_elements(coalesce(p->'nut'->'custom','[]'::jsonb)) loop
      insert into nutrients(id, builtin, hidden, name_ar, name_en, hint_ar, hint_en, unit, dose_rows, plan_ar, plan_en, note_ar, note_en, source_ids, reviewed)
      values (x->>'id', false, coalesce((x->>'hidden')::boolean,false), x->'n'->>'ar', coalesce(x->'n'->>'en',''), coalesce(x->'h'->>'ar',''), coalesce(x->'h'->>'en',''), x->>'uk', coalesce(x->'rows','[]'::jsonb),
              coalesce(x->'plan'->>'ar',''), coalesce(x->'plan'->>'en',''), coalesce(x->'note'->>'ar',''), coalesce(x->'note'->>'en',''),
              array(select jsonb_array_elements_text(coalesce(x->'r','[]'::jsonb))::int), coalesce((x->>'rv')::boolean,false))
      on conflict (id) do update set hidden = excluded.hidden, name_ar = excluded.name_ar, name_en = excluded.name_en, hint_ar = excluded.hint_ar, hint_en = excluded.hint_en, unit = excluded.unit,
        dose_rows = excluded.dose_rows, plan_ar = excluded.plan_ar, plan_en = excluded.plan_en, note_ar = excluded.note_ar, note_en = excluded.note_en, source_ids = excluded.source_ids, reviewed = excluded.reviewed, deleted = false
      where not nutrients.builtin and (nutrients.deleted, nutrients.hidden, nutrients.name_ar, nutrients.name_en, nutrients.hint_ar, nutrients.hint_en, nutrients.unit, nutrients.dose_rows, nutrients.plan_ar, nutrients.plan_en, nutrients.note_ar, nutrients.note_en, nutrients.source_ids, nutrients.reviewed)
        is distinct from (false, excluded.hidden, excluded.name_ar, excluded.name_en, excluded.hint_ar, excluded.hint_en, excluded.unit, excluded.dose_rows, excluded.plan_ar, excluded.plan_en, excluded.note_ar, excluded.note_en, excluded.source_ids, excluded.reviewed);
    end loop;
    update nutrients set deleted = true where not builtin and not deleted and id not in (select x2->>'id' from jsonb_array_elements(coalesce(p->'nut'->'custom','[]'::jsonb)) x2);
  end if;

  if p ? 'inter' then
    keep_ids := array(select (x2->>'id')::bigint from jsonb_array_elements(p->'inter') x2 where x2 ? 'id' and x2->>'id' is not null);
    update interactions set deleted = true where not deleted and not (id = any(keep_ids));
    declare i int := 0; g jsonb; begin
      for x in select * from jsonb_array_elements(p->'inter') loop
        i := i + 1;
        if x ? 'id' and x->>'id' is not null then
          -- "g" (timing) is new in 1.9.0: an older page does not send it, so the stored value is kept
          g := case when x ? 'g' then coalesce(x->'g','{}'::jsonb) else (select gap from interactions where id = (x->>'id')::bigint) end;
          update interactions set nutrient_id = x->>'k', supp_ar = x->'a'->>'ar', supp_en = coalesce(x->'a'->>'en',''), with_ar = x->'b'->>'ar', with_en = coalesce(x->'b'->>'en',''),
            desc_ar = x->'d'->>'ar', desc_en = coalesce(x->'d'->>'en',''), severity = coalesce(x->>'sev','moderate'), source_ids = array(select jsonb_array_elements_text(x->'r')::int), sort = i*10,
            reviewed = coalesce((x->>'rv')::boolean,false), hidden = coalesce((x->>'hidden')::boolean,false), gap = g
          where id = (x->>'id')::bigint
            and (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, hidden, gap) is distinct from
                (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false), coalesce((x->>'hidden')::boolean,false), g);
        else
          insert into interactions(nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, hidden, gap)
          values (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false), coalesce((x->>'hidden')::boolean,false), coalesce(x->'g','{}'::jsonb));
        end if;
      end loop;
    end;
  end if;

  if p ? 'refs' then
    update sources set deleted = true where not deleted and id not in (select (x2->>'id')::int from jsonb_array_elements(p->'refs') x2);
  end if;
end $$;

create or replace function public.publish_site(note text default '') returns jsonb
  language plpgsql security definer set search_path = 'public' as $$
declare s jsonb; inter jsonb; nut_custom jsonb; hide jsonb; refs jsonb; snap jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can publish'; end if;
  select data into s from site_config where id = 'draft';
  if s is null then select data into s from site_config where id = 'published'; end if;
  s := coalesce(s, '{}'::jsonb) - 'refs' - 'inter' - 'nut' - 'team' - 'team_done';

  select coalesce(jsonb_agg(id order by sort), '[]'::jsonb) into hide from private.pub_nutrients() where builtin and hidden;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids)) order by sort, id), '[]'::jsonb)
    into nut_custom from private.pub_nutrients() where not builtin and not hidden and not deleted;
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),'d',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'g',coalesce(i.gap,'{}'::jsonb)) order by i.sort, i.id), '[]'::jsonb)
    into inter from private.pub_interactions() i join private.pub_nutrients() n on n.id = i.nutrient_id
    where not i.deleted and not i.hidden and not n.hidden and not n.deleted;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'kind',kind) order by id), '[]'::jsonb)
    into refs from private.pub_sources() where not deleted and not hidden;

  snap := s || jsonb_build_object('refs', refs, 'inter', inter, 'nut', jsonb_build_object('hide', hide, 'custom', nut_custom), 'published_at', now());
  insert into site_config (id, data, updated_at, updated_by) values ('published', snap, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into config_history (data, note) values (snap, note);
  return jsonb_build_object('refs', jsonb_array_length(refs), 'inter', jsonb_array_length(inter), 'custom', jsonb_array_length(nut_custom));
end $$;

create or replace function public.review_change(p_kind text, p_id text, p_accept boolean) returns void
  language plpgsql security definer set search_path = '' as $$
declare who uuid; lbl text;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if p_kind = 'r' then
    select updated_by, title into who, lbl from public.sources where id = p_id::int and not reviewed;
    if p_accept then update public.sources set reviewed = true where id = p_id::int;
    else
      update public.sources t set (org, title, url, use_ar, use_en, hidden, kind, deleted, reviewed) =
        (select p.org, p.title, p.url, p.use_ar, p.use_en, p.hidden, p.kind, p.deleted, true from jsonb_populate_record(null::public.sources, t.pub) p)
       where t.id = p_id::int and t.pub is not null;
      if not found then update public.sources set deleted = true, reviewed = true where id = p_id::int and not reviewed; end if;
    end if;
  elsif p_kind = 'i' then
    select updated_by, supp_ar || ' + ' || with_ar into who, lbl from public.interactions where id = p_id::bigint and not reviewed;
    if p_accept then update public.interactions set reviewed = true where id = p_id::bigint;
    else
      update public.interactions t set (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, hidden, deleted, gap, reviewed) =
        (select p.nutrient_id, p.supp_ar, p.supp_en, p.with_ar, p.with_en, p.desc_ar, p.desc_en, p.severity, p.source_ids, p.hidden, p.deleted, coalesce(p.gap, '{}'::jsonb), true
           from jsonb_populate_record(null::public.interactions, t.pub) p)
       where t.id = p_id::bigint and t.pub is not null;
      if not found then update public.interactions set deleted = true, reviewed = true where id = p_id::bigint and not reviewed; end if;
    end if;
  elsif p_kind = 'n' then
    select updated_by, name_ar into who, lbl from public.nutrients where id = p_id and not builtin and not reviewed;
    if p_accept then update public.nutrients set reviewed = true where id = p_id and not builtin;
    else
      update public.nutrients t set (hidden, name_ar, name_en, hint_ar, hint_en, unit, dose_rows, plan_ar, plan_en, note_ar, note_en, source_ids, deleted, reviewed) =
        (select p.hidden, p.name_ar, p.name_en, p.hint_ar, p.hint_en, p.unit, p.dose_rows, p.plan_ar, p.plan_en, p.note_ar, p.note_en, p.source_ids, p.deleted, true
           from jsonb_populate_record(null::public.nutrients, t.pub) p)
       where t.id = p_id and not t.builtin and t.pub is not null;
      if not found then update public.nutrients set deleted = true, reviewed = true where id = p_id and not builtin and not reviewed; end if;
    end if;
  else
    raise exception 'bad kind';
  end if;
  if who is not null and who <> auth.uid() and exists (select 1 from public.members where user_id = who and role = 'editor') then
    insert into public.notifications (user_id, kind, item, label)
      values (who, case when p_accept then 'approved' else 'rejected' end, p_kind, left(coalesce(lbl, ''), 200));
  end if;
end $$;

-- 2. Content (waits in 🔔 for the owner; the approved version stays live until he approves) ------------------------------
insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed) values
 (60, 'U.S. FDA (Tivicay label)', 'TIVICAY (dolutegravir): Full Prescribing Information', 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/204790s031%2C213983s004lbl.pdf',
      'فاصل Dolutegravir عن الحديد والكالسيوم ومضادات الحموضة', 'Spacing dolutegravir from iron, calcium and antacids', 'd', false)
on conflict (id) do nothing;

-- timing for the daily schedule on the existing interactions (d = schedule item, b / a = hours before / after the supplement)
update public.interactions t set gap = x.g::jsonb, pub = case when t.reviewed then to_jsonb(t) - 'pub' else t.pub end, reviewed = false
  from (values
 (1::bigint, '{"d":"levo","b":4,"a":4}'), (2,  '{"d":"levo","b":4,"a":4}'),
 (3,  '{"d":"zn","b":2,"a":2}'),   (51, '{"d":"fe","b":2,"a":2}'),
 (6,  '{"d":"bis","b":2,"a":24}'), (49, '{"d":"bis","b":0.5,"a":24}'),
 (43, '{"d":"abx","b":2,"a":6}'),  (47, '{"d":"abx","b":2,"a":6}'), (48, '{"d":"abx","b":2,"a":2}'),
 (4,  '{"d":"abx","b":2,"a":6}'),  (7,  '{"d":"abx","b":2,"a":6}'),
 (41, '{"d":"dtg","b":2,"a":6}')) x(id, g) where t.id = x.id and not t.deleted;

-- one rule for the antibiotic with every mineral (FDA Cipro label: 2 hours before or 6 hours after)
update public.interactions t set
  desc_ar = 'يؤخذ Ciprofloxacin قبل الزنك بساعتين أو بعده بـ 6 ساعات؛ وDoxycycline وTetracycline قبله بساعتين أو بعده بـ 4 إلى 6 ساعات',
  desc_en = 'Take ciprofloxacin 2 hours before or 6 hours after zinc; doxycycline and tetracycline 2 hours before or 4–6 hours after',
  source_ids = '{45,25}' where id = 4;
update public.interactions t set
  desc_ar = 'يؤخذ Ciprofloxacin قبل المغنيسيوم بساعتين أو بعده بـ 6 ساعات؛ وDoxycycline وTetracycline قبله بساعتين أو بعده بـ 4 إلى 6 ساعات',
  desc_en = 'Take ciprofloxacin 2 hours before or 6 hours after magnesium; doxycycline and tetracycline 2 hours before or 4–6 hours after',
  source_ids = '{45,20}' where id = 7;
-- dolutegravir: the label allows taking it together with calcium or iron when taken with food
update public.interactions t set
  desc_ar = 'الكالسيوم يخفض مستوى الدواء في الدم بشكل كبير؛ يؤخذ الدواء قبل الكالسيوم بساعتين أو بعده بـ 6 ساعات، أو معه مع وجبة طعام',
  desc_en = 'Calcium can substantially lower its blood level; take the drug 2 hours before or 6 hours after calcium, or together with it with a meal',
  source_ids = '{60,18}' where id = 41;

insert into public.interactions (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, gap) values
('fe', 'الحديد', 'Iron', 'Dolutegravir', 'Dolutegravir',
 'الحديد يخفض مستوى الدواء في الدم بشكل كبير؛ يؤخذ الدواء قبل الحديد بساعتين أو بعده بـ 6 ساعات، أو معه مع وجبة طعام',
 'Iron can substantially lower its blood level; take the drug 2 hours before or 6 hours after iron, or together with it with a meal', 'major', '{60}', 590, false, '{"d":"dtg","b":2,"a":6}'),
('mg', 'المغنيسيوم', 'Magnesium', 'Dolutegravir', 'Dolutegravir',
 'مضادات الحموضة والملينات التي فيها مغنيسيوم تخفض مستوى الدواء؛ يؤخذ الدواء قبلها بساعتين أو بعدها بـ 6 ساعات',
 'Magnesium-containing antacids and laxatives lower its level; take the drug 2 hours before or 6 hours after them', 'major', '{60}', 600, false, '{"d":"dtg","b":2,"a":6}'),
('mg', 'المغنيسيوم', 'Magnesium', 'Levothyroxine', 'Levothyroxine',
 'مضادات الحموضة التي فيها مغنيسيوم قد تقلل امتصاص الدواء؛ يُنصح بفاصل 4 ساعات كما مع الكالسيوم والحديد',
 'Magnesium-containing antacids may lower its absorption; a 4-hour gap is advised, as with calcium and iron', 'moderate', '{27}', 610, false, '{"d":"levo","b":4,"a":4}');
