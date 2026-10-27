create table if not exists public.site_config (
  id          text primary key check (id in ('draft','published')),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);

create table if not exists public.config_history (
  id            bigint generated always as identity primary key,
  data          jsonb not null,
  note          text,
  published_at  timestamptz not null default now(),
  published_by  uuid default auth.uid()
);

create table if not exists public.members (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text,
  role        text not null check (role in ('owner','editor')),
  created_at  timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid()
$$;

alter table public.site_config    enable row level security;
alter table public.config_history enable row level security;
alter table public.members        enable row level security;

create policy "read published or team" on public.site_config
  for select using (id = 'published' or public.my_role() in ('owner','editor'));
create policy "team inserts draft" on public.site_config
  for insert with check (id = 'draft' and public.my_role() in ('owner','editor'));
create policy "team updates draft" on public.site_config
  for update using (id = 'draft' and public.my_role() in ('owner','editor')) with check (id = 'draft');
create policy "team deletes draft" on public.site_config
  for delete using (id = 'draft' and public.my_role() in ('owner','editor'));

create policy "team reads history" on public.config_history
  for select using (public.my_role() in ('owner','editor'));

create policy "members read" on public.members
  for select using (user_id = auth.uid() or public.my_role() = 'owner');
create policy "owner manages members" on public.members
  for all using (public.my_role() = 'owner') with check (public.my_role() = 'owner');

create or replace function public.publish_config(note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  if coalesce(public.my_role(), '') <> 'owner' then
    raise exception 'only the owner can publish';
  end if;
  select data into d from public.site_config where id = 'draft';
  if d is null then raise exception 'no draft to publish'; end if;
  insert into public.site_config (id, data, updated_at, updated_by)
       values ('published', d, now(), auth.uid())
  on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into public.config_history (data, note) values (d, note);
end $$;

revoke all on function public.publish_config(text) from public, anon;
grant execute on function public.publish_config(text) to authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.site_config to anon, authenticated;
grant insert, update, delete on public.site_config to authenticated;
grant select on public.config_history to authenticated;
grant select, insert, update, delete on public.members to authenticated;
