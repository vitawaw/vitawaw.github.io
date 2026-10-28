-- VITAWAW 1.6.1: a pharmacist's change never reaches visitors before the owner approves it.
-- Before: an edit by a pharmacist to an approved item removed it from the site at the next publish, a deletion
-- disappeared from the owner's view, and an unreviewed source was published when an approved item cited it.
-- Now every approved item keeps its last approved version ("pub") while a pharmacist's edit or deletion waits
-- for review. publish_site() publishes the approved version only; the owner approves or rejects the change.
-- Compatible with the 1.6.0 page: get_content() only gains keys that 1.6.0 ignores.

-- 1. Last approved version of an item that a pharmacist changed (null = nothing waiting) ---------------
alter table public.sources      add column if not exists pub jsonb;
alter table public.interactions add column if not exists pub jsonb;
alter table public.nutrients    add column if not exists pub jsonb;

-- Sources that are on the live site today but not yet reviewed stay live as they are (status quo for visitors)
-- and stay in the owner's review list.
alter table public.sources disable trigger sources_guard;
update public.sources s set pub = to_jsonb(s) - 'pub'
 where not s.reviewed and not s.deleted and s.pub is null
   and s.id in (select (r ->> 'id')::int from public.site_config c, jsonb_array_elements(c.data -> 'refs') r where c.id = 'published');
alter table public.sources enable trigger sources_guard;

-- 2. Guard: keep the approved version when a pharmacist changes an approved item -------------------------
create or replace function private.content_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  skip constant text[] := array['sort', 'updated_at', 'updated_by', 'reviewed', 'reviewed_at', 'pub'];
  owner boolean := auth.uid() is null or coalesce(private.my_role(), '') = 'owner'; -- uid null = trusted migration
begin
  if tg_table_name = 'nutrients' then
    if new.builtin and new.deleted then raise exception 'built-in nutrients cannot be removed; hide them instead'; end if;
    if tg_op = 'UPDATE' then
      if old.builtin <> new.builtin then raise exception 'builtin flag is fixed'; end if;
    end if;
  end if;
  if not owner then
    if tg_op = 'UPDATE' and (to_jsonb(new) - skip) = (to_jsonb(old) - skip) then
      new.reviewed := old.reviewed;          -- only the order changed (e.g. another item was removed): no review needed
    else
      new.reviewed := false;
      if tg_op = 'UPDATE' then
        if old.reviewed then new.pub := to_jsonb(old) - 'pub'; else new.pub := old.pub; end if;
      else
        new.pub := null;
      end if;
    end if;
  end if;
  if new.reviewed then
    if owner then new.pub := null; end if;   -- approved by the owner: nothing waiting any more
    if tg_op = 'INSERT' then new.reviewed_at := now();
    elsif not old.reviewed then new.reviewed_at := now();
    end if;
    -- approving an item also approves the new sources it cites (never-approved ones; an edited source keeps its own review)
    if owner and auth.uid() is not null and tg_table_name in ('interactions', 'nutrients') and not new.deleted then
      update public.sources set reviewed = true
       where id = any(new.source_ids) and not reviewed and not deleted and pub is null;
    end if;
  else
    new.reviewed_at := null;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

-- 3. The approved version of each item (what visitors may see) ----------------------------------------
create or replace function private.pub_sources() returns setof public.sources
  language sql stable set search_path = '' as $$
  select (x).* from (select case when t.reviewed then t else jsonb_populate_record(null::public.sources, t.pub) end as x
                       from public.sources t where t.reviewed or t.pub is not null) q
$$;
create or replace function private.pub_interactions() returns setof public.interactions
  language sql stable set search_path = '' as $$
  select (x).* from (select case when t.reviewed then t else jsonb_populate_record(null::public.interactions, t.pub) end as x
                       from public.interactions t where t.reviewed or t.pub is not null) q
$$;
create or replace function private.pub_nutrients() returns setof public.nutrients
  language sql stable set search_path = '' as $$
  select (x).* from (select case when t.reviewed then t else jsonb_populate_record(null::public.nutrients, t.pub) end as x
                       from public.nutrients t where t.reviewed or t.pub is not null) q
$$;
revoke all on function private.pub_sources(), private.pub_interactions(), private.pub_nutrients() from public, anon, authenticated;

-- 4. Publish: approved versions only (no more "unreviewed but cited" sources) ----------------------------
create or replace function public.publish_site(note text default '') returns jsonb
  language plpgsql security definer set search_path = 'public' as $$
declare s jsonb; inter jsonb; nut_custom jsonb; hide jsonb; refs jsonb; snap jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can publish'; end if;
  select data into s from site_config where id = 'draft';
  if s is null then select data into s from site_config where id = 'published'; end if;
  s := coalesce(s, '{}'::jsonb) - 'refs' - 'inter' - 'nut';

  select coalesce(jsonb_agg(id order by sort), '[]'::jsonb) into hide from private.pub_nutrients() where builtin and hidden;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids)) order by sort, id), '[]'::jsonb)
    into nut_custom from private.pub_nutrients() where not builtin and not hidden and not deleted;
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),'d',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids)) order by i.sort, i.id), '[]'::jsonb)
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

-- 5. Content for the team: each changed item carries its approved version ("pv"), and approved items a
--    pharmacist deleted are listed under "del" so the owner can confirm or restore them.
create or replace function private.j_src(s public.sources) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',s.id,'org',s.org,'title',s.title,'url',s.url,'ar',s.use_ar,'en',s.use_en,'rv',s.reviewed,'hidden',s.hidden,'kind',s.kind)
$$;
create or replace function private.j_inter(i public.interactions) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',i.id,'k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),
    'd',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'rv',i.reviewed,'hidden',i.hidden)
$$;
create or replace function private.j_nut(n public.nutrients) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',n.id,'hidden',n.hidden,'n',jsonb_build_object('ar',n.name_ar,'en',n.name_en),'h',jsonb_build_object('ar',n.hint_ar,'en',n.hint_en),'uk',n.unit,
    'rows',n.dose_rows,'plan',jsonb_build_object('ar',n.plan_ar,'en',n.plan_en),'note',jsonb_build_object('ar',n.note_ar,'en',n.note_en),'r',to_jsonb(n.source_ids),'rv',n.reviewed)
$$;
revoke all on function private.j_src(public.sources), private.j_inter(public.interactions), private.j_nut(public.nutrients) from public, anon;
grant execute on function private.j_src(public.sources), private.j_inter(public.interactions), private.j_nut(public.nutrients) to authenticated;

create or replace function public.get_content() returns jsonb
  language sql stable set search_path = 'public' as $$
  select jsonb_build_object(
    'refs', coalesce((select jsonb_agg(private.j_src(s) || case when s.pub is null then '{}'::jsonb
        else jsonb_build_object('pv', private.j_src(jsonb_populate_record(null::sources, s.pub)) || '{"rv":true}') end order by s.id)
      from sources s where not s.deleted), '[]'::jsonb),
    'next_ref', (select coalesce(max(id), 29) + 1 from sources),
    'inter', coalesce((select jsonb_agg(private.j_inter(i) || case when i.pub is null then '{}'::jsonb
        else jsonb_build_object('pv', private.j_inter(jsonb_populate_record(null::interactions, i.pub)) || '{"rv":true}') end order by i.sort, i.id)
      from interactions i where not i.deleted), '[]'::jsonb),
    'nut', jsonb_build_object(
      'hide', coalesce((select jsonb_agg(id order by sort) from nutrients where builtin and hidden), '[]'::jsonb),
      'custom', coalesce((select jsonb_agg(private.j_nut(n) || case when n.pub is null then '{}'::jsonb
          else jsonb_build_object('pv', private.j_nut(jsonb_populate_record(null::nutrients, n.pub)) || '{"rv":true}') end order by n.sort, n.id)
        from nutrients n where not n.builtin and not n.deleted), '[]'::jsonb)),
    'del', jsonb_build_object(
      'refs',  coalesce((select jsonb_agg(private.j_src(jsonb_populate_record(null::sources, s.pub)) || '{"rv":true}' order by s.id)
                 from sources s where s.deleted and s.pub is not null and not (s.pub ->> 'deleted')::boolean), '[]'::jsonb),
      'inter', coalesce((select jsonb_agg(private.j_inter(jsonb_populate_record(null::interactions, i.pub)) || '{"rv":true}' order by i.sort, i.id)
                 from interactions i where i.deleted and i.pub is not null and not (i.pub ->> 'deleted')::boolean), '[]'::jsonb),
      'nut',   coalesce((select jsonb_agg(private.j_nut(jsonb_populate_record(null::nutrients, n.pub)) || '{"rv":true}' order by n.sort, n.id)
                 from nutrients n where n.deleted and n.pub is not null and not (n.pub ->> 'deleted')::boolean), '[]'::jsonb))
  )
$$;

-- 6. Owner decision on a pharmacist's change: accept (approve the change or the deletion) or reject
--    (bring back the last approved version; a never-approved item is removed). kind: r | i | n
create or replace function public.review_change(p_kind text, p_id text, p_accept boolean) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if p_kind = 'r' then
    if p_accept then update public.sources set reviewed = true where id = p_id::int;
    else
      update public.sources t set (org, title, url, use_ar, use_en, hidden, kind, deleted, reviewed) =
        (select p.org, p.title, p.url, p.use_ar, p.use_en, p.hidden, p.kind, p.deleted, true from jsonb_populate_record(null::public.sources, t.pub) p)
       where t.id = p_id::int and t.pub is not null;
      if not found then update public.sources set deleted = true, reviewed = true where id = p_id::int and not reviewed; end if;
    end if;
  elsif p_kind = 'i' then
    if p_accept then update public.interactions set reviewed = true where id = p_id::bigint;
    else
      update public.interactions t set (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, hidden, deleted, reviewed) =
        (select p.nutrient_id, p.supp_ar, p.supp_en, p.with_ar, p.with_en, p.desc_ar, p.desc_en, p.severity, p.source_ids, p.hidden, p.deleted, true
           from jsonb_populate_record(null::public.interactions, t.pub) p)
       where t.id = p_id::bigint and t.pub is not null;
      if not found then update public.interactions set deleted = true, reviewed = true where id = p_id::bigint and not reviewed; end if;
    end if;
  elsif p_kind = 'n' then
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
end $$;
revoke all on function public.review_change(text, text, boolean) from public, anon;
grant execute on function public.review_change(text, text, boolean) to authenticated;

-- 7. members: one SELECT policy is enough (writes go through the owner-only team_* functions;
--    the table has no insert/update/delete grant). Removes the "multiple permissive policies" warning.
drop policy if exists "owner manages members" on public.members;
