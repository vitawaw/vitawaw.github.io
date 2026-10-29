-- VITAWAW 1.6.6: two decisions of the owner after the full review.
-- 1. Invitation key: the invitation link carries a secret key, and an account can be created only with it.
--    Before, anyone who knew (or guessed) the invited e-mail could create the account first.
-- 2. Page texts and info pages changed by a pharmacist wait for the owner's approval (🔔), like medical content.
--    Before, they went live with the owner's next «Publish» without review.

-- 1. Invitation key -------------------------------------------------------------------------------------------
alter table private.invites add column if not exists token text not null default replace(gen_random_uuid()::text, '-', '');

create or replace function private.guard_signup() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.invites i
                  where i.email = lower(new.email) and not i.revoked
                    and (i.role = 'owner' or i.token = coalesce(new.raw_user_meta_data ->> 'invite', ''))) then
    raise exception 'signup is invite-only';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;

-- a new invitation (or sending it again) makes a new key, so older links stop working
create or replace function public.team_invite(p_email text, p_name text, p_perms jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if e !~ '^[^\s@<>"'']+@[^\s@<>"'']+\.[a-z]{2,}$' then raise exception 'bad email'; end if;
  if exists (select 1 from public.members where lower(email) = e and status <> 'removed') then raise exception 'already a member'; end if;
  if exists (select 1 from private.invites where email = e and role = 'owner') then raise exception 'owner email'; end if;
  insert into private.invites(email, role, name, perms) values (e, 'editor', left(trim(coalesce(p_name, '')), 80), private.clean_perms(p_perms))
  on conflict (email) do update set name = excluded.name, perms = excluded.perms, revoked = false, used_at = null, created_at = now(),
    token = replace(gen_random_uuid()::text, '-', '');
  update public.members set status = 'active', perms = private.clean_perms(p_perms),
         name = coalesce(nullif(left(trim(coalesce(p_name, '')), 80), ''), name)
   where lower(email) = e and status = 'removed' and role = 'editor';
end $$;
revoke all on function public.team_invite(text, text, jsonb) from public, anon;
grant execute on function public.team_invite(text, text, jsonb) to authenticated;

-- the owner's list of open invitations includes the key (to build or resend the link)
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
    'invites', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'name', i.name, 'perms', i.perms, 'at', i.created_at, 'key', i.token) order by i.created_at desc)
      from private.invites i where i.role = 'editor' and not i.revoked and i.used_at is null), '[]'::jsonb));
end $$;
revoke all on function public.team_list() from public, anon;
grant execute on function public.team_list() to authenticated;

-- 2. Pharmacists' page texts and info pages wait for review ------------------------------------------------------
-- A pharmacist's texts/pages are kept in the draft under "team" (the owner's own texts stay as they are).
-- The owner approves (takes them into the draft) or rejects; either way the page sends "team_done": true.
create or replace function private.draft_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare base jsonb; t jsonb; p jsonb;
begin
  if new.id <> 'draft' or auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' then base := old.data;
  else select data into base from public.site_config where id = 'published'; end if;
  base := coalesce(base, '{}'::jsonb);
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

-- publishing never takes the pharmacists' waiting proposal
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
