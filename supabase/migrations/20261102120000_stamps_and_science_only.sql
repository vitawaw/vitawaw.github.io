-- VITAWAW 1.12.0 (the owner's notes):
-- 1. Every pharmacist has his own stamp: an item (source, interaction, vitamin) that a pharmacist added or edited shows
--    «راجعه: <his name> · <the date the owner approved it>» once the owner approves and publishes it.
-- 2. Invited pharmacists edit only the scientific content (vitamins, interactions, sources); page texts and info pages
--    are for the owner only — enforced here in the database, not only in the page.
-- Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- 3. Fix: a pharmacist could not edit an existing source (the guard set an order column that sources do not have).
-- Compatible with the live site: it only adds fields ("sb", "sa") that older pages ignore.

-- 1a. who wrote the current version of an item (a pharmacist; empty when the owner wrote it)
alter table public.sources      add column if not exists author uuid;
alter table public.interactions add column if not exists author uuid;
alter table public.nutrients    add column if not exists author uuid;

-- 1b. the content guard (same as 1.6.5) also records the author
create or replace function private.content_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  skip constant text[] := array['sort', 'updated_at', 'updated_by', 'reviewed', 'reviewed_at', 'pub', 'author'];
  owner boolean := auth.uid() is null or coalesce(private.my_role(), '') = 'owner'; -- uid null = trusted migration
  changed boolean := tg_op = 'INSERT' or (to_jsonb(new) - skip) <> (to_jsonb(old) - skip);
begin
  if tg_table_name = 'nutrients' then
    if new.builtin and new.deleted then raise exception 'built-in nutrients cannot be removed; hide them instead'; end if;
    if tg_op = 'UPDATE' then
      if old.builtin <> new.builtin then raise exception 'builtin flag is fixed'; end if;
    end if;
    if not owner and (new.builtin or (tg_op = 'UPDATE' and old.builtin)) then raise exception 'built-in vitamins: owner only'; end if;
  end if;
  -- the stamp: a pharmacist's change carries his name; a change by the owner clears it; approving keeps it
  if tg_op = 'UPDATE' then new.author := old.author; end if;
  if changed and auth.uid() is not null then new.author := case when owner then null else auth.uid() end; end if;
  if not owner then
    -- the approved version and the order are never taken from a pharmacist's request
    new.pub := case when tg_op = 'INSERT' then null else old.pub end;
    if tg_op = 'UPDATE' and tg_table_name <> 'sources' then new.sort := old.sort; end if; -- sources have no order column (this line broke a pharmacist's edit of a source)
    if tg_op = 'UPDATE' and not changed then
      new.reviewed := old.reviewed;          -- nothing that visitors see changed
    else
      new.reviewed := false;
      if tg_op = 'UPDATE' and old.reviewed then new.pub := to_jsonb(old) - 'pub'; end if;
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

-- 1c. the name on the stamp: only a pharmacist's display name (never the e-mail), for everyone
create or replace function private.stamp_name(u uuid) returns text
  language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(m.name, ''), '') from public.members m where m.user_id = u and m.role = 'editor'
$$;
revoke all on function private.stamp_name(uuid) from public, anon;
grant execute on function private.stamp_name(uuid) to authenticated;

-- 1d. the stamp in what the team sees (get_content) …
create or replace function private.j_src(s public.sources) returns jsonb
  language sql stable set search_path = '' as $$
  select jsonb_build_object('id',s.id,'org',s.org,'title',s.title,'url',s.url,'ar',s.use_ar,'en',s.use_en,'rv',s.reviewed,'hidden',s.hidden,'kind',s.kind,
    'at',coalesce(to_char(s.reviewed_at,'YYYY-MM-DD'),''),'sb',coalesce(private.stamp_name(s.author),''),'sa',coalesce(to_char(s.reviewed_at,'YYYY-MM-DD'),''))
$$;
create or replace function private.j_inter(i public.interactions) returns jsonb
  language sql stable set search_path = '' as $$
  select jsonb_build_object('id',i.id,'k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),
    'd',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'rv',i.reviewed,'hidden',i.hidden,'g',coalesce(i.gap,'{}'::jsonb),
    'sb',coalesce(private.stamp_name(i.author),''),'sa',coalesce(to_char(i.reviewed_at,'YYYY-MM-DD'),''))
$$;
create or replace function private.j_nut(n public.nutrients) returns jsonb
  language sql stable set search_path = '' as $$
  select jsonb_build_object('id',n.id,'hidden',n.hidden,'n',jsonb_build_object('ar',n.name_ar,'en',n.name_en),'h',jsonb_build_object('ar',n.hint_ar,'en',n.hint_en),'uk',n.unit,
    'rows',n.dose_rows,'plan',jsonb_build_object('ar',n.plan_ar,'en',n.plan_en),'note',jsonb_build_object('ar',n.note_ar,'en',n.note_en),'r',to_jsonb(n.source_ids),'rv',n.reviewed,
    'sb',coalesce(private.stamp_name(n.author),''),'sa',coalesce(to_char(n.reviewed_at,'YYYY-MM-DD'),''))
$$;
revoke all on function private.j_src(public.sources), private.j_inter(public.interactions), private.j_nut(public.nutrients) from public, anon;
grant execute on function private.j_src(public.sources), private.j_inter(public.interactions), private.j_nut(public.nutrients) to authenticated;

-- 1e. … and in what visitors see (publish_site, same as 1.9.0 plus "sb"/"sa")
create or replace function public.publish_site(note text default '') returns jsonb
  language plpgsql security definer set search_path = 'public' as $$
declare s jsonb; inter jsonb; nut_custom jsonb; hide jsonb; refs jsonb; snap jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can publish'; end if;
  select data into s from site_config where id = 'draft';
  if s is null then select data into s from site_config where id = 'published'; end if;
  s := coalesce(s, '{}'::jsonb) - 'refs' - 'inter' - 'nut' - 'team' - 'team_done';

  select coalesce(jsonb_agg(id order by sort), '[]'::jsonb) into hide from private.pub_nutrients() where builtin and hidden;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids),
      'sb',coalesce(private.stamp_name(author),''),'sa',coalesce(to_char(reviewed_at,'YYYY-MM-DD'),'')) order by sort, id), '[]'::jsonb)
    into nut_custom from private.pub_nutrients() where not builtin and not hidden and not deleted;
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),'d',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'g',coalesce(i.gap,'{}'::jsonb),
      'sb',coalesce(private.stamp_name(i.author),''),'sa',coalesce(to_char(i.reviewed_at,'YYYY-MM-DD'),'')) order by i.sort, i.id), '[]'::jsonb)
    into inter from private.pub_interactions() i join private.pub_nutrients() n on n.id = i.nutrient_id
    where not i.deleted and not i.hidden and not n.hidden and not n.deleted;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'kind',kind,'at',coalesce(to_char(reviewed_at,'YYYY-MM-DD'),''),
      'sb',coalesce(private.stamp_name(author),''),'sa',coalesce(to_char(reviewed_at,'YYYY-MM-DD'),'')) order by id), '[]'::jsonb)
    into refs from private.pub_sources() where not deleted and not hidden;

  snap := s || jsonb_build_object('refs', refs, 'inter', inter, 'nut', jsonb_build_object('hide', hide, 'custom', nut_custom), 'published_at', now());
  insert into site_config (id, data, updated_at, updated_by) values ('published', snap, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into config_history (data, note) values (snap, note);
  return jsonb_build_object('refs', jsonb_array_length(refs), 'inter', jsonb_array_length(inter), 'custom', jsonb_array_length(nut_custom));
end $$;

-- 2. pharmacists: scientific content only. "text" (page texts and info pages) is the owner's alone.
create or replace function private.can_edit(kind text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and exists (select 1 from public.members m
                 where m.user_id = auth.uid() and m.status = 'active'
                   and (m.role = 'owner' or (m.role = 'editor' and kind <> 'text' and coalesce((m.perms ->> kind)::boolean, false))))
$$;
