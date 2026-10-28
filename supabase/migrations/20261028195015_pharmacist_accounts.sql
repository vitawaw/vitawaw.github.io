-- VITAWAW 1.6.0: pharmacist accounts.
-- The owner invites a pharmacist with chosen permissions; the invite alone lets them create an account.
-- The owner can switch each permission on/off, suspend or remove an account at any time.
-- Permissions are enforced HERE (row level security + checks), not only in the page.
--   nut   = add/edit vitamins        inter = add/edit interactions
--   refs  = add/edit sources         text  = edit page texts and info pages
-- Pharmacists can never approve, publish, manage accounts or change contact/colours/roadmap.

-- 1. Columns ------------------------------------------------------------------------------------
alter table public.members
  add column if not exists name   text  not null default '',
  add column if not exists perms  jsonb not null default '{}'::jsonb,
  add column if not exists status text  not null default 'active';
alter table public.members add constraint members_status_check check (status in ('active','suspended','removed'));
alter table public.members add constraint members_no_html check (name !~ '[<>]' and perms::text !~ '[<>]');

alter table private.invites
  add column if not exists name    text  not null default '',
  add column if not exists perms   jsonb not null default '{}'::jsonb,
  add column if not exists revoked boolean not null default false,
  add column if not exists used_at timestamptz;
alter table private.invites add constraint invites_no_html check (name !~ '[<>]' and email !~ '[<>]');

-- 2. Role and permission helpers ------------------------------------------------------------------
-- A suspended or removed member has no role at all, so every existing policy shuts them out.
create or replace function private.my_role() returns text
  language sql stable security definer set search_path = '' as $$
  select role from public.members where user_id = auth.uid() and status = 'active'
$$;

create or replace function private.can_edit(kind text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m
                 where m.user_id = auth.uid() and m.status = 'active'
                   and (m.role = 'owner' or (m.role = 'editor' and coalesce((m.perms ->> kind)::boolean, false))))
$$;
revoke all on function private.can_edit(text) from public, anon;
grant execute on function private.can_edit(text) to authenticated;

-- 3. Sign-up: only with a valid (not revoked) invite; the account gets the invite's name and permissions.
create or replace function private.guard_signup() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.invites i where i.email = lower(new.email) and not i.revoked) then
    raise exception 'signup is invite-only';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;

create or replace function private.add_invited_member() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.members(user_id, email, role, name, perms)
  select new.id, new.email, i.role, i.name, i.perms from private.invites i
   where i.email = lower(new.email) and not i.revoked
  on conflict (user_id) do nothing;
  update private.invites set used_at = now() where email = lower(new.email);
  return new;
end $$;

-- 4. Content tables: writing needs the matching permission ------------------------------------------
alter policy "team writes sources"       on public.sources      with check (private.can_edit('refs'));
alter policy "team updates sources"      on public.sources      using (private.can_edit('refs'))  with check (private.can_edit('refs'));
alter policy "team writes nutrients"     on public.nutrients    with check (private.can_edit('nut'));
alter policy "team updates nutrients"    on public.nutrients    using (private.can_edit('nut'))   with check (private.can_edit('nut'));
alter policy "team writes interactions"  on public.interactions with check (private.can_edit('inter'));
alter policy "team updates interactions" on public.interactions using (private.can_edit('inter')) with check (private.can_edit('inter'));

-- Draft settings: pharmacists need "text", and may only change texts and info pages.
alter policy "team inserts draft" on public.site_config with check (id = 'draft' and private.can_edit('text'));
alter policy "team updates draft" on public.site_config using (id = 'draft' and private.can_edit('text')) with check (id = 'draft');
alter policy "team deletes draft" on public.site_config using (id = 'draft' and private.my_role() = 'owner');

create or replace function private.draft_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare base jsonb;
begin
  if new.id <> 'draft' or auth.uid() is null or coalesce(private.my_role(), '') = 'owner' then return new; end if;
  if tg_op = 'UPDATE' then base := old.data;
  else select data into base from public.site_config where id = 'published'; end if;
  base := coalesce(base, '{}'::jsonb);
  new.data := base || jsonb_build_object('text',  coalesce(new.data -> 'text',  base -> 'text',  '{}'::jsonb),
                                         'pages', coalesce(new.data -> 'pages', base -> 'pages', '[]'::jsonb));
  return new;
end $$;
create trigger site_config_draft_guard before insert or update on public.site_config
  for each row execute function private.draft_guard();

-- 5. save_content: per-part permission, and only the owner hides/shows built-in vitamins ----------------
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

-- 6. Owner-only team management ----------------------------------------------------------------------
create or replace function private.clean_perms(p jsonb) returns jsonb
  language sql immutable set search_path = '' as $$
  select jsonb_build_object('nut',   coalesce((p ->> 'nut')::boolean,   false),
                            'inter', coalesce((p ->> 'inter')::boolean, false),
                            'refs',  coalesce((p ->> 'refs')::boolean,  false),
                            'text',  coalesce((p ->> 'text')::boolean,  false))
$$;

create or replace function public.team_list() returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.user_id, 'email', m.email, 'name', m.name, 'role', m.role, 'status', m.status, 'perms', m.perms,
        'since', m.created_at, 'last', u.last_sign_in_at,
        'pending', (select count(*) from public.nutrients    where updated_by = m.user_id and not reviewed and not deleted)
                 + (select count(*) from public.interactions where updated_by = m.user_id and not reviewed and not deleted)
                 + (select count(*) from public.sources      where updated_by = m.user_id and not reviewed and not deleted))
        order by (m.role = 'owner') desc, m.created_at)
      from public.members m left join auth.users u on u.id = m.user_id where m.status <> 'removed'), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'name', i.name, 'perms', i.perms, 'at', i.created_at) order by i.created_at desc)
      from private.invites i where i.role = 'editor' and not i.revoked and i.used_at is null), '[]'::jsonb));
end $$;

create or replace function public.team_invite(p_email text, p_name text, p_perms jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if e !~ '^[^\s@<>"'']+@[^\s@<>"'']+\.[a-z]{2,}$' then raise exception 'bad email'; end if;
  if exists (select 1 from public.members where lower(email) = e) then raise exception 'already a member'; end if;
  if exists (select 1 from private.invites where email = e and role = 'owner') then raise exception 'owner email'; end if;
  insert into private.invites(email, role, name, perms) values (e, 'editor', left(trim(coalesce(p_name, '')), 80), private.clean_perms(p_perms))
  on conflict (email) do update set name = excluded.name, perms = excluded.perms, revoked = false, used_at = null, created_at = now();
end $$;

create or replace function public.team_revoke_invite(p_email text) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  update private.invites set revoked = true where email = lower(trim(p_email)) and role = 'editor';
end $$;

-- status: 'active' | 'suspended' | 'removed' (removed = hidden from the list, cannot sign in to edit; nothing is deleted)
create or replace function public.team_update(p_user uuid, p_perms jsonb, p_status text) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if p_status is not null and p_status not in ('active','suspended','removed') then raise exception 'bad status'; end if;
  update public.members set
     perms  = case when p_perms is null then perms else private.clean_perms(p_perms) end,
     status = coalesce(p_status, status)
   where user_id = p_user and role = 'editor';
  if not found then raise exception 'not a pharmacist account'; end if;
  if p_status = 'removed' then update private.invites set revoked = true where email = (select lower(email) from public.members where user_id = p_user); end if;
end $$;

revoke all on function public.team_list(), public.team_invite(text, text, jsonb), public.team_revoke_invite(text), public.team_update(uuid, jsonb, text) from public, anon;
grant execute on function public.team_list(), public.team_invite(text, text, jsonb), public.team_revoke_invite(text), public.team_update(uuid, jsonb, text) to authenticated;
