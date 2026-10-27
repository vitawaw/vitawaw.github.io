-- ============================================================
-- VITAWAW · إعداد قاعدة البيانات في Supabase
-- انسخ هذا الملف كاملاً في SQL Editor ثم اضغط Run مرة واحدة.
-- ============================================================

-- 1) الجداول
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

-- 2) دالة تعرف صلاحية المستخدم الحالي
create schema if not exists private;
grant usage on schema private to anon, authenticated;
create or replace function private.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid()
$$;

-- 3) قواعد الحماية (Row Level Security)
alter table public.site_config    enable row level security;
alter table public.config_history enable row level security;
alter table public.members        enable row level security;

drop policy if exists "read published or team"  on public.site_config;
drop policy if exists "team inserts draft"      on public.site_config;
drop policy if exists "team updates draft"      on public.site_config;
drop policy if exists "team deletes draft"      on public.site_config;
drop policy if exists "team reads history"      on public.config_history;
drop policy if exists "members read"            on public.members;
drop policy if exists "owner manages members"   on public.members;

-- الزوار يقرؤون النسخة المنشورة فقط، والفريق يقرأ المسودة أيضاً
create policy "read published or team" on public.site_config
  for select using (id = 'published' or private.my_role() in ('owner','editor'));
-- المالك والمحرر يكتبان المسودة فقط (النشر عبر الدالة أدناه للمالك وحده)
create policy "team inserts draft" on public.site_config
  for insert with check (id = 'draft' and private.my_role() in ('owner','editor'));
create policy "team updates draft" on public.site_config
  for update using (id = 'draft' and private.my_role() in ('owner','editor')) with check (id = 'draft');
create policy "team deletes draft" on public.site_config
  for delete using (id = 'draft' and private.my_role() in ('owner','editor'));

create policy "team reads history" on public.config_history
  for select using (private.my_role() in ('owner','editor'));

create policy "members read" on public.members
  for select using (user_id = auth.uid() or private.my_role() = 'owner');
create policy "owner manages members" on public.members
  for all using (private.my_role() = 'owner') with check (private.my_role() = 'owner');

-- 4) النشر: للمالك فقط، وينسخ المسودة إلى المنشور ويحفظ نسخة في السجل
create or replace function public.publish_config(note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then
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

-- صلاحيات الوصول عبر الواجهة البرمجية (قواعد الحماية أعلاه تبقى سارية)
grant usage on schema public to anon, authenticated;
grant select on public.site_config to anon, authenticated;
grant insert, update, delete on public.site_config to authenticated;
grant select on public.config_history to authenticated;
grant select, insert, update, delete on public.members to authenticated;

-- ============================================================
-- 5) بعد إنشاء حسابك من Authentication → Users، نفّذ هذا السطر وحده
--    (غيّر البريد إن كان حسابك ببريد آخر):
-- insert into public.members (user_id, email, role)
-- select id, email, 'owner' from auth.users where email = 'vitawaw26@gmail.com';
--
-- ولإضافة محرر (يعدّل ويحفظ المسودة ولا ينشر):
-- insert into public.members (user_id, email, role)
-- select id, email, 'editor' from auth.users where email = 'EDITOR@EMAIL.COM';
-- ============================================================
