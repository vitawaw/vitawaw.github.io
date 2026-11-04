-- VITAWAW 1.16.0 activity log (owner: «اريد اضافه صفحه للاجرائات ... حتى اعرف مالذي حدث ومن غير و مالذي غير»).
-- The DATABASE writes every action itself (triggers), so no page can skip or fake it:
--   sources / interactions / added vitamins: add, edit (which fields), hide, show, delete, restore, approve, reject
--   the draft settings (texts, pages, menus, tools, look…): which parts were saved
--   publishing (with its note), and the team: invite, join, permissions, status, name.
-- Who can read it (row level security): the owner reads everything; an invited pharmacist reads only his own actions.
-- Nobody can write, change or delete a line from the page. Safe to run twice; nothing in the live page depends on it.

create table if not exists public.activity (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  user_id uuid,
  who     text,
  kind    text not null check (kind in ('src','int','nut','draft','publish','team')),
  action  text not null check (action in ('add','edit','del','hide','show','restore','approve','reject','save','publish','invite','join','perms','status','rename')),
  item    text check (item is null or length(item) <= 80),
  label   text check (label is null or (length(label) <= 300 and label !~ '[<>]')),
  detail  text check (detail is null or (length(detail) <= 600 and detail !~ '[<>]'))
);
create index if not exists activity_user_idx on public.activity (user_id, id desc);
alter table public.activity enable row level security;
revoke all on public.activity from public, anon, authenticated;
grant select on public.activity to authenticated;
drop policy if exists "activity: owner reads all, team reads own" on public.activity;
create policy "activity: owner reads all, team reads own" on public.activity for select to authenticated
  using ((select private.my_role()) = 'owner' or user_id = (select auth.uid()));

-- one line in the log (only the triggers below call it)
create or replace function private.log(p_kind text, p_action text, p_item text, p_label text, p_detail text) returns void
  language sql security definer set search_path = '' as $$
  insert into public.activity (user_id, who, kind, action, item, label, detail)
  values ((select auth.uid()), private.who((select auth.uid())), p_kind, p_action, left(p_item, 80),
          nullif(left(translate(coalesce(p_label, ''), '<>', '‹›'), 300), ''), nullif(left(translate(coalesce(p_detail, ''), '<>', '‹›'), 600), ''))
$$;
revoke all on function private.log(text, text, text, text, text) from public, anon, authenticated;

-- sources, interactions, nutrients
create or replace function private.log_content() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  k text := case tg_table_name when 'sources' then 'src' when 'interactions' then 'int' else 'nut' end;
  n jsonb := to_jsonb(new); o jsonb; lab text; ch text; act text;
  meta text[] := array['updated_at','updated_by','reviewed','reviewed_at','pub','sort','author','deleted','hidden'];
begin
  lab := case k when 'src' then (n->>'id') || '. ' || coalesce(n->>'org', '')
                when 'int' then coalesce(n->>'nutrient_id', '') || ' + ' || coalesce(nullif(n->>'with_ar', ''), n->>'with_en', '')
                else coalesce(nullif(n->>'name_ar', ''), n->>'name_en', n->>'id') end;
  if tg_op = 'INSERT' then perform private.log(k, 'add', n->>'id', lab, null); return null; end if;
  o := to_jsonb(old);
  select string_agg(e.key, ',' order by e.key) into ch from jsonb_each(n) e where e.key <> all (meta) and e.value is distinct from o->e.key;
  if coalesce((n->>'deleted')::boolean, false) and not coalesce((o->>'deleted')::boolean, false) then act := 'del';
  elsif not coalesce((n->>'deleted')::boolean, false) and coalesce((o->>'deleted')::boolean, false) then act := 'restore';
  elsif coalesce((n->>'reviewed')::boolean, false) and not coalesce((o->>'reviewed')::boolean, false) then act := case when ch is null then 'approve' else 'reject' end;
  elsif ch is not null then act := 'edit';
  elsif (n->>'hidden') is distinct from (o->>'hidden') then act := case when coalesce((n->>'hidden')::boolean, false) then 'hide' else 'show' end;
  else return null; -- saved again without a change: nothing to log
  end if;
  if act = 'edit' and (n->>'hidden') is distinct from (o->>'hidden') then ch := ch || ',hidden'; end if;
  perform private.log(k, act, n->>'id', lab, case when act in ('edit','reject') then ch end);
  return null;
end $$;
revoke all on function private.log_content() from public, anon, authenticated;
drop trigger if exists sources_log on public.sources;
create trigger sources_log after insert or update on public.sources for each row execute function private.log_content();
drop trigger if exists interactions_log on public.interactions;
create trigger interactions_log after insert or update on public.interactions for each row execute function private.log_content();
drop trigger if exists nutrients_log on public.nutrients;
create trigger nutrients_log after insert or update on public.nutrients for each row execute function private.log_content();

-- the draft settings: which parts changed (texts, pages, menus, tools, look, colours, roadmap, a pharmacist's proposals…)
create or replace function private.log_config() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare ch text;
begin
  if new.id <> 'draft' then return null; end if;
  select string_agg(x.key, ',' order by x.key) into ch from (
    select e.key from jsonb_each(coalesce(new.data, '{}'::jsonb)) e
     where tg_op = 'INSERT' or e.value is distinct from (old.data -> e.key)
    union select e.key from jsonb_each(case when tg_op = 'UPDATE' then coalesce(old.data, '{}'::jsonb) else '{}'::jsonb end) e
     where not (coalesce(new.data, '{}'::jsonb) ? e.key)) x;
  if ch is null then return null; end if;
  perform private.log('draft', 'save', 'draft', null, ch);
  return null;
end $$;
revoke all on function private.log_config() from public, anon, authenticated;
drop trigger if exists site_config_log on public.site_config;
create trigger site_config_log after insert or update on public.site_config for each row execute function private.log_config();

-- publishing (every publish adds a version to config_history)
create or replace function private.log_publish() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin perform private.log('publish', 'publish', new.id::text, new.note, null); return null; end $$;
revoke all on function private.log_publish() from public, anon, authenticated;
drop trigger if exists config_history_log on public.config_history;
create trigger config_history_log after insert on public.config_history for each row execute function private.log_publish();

-- the team: invitations and members (permissions, status, name)
create or replace function private.log_team() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  if tg_table_name = 'invites' then
    if tg_op = 'INSERT' then perform private.log('team', 'invite', null, coalesce(nullif(new.name, ''), new.email), null); end if;
    return null;
  end if;
  nm := coalesce(nullif(new.name, ''), new.email);
  if tg_op = 'INSERT' then perform private.log('team', 'join', new.user_id::text, nm, new.role); return null; end if;
  if new.perms is distinct from old.perms then
    perform private.log('team', 'perms', new.user_id::text, nm, (select string_agg(key, ',' order by key) from jsonb_each(coalesce(new.perms, '{}'::jsonb)) where value = 'true'::jsonb));
  end if;
  if new.status is distinct from old.status then perform private.log('team', 'status', new.user_id::text, nm, new.status); end if;
  if new.name is distinct from old.name then perform private.log('team', 'rename', new.user_id::text, nm, coalesce(old.name, '') || ' → ' || coalesce(new.name, '')); end if;
  return null;
end $$;
revoke all on function private.log_team() from public, anon, authenticated;
drop trigger if exists members_log on public.members;
create trigger members_log after insert or update on public.members for each row execute function private.log_team();
drop trigger if exists invites_log on private.invites;
create trigger invites_log after insert on private.invites for each row execute function private.log_team();
