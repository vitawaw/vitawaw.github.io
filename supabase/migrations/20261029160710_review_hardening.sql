-- VITAWAW 1.6.5: fixes from the full review (database part).
-- 1. A pharmacist could write the "approved version" column (pub) directly through the API and so get unreviewed
--    text published (or turned into "approved" by Reject). Now only the database itself sets pub.
-- 2. A pharmacist could hide/edit built-in vitamins (owner only) and leave rows the owner cannot resolve.
-- 3. A pharmacist could reorder approved items without review. Now only the owner changes the order.
-- 4. Pharmacists could read colleagues' names/e-mails through get_content's "by". Now only the owner sees "by".
-- 5. A removed pharmacist could not be invited again. Now inviting the same e-mail re-activates the account.
-- Applied 2026-10-29 by the owner in the SQL editor (not in list_migrations); named with the time it was checked.
-- Compatible with the 1.6.0–1.6.4 pages (no change in what they send or receive).

-- 1–3: content guard ----------------------------------------------------------------------------------------
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
    if not owner and (new.builtin or (tg_op = 'UPDATE' and old.builtin)) then raise exception 'built-in vitamins: owner only'; end if;
  end if;
  if not owner then
    -- the approved version and the order are never taken from a pharmacist's request
    new.pub := case when tg_op = 'INSERT' then null else old.pub end;
    if tg_op = 'UPDATE' then new.sort := old.sort; end if;
    if tg_op = 'UPDATE' and (to_jsonb(new) - skip) = (to_jsonb(old) - skip) then
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

-- 4: "by" (who made a waiting change) only for the owner ------------------------------------------------------
create or replace function private.who(u uuid) returns text
  language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(m.name, ''), m.email) from public.members m
   where m.user_id = u and coalesce(private.my_role(), '') = 'owner'
$$;

-- 5: inviting a removed pharmacist again re-activates the account ----------------------------------------------
create or replace function public.team_invite(p_email text, p_name text, p_perms jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if e !~ '^[^\s@<>"'']+@[^\s@<>"'']+\.[a-z]{2,}$' then raise exception 'bad email'; end if;
  if exists (select 1 from public.members where lower(email) = e and status <> 'removed') then raise exception 'already a member'; end if;
  if exists (select 1 from private.invites where email = e and role = 'owner') then raise exception 'owner email'; end if;
  insert into private.invites(email, role, name, perms) values (e, 'editor', left(trim(coalesce(p_name, '')), 80), private.clean_perms(p_perms))
  on conflict (email) do update set name = excluded.name, perms = excluded.perms, revoked = false, used_at = null, created_at = now();
  -- an account that was removed before: active again with the new name and permissions (same password)
  update public.members set status = 'active', perms = private.clean_perms(p_perms),
         name = coalesce(nullif(left(trim(coalesce(p_name, '')), 80), ''), name)
   where lower(email) = e and status = 'removed' and role = 'editor';
end $$;
revoke all on function public.team_invite(text, text, jsonb) from public, anon;
grant execute on function public.team_invite(text, text, jsonb) to authenticated;
