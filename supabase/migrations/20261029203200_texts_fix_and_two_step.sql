-- VITAWAW 1.6.7–1.6.8: (1) fix — a pharmacist's page texts were lost instead of waiting for review; (2) two-step verification enforced by the database; (3) the owner can rename a pharmacist.
-- Applied 2026-10-29 by the owner in the SQL editor (not in list_migrations); named with the time it was checked.
-- Cause: the page saves the draft with an "upsert" (INSERT … ON CONFLICT DO UPDATE). The guard ran twice: first as
-- INSERT (comparing with the published copy and moving the texts under "team"), then as UPDATE, where it read the texts
-- from the top level again (already replaced) and dropped the proposal. The owner's «approve/reject» flag (team_done)
-- was lost the same way. Now the INSERT pass does nothing when the draft row already exists (the UPDATE pass decides),
-- and a proposal already moved under "team" is kept.

create or replace function private.draft_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare base jsonb; t jsonb; p jsonb;
begin
  if new.id <> 'draft' or auth.uid() is null then return new; end if;
  -- upsert on an existing draft: let the UPDATE pass (with the real old row) decide
  if tg_op = 'INSERT' and exists (select 1 from public.site_config where id = 'draft') then return new; end if;
  if tg_op = 'UPDATE' then base := old.data;
  else select data into base from public.site_config where id = 'published'; end if;
  base := coalesce(base, '{}'::jsonb) - 'team_done';
  if coalesce(private.my_role(), '') = 'owner' then
    -- the owner's page does not send "team": keep the pharmacist's proposal unless the owner has decided on it
    if coalesce((new.data ->> 'team_done')::boolean, false) then new.data := new.data - 'team' - 'team_done';
    elsif base ? 'team' and not (new.data ? 'team') then new.data := new.data || jsonb_build_object('team', base -> 'team');
    end if;
    return new;
  end if;
  t := coalesce(new.data -> 'text',  base -> 'text',  '{}'::jsonb);
  p := coalesce(new.data -> 'pages', base -> 'pages', '[]'::jsonb);
  new.data := base;  -- everything else stays as the owner left it
  if t is distinct from coalesce(base -> 'text', '{}'::jsonb) or p is distinct from coalesce(base -> 'pages', '[]'::jsonb) then
    new.data := base || jsonb_build_object('team', jsonb_build_object('text', t, 'pages', p, 'by', auth.uid(), 'at', now()));
  end if;
  return new;
end $$;

-- 2. Two-step verification is enforced by the database, not only by the page: an account that turned it on gets no
--    team rights (no editing, no publishing, no team management) until the session is verified with the code (aal2).
create or replace function private.mfa_ok() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;
revoke all on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

create or replace function private.my_role() returns text
  language sql stable security definer set search_path = '' as $$
  select role from public.members where user_id = auth.uid() and status = 'active' and private.mfa_ok()
$$;

create or replace function private.can_edit(kind text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and exists (select 1 from public.members m
                 where m.user_id = auth.uid() and m.status = 'active'
                   and (m.role = 'owner' or (m.role = 'editor' and coalesce((m.perms ->> kind)::boolean, false))))
$$;

-- 3. The owner can rename a pharmacist's account (shown in the menu and in notifications).
create or replace function public.team_rename(p_user uuid, p_name text) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if coalesce(trim(p_name), '') = '' or p_name ~ '[<>]' then raise exception 'bad name'; end if;
  update public.members set name = left(trim(p_name), 80) where user_id = p_user and role = 'editor';
  if not found then raise exception 'not a pharmacist account'; end if;
end $$;
revoke all on function public.team_rename(uuid, text) from public, anon;
grant execute on function public.team_rename(uuid, text) to authenticated;
