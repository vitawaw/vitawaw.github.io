create table if not exists private.invites (
  email text primary key,
  role  text not null check (role in ('owner','editor')),
  created_at timestamptz not null default now()
);
revoke all on private.invites from anon, authenticated;
insert into private.invites(email, role) values ('vitawaw26@gmail.com','owner') on conflict (email) do update set role = excluded.role;

create or replace function private.guard_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.invites i where i.email = lower(new.email)) then
    raise exception 'signup is invite-only';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;

create or replace function private.add_invited_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.members(user_id, email, role)
  select new.id, new.email, i.role from private.invites i where i.email = lower(new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger vitawaw_guard_signup before insert on auth.users
  for each row execute function private.guard_signup();
create trigger vitawaw_add_member after insert on auth.users
  for each row execute function private.add_invited_member();
