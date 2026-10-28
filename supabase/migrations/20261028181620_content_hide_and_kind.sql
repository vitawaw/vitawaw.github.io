-- VITAWAW 1.4.0: hide/show for interactions and sources, and an owner-chosen source type.
alter table public.interactions add column if not exists hidden boolean not null default false;
alter table public.sources add column if not exists hidden boolean not null default false;
alter table public.sources add column if not exists kind text not null default '';
alter table public.sources add constraint sources_kind_check check (kind in ('','g','o','d','s','c','x'));

create or replace function public.get_content() returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'refs', coalesce((select jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'rv',reviewed,'hidden',hidden,'kind',kind) order by id) from sources where not deleted), '[]'::jsonb),
    'next_ref', (select coalesce(max(id), 29) + 1 from sources),
    'inter', coalesce((select jsonb_agg(jsonb_build_object('id',id,'k',nutrient_id,'a',jsonb_build_object('ar',supp_ar,'en',supp_en),'b',jsonb_build_object('ar',with_ar,'en',with_en),'d',jsonb_build_object('ar',desc_ar,'en',desc_en),'sev',severity,'r',to_jsonb(source_ids),'rv',reviewed,'hidden',hidden) order by sort, id) from interactions where not deleted), '[]'::jsonb),
    'nut', jsonb_build_object(
      'hide', coalesce((select jsonb_agg(id order by sort) from nutrients where builtin and hidden), '[]'::jsonb),
      'custom', coalesce((select jsonb_agg(jsonb_build_object('id',id,'hidden',hidden,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids),'rv',reviewed) order by sort, id) from nutrients where not builtin and not deleted), '[]'::jsonb)
    )
  )
$$;

create or replace function public.save_content(p jsonb) returns void
language plpgsql set search_path = public as $$
declare x jsonb; keep_ids bigint[];
begin
  if coalesce(private.my_role(), '') not in ('owner','editor') then raise exception 'not allowed'; end if;

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
    update nutrients set hidden = (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))))
      where builtin and hidden is distinct from (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))));
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
    declare i int := 0; begin
      for x in select * from jsonb_array_elements(p->'inter') loop
        i := i + 1;
        if x ? 'id' and x->>'id' is not null then
          update interactions set nutrient_id = x->>'k', supp_ar = x->'a'->>'ar', supp_en = coalesce(x->'a'->>'en',''), with_ar = x->'b'->>'ar', with_en = coalesce(x->'b'->>'en',''),
            desc_ar = x->'d'->>'ar', desc_en = coalesce(x->'d'->>'en',''), severity = coalesce(x->>'sev','moderate'), source_ids = array(select jsonb_array_elements_text(x->'r')::int), sort = i*10,
            reviewed = coalesce((x->>'rv')::boolean,false), hidden = coalesce((x->>'hidden')::boolean,false)
          where id = (x->>'id')::bigint
            and (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, hidden) is distinct from
                (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false), coalesce((x->>'hidden')::boolean,false));
        else
          insert into interactions(nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, hidden)
          values (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false), coalesce((x->>'hidden')::boolean,false));
        end if;
      end loop;
    end;
  end if;

  if p ? 'refs' then
    update sources set deleted = true where not deleted and id not in (select (x2->>'id')::int from jsonb_array_elements(p->'refs') x2);
  end if;
end $$;

create or replace function public.publish_site(note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb; inter jsonb; nut_custom jsonb; hide jsonb; used int[]; refs jsonb; snap jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can publish'; end if;
  select data into s from site_config where id = 'draft';
  if s is null then select data into s from site_config where id = 'published'; end if;
  s := coalesce(s, '{}'::jsonb) - 'refs' - 'inter' - 'nut';

  select coalesce(jsonb_agg(id order by sort), '[]'::jsonb) into hide from nutrients where builtin and hidden;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids)) order by sort, id), '[]'::jsonb)
    into nut_custom from nutrients where not builtin and not hidden and not deleted and reviewed;
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',supp_ar,'en',supp_en),'b',jsonb_build_object('ar',with_ar,'en',with_en),'d',jsonb_build_object('ar',desc_ar,'en',desc_en),'sev',severity,'r',to_jsonb(i.source_ids)) order by i.sort, i.id), '[]'::jsonb)
    into inter from interactions i join nutrients n on n.id = i.nutrient_id
    where i.reviewed and not i.deleted and not i.hidden and not n.hidden and not n.deleted and (n.builtin or n.reviewed);
  select array(select distinct unnest(source_ids) from (
      select i.source_ids from interactions i join nutrients n on n.id = i.nutrient_id where i.reviewed and not i.deleted and not i.hidden and not n.hidden and not n.deleted and (n.builtin or n.reviewed)
      union all select n2.source_ids from nutrients n2 where not n2.builtin and not n2.hidden and not n2.deleted and n2.reviewed) z) into used;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'kind',kind) order by id), '[]'::jsonb)
    into refs from sources where not deleted and not hidden and (reviewed or id = any(used));

  snap := s || jsonb_build_object('refs', refs, 'inter', inter, 'nut', jsonb_build_object('hide', hide, 'custom', nut_custom), 'published_at', now());
  insert into site_config (id, data, updated_at, updated_by) values ('published', snap, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into config_history (data, note) values (snap, note);
  return jsonb_build_object('refs', jsonb_array_length(refs), 'inter', jsonb_array_length(inter), 'custom', jsonb_array_length(nut_custom));
end $$;
