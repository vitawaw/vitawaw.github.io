-- VITAWAW · test project (vitawaw-test, qzxdvdesscsyqbaqyuqb) — run ONCE in that project's SQL editor.
-- Builds the same database as the live site (all files of supabase/migrations in order), then copies the live
-- published content so the preview links look like the real site. Publishing on a preview link writes HERE only.
-- Never run this file in the live project.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'site_config') then
    raise exception 'this project already has the VITAWAW tables — stop (wrong project, or already run)';
  end if;
end $$;

-- ===================== 20261027190955_vitawaw_owner_core.sql =====================
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

-- ===================== 20261027191014_move_my_role_private.sql =====================
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.my_role() set schema private;
grant execute on function private.my_role() to anon, authenticated;

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

-- ===================== 20261027194751_invite_only_signup.sql =====================
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

-- ===================== 20261027202932_content_tables.sql =====================
-- VITAWAW 1.1.0: medical content in tables (sources, nutrients, interactions)
-- Visitors never read these tables; they read the published snapshot built by publish_site().

create table public.sources (
  id          int primary key check (id > 0),
  org         text not null check (length(trim(org)) > 0),
  title       text not null check (length(trim(title)) > 0),
  url         text not null default '' check (url = '' or url ~* '^https?://'),
  use_ar      text not null default '',
  use_en      text not null default '',
  reviewed    boolean not null default false,
  reviewed_at timestamptz,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);

create table public.nutrients (
  id          text primary key check (id ~ '^[a-z0-9_]{1,24}$'),
  builtin     boolean not null default false,
  hidden      boolean not null default false,
  sort        int not null default 1000,
  name_ar     text not null check (length(trim(name_ar)) > 0),
  name_en     text not null default '',
  hint_ar     text not null default '',
  hint_en     text not null default '',
  unit        text check (unit in ('mg','mcg','iu','g')),
  dose_rows   jsonb not null default '[]'::jsonb check (jsonb_typeof(dose_rows) = 'array'),
  plan_ar     text not null default '',
  plan_en     text not null default '',
  note_ar     text not null default '',
  note_en     text not null default '',
  source_ids  int[] not null default '{}',
  reviewed    boolean not null default false,
  reviewed_at timestamptz,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid(),
  constraint custom_needs_rows_and_sources check (builtin or (jsonb_array_length(dose_rows) > 0 and cardinality(source_ids) > 0 and unit is not null))
);

create table public.interactions (
  id          bigint generated by default as identity primary key,
  nutrient_id text not null references public.nutrients(id) on delete cascade,
  supp_ar     text not null check (length(trim(supp_ar)) > 0),
  supp_en     text not null default '',
  with_ar     text not null check (length(trim(with_ar)) > 0),
  with_en     text not null default '',
  desc_ar     text not null check (length(trim(desc_ar)) > 0),
  desc_en     text not null default '',
  severity    text not null default 'moderate' check (severity in ('major','moderate','minor')),
  source_ids  int[] not null check (cardinality(source_ids) > 0),
  sort        int not null default 1000,
  reviewed    boolean not null default false,
  reviewed_at timestamptz,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create index interactions_nutrient_idx on public.interactions(nutrient_id);

-- only the owner (the pharmacist) can approve; any edit by an editor sends the item back to review
create or replace function private.content_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'nutrients' then
    if new.builtin and new.deleted then raise exception 'built-in nutrients cannot be removed; hide them instead'; end if;
    if tg_op = 'UPDATE' then
      if old.builtin <> new.builtin then raise exception 'builtin flag is fixed'; end if;
    end if;
  end if;
  -- auth.uid() is null only for trusted server-side migrations
  if auth.uid() is not null and coalesce(private.my_role(), '') <> 'owner' then new.reviewed := false; end if;
  if new.reviewed then
    if tg_op = 'INSERT' then new.reviewed_at := now();
    elsif not old.reviewed then new.reviewed_at := now();
    end if;
  else
    new.reviewed_at := null;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

create trigger sources_guard      before insert or update on public.sources      for each row execute function private.content_guard();
create trigger nutrients_guard    before insert or update on public.nutrients    for each row execute function private.content_guard();
create trigger interactions_guard before insert or update on public.interactions for each row execute function private.content_guard();

alter table public.sources      enable row level security;
alter table public.nutrients    enable row level security;
alter table public.interactions enable row level security;

create policy "team reads sources"       on public.sources      for select using (private.my_role() in ('owner','editor'));
create policy "team writes sources"      on public.sources      for insert with check (private.my_role() in ('owner','editor'));
create policy "team updates sources"     on public.sources      for update using (private.my_role() in ('owner','editor')) with check (private.my_role() in ('owner','editor'));
create policy "team reads nutrients"     on public.nutrients    for select using (private.my_role() in ('owner','editor'));
create policy "team writes nutrients"    on public.nutrients    for insert with check (private.my_role() in ('owner','editor'));
create policy "team updates nutrients"   on public.nutrients    for update using (private.my_role() in ('owner','editor')) with check (private.my_role() in ('owner','editor'));
create policy "team reads interactions"  on public.interactions for select using (private.my_role() in ('owner','editor'));
create policy "team writes interactions" on public.interactions for insert with check (private.my_role() in ('owner','editor'));
create policy "team updates interactions" on public.interactions for update using (private.my_role() in ('owner','editor')) with check (private.my_role() in ('owner','editor'));

-- no hard removals from the app: removed items are flagged (deleted = true) so they can be restored
grant select, insert, update on public.sources, public.nutrients, public.interactions to authenticated;
grant usage on sequence public.interactions_id_seq to authenticated;

-- ---------- read all content for the owner screens (same shape the app uses) ----------
create or replace function public.get_content() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'refs', coalesce((select jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'rv',reviewed) order by id) from sources where not deleted), '[]'::jsonb),
    'next_ref', (select coalesce(max(id), 29) + 1 from sources),
    'inter', coalesce((select jsonb_agg(jsonb_build_object('id',id,'k',nutrient_id,'a',jsonb_build_object('ar',supp_ar,'en',supp_en),'b',jsonb_build_object('ar',with_ar,'en',with_en),'d',jsonb_build_object('ar',desc_ar,'en',desc_en),'sev',severity,'r',to_jsonb(source_ids),'rv',reviewed) order by sort, id) from interactions where not deleted), '[]'::jsonb),
    'nut', jsonb_build_object(
      'hide', coalesce((select jsonb_agg(id order by sort) from nutrients where builtin and hidden), '[]'::jsonb),
      'custom', coalesce((select jsonb_agg(jsonb_build_object('id',id,'hidden',hidden,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids),'rv',reviewed) order by sort, id) from nutrients where not builtin and not deleted), '[]'::jsonb)
    )
  )
$$;
revoke all on function public.get_content() from public, anon;
grant execute on function public.get_content() to authenticated;

-- ---------- save the owner's edits (row level, RLS applies) ----------
create or replace function public.save_content(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare x jsonb; keep_ids bigint[];
begin
  if coalesce(private.my_role(), '') not in ('owner','editor') then raise exception 'not allowed'; end if;

  -- sources
  if p ? 'refs' then
    for x in select * from jsonb_array_elements(p->'refs') loop
      insert into sources(id, org, title, url, use_ar, use_en, reviewed)
      values ((x->>'id')::int, x->>'org', x->>'title', coalesce(x->>'url',''), coalesce(x->>'ar',''), coalesce(x->>'en',''), coalesce((x->>'rv')::boolean, false))
      on conflict (id) do update set org = excluded.org, title = excluded.title, url = excluded.url, use_ar = excluded.use_ar, use_en = excluded.use_en, reviewed = excluded.reviewed, deleted = false
      where (sources.org, sources.title, sources.url, sources.use_ar, sources.use_en, sources.reviewed, sources.deleted) is distinct from (excluded.org, excluded.title, excluded.url, excluded.use_ar, excluded.use_en, excluded.reviewed, false);
    end loop;
  end if;

  -- nutrients: built-in visibility + custom ones
  if p ? 'nut' then
    update nutrients set hidden = (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))))
      where builtin and hidden is distinct from (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))));
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

  -- interactions
  if p ? 'inter' then
    keep_ids := array(select (x2->>'id')::bigint from jsonb_array_elements(p->'inter') x2 where x2 ? 'id' and x2->>'id' is not null);
    update interactions set deleted = true where not deleted and not (id = any(keep_ids));
    declare i int := 0; begin
      for x in select * from jsonb_array_elements(p->'inter') loop
        i := i + 1;
        if x ? 'id' and x->>'id' is not null then
          update interactions set nutrient_id = x->>'k', supp_ar = x->'a'->>'ar', supp_en = coalesce(x->'a'->>'en',''), with_ar = x->'b'->>'ar', with_en = coalesce(x->'b'->>'en',''),
            desc_ar = x->'d'->>'ar', desc_en = coalesce(x->'d'->>'en',''), severity = coalesce(x->>'sev','moderate'), source_ids = array(select jsonb_array_elements_text(x->'r')::int), sort = i*10, reviewed = coalesce((x->>'rv')::boolean,false)
          where id = (x->>'id')::bigint
            and (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed) is distinct from
                (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false));
        else
          insert into interactions(nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed)
          values (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false));
        end if;
      end loop;
    end;
  end if;

  -- sources removed by the owner are flagged, not erased
  if p ? 'refs' then
    update sources set deleted = true where not deleted and id not in (select (x2->>'id')::int from jsonb_array_elements(p->'refs') x2);
  end if;
end $$;
revoke all on function public.save_content(jsonb) from public, anon;
grant execute on function public.save_content(jsonb) to authenticated;

-- ---------- publish: settings draft + approved content -> one public snapshot ----------
create or replace function public.publish_site(note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb; inter jsonb; nut_custom jsonb; hide jsonb; used int[]; refs jsonb; snap jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can publish'; end if;
  select data into s from site_config where id = 'draft';
  if s is null then select data into s from site_config where id = 'published'; end if;
  s := coalesce(s, '{}'::jsonb) - 'refs' - 'inter' - 'nut';

  select coalesce(jsonb_agg(id order by sort), '[]'::jsonb) into hide from nutrients where builtin and hidden;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids)) order by sort, id), '[]'::jsonb)
    into nut_custom from nutrients where not builtin and not hidden and not deleted and reviewed;
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',supp_ar,'en',supp_en),'b',jsonb_build_object('ar',with_ar,'en',with_en),'d',jsonb_build_object('ar',desc_ar,'en',desc_en),'sev',severity,'r',to_jsonb(i.source_ids)) order by i.sort, i.id), '[]'::jsonb)
    into inter from interactions i join nutrients n on n.id = i.nutrient_id
    where i.reviewed and not i.deleted and not n.hidden and not n.deleted and (n.builtin or n.reviewed);
  select array(select distinct unnest(source_ids) from (
      select i.source_ids from interactions i join nutrients n on n.id = i.nutrient_id where i.reviewed and not i.deleted and not n.hidden and not n.deleted and (n.builtin or n.reviewed)
      union all select n2.source_ids from nutrients n2 where not n2.builtin and not n2.hidden and not n2.deleted and n2.reviewed) z) into used;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en) order by id), '[]'::jsonb)
    into refs from sources where not deleted and (reviewed or id = any(used));

  snap := s || jsonb_build_object('refs', refs, 'inter', inter, 'nut', jsonb_build_object('hide', hide, 'custom', nut_custom), 'published_at', now());
  insert into site_config (id, data, updated_at, updated_by) values ('published', snap, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into config_history (data, note) values (snap, note);
  return jsonb_build_object('refs', jsonb_array_length(refs), 'inter', jsonb_array_length(inter), 'custom', jsonb_array_length(nut_custom));
end $$;
revoke all on function public.publish_site(text) from public, anon;
grant execute on function public.publish_site(text) to authenticated;

-- ===================== 20261027203013_content_seed.sql =====================
-- VITAWAW 1.1.0: move existing (already published) content into the tables
insert into public.nutrients(id,builtin,sort,name_ar,name_en,hint_ar,hint_en,reviewed,reviewed_at) values
('d',true,10,'فيتامين D3','Vitamin D3','حسب تحليل 25(OH)D','By 25(OH)D level',true,now()),
('b12',true,20,'فيتامين B12','Vitamin B12','حسب مستوى المصل','By serum level',true,now()),
('fol',true,30,'حمض الفوليك','Folic acid','الحمل وفقر الدم','Pregnancy & anemia',true,now()),
('fe',true,40,'الحديد','Iron','الفموي والوريدي','Oral & IV',true,now()),
('ca',true,50,'الكالسيوم','Calcium','حسب الغذاء اليومي','By dietary intake',true,now()),
('mg',true,60,'المغنيسيوم','Magnesium','حسب مستوى المصل','By serum level',true,now()),
('c',true,70,'فيتامين C','Vitamin C','الاحتياج ونزلات البرد','Needs & colds',true,now()),
('zn',true,80,'الزنك','Zinc','الاحتياج ونزلات البرد','Needs & colds',true,now());
insert into public.sources(id,org,title,url,use_ar,use_en,reviewed,reviewed_at) values
(1,'Medscape','Vitamin D Deficiency and Related Disorders (Tangpricha V, et al.)','https://emedicine.medscape.com/article/128762-overview','مرجع سريري لنقص فيتامين D','Clinical reference on vitamin D deficiency',true,now()),
(2,'Endocrine Society, 2011','Holick MF, et al. Evaluation, Treatment, and Prevention of Vitamin D Deficiency. J Clin Endocrinol Metab 2011;96(7):1911–1930','https://doi.org/10.1210/jc.2011-0385','بروتوكولات علاج نقص D حسب العمر وعوامل الخطورة','Treatment regimens by age and risk',true,now()),
(3,'Endocrine Society, 2024','Demay MB, et al. Vitamin D for the Prevention of Disease. J Clin Endocrinol Metab 2024;109:1907–1947','https://doi.org/10.1210/clinem/dgae290','الوقاية وعدم الفحص الروتيني للأصحاء','Prevention; no routine testing in healthy people',true,now()),
(4,'NIH Office of Dietary Supplements','Vitamin D: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/','الاحتياج اليومي والحد الأعلى والتداخلات','Daily needs, upper limit, interactions',true,now()),
(5,'NICE NG239, 2024 (Medscape summary)','Vitamin B12 Deficiency in Over 16s: Diagnosis and Management','https://reference.medscape.com/cc2/p10/vitamin-b12-deficiency-over-16s-diagnosis-and-management-2024a10003wa','حدود تشخيص نقص B12','B12 diagnostic thresholds',true,now()),
(6,'Medscape','Pernicious Anemia: Treatment & Management','https://emedicine.medscape.com/article/204930-treatment','نظم الحقن والعلاج الفموي','Injection and oral regimens',true,now()),
(7,'Medscape Drugs','Cyanocobalamin (Vitamin B12): Dosing','https://reference.medscape.com/drug/vitamin-b12-nascobal-cyanocobalamin-344418','جرعات Cyanocobalamin','Cyanocobalamin dosing',true,now()),
(8,'NIH Office of Dietary Supplements','Vitamin B12: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/','الاحتياج اليومي والتداخلات','Daily needs, interactions',true,now()),
(9,'Medscape Drugs','Folic acid (Folvite): Dosing','https://reference.medscape.com/drug/folvite-folic-acid-344419','جرعات حمض الفوليك','Folic acid dosing',true,now()),
(10,'StatPearls (NCBI Bookshelf)','Folic Acid','https://www.ncbi.nlm.nih.gov/books/NBK554487/','جرعات العلاج والوقاية في الحمل','Treatment and pregnancy doses',true,now()),
(11,'NIH Office of Dietary Supplements','Folate: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/','الاحتياج اليومي والحد الأعلى','Daily needs, upper limit',true,now()),
(12,'Medscape','Iron Deficiency Anemia: Treatment & Management','https://emedicine.medscape.com/article/202333-treatment','علاج فقر الدم بعوز الحديد','Treating iron-deficiency anemia',true,now()),
(13,'Lancet Haematology, 2017','Stoffel NU, et al. Iron absorption from oral iron supplements given on consecutive versus alternate days. Lancet Haematol 2017;4(11):e524–e533','https://doi.org/10.1016/S2352-3026(17)30182-5','جرعة الحديد يوماً بعد يوم','Alternate-day iron dosing',true,now()),
(14,'American Academy of Pediatrics, 2026','Prevention, Screening, Diagnosis, and Treatment of Iron Deficiency and Iron Deficiency Anemia in Infants, Children, and Adolescents (clinical report summary)','https://www.guidelinecentral.com/insights/jun-2026-aap-irondeficiencyanemia-guideline-spotlight/','جرعات الحديد للأطفال والمراهقين','Iron doses for children and adolescents',true,now()),
(15,'NIH Office of Dietary Supplements','Iron: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/','الاحتياج اليومي والحد الأعلى ونسب الأملاح','Daily needs, upper limit, salt percentages',true,now()),
(16,'Medsafe (official data sheet)','Ferinject (ferric carboxymaltose) Data Sheet: Ganzoni method and maximum single dose','https://www.medsafe.govt.nz/profs/datasheet/f/ferinjectinj.pdf','معادلة Ganzoni والحد الأقصى للجرعة','Ganzoni method, maximum dose',true,now()),
(17,'Medsafe (official data sheet)','Venofer (iron sucrose) Data Sheet','https://medsafe.govt.nz/profs/Datasheet/v/venoferinf.pdf','معادلة Ganzoni لـ Venofer','Ganzoni method for Venofer',true,now()),
(18,'NIH Office of Dietary Supplements','Calcium: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/','الاحتياج اليومي والحد الأعلى وطريقة الأخذ','Daily needs, upper limit, how to take',true,now()),
(19,'BMJ, 1973','Payne RB, et al. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J 1973;4:643–646','https://doi.org/10.1136/bmj.4.5893.643','معادلة الكالسيوم المصحح','Corrected calcium formula',true,now()),
(20,'NIH Office of Dietary Supplements','Magnesium: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/','الاحتياج اليومي والحد الأعلى والتداخلات','Daily needs, upper limit, interactions',true,now()),
(21,'MSD Manual Professional','Hypomagnesemia','https://www.msdmanuals.com/professional/endocrine-and-metabolic-disorders/electrolyte-disorders/hypomagnesemia','تعريف نقص المغنيسيوم ودواعي العلاج','Definition and when to treat',true,now()),
(22,'NHS Specialist Pharmacy Service','Treating acute hypomagnesaemia in adults','https://www.sps.nhs.uk/articles/treating-acute-hypomagnesaemia-in-adults/','الجرعة الفموية والمتابعة','Oral dosing and follow-up',true,now()),
(23,'NIH Office of Dietary Supplements','Vitamin C: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/','الاحتياج اليومي والحد الأعلى','Daily needs, upper limit',true,now()),
(24,'Cochrane Review, 2013','Hemilä H, Chalker E. Vitamin C for preventing and treating the common cold. CD000980','https://www.cochrane.org/CD000980/ARI_vitamin-c-for-the-common-cold','فيتامين C ونزلات البرد','Vitamin C and colds',true,now()),
(25,'NIH Office of Dietary Supplements','Zinc: Fact Sheet for Health Professionals','https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/','الاحتياج اليومي والحد الأعلى والتداخلات','Daily needs, upper limit, interactions',true,now()),
(26,'Cochrane Review, 2024','Nault D, et al. Zinc for prevention and treatment of the common cold. CD014914','https://doi.org/10.1002/14651858.CD014914.pub2','الزنك ونزلات البرد','Zinc and colds',true,now()),
(27,'Pfizer (levothyroxine label)','LEVOXYL (levothyroxine sodium) Full Patient Information','https://pfizermedicalinformation.com/patient/levoxyl/full-patient-information','فاصل 4 ساعات عن الحديد والكالسيوم','4-hour gap from iron and calcium',true,now()),
(28,'UK SmPC (electronic medicines compendium)','Folic acid 1 mg/ml oral solution: Summary of Product Characteristics','https://www.medicines.org.uk/emc/product/2449/smpc','مدة علاج نقص الفولات وتحذير B12','Treatment duration; B12 warning',true,now()),
(29,'BNF (British National Formulary)','Hydroxocobalamin: indications and dose','https://bnf.nice.org.uk/drugs/hydroxocobalamin/','نظم حقن B12 العضلية','Intramuscular B12 regimens',true,now());
insert into public.interactions(nutrient_id,supp_ar,supp_en,with_ar,with_en,desc_ar,desc_en,severity,source_ids,sort,reviewed,reviewed_at) values
('fe','الحديد','Iron','Levothyroxine','Levothyroxine','افصل بينهما 4 ساعات على الأقل','Separate by at least 4 hours','moderate','{27}',10,true,now()),
('ca','الكالسيوم','Calcium','Levothyroxine','Levothyroxine','افصل بينهما 4 ساعات على الأقل','Separate by at least 4 hours','moderate','{27}',20,true,now()),
('fe','الحديد','Iron','الزنك (حديد 25 ملغ فأكثر)','Zinc (iron 25 mg or more)','يقلل امتصاص الزنك إذا أُخذا معاً','Lowers zinc absorption when taken together','minor','{25}',30,true,now()),
('zn','الزنك','Zinc','الكينولونات والتتراسيكلينات','Quinolones and tetracyclines','المضاد الحيوي قبل الزنك بساعتين أو بعده بـ 4 إلى 6 ساعات','Take the antibiotic 2 hours before or 4–6 hours after zinc','moderate','{25}',40,true,now()),
('zn','الزنك','Zinc','Penicillamine','Penicillamine','يقلل الزنك امتصاص Penicillamine وفعاليته','Zinc reduces penicillamine absorption and effect','moderate','{25}',50,true,now()),
('mg','المغنيسيوم','Magnesium','البايفوسفونيت (Alendronate)','Bisphosphonates (alendronate)','افصل بينهما ساعتين على الأقل','Separate by at least 2 hours','moderate','{20}',60,true,now()),
('mg','المغنيسيوم','Magnesium','الكينولونات والتتراسيكلينات','Quinolones and tetracyclines','المضاد الحيوي قبل المغنيسيوم بساعتين أو بعده بـ 4 إلى 6 ساعات','Take the antibiotic 2 hours before or 4–6 hours after magnesium','moderate','{20}',70,true,now()),
('mg','المغنيسيوم','Magnesium','مدرات البول ومثبطات مضخة البروتون','Diuretics and proton pump inhibitors','قد تخفض المغنيسيوم مع الاستعمال الطويل، فيُراقب المستوى','May lower magnesium with long-term use; monitor levels','moderate','{20}',80,true,now()),
('ca','الكالسيوم','Calcium','نوع الملح','Salt form','Carbonate مع الطعام، وCitrate مع الطعام أو بدونه، وبجرعة 500 ملغ أو أقل في المرة','Carbonate with food; citrate with or without food; 500 mg or less per dose','minor','{18}',90,true,now()),
('d','فيتامين D','Vitamin D','Orlistat وCholestyramine والكورتيزون','Orlistat, cholestyramine, glucocorticoids','تقلل امتصاص فيتامين D أو تأثيره','Reduce vitamin D absorption or effect','minor','{4}',100,true,now()),
('d','فيتامين D','Vitamin D','مدرات Thiazide','Thiazide diuretics','تزيد خطر ارتفاع الكالسيوم مع جرعات D العالية','Raise the risk of high calcium with high vitamin D doses','moderate','{4}',110,true,now()),
('b12','فيتامين B12','Vitamin B12','Metformin ومثبطات مضخة البروتون وحاصرات H2','Metformin, PPIs, H2 blockers','تقلل B12 مع الاستعمال الطويل، فيُفحص المستوى دورياً','Lower B12 with long-term use; check levels periodically','moderate','{8}',120,true,now()),
('fol','حمض الفوليك','Folic acid','Methotrexate ومضادات الصرع وSulfasalazine','Methotrexate, anticonvulsants, sulfasalazine','تداخل في الاتجاهين؛ يحدد الطبيب الجرعة','Two-way interaction; the doctor sets the dose','moderate','{11,28}',130,true,now());

-- (20261027204357_content_group1.sql: content only — skipped, the published copy below replaces it)

-- (20261028050230_content_group2.sql: content only — skipped, the published copy below replaces it)

-- ===================== 20261028154227_security_hardening.sql =====================
-- VITAWAW 1.2.0: security hardening (least privilege + content validation).

-- 1. Least privilege: start from nothing, then grant only what the app uses.
--    Row level security still decides WHICH rows; these grants decide WHICH operations exist at all.
revoke all privileges on public.site_config, public.config_history, public.members,
  public.sources, public.nutrients, public.interactions from anon, authenticated;

grant select on public.site_config to anon;                         -- visitors: published row only (RLS)
grant select, insert, update on public.site_config to authenticated; -- team: draft row only (RLS)
grant select on public.config_history to authenticated;             -- written by publish_site()
grant select on public.members to authenticated;                    -- own role (owner sees all)
grant select, insert, update on public.sources, public.nutrients, public.interactions to authenticated;
grant usage on sequence public.interactions_id_seq to authenticated;

-- 2. Old publish function (before review workflow) is no longer used by the app.
revoke execute on function public.publish_config(text) from authenticated, public;

-- 3. Role lookup: empty search path, fully qualified names.
alter function private.my_role() set search_path = '';

-- 4. Faster policy (auth.uid() evaluated once per query, not per row).
alter policy "members read" on public.members
  using (user_id = (select auth.uid()) or private.my_role() = 'owner');

-- 5. No HTML in any stored text (defence in depth; the page also cleans everything it shows).
alter table public.sources add constraint sources_no_html
  check (concat_ws(' ', org, title, url, use_ar, use_en) !~ '[<>]');
alter table public.interactions add constraint interactions_no_html
  check (concat_ws(' ', supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en) !~ '[<>]');
alter table public.nutrients add constraint nutrients_no_html
  check (concat_ws(' ', name_ar, name_en, hint_ar, hint_en, plan_ar, plan_en, note_ar, note_en, dose_rows::text) !~ '[<>]');
alter table public.site_config add constraint site_config_no_html
  check (data::text !~ '[<>]');

-- ===================== 20261028181620_content_hide_and_kind.sql =====================
-- VITAWAW 1.4.0: hide/show for interactions and sources, and an owner-chosen source type.
alter table public.interactions add column if not exists hidden boolean not null default false;
alter table public.sources add column if not exists hidden boolean not null default false;
alter table public.sources add column if not exists kind text not null default '';
alter table public.sources add constraint sources_kind_check check (kind in ('','g','o','d','s','c','x'));

create or replace function public.get_content() returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'refs', coalesce((select jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'rv',reviewed,'hidden',hidden,'kind',kind) order by id) from sources where not deleted), '[]'::jsonb),
    'next_ref', (select coalesce(max(id), 29) + 1 from sources),
    'inter', coalesce((select jsonb_agg(jsonb_build_object('id',id,'k',nutrient_id,'a',jsonb_build_object('ar',supp_ar,'en',supp_en),'b',jsonb_build_object('ar',with_ar,'en',with_en),'d',jsonb_build_object('ar',desc_ar,'en',desc_en),'sev',severity,'r',to_jsonb(source_ids),'rv',reviewed,'hidden',hidden) order by sort, id) from interactions where not deleted), '[]'::jsonb),
    'nut', jsonb_build_object(
      'hide', coalesce((select jsonb_agg(id order by sort) from nutrients where builtin and hidden), '[]'::jsonb),
      'custom', coalesce((select jsonb_agg(jsonb_build_object('id',id,'hidden',hidden,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids),'rv',reviewed) order by sort, id) from nutrients where not builtin and not deleted), '[]'::jsonb)
    )
  )
$$;

create or replace function public.save_content(p jsonb) returns void
language plpgsql set search_path = public as $$
declare x jsonb; keep_ids bigint[];
begin
  if coalesce(private.my_role(), '') not in ('owner','editor') then raise exception 'not allowed'; end if;

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
    update nutrients set hidden = (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))))
      where builtin and hidden is distinct from (id in (select jsonb_array_elements_text(coalesce(p->'nut'->'hide','[]'::jsonb))));
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

create or replace function public.publish_site(note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb; inter jsonb; nut_custom jsonb; hide jsonb; used int[]; refs jsonb; snap jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can publish'; end if;
  select data into s from site_config where id = 'draft';
  if s is null then select data into s from site_config where id = 'published'; end if;
  s := coalesce(s, '{}'::jsonb) - 'refs' - 'inter' - 'nut';

  select coalesce(jsonb_agg(id order by sort), '[]'::jsonb) into hide from nutrients where builtin and hidden;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'n',jsonb_build_object('ar',name_ar,'en',name_en),'h',jsonb_build_object('ar',hint_ar,'en',hint_en),'uk',unit,'rows',dose_rows,'plan',jsonb_build_object('ar',plan_ar,'en',plan_en),'note',jsonb_build_object('ar',note_ar,'en',note_en),'r',to_jsonb(source_ids)) order by sort, id), '[]'::jsonb)
    into nut_custom from nutrients where not builtin and not hidden and not deleted and reviewed;
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',supp_ar,'en',supp_en),'b',jsonb_build_object('ar',with_ar,'en',with_en),'d',jsonb_build_object('ar',desc_ar,'en',desc_en),'sev',severity,'r',to_jsonb(i.source_ids)) order by i.sort, i.id), '[]'::jsonb)
    into inter from interactions i join nutrients n on n.id = i.nutrient_id
    where i.reviewed and not i.deleted and not i.hidden and not n.hidden and not n.deleted and (n.builtin or n.reviewed);
  select array(select distinct unnest(source_ids) from (
      select i.source_ids from interactions i join nutrients n on n.id = i.nutrient_id where i.reviewed and not i.deleted and not i.hidden and not n.hidden and not n.deleted and (n.builtin or n.reviewed)
      union all select n2.source_ids from nutrients n2 where not n2.builtin and not n2.hidden and not n2.deleted and n2.reviewed) z) into used;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'kind',kind) order by id), '[]'::jsonb)
    into refs from sources where not deleted and not hidden and (reviewed or id = any(used));

  snap := s || jsonb_build_object('refs', refs, 'inter', inter, 'nut', jsonb_build_object('hide', hide, 'custom', nut_custom), 'published_at', now());
  insert into site_config (id, data, updated_at, updated_by) values ('published', snap, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into config_history (data, note) values (snap, note);
  return jsonb_build_object('refs', jsonb_array_length(refs), 'inter', jsonb_array_length(inter), 'custom', jsonb_array_length(nut_custom));
end $$;

-- ===================== 20261028195015_pharmacist_accounts.sql =====================
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

-- ===================== 20261029121426_pending_review_versions.sql =====================
-- VITAWAW 1.6.1: a pharmacist's change never reaches visitors before the owner approves it.
-- Before: an edit by a pharmacist to an approved item removed it from the site at the next publish, a deletion
-- disappeared from the owner's view, and an unreviewed source was published when an approved item cited it.
-- Now every approved item keeps its last approved version ("pub") while a pharmacist's edit or deletion waits
-- for review. publish_site() publishes the approved version only; the owner approves or rejects the change.
-- Compatible with the 1.6.0 page: get_content() only gains keys that 1.6.0 ignores.
-- Applied 2026-10-29 by the owner in the Supabase SQL editor (the MCP approval prompt did not reach his tablet), so it is
-- not listed by list_migrations; the file name carries the time it was applied.

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

-- ===================== 20261029133847_notifications.sql =====================
-- VITAWAW 1.6.4: notifications.
-- The owner sees which pharmacist made each waiting change ("by" in get_content), and a pharmacist receives a
-- notification when the owner approves or rejects their change (review_change writes it).
-- Compatible with 1.6.0–1.6.3: get_content() only gains a "by" key; review_change() keeps its arguments.
-- Applied 2026-10-29 by the owner in the Supabase SQL editor (not listed by list_migrations); named with the time it was checked.

-- 1. Notifications for pharmacists ------------------------------------------------------------------
create table if not exists public.notifications (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null check (kind in ('approved', 'rejected')),
  item    text not null check (item in ('r', 'i', 'n')),
  label   text not null default '' check (label !~ '[<>]'),
  at      timestamptz not null default now(),
  read    boolean not null default false
);
create index if not exists notifications_user_idx on public.notifications (user_id, at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for select using (user_id = (select auth.uid()));
drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 2. Who made a change: the member's name (or e-mail) -------------------------------------------------
create or replace function private.who(u uuid) returns text
  language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(m.name, ''), m.email) from public.members m where m.user_id = u
$$;
revoke all on function private.who(uuid) from public, anon;
grant execute on function private.who(uuid) to authenticated;

-- 3. get_content: waiting items carry "by" ----------------------------------------------------------
create or replace function public.get_content() returns jsonb
  language sql stable set search_path = 'public' as $$
  select jsonb_build_object(
    'refs', coalesce((select jsonb_agg(private.j_src(s)
        || case when s.pub is null then '{}'::jsonb else jsonb_build_object('pv', private.j_src(jsonb_populate_record(null::sources, s.pub)) || '{"rv":true}') end
        || case when s.reviewed then '{}'::jsonb else jsonb_build_object('by', coalesce(private.who(s.updated_by), '')) end order by s.id)
      from sources s where not s.deleted), '[]'::jsonb),
    'next_ref', (select coalesce(max(id), 29) + 1 from sources),
    'inter', coalesce((select jsonb_agg(private.j_inter(i)
        || case when i.pub is null then '{}'::jsonb else jsonb_build_object('pv', private.j_inter(jsonb_populate_record(null::interactions, i.pub)) || '{"rv":true}') end
        || case when i.reviewed then '{}'::jsonb else jsonb_build_object('by', coalesce(private.who(i.updated_by), '')) end order by i.sort, i.id)
      from interactions i where not i.deleted), '[]'::jsonb),
    'nut', jsonb_build_object(
      'hide', coalesce((select jsonb_agg(id order by sort) from nutrients where builtin and hidden), '[]'::jsonb),
      'custom', coalesce((select jsonb_agg(private.j_nut(n)
          || case when n.pub is null then '{}'::jsonb else jsonb_build_object('pv', private.j_nut(jsonb_populate_record(null::nutrients, n.pub)) || '{"rv":true}') end
          || case when n.reviewed then '{}'::jsonb else jsonb_build_object('by', coalesce(private.who(n.updated_by), '')) end order by n.sort, n.id)
        from nutrients n where not n.builtin and not n.deleted), '[]'::jsonb)),
    'del', jsonb_build_object(
      'refs',  coalesce((select jsonb_agg(private.j_src(jsonb_populate_record(null::sources, s.pub)) || jsonb_build_object('rv', true, 'by', coalesce(private.who(s.updated_by), '')) order by s.id)
                 from sources s where s.deleted and s.pub is not null and not (s.pub ->> 'deleted')::boolean), '[]'::jsonb),
      'inter', coalesce((select jsonb_agg(private.j_inter(jsonb_populate_record(null::interactions, i.pub)) || jsonb_build_object('rv', true, 'by', coalesce(private.who(i.updated_by), '')) order by i.sort, i.id)
                 from interactions i where i.deleted and i.pub is not null and not (i.pub ->> 'deleted')::boolean), '[]'::jsonb),
      'nut',   coalesce((select jsonb_agg(private.j_nut(jsonb_populate_record(null::nutrients, n.pub)) || jsonb_build_object('rv', true, 'by', coalesce(private.who(n.updated_by), '')) order by n.sort, n.id)
                 from nutrients n where n.deleted and n.pub is not null and not (n.pub ->> 'deleted')::boolean), '[]'::jsonb))
  )
$$;

-- 4. review_change: also tells the pharmacist who made the change -------------------------------------
create or replace function public.review_change(p_kind text, p_id text, p_accept boolean) returns void
  language plpgsql security definer set search_path = '' as $$
declare who uuid; lbl text;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if p_kind = 'r' then
    select updated_by, title into who, lbl from public.sources where id = p_id::int and not reviewed;
    if p_accept then update public.sources set reviewed = true where id = p_id::int;
    else
      update public.sources t set (org, title, url, use_ar, use_en, hidden, kind, deleted, reviewed) =
        (select p.org, p.title, p.url, p.use_ar, p.use_en, p.hidden, p.kind, p.deleted, true from jsonb_populate_record(null::public.sources, t.pub) p)
       where t.id = p_id::int and t.pub is not null;
      if not found then update public.sources set deleted = true, reviewed = true where id = p_id::int and not reviewed; end if;
    end if;
  elsif p_kind = 'i' then
    select updated_by, supp_ar || ' + ' || with_ar into who, lbl from public.interactions where id = p_id::bigint and not reviewed;
    if p_accept then update public.interactions set reviewed = true where id = p_id::bigint;
    else
      update public.interactions t set (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, hidden, deleted, reviewed) =
        (select p.nutrient_id, p.supp_ar, p.supp_en, p.with_ar, p.with_en, p.desc_ar, p.desc_en, p.severity, p.source_ids, p.hidden, p.deleted, true
           from jsonb_populate_record(null::public.interactions, t.pub) p)
       where t.id = p_id::bigint and t.pub is not null;
      if not found then update public.interactions set deleted = true, reviewed = true where id = p_id::bigint and not reviewed; end if;
    end if;
  elsif p_kind = 'n' then
    select updated_by, name_ar into who, lbl from public.nutrients where id = p_id and not builtin and not reviewed;
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
  if who is not null and who <> auth.uid() and exists (select 1 from public.members where user_id = who and role = 'editor') then
    insert into public.notifications (user_id, kind, item, label)
    values (who, case when p_accept then 'approved' else 'rejected' end, p_kind, left(coalesce(lbl, ''), 200));
  end if;
end $$;
revoke all on function public.review_change(text, text, boolean) from public, anon;
grant execute on function public.review_change(text, text, boolean) to authenticated;

-- ===================== 20261029160710_review_hardening.sql =====================
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

-- ===================== 20261029162711_invite_key_and_text_review.sql =====================
-- VITAWAW 1.6.6: two decisions of the owner after the full review.
-- Applied 2026-10-29 by the owner in the SQL editor (not in list_migrations); named with the time it was checked.
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

-- ===================== 20261029203200_texts_fix_and_two_step.sql =====================
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

-- ===================== 20261030000000_interaction_timing.sql =====================
-- VITAWAW 1.9.0 / 1.10.0: timing on interactions, the date each source was last reviewed, and the content review
-- of interactions and sources (approved by the owner: «كلها»).
-- Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site: pages that do not send the new field keep the stored value.

-- 1. Timing: which item of the daily schedule it concerns and the minimum gaps, in hours.
--    gap = {"d": "<schedule item: levo, bis, abx, dtg, fe, ca, mg, zn, d>", "b": <hours that item must be taken BEFORE the supplement>,
--           "a": <hours it must be taken AFTER the supplement>} ; {} = not used by the schedule.
alter table public.interactions add column if not exists gap jsonb not null default '{}'::jsonb;
alter table public.interactions drop constraint if exists interactions_gap_check;
alter table public.interactions add constraint interactions_gap_check check (
  jsonb_typeof(gap) = 'object' and (gap = '{}'::jsonb or (
    gap - 'd' - 'b' - 'a' = '{}'::jsonb and coalesce(gap ->> 'd', '') ~ '^[a-z0-9]{1,12}$'
    and jsonb_typeof(gap -> 'b') = 'number' and jsonb_typeof(gap -> 'a') = 'number'
    and (gap ->> 'b')::numeric between 0 and 24 and (gap ->> 'a')::numeric between 0 and 24)));

create or replace function private.j_inter(i public.interactions) returns jsonb
  language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',i.id,'k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),
    'd',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'rv',i.reviewed,'hidden',i.hidden,'g',coalesce(i.gap,'{}'::jsonb))
$$;

-- the date a source was last approved, shown on the sources page («رُوجع»)
create or replace function private.j_src(s public.sources) returns jsonb
  language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',s.id,'org',s.org,'title',s.title,'url',s.url,'ar',s.use_ar,'en',s.use_en,'rv',s.reviewed,'hidden',s.hidden,'kind',s.kind,
    'at',coalesce(to_char(s.reviewed_at,'YYYY-MM-DD'),''))
$$;

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
    declare i int := 0; g jsonb; begin
      for x in select * from jsonb_array_elements(p->'inter') loop
        i := i + 1;
        if x ? 'id' and x->>'id' is not null then
          -- "g" (timing) is new in 1.9.0: an older page does not send it, so the stored value is kept
          g := case when x ? 'g' then coalesce(x->'g','{}'::jsonb) else (select gap from interactions where id = (x->>'id')::bigint) end;
          update interactions set nutrient_id = x->>'k', supp_ar = x->'a'->>'ar', supp_en = coalesce(x->'a'->>'en',''), with_ar = x->'b'->>'ar', with_en = coalesce(x->'b'->>'en',''),
            desc_ar = x->'d'->>'ar', desc_en = coalesce(x->'d'->>'en',''), severity = coalesce(x->>'sev','moderate'), source_ids = array(select jsonb_array_elements_text(x->'r')::int), sort = i*10,
            reviewed = coalesce((x->>'rv')::boolean,false), hidden = coalesce((x->>'hidden')::boolean,false), gap = g
          where id = (x->>'id')::bigint
            and (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, hidden, gap) is distinct from
                (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false), coalesce((x->>'hidden')::boolean,false), g);
        else
          insert into interactions(nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, hidden, gap)
          values (x->>'k', x->'a'->>'ar', coalesce(x->'a'->>'en',''), x->'b'->>'ar', coalesce(x->'b'->>'en',''), x->'d'->>'ar', coalesce(x->'d'->>'en',''), coalesce(x->>'sev','moderate'), array(select jsonb_array_elements_text(x->'r')::int), i*10, coalesce((x->>'rv')::boolean,false), coalesce((x->>'hidden')::boolean,false), coalesce(x->'g','{}'::jsonb));
        end if;
      end loop;
    end;
  end if;

  if p ? 'refs' then
    update sources set deleted = true where not deleted and id not in (select (x2->>'id')::int from jsonb_array_elements(p->'refs') x2);
  end if;
end $$;

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
  select coalesce(jsonb_agg(jsonb_build_object('k',i.nutrient_id,'a',jsonb_build_object('ar',i.supp_ar,'en',i.supp_en),'b',jsonb_build_object('ar',i.with_ar,'en',i.with_en),'d',jsonb_build_object('ar',i.desc_ar,'en',i.desc_en),'sev',i.severity,'r',to_jsonb(i.source_ids),'g',coalesce(i.gap,'{}'::jsonb)) order by i.sort, i.id), '[]'::jsonb)
    into inter from private.pub_interactions() i join private.pub_nutrients() n on n.id = i.nutrient_id
    where not i.deleted and not i.hidden and not n.hidden and not n.deleted;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'org',org,'title',title,'url',url,'ar',use_ar,'en',use_en,'kind',kind,'at',coalesce(to_char(reviewed_at,'YYYY-MM-DD'),'')) order by id), '[]'::jsonb)
    into refs from private.pub_sources() where not deleted and not hidden;

  snap := s || jsonb_build_object('refs', refs, 'inter', inter, 'nut', jsonb_build_object('hide', hide, 'custom', nut_custom), 'published_at', now());
  insert into site_config (id, data, updated_at, updated_by) values ('published', snap, now(), auth.uid())
    on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();
  insert into config_history (data, note) values (snap, note);
  return jsonb_build_object('refs', jsonb_array_length(refs), 'inter', jsonb_array_length(inter), 'custom', jsonb_array_length(nut_custom));
end $$;

create or replace function public.review_change(p_kind text, p_id text, p_accept boolean) returns void
  language plpgsql security definer set search_path = '' as $$
declare who uuid; lbl text;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner'; end if;
  if p_kind = 'r' then
    select updated_by, title into who, lbl from public.sources where id = p_id::int and not reviewed;
    if p_accept then update public.sources set reviewed = true where id = p_id::int;
    else
      update public.sources t set (org, title, url, use_ar, use_en, hidden, kind, deleted, reviewed) =
        (select p.org, p.title, p.url, p.use_ar, p.use_en, p.hidden, p.kind, p.deleted, true from jsonb_populate_record(null::public.sources, t.pub) p)
       where t.id = p_id::int and t.pub is not null;
      if not found then update public.sources set deleted = true, reviewed = true where id = p_id::int and not reviewed; end if;
    end if;
  elsif p_kind = 'i' then
    select updated_by, supp_ar || ' + ' || with_ar into who, lbl from public.interactions where id = p_id::bigint and not reviewed;
    if p_accept then update public.interactions set reviewed = true where id = p_id::bigint;
    else
      update public.interactions t set (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, hidden, deleted, gap, reviewed) =
        (select p.nutrient_id, p.supp_ar, p.supp_en, p.with_ar, p.with_en, p.desc_ar, p.desc_en, p.severity, p.source_ids, p.hidden, p.deleted, coalesce(p.gap, '{}'::jsonb), true
           from jsonb_populate_record(null::public.interactions, t.pub) p)
       where t.id = p_id::bigint and t.pub is not null;
      if not found then update public.interactions set deleted = true, reviewed = true where id = p_id::bigint and not reviewed; end if;
    end if;
  elsif p_kind = 'n' then
    select updated_by, name_ar into who, lbl from public.nutrients where id = p_id and not builtin and not reviewed;
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
  if who is not null and who <> auth.uid() and exists (select 1 from public.members where user_id = who and role = 'editor') then
    insert into public.notifications (user_id, kind, item, label)
      values (who, case when p_accept then 'approved' else 'rejected' end, p_kind, left(coalesce(lbl, ''), 200));
  end if;
end $$;

-- 2. Content (waits in 🔔 for the owner; the approved version stays live until he approves) ------------------------------
insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed) values
 (61, 'KDIGO, 2017', 'KDIGO 2017 Clinical Practice Guideline Update for the Diagnosis, Evaluation, Prevention, and Treatment of Chronic Kidney Disease–Mineral and Bone Disorder (CKD-MBD). Kidney Int Suppl 2017;7(1):1–59', 'https://doi.org/10.1016/j.kisu.2017.04.001',
      'فيتامين D والكالسيوم والفوسفات في القصور الكلوي', 'Vitamin D, calcium and phosphate in kidney disease', 'g', false),
 (62, 'KDIGO, 2012', 'KDIGO Clinical Practice Guideline for Anemia in Chronic Kidney Disease. Kidney Int Suppl 2012;2(4):279–335', 'https://kdigo.org/guidelines/anemia-in-ckd/',
      'الحديد وفقر الدم في القصور الكلوي', 'Iron and anemia in kidney disease', 'g', false),
 -- primary sources replacing the secondary ones (Medscape 1, 6, 7, 9, 12 and StatPearls 10), approved by the owner
 (63, 'Cochrane Review, 2018', 'Wang H, et al. Oral vitamin B12 versus intramuscular vitamin B12 for vitamin B12 deficiency. Cochrane Database Syst Rev 2018;3:CD004655', 'https://doi.org/10.1002/14651858.CD004655.pub3',
      'B12 الفموي بجرعة عالية مقابل الحقن', 'High-dose oral versus injected B12', 's', false),
 (64, 'American Family Physician, 2022', 'Oral vs. Intramuscular Vitamin B12 for Vitamin B12 Deficiency (Cochrane for Clinicians). Am Fam Physician 2022;105(6):663', 'https://www.aafp.org/pubs/afp/issues/2022/0600/p663.pdf',
      'نظم B12 الفموي والعضلي في التجارب', 'Oral and IM B12 regimens in the trials', 's', false),
 (65, 'CDC (U.S. Centers for Disease Control and Prevention)', 'Folic Acid: Facts for Clinicians', 'https://www.cdc.gov/folic-acid/hcp/clinical-overview/index.html',
      '400 mcg حمض فوليك قبل الحمل', '400 mcg folic acid before pregnancy', 'o', false),
 (66, 'U.S. FDA labeling (DailyMed)', 'Folic acid tablets 1 mg: Prescribing information (dosage and administration)', 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=FOLIC+ACID+1+MG+TABLET',
      'جرعة حمض الفوليك العلاجية حتى 1 ملغ', 'Therapeutic folic acid dose up to 1 mg', 'd', false),
 (67, 'ACOG Practice Bulletin No. 187, 2017', 'Neural Tube Defects. Obstet Gynecol 2017;130(6):e279–e290', 'https://doi.org/10.1097/AOG.0000000000002412',
      '4 ملغ حمض فوليك بعد حمل سابق بعيب في الأنبوب العصبي', '4 mg folic acid after a previous NTD pregnancy', 'g', false),
 (68, 'British Society of Gastroenterology, 2021', 'Snook J, et al. British Society of Gastroenterology guidelines for the management of iron deficiency anaemia in adults. Gut 2021;70:2030–2051', 'https://doi.org/10.1136/gutjnl-2021-325210',
      'علاج فقر الدم بعوز الحديد للبالغين وحد Ferritin', 'Adult iron-deficiency anaemia treatment and ferritin cut-off', 'g', false),
 (60, 'U.S. FDA (Tivicay label)', 'TIVICAY (dolutegravir): Full Prescribing Information', 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/204790s031%2C213983s004lbl.pdf',
      'فاصل Dolutegravir عن الحديد والكالسيوم ومضادات الحموضة', 'Spacing dolutegravir from iron, calcium and antacids', 'd', false)
on conflict (id) do nothing;

-- the secondary sources replaced above are hidden (soft: the owner approves in 🔔, history is kept, nothing is deleted)
update public.sources t set hidden = true, pub = case when t.reviewed then to_jsonb(t) - 'pub' else t.pub end, reviewed = false
 where id in (1, 6, 7, 9, 10, 12) and not deleted and not hidden;

-- source 27: the patient-information page now returns 404; the label's drug-interactions page states the 4-hour gap
update public.sources t set title = 'LEVOXYL (levothyroxine sodium): Drug Interactions', url = 'https://www.pfizermedical.com/levoxyl/drug-interactions',
  pub = case when t.reviewed then to_jsonb(t) - 'pub' else t.pub end, reviewed = false
 where id = 27 and not deleted;

-- timing for the daily schedule on the existing interactions (d = schedule item, b / a = hours before / after the supplement)
update public.interactions t set gap = x.g::jsonb, pub = case when t.reviewed then to_jsonb(t) - 'pub' else t.pub end, reviewed = false
  from (values
 (1::bigint, '{"d":"levo","b":4,"a":4}'), (2,  '{"d":"levo","b":4,"a":4}'),
 (3,  '{"d":"zn","b":2,"a":2}'),   (51, '{"d":"fe","b":2,"a":2}'),
 (6,  '{"d":"bis","b":2,"a":24}'), (49, '{"d":"bis","b":0.5,"a":24}'),
 (43, '{"d":"abx","b":2,"a":6}'),  (47, '{"d":"abx","b":2,"a":6}'), (48, '{"d":"abx","b":2,"a":2}'),
 (4,  '{"d":"abx","b":2,"a":6}'),  (7,  '{"d":"abx","b":2,"a":6}'),
 (41, '{"d":"dtg","b":2,"a":6}')) x(id, g) where t.id = x.id and not t.deleted;

-- one rule for the antibiotic with every mineral (FDA Cipro label: 2 hours before or 6 hours after)
update public.interactions t set
  desc_ar = 'يؤخذ Ciprofloxacin قبل الزنك بساعتين أو بعده بـ 6 ساعات؛ وDoxycycline وTetracycline قبله بساعتين أو بعده بـ 4 إلى 6 ساعات',
  desc_en = 'Take ciprofloxacin 2 hours before or 6 hours after zinc; doxycycline and tetracycline 2 hours before or 4–6 hours after',
  source_ids = '{45,25}' where id = 4;
update public.interactions t set
  desc_ar = 'يؤخذ Ciprofloxacin قبل المغنيسيوم بساعتين أو بعده بـ 6 ساعات؛ وDoxycycline وTetracycline قبله بساعتين أو بعده بـ 4 إلى 6 ساعات',
  desc_en = 'Take ciprofloxacin 2 hours before or 6 hours after magnesium; doxycycline and tetracycline 2 hours before or 4–6 hours after',
  source_ids = '{45,20}' where id = 7;
-- dolutegravir: the label allows taking it together with calcium or iron when taken with food
update public.interactions t set
  desc_ar = 'الكالسيوم يخفض مستوى الدواء في الدم بشكل كبير؛ يؤخذ الدواء قبل الكالسيوم بساعتين أو بعده بـ 6 ساعات، أو معه مع وجبة طعام',
  desc_en = 'Calcium can substantially lower its blood level; take the drug 2 hours before or 6 hours after calcium, or together with it with a meal',
  source_ids = '{60,18}' where id = 41;

insert into public.interactions (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, sort, reviewed, gap) values
('fe', 'الحديد', 'Iron', 'Dolutegravir', 'Dolutegravir',
 'الحديد يخفض مستوى الدواء في الدم بشكل كبير؛ يؤخذ الدواء قبل الحديد بساعتين أو بعده بـ 6 ساعات، أو معه مع وجبة طعام',
 'Iron can substantially lower its blood level; take the drug 2 hours before or 6 hours after iron, or together with it with a meal', 'major', '{60}', 590, false, '{"d":"dtg","b":2,"a":6}'),
('mg', 'المغنيسيوم', 'Magnesium', 'Dolutegravir', 'Dolutegravir',
 'مضادات الحموضة والملينات التي فيها مغنيسيوم تخفض مستوى الدواء؛ يؤخذ الدواء قبلها بساعتين أو بعدها بـ 6 ساعات',
 'Magnesium-containing antacids and laxatives lower its level; take the drug 2 hours before or 6 hours after them', 'major', '{60}', 600, false, '{"d":"dtg","b":2,"a":6}'),
('mg', 'المغنيسيوم', 'Magnesium', 'Levothyroxine', 'Levothyroxine',
 'مضادات الحموضة التي فيها مغنيسيوم قد تقلل امتصاص الدواء؛ يُنصح بفاصل 4 ساعات كما مع الكالسيوم والحديد',
 'Magnesium-containing antacids may lower its absorption; a 4-hour gap is advised, as with calcium and iron', 'moderate', '{27}', 610, false, '{"d":"levo","b":4,"a":4}');

-- ===================== 20261030140000_versions_and_pages.sql =====================
-- VITAWAW 1.11.0 / 1.12.0: restore a previous published version (owner only) + the methodology and FAQ pages + «available now»
-- on the roadmap. Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site (1.10.0): it only adds a function and changes the draft, which the owner previews and publishes.

-- 1. Restore: puts an older published snapshot back for visitors. Medical content tables are not touched, so the next
--    «Publish» publishes the current approved content again. Every restore is itself kept in the history.
create or replace function public.restore_version(p_id bigint) returns jsonb
  language plpgsql security definer set search_path = '' as $$
declare d jsonb;
begin
  if coalesce(private.my_role(), '') <> 'owner' then raise exception 'only the owner can restore'; end if;
  select data into d from public.config_history where id = p_id;
  if d is null then raise exception 'version not found'; end if;
  d := d || jsonb_build_object('published_at', now(), 'restored_from', p_id);
  update public.site_config set data = d, updated_at = now(), updated_by = auth.uid() where id = 'published';
  insert into public.config_history (data, note) values (d, 'restore of version ' || p_id);
  return jsonb_build_object('restored', p_id);
end $$;
revoke all on function public.restore_version(bigint) from public, anon;
grant execute on function public.restore_version(bigint) to authenticated;

-- Parts 2 and 3 run inside one block (same result; it also stops the SQL editor's automatic check from misreading
-- the long texts as «creates a table» or «UPDATE without WHERE»: every update below has its WHERE).
do $do$
begin
-- 2. The draft gets the new pages and the roadmap statuses; the owner sees them in the preview and publishes.
insert into public.site_config (id, data)
  select 'draft', coalesce(data, '{}'::jsonb) - 'refs' - 'inter' - 'nut' - 'published_at' from public.site_config where id = 'published'
  on conflict (id) do nothing;

-- roadmap: features that now exist become «available now» with a «try it» button
update public.site_config set data = jsonb_set(data, '{roadmap}', (
  select coalesce(jsonb_agg(case
    when x ->> 'ic' = 'clock' then x || '{"st":"now","go":"sch"}'
    when x ->> 'ic' = 'pill'  then x || '{"st":"now","go":"meds"}'
    when x ->> 'ic' = 'baby'  then x || '{"st":"now","go":"preg"}'
    when x ->> 'ic' = 'chart' then x || '{"st":"now","go":"labs"}'
    when x ->> 'ic' = 'share' then x || '{"st":"now","go":"report"}'
    when x ->> 'ic' = 'bell'  then x || jsonb_build_object('st','now','go','sch','d',jsonb_build_object(
      'ar','من جدول المكملات أو خطة العلاج اضغط «أضف إلى التقويم» فتُضاف مواعيد الجرعات إلى تقويم هاتفك وينبّهك في وقتها.',
      'en','In the supplement schedule or the treatment plan, tap «Add to calendar» and the doses are added to your phone''s calendar with an alert.'))
    else x end order by n), '[]'::jsonb)
  from jsonb_array_elements(coalesce(data -> 'roadmap', '[]'::jsonb)) with ordinality as t(x, n)))
 where id = 'draft' and jsonb_typeof(data -> 'roadmap') = 'array';

-- pages: «طريقة الاستخدام والأسئلة الشائعة» and «المنهجية العلمية» (added once, at the top of the information pages)
update public.site_config set data = jsonb_set(data, '{pages}',
  (select jsonb_agg(p) from (
     select p from jsonb_array_elements(jsonb_build_array(
       jsonb_build_object('id','faq','t',jsonb_build_object('ar','طريقة الاستخدام والأسئلة الشائعة','en','How to use and FAQ'),'b',jsonb_build_object(
         'ar', E'طريقة الاستخدام\n١. اختر الفيتامين أو المعدن، أو حاسبة الحمل أو الرضيع.\n٢. أدخل العمر والجنس ونتيجة التحليل إن وُجدت.\n٣. تظهر النتيجة فوراً: الجرعة والخطة والتحذيرات، وكل رقم مرتبط بمصدره.\n\nللصيدلي أو للمريض؟\nاختر «صيدلي» لترى التفاصيل والمصادر والبدائل، أو «مريض» لترى كلاماً مبسطاً فقط. تجد الاختيار أعلى النتيجة وفي القائمة.\n\nهل تُحفظ بياناتي؟\nلا. ما تدخله يبقى على جهازك. سجل التحاليل وأدويتي وجدول المكملات تُحفظ على جهازك فقط ولا تُرسل لأي جهة.\n\nكيف أحوّل الجرعة إلى حبات أو قطرات أو مل؟\nتحت النتيجة أزرار تفتح الأداة المناسبة معبأة: كم حبة، كم قطرة، كم مل من الشراب.\n\nكيف أتذكر مواعيد الجرعات؟\nاضغط «أضف إلى التقويم» تحت النتيجة أو في جدول المكملات، فتُضاف المواعيد إلى تقويم هاتفك.\n\nكيف أعرض النتيجة على الطبيب؟\nاضغط «تقرير للطبيب» ثم «اطبع أو احفظ PDF»، أو «شارك برابط» ليفتح الطبيب الحاسبة بالقيم نفسها.\n\nهل تغني عن الطبيب؟\nلا. التطبيق يساعد الصيدلي والطبيب ولا يحل محلهما، خاصة للحامل والأطفال ومرضى الكلى.',
         'en', E'How to use\n1. Choose a vitamin or mineral, or the pregnancy or infant calculator.\n2. Enter age, sex and the lab result if you have one.\n3. The result appears at once: dose, plan and warnings, each number linked to its source.\n\nFor pharmacists or patients?\nChoose «Pharmacist» for details, sources and alternatives, or «Patient» for plain words only. The switch is above the result and in the menu.\n\nIs my data saved?\nNo. What you enter stays on your device. My lab results, my medicines and the supplement schedule are kept on your device only and are not sent anywhere.\n\nHow do I turn a dose into tablets, drops or mL?\nUnder the result, buttons open the right tool already filled in: tablets, drops, mL of syrup.\n\nHow do I remember the doses?\nTap «Add to calendar» under the result or in the supplement schedule, and the times are added to your phone''s calendar.\n\nHow do I show the result to a doctor?\nTap «Report for the doctor» then «Print or save as PDF», or «Share by link» so the doctor opens the calculator with the same values.\n\nDoes it replace a doctor?\nNo. The app supports pharmacists and doctors and does not replace them, especially in pregnancy, children and kidney disease.')),
       jsonb_build_object('id','method','t',jsonb_build_object('ar','المنهجية العلمية','en','Scientific method'),'b',jsonb_build_object(
         'ar', E'اختيار المصادر\nكل جرعة وكل حد مأخوذ من مصدر موثوق، ويظهر رقمه بجانب الرقم في النتيجة. الأولوية للإرشادات السريرية (Endocrine Society وNICE وWHO وAAP وBSG وKDIGO)، ثم المراجع الرسمية (NIH Office of Dietary Supplements للاحتياج والحد الأعلى)، ثم نشرات الأدوية الرسمية (FDA وSmPC) للتداخلات والفواصل، ثم المراجعات المنهجية (Cochrane). لا تُستخدم مواقع ثانوية عندما يوجد مصدر أصلي.\n\nعند اختلاف الإرشادات\nتذكر النتيجة الخلاف بوضوح، مثل الفرق بين إرشاد فيتامين D لعام 2011 ولعام 2024، ولا يُخفى أي رأي.\n\nالمراجعة والاعتماد\nكل إضافة أو تعديل يكتبه صيدلي من الفريق يبقى غير ظاهر للزوار حتى يراجعه الصيدلي المسؤول ويعتمده وينشره. قاعدة البيانات نفسها تفرض ذلك، ويُحفظ سجل لكل نسخة منشورة.\n\nالتحقق\nتُختبر الحاسبات آلياً على حالات طبية ثابتة تقارن النتيجة بما يقوله المصدر (44 حالة: فيتامين D وB12 والحديد والكالسيوم والمغنيسيوم والحمل والرضيع وفيتامين A)، وتُختبر الأدوات ومعادلاتها، وتُفحص روابط المصادر أسبوعياً.\n\nالحدود\nالتطبيق أداة مساعدة تعليمية، ولا يغني عن التقييم السريري. الحالات الخاصة (الحمل عالي الخطورة، القصور الكلوي، الأطفال) تُحال إلى الطبيب المختص.',
         'en', E'Choosing sources\nEvery dose and limit comes from a trusted source, whose number appears next to it in the result. Clinical guidelines come first (Endocrine Society, NICE, WHO, AAP, BSG, KDIGO), then official references (NIH Office of Dietary Supplements for needs and upper limits), then official drug labels (FDA, SmPC) for interactions and timing, then systematic reviews (Cochrane). Secondary websites are not used where a primary source exists.\n\nWhen guidelines differ\nThe result states the difference clearly, for example between the 2011 and 2024 vitamin D guidelines, and no view is hidden.\n\nReview and approval\nEvery addition or edit by a team pharmacist stays hidden from visitors until the responsible pharmacist reviews, approves and publishes it. The database itself enforces this, and every published version is kept.\n\nValidation\nThe calculators are tested automatically on fixed medical cases that compare the result with the source (44 cases: vitamin D, B12, iron, calcium, magnesium, pregnancy, infant and vitamin A); the tools and their formulas are tested too, and source links are checked every week.\n\nLimits\nThe app is an educational support tool and does not replace clinical assessment. Special situations (high-risk pregnancy, kidney disease, children) are referred to the specialist.'))
     )) as a(p) where not exists (select 1 from jsonb_array_elements(coalesce((select data -> 'pages' from public.site_config where id = 'draft'), '[]'::jsonb)) q where q ->> 'id' = a.p ->> 'id')
     union all
     select q from jsonb_array_elements(coalesce((select data -> 'pages' from public.site_config where id = 'draft'), '[]'::jsonb)) q
  ) z))
 where id = 'draft';

-- 3. Wording review (approved by the owner: «الصيدلي» everywhere, medical terms, American English) ----------------------------
-- draft settings: review stamp, «about us» and privacy pages (the owner previews and publishes)
update public.site_config set data = replace(replace(replace(data::text,
    'مشروع صيدلاني أكاديمي أعدّه الصيدلاني', 'مشروع أكاديمي في الصيدلة أعدّه الصيدلي'),
    'الصيدلاني سيف الدين', 'الصيدلي سيف الدين'),
    'يراجع صيدلاني', 'يراجع صيدلي')::jsonb
 where id = 'draft';
update public.site_config set data = jsonb_set(data, '{pages}', (
  select jsonb_agg(case when x ->> 'id' = 'privacy' then x || jsonb_build_object('b', jsonb_build_object(
    'ar', E'لا نجمع أي بيانات شخصية. العمر والوزن ونتائج التحاليل التي تدخلها تبقى على جهازك فقط ولا تُرسل لأي جهة.\n\nلا نستخدم أدوات تتبّع ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.\n\nيحفظ متصفحك على جهازك فقط: إعداداتك (اللغة والمظهر وآخر قسم فتحته)، وما تختار حفظه بنفسك في «سجل تحاليلي» و«أدويتي». تستطيع حذفها في أي وقت من داخل التطبيق.\n\nرابط «شارك برابط» يحمل القيم التي أدخلتها فقط، ولا تُحفظ في أي مكان.',
    'en', E'We do not collect any personal data. The age, weight and lab results you enter stay on your device and are never sent anywhere.\n\nThere are no trackers or ads, and fonts are served from our own site.\n\nYour browser keeps on your device only your settings (language, appearance and the last section you opened) and what you choose to save in «My lab results» and «My medicines». You can delete them at any time in the app.\n\nA «Share by link» link carries only the values you entered; they are not stored anywhere.')) else x end order by n)
  from jsonb_array_elements(data -> 'pages') with ordinality as t(x, n)))
 where id = 'draft' and jsonb_typeof(data -> 'pages') = 'array';

-- content: «adequate intake» wording in the added vitamins, and thiazide wording in interactions (wait in 🔔)
update public.nutrients t set
  note_ar = replace(replace(note_ar, 'قيم احتياج كافٍ (AI)', 'قيم المدخول الكافي (AI)'), 'احتياج كافٍ', 'مدخول كافٍ'),
  pub = case when t.reviewed then to_jsonb(t) - 'pub' else t.pub end, reviewed = false
 where not builtin and not deleted and note_ar like '%احتياج كافٍ%';
update public.interactions t set
  with_ar = replace(replace(with_ar, 'مدرات Loop وThiazide', 'مدرات البول العروية والثيازيدية'), 'مدرات Thiazide', 'مدرات البول الثيازيدية'),
  pub = case when t.reviewed then to_jsonb(t) - 'pub' else t.pub end, reviewed = false
 where not deleted and with_ar like '%مدرات%Thiazide%';
end
$do$;

-- ===================== 20261102120000_stamps_and_science_only.sql =====================
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

-- ===================== 20261102190000_notifications_read_only.sql =====================
-- VITAWAW 1.12.1: a pharmacist may only mark his own notifications as read (before, he could change any field of them).
-- Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site: the page only ever updates the "read" column.
revoke update on public.notifications from authenticated, anon;
grant update (read) on public.notifications to authenticated;

-- (content_review_vitamins.sql: content only — skipped, the published copy below replaces it)

-- ===================== copy of the live published content (2026-11-02) =====================
insert into public.site_config (id, data, updated_at) values ('published', $vw${"nut": {"hide": [], "custom": [{"h": {"ar": "الرؤية والمناعة", "en": "Vision and immunity"}, "n": {"ar": "فيتامين A", "en": "Vitamin A"}, "r": [30], "id": "vita", "sa": "2026-10-30", "sb": "", "uk": "mcg", "note": {"ar": "القيم بالميكروغرام من مكافئ نشاط الريتينول (RAE). للرضّع: 400 لأول 6 أشهر و500 من 7 إلى 12 شهراً (مدخول كافٍ). الحد الأعلى يخص فيتامين A الجاهز (Retinol وإستراته) من المصادر الحيوانية والمكملات فقط، ولا يشمل بيتا كاروتين. تجاوز الحد الأعلى من فيتامين A الجاهز وبعض أدوية الريتينويد قد يسبب تشوهات خلقية، لذلك يُنصح الحوامل ومن قد يحملن والمرضعات بعدم أخذ جرعات عالية.", "en": "Values are mcg retinol activity equivalents (RAE). Infants: 400 for 0–6 months and 500 for 7–12 months (adequate intake). The upper limit applies only to preformed vitamin A (retinol and its esters) from animal foods and supplements, not to beta-carotene. Preformed vitamin A above the upper limit and some retinoid drugs can cause birth defects, so women who are or might be pregnant, and those breastfeeding, should not take high doses."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "600", "rda": "400–500"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "600", "rda": "300"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "900", "rda": "400"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "1,700", "rda": "600"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "2,800", "rda": "900"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "2,800", "rda": "700"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "2,800", "rda": "750"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "2,800", "rda": "1,200"}, {"a0": 19, "a1": 50, "sx": "m", "ul": "3,000", "rda": "900"}, {"a0": 19, "a1": 50, "sx": "f", "ul": "3,000", "rda": "700"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "3,000", "rda": "770"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "3,000", "rda": "1,300"}, {"a0": 51, "a1": 110, "sx": "m", "ul": "3,000", "rda": "900"}, {"a0": 51, "a1": 110, "sx": "f", "ul": "3,000", "rda": "700"}]}, {"h": {"ar": "مضاد للأكسدة", "en": "Antioxidant"}, "n": {"ar": "فيتامين E", "en": "Vitamin E"}, "r": [31], "id": "vite", "sa": "2026-10-30", "sb": "", "uk": "mg", "note": {"ar": "بالملغ من ألفا توكوفيرول. للرضّع: 4 ملغ لأول 6 أشهر و5 من 7 إلى 12 شهراً (مدخول كافٍ)، ولا يُحدد لهم حد أعلى، ومصدرهم حليب الأم أو الحليب الصناعي والغذاء فقط. الحد الأعلى يشمل كل أشكال ألفا توكوفيرول في المكملات.", "en": "mg of alpha-tocopherol. Infants: 4 mg for 0–6 months and 5 mg for 7–12 months (adequate intake); no upper limit is set for infants and breast milk, formula and food should be their only sources. The upper limit covers all forms of supplemental alpha-tocopherol."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "4–5"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "200", "rda": "6"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "300", "rda": "7"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "600", "rda": "11"}, {"a0": 14, "a1": 18, "sx": "all", "ul": "800", "rda": "15"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "800", "rda": "19"}, {"a0": 19, "a1": 110, "sx": "all", "ul": "1,000", "rda": "15"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "1,000", "rda": "19"}]}, {"h": {"ar": "تخثر الدم", "en": "Blood clotting"}, "n": {"ar": "فيتامين K", "en": "Vitamin K"}, "r": [32], "id": "vitk", "sa": "2026-10-30", "sb": "", "uk": "mcg", "note": {"ar": "هذه قيم المدخول الكافي (AI) وليست RDA. لا يوجد حد أعلى لأن سمّيته منخفضة. من يتناول الوارفارين يحافظ على كمية ثابتة من فيتامين K يومياً، لأن التغيّر المفاجئ يغيّر تأثير الدواء.", "en": "These are adequate intakes (AI), not RDAs. There is no upper limit because toxicity is low. People on warfarin should keep their vitamin K intake consistent, because sudden changes alter the drug's effect."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "2–2.5"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "30"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "55"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "", "rda": "60"}, {"a0": 14, "a1": 18, "sx": "all", "ul": "", "rda": "75"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "", "rda": "120"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "", "rda": "90"}]}, {"h": {"ar": "البيريدوكسين", "en": "Pyridoxine"}, "n": {"ar": "فيتامين B6", "en": "Vitamin B6"}, "r": [33], "id": "b6", "sa": "2026-10-29", "sb": "", "uk": "mg", "note": {"ar": "الاستعمال الطويل لجرعات عالية من البيريدوكسين قد يسبب اعتلالاً عصبياً حسياً شديداً ومتفاقماً، وسُجّلت حالات بجرعات أقل من 500 ملغ يومياً. الحد الأعلى الأمريكي للبالغين 100 ملغ يومياً، بينما حددت الهيئة الأوروبية EFSA عام 2023 حداً أعلى 12 ملغ يومياً. للرضّع: 0.1 ملغ لأول 6 أشهر و0.3 من 7 إلى 12 شهراً.", "en": "Long-term high-dose pyridoxine can cause severe, progressive sensory neuropathy, with reports at doses below 500 mg/day. The US adult upper limit is 100 mg/day, while EFSA (2023) set 12 mg/day. Infants: 0.1 mg for 0–6 months and 0.3 mg for 7–12 months."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "0.1–0.3"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "30", "rda": "0.5"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "40", "rda": "0.6"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "60", "rda": "1.0"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "80", "rda": "1.3"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "80", "rda": "1.2"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "80", "rda": "1.9"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "80", "rda": "2.0"}, {"a0": 19, "a1": 50, "sx": "all", "ul": "100", "rda": "1.3"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "100", "rda": "1.9"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "100", "rda": "2.0"}, {"a0": 51, "a1": 110, "sx": "m", "ul": "100", "rda": "1.7"}, {"a0": 51, "a1": 110, "sx": "f", "ul": "100", "rda": "1.5"}]}, {"h": {"ar": "الثيامين", "en": "Thiamin"}, "n": {"ar": "فيتامين B1", "en": "Vitamin B1"}, "r": [34], "id": "b1", "sa": "2026-10-29", "sb": "", "uk": "mg", "note": {"ar": "لا يوجد حد أعلى معتمد لعدم تسجيل آثار ضارة من الكميات العالية. للرضّع: 0.2 ملغ لأول 6 أشهر و0.3 من 7 إلى 12 شهراً.", "en": "No upper limit is set because no adverse effects from high intakes have been reported. Infants: 0.2 mg for 0–6 months and 0.3 mg for 7–12 months."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "0.2–0.3"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "0.5"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "0.6"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "", "rda": "0.9"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "", "rda": "1.2"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "", "rda": "1.0"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "", "rda": "1.4"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "", "rda": "1.4"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "", "rda": "1.2"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "", "rda": "1.1"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "", "rda": "1.4"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "", "rda": "1.4"}]}, {"h": {"ar": "النياسين", "en": "Niacin"}, "n": {"ar": "فيتامين B3", "en": "Vitamin B3"}, "r": [35], "id": "b3", "sa": "2026-10-29", "sb": "", "uk": "mg", "note": {"ar": "القيم بالملغ من مكافئ النياسين (NE)، عدا قيمة الرضّع لأول 6 أشهر فهي من النياسين الجاهز. الحد الأعلى يخص النياسين المكمّل فقط (حمض النيكوتينيك والنيكوتيناميد) وليس الغذاء، ولا ينطبق على العلاج تحت إشراف طبي. 30 إلى 50 ملغ فأكثر من حمض النيكوتينيك تسبب عادة احمرار الوجه، وجرعات 1,000 إلى 3,000 ملغ يومياً قد تسبب آثاراً أخطر، والاستعمال الطويل بجرعات عالية قد يضر الكبد.", "en": "Values are mg niacin equivalents (NE), except the 0–6 month value, which is preformed niacin. The upper limit applies only to supplemental niacin (nicotinic acid and nicotinamide), not food, and not to treatment under medical supervision. 30–50 mg or more of nicotinic acid usually causes flushing; 1,000–3,000 mg/day can cause more serious effects, and high doses over months or years can harm the liver."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "2–4"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "10", "rda": "6"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "15", "rda": "8"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "20", "rda": "12"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "30", "rda": "16"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "30", "rda": "14"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "30", "rda": "18"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "30", "rda": "17"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "35", "rda": "16"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "35", "rda": "14"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "35", "rda": "18"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "35", "rda": "17"}]}, {"h": {"ar": "فيتامين B7", "en": "Vitamin B7"}, "n": {"ar": "البيوتين", "en": "Biotin"}, "r": [36, 38], "id": "biotin", "sa": "2026-10-30", "sb": "", "uk": "mcg", "note": {"ar": "قيم المدخول الكافي (AI)، ولا يوجد حد أعلى. الجرعات العالية من البيوتين قد تُفسد نتائج تحاليل تعتمد على تقنية biotin-streptavidin، مثل هرمونات الغدة الدرقية والتروبونين، فتعطي نتائج خاطئة، لذلك يُنصح مقدمو الرعاية بسؤال المرضى عن تناول مكملات البيوتين.", "en": "Adequate intakes (AI); no upper limit. High-dose biotin can distort results of biotin-streptavidin lab tests such as thyroid hormones and troponin. Health care providers should ask patients about biotin supplements."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "5–6"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "8"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "12"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "", "rda": "20"}, {"a0": 14, "a1": 18, "sx": "all", "ul": "", "rda": "25"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "", "rda": "30"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "", "rda": "35"}, {"a0": 19, "a1": 110, "sx": "all", "ul": "", "rda": "30"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "", "rda": "35"}]}, {"h": {"ar": "هرمونات الغدة الدرقية", "en": "Thyroid hormones"}, "n": {"ar": "اليود", "en": "Iodine"}, "r": [37], "id": "iodine", "sa": "2026-10-28", "sb": "", "uk": "mcg", "note": {"ar": "الكميات العالية من اليود قد تسبب أعراضاً تشبه نقصه مثل تضخم الغدة وقصورها، وقد تسبب فرط نشاطها والتهابها. مرضى أمراض الغدة المناعية قد يتأثرون بكميات تُعد آمنة لغيرهم. للرضّع: 110 لأول 6 أشهر و130 من 7 إلى 12 شهراً، ومصدرهم الحليب الصناعي والغذاء فقط.", "en": "High iodine intake can cause symptoms similar to deficiency, such as goiter and hypothyroidism, and can also cause hyperthyroidism and thyroiditis. People with autoimmune thyroid disease may react to amounts that are safe for others. Infants: 110 for 0–6 months and 130 for 7–12 months; formula and food should be their only sources."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "110–130"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "200", "rda": "90"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "300", "rda": "90"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "600", "rda": "120"}, {"a0": 14, "a1": 18, "sx": "all", "ul": "900", "rda": "150"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "900", "rda": "220"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "900", "rda": "290"}, {"a0": 19, "a1": 110, "sx": "all", "ul": "1,100", "rda": "150"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "1,100", "rda": "220"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "1,100", "rda": "290"}]}, {"h": {"ar": "مضاد للأكسدة والغدة الدرقية", "en": "Antioxidant, thyroid"}, "n": {"ar": "السيلينيوم", "en": "Selenium"}, "r": [39], "id": "selenium", "sa": "2026-10-29", "sb": "", "uk": "mcg", "note": {"ar": "الأعراض الأكثر شيوعاً لزيادة السيلينيوم المزمنة تساقط الشعر وهشاشة الأظافر أو سقوطها، وقد تسبب طفحاً جلدياً وغثياناً وإسهالاً وتعباً وتهيجاً واضطرابات عصبية. الحد الأعلى لا ينطبق على العلاج تحت إشراف الطبيب. للرضّع: الاحتياج 15 لأول 6 أشهر و20 من 7 إلى 12 شهراً، والحد الأعلى 45 ثم 60.", "en": "The most common signs of chronic excess are hair loss and brittle or lost nails; it can also cause skin rash, nausea, diarrhea, fatigue, irritability and nervous system problems. The upper limit does not apply under a physician's care. Infants: need 15 for 0–6 months and 20 for 7–12 months; upper limit 45 then 60."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "45–60", "rda": "15–20"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "90", "rda": "20"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "150", "rda": "30"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "280", "rda": "40"}, {"a0": 14, "a1": 110, "sx": "all", "ul": "400", "rda": "55"}, {"a0": 14, "a1": 50, "sx": "p", "ul": "400", "rda": "60"}, {"a0": 14, "a1": 50, "sx": "l", "ul": "400", "rda": "70"}]}, {"h": {"ar": "تكوين الدم والأعصاب", "en": "Blood and nerves"}, "n": {"ar": "النحاس", "en": "Copper"}, "r": [40], "id": "copper", "sa": "2026-10-29", "sb": "", "uk": "mcg", "note": {"ar": "لا يُعرف للنحاس تداخل دوائي مهم سريرياً. الإفراط في مكملات الزنك قد يسبب نقص النحاس. الحد الأعلى لا ينطبق على العلاج تحت إشراف طبي. للرضّع: 200 لأول 6 أشهر و220 من 7 إلى 12 شهراً، ومصدرهم حليب الأم أو الحليب الصناعي والغذاء فقط.", "en": "Copper has no known clinically relevant drug interactions. Excessive zinc supplements can cause copper deficiency. The upper limit does not apply under medical supervision. Infants: 200 for 0–6 months and 220 for 7–12 months; breast milk, formula and food should be their only sources."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "200–220"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "1,000", "rda": "340"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "3,000", "rda": "440"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "5,000", "rda": "700"}, {"a0": 14, "a1": 18, "sx": "all", "ul": "8,000", "rda": "890"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "8,000", "rda": "1,000"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "8,000", "rda": "1,300"}, {"a0": 19, "a1": 110, "sx": "all", "ul": "10,000", "rda": "900"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "10,000", "rda": "1,000"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "10,000", "rda": "1,300"}]}, {"h": {"ar": "القلب والعضلات", "en": "Heart and muscles"}, "n": {"ar": "البوتاسيوم", "en": "Potassium"}, "r": [41], "id": "potassium", "sa": "2026-10-30", "sb": "", "uk": "mg", "note": {"ar": "قيم المدخول الكافي (AI)، ولا يوجد حد أعلى. لا تنطبق هذه القيم على من لديهم ضعف في طرح البوتاسيوم بسبب أمراض الكلى أو أدوية معينة، فقد يحدث لديهم ارتفاع البوتاسيوم حتى بكميات أقل من الاحتياج. الكميات العالية جداً من المكملات أو بدائل الملح قد تسبب ارتفاعاً حاداً في البوتاسيوم حتى لدى الأصحاء.", "en": "Adequate intakes (AI); no upper limit. These values do not apply to people whose potassium excretion is impaired by kidney disease or certain medicines; they can develop high potassium even below the AI. Very high amounts from supplements or salt substitutes can cause acute hyperkalemia even in healthy people."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "400–860"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "2,000"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "2,300"}, {"a0": 9, "a1": 13, "sx": "m", "ul": "", "rda": "2,500"}, {"a0": 9, "a1": 13, "sx": "f", "ul": "", "rda": "2,300"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "", "rda": "3,000"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "", "rda": "2,300"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "", "rda": "2,600"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "", "rda": "2,500"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "", "rda": "3,400"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "", "rda": "2,600"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "", "rda": "2,900"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "", "rda": "2,800"}]}, {"h": {"ar": "الأحماض الدهنية الأساسية", "en": "Essential fatty acids"}, "n": {"ar": "أوميغا-3", "en": "Omega-3"}, "r": [42], "id": "omega3", "sa": "2026-10-28", "sb": "", "uk": "g", "note": {"ar": "القيم بالغرام من حمض ألفا لينولينيك (ALA)، وللرضّع من مجموع أوميغا-3. لا يوجد حد أعلى رسمي. ترى EFSA أن تناول EPA وDHA معاً حتى نحو 5 غرامات يومياً آمن على المدى الطويل، وتعتبر FDA المكملات التي لا تتجاوز 5 غرامات يومياً آمنة.", "en": "Grams of alpha-linolenic acid (ALA); for infants, total omega-3s. No official upper limit. EFSA considers combined EPA and DHA up to about 5 g/day safe long term, and FDA considers supplements providing no more than 5 g/day safe."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "0.5"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "0.7"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "0.9"}, {"a0": 9, "a1": 13, "sx": "m", "ul": "", "rda": "1.2"}, {"a0": 9, "a1": 13, "sx": "f", "ul": "", "rda": "1.0"}, {"a0": 14, "a1": 110, "sx": "m", "ul": "", "rda": "1.6"}, {"a0": 14, "a1": 110, "sx": "f", "ul": "", "rda": "1.1"}, {"a0": 14, "a1": 50, "sx": "p", "ul": "", "rda": "1.4"}, {"a0": 14, "a1": 50, "sx": "l", "ul": "", "rda": "1.3"}]}, {"h": {"ar": "الريبوفلافين", "en": "Riboflavin"}, "n": {"ar": "فيتامين B2", "en": "Vitamin B2"}, "r": [43], "id": "b2", "sa": "2026-10-29", "sb": "", "uk": "mg", "note": {"ar": "لا يوجد حد أعلى، لعدم تسجيل آثار ضارة حتى مع 400 ملغ يومياً لمدة 3 أشهر على الأقل. لا يُعرف له تداخل دوائي مهم سريرياً. للرضّع: 0.3 ملغ لأول 6 أشهر و0.4 من 7 إلى 12 شهراً.", "en": "No upper limit, since no adverse effects were reported even at 400 mg/day for at least 3 months. No known clinically relevant drug interactions. Infants: 0.3 mg for 0–6 months and 0.4 mg for 7–12 months."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "0.3–0.4"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "0.5"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "0.6"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "", "rda": "0.9"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "", "rda": "1.3"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "", "rda": "1.0"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "", "rda": "1.4"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "", "rda": "1.6"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "", "rda": "1.3"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "", "rda": "1.1"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "", "rda": "1.4"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "", "rda": "1.6"}]}, {"h": {"ar": "الكبد والدماغ", "en": "Liver and brain"}, "n": {"ar": "الكولين", "en": "Choline"}, "r": [44], "id": "choline", "sa": "2026-10-30", "sb": "", "uk": "mg", "note": {"ar": "قيم المدخول الكافي (AI). الكميات العالية قد تسبب رائحة جسم تشبه السمك وقيئاً وتعرقاً ولعاباً زائدين وانخفاض ضغط الدم وسمية الكبد. لا يُعرف له تداخل دوائي مهم سريرياً. للرضّع: 125 لأول 6 أشهر و150 من 7 إلى 12 شهراً، ومصدرهم حليب الأم أو الحليب الصناعي والغذاء فقط.", "en": "Adequate intakes (AI). High intakes can cause fishy body odor, vomiting, excessive sweating and salivation, low blood pressure and liver toxicity. No known clinically relevant drug interactions. Infants: 125 for 0–6 months and 150 for 7–12 months; breast milk, formula and food should be their only sources."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "125–150"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "1,000", "rda": "200"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "1,000", "rda": "250"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "2,000", "rda": "375"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "3,000", "rda": "550"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "3,000", "rda": "400"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "3,000", "rda": "450"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "3,000", "rda": "550"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "3,500", "rda": "550"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "3,500", "rda": "425"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "3,500", "rda": "450"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "3,500", "rda": "550"}]}, {"h": {"ar": "حمض البانتوثينيك", "en": "Pantothenic acid"}, "n": {"ar": "فيتامين B5", "en": "Vitamin B5"}, "r": [46], "id": "b5", "sa": "2026-10-30", "sb": "", "uk": "mg", "note": {"ar": "قيم المدخول الكافي (AI)، ولا يوجد حد أعلى لعدم تسجيل آثار ضارة. النقص نادر جداً لتوفره في معظم الأطعمة. للرضّع: 1.7 لأول 6 أشهر و1.8 من 7 إلى 12 شهراً.", "en": "Adequate intake (AI) values; no upper limit, as no harm has been reported. Deficiency is very rare because it is in most foods. Infants: 1.7 for the first 6 months and 1.8 from 7 to 12 months."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "1.7–1.8"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "2"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "3"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "", "rda": "4"}, {"a0": 14, "a1": 110, "sx": "all", "ul": "", "rda": "5"}, {"a0": 14, "a1": 50, "sx": "p", "ul": "", "rda": "6"}, {"a0": 14, "a1": 50, "sx": "l", "ul": "", "rda": "7"}]}, {"h": {"ar": "استقلاب السكر", "en": "Glucose metabolism"}, "n": {"ar": "الكروم", "en": "Chromium"}, "r": [47], "id": "chromium", "sa": "2026-10-30", "sb": "", "uk": "mcg", "note": {"ar": "قيم المدخول الكافي (AI)، ولا يوجد حد أعلى. لم تثبت فائدة مكملات الكروم في علاج السكري أو إنقاص الوزن بأدلة كافية. للرضّع: 0.2 لأول 6 أشهر و5.5 من 7 إلى 12 شهراً.", "en": "Adequate intake (AI) values; no upper limit. Chromium supplements have not been shown well enough to help diabetes or weight loss. Infants: 0.2 for the first 6 months and 5.5 from 7 to 12 months."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "0.2–5.5"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "", "rda": "11"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "", "rda": "15"}, {"a0": 9, "a1": 13, "sx": "m", "ul": "", "rda": "25"}, {"a0": 9, "a1": 13, "sx": "f", "ul": "", "rda": "21"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "", "rda": "35"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "", "rda": "24"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "", "rda": "29"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "", "rda": "44"}, {"a0": 19, "a1": 50, "sx": "m", "ul": "", "rda": "35"}, {"a0": 19, "a1": 50, "sx": "f", "ul": "", "rda": "25"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "", "rda": "30"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "", "rda": "45"}, {"a0": 51, "a1": 110, "sx": "m", "ul": "", "rda": "30"}, {"a0": 51, "a1": 110, "sx": "f", "ul": "", "rda": "20"}]}, {"h": {"ar": "العظام والاستقلاب", "en": "Bones and metabolism"}, "n": {"ar": "المنغنيز", "en": "Manganese"}, "r": [48], "id": "manganese", "sa": "2026-10-30", "sb": "", "uk": "mg", "note": {"ar": "قيم المدخول الكافي (AI). الزيادة الكبيرة (مثل التعرض المهني أو مرض الكبد) قد تسبب أعراضاً عصبية تشبه باركنسون. للرضّع: 0.003 لأول 6 أشهر و0.6 من 7 إلى 12 شهراً، ولا يُحدد لهم حد أعلى.", "en": "Adequate intake (AI) values. Large excess (for example occupational exposure or liver disease) can cause Parkinson-like nerve symptoms. Infants: 0.003 for the first 6 months and 0.6 from 7 to 12 months, with no upper limit set."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "0.003–0.6"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "2", "rda": "1.2"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "3", "rda": "1.5"}, {"a0": 9, "a1": 13, "sx": "m", "ul": "6", "rda": "1.9"}, {"a0": 9, "a1": 13, "sx": "f", "ul": "6", "rda": "1.6"}, {"a0": 14, "a1": 18, "sx": "m", "ul": "9", "rda": "2.2"}, {"a0": 14, "a1": 18, "sx": "f", "ul": "9", "rda": "1.6"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "9", "rda": "2.0"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "9", "rda": "2.6"}, {"a0": 19, "a1": 110, "sx": "m", "ul": "11", "rda": "2.3"}, {"a0": 19, "a1": 110, "sx": "f", "ul": "11", "rda": "1.8"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "11", "rda": "2.0"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "11", "rda": "2.6"}]}, {"h": {"ar": "إنزيمات الجسم", "en": "Body enzymes"}, "n": {"ar": "الموليبدنوم", "en": "Molybdenum"}, "r": [49], "id": "molybdenum", "sa": "2026-10-30", "sb": "", "uk": "mcg", "note": {"ar": "النقص نادر جداً. للرضّع مدخول كافٍ: 2 لأول 6 أشهر و3 من 7 إلى 12 شهراً، ولا يُحدد لهم حد أعلى.", "en": "Deficiency is very rare. Infants (adequate intake): 2 for the first 6 months and 3 from 7 to 12 months, with no upper limit set."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "2–3"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "300", "rda": "17"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "600", "rda": "22"}, {"a0": 9, "a1": 13, "sx": "all", "ul": "1,100", "rda": "34"}, {"a0": 14, "a1": 18, "sx": "all", "ul": "1,700", "rda": "43"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "1,700", "rda": "50"}, {"a0": 14, "a1": 18, "sx": "l", "ul": "1,700", "rda": "50"}, {"a0": 19, "a1": 110, "sx": "all", "ul": "2,000", "rda": "45"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "2,000", "rda": "50"}, {"a0": 19, "a1": 50, "sx": "l", "ul": "2,000", "rda": "50"}]}, {"h": {"ar": "العظام والأسنان", "en": "Bones and teeth"}, "n": {"ar": "الفوسفور", "en": "Phosphorus"}, "r": [50], "id": "phosphorus", "sa": "2026-10-30", "sb": "", "uk": "mg", "note": {"ar": "للرضّع مدخول كافٍ: 100 لأول 6 أشهر و275 من 7 إلى 12 شهراً. الحد الأعلى في الحمل 3,500 ملغ، وفي الرضاعة 4,000. معظم الناس يحصلون على ما يكفي من الطعام، والزيادة مشكلة خاصة لدى مرضى الكلى.", "en": "Infants (adequate intake): 100 for the first 6 months and 275 from 7 to 12 months. Upper limit 3,500 mg in pregnancy and 4,000 mg when breastfeeding. Most people get enough from food; excess is a concern mainly in kidney disease."}, "plan": {"ar": "", "en": ""}, "rows": [{"a0": 0, "a1": 0, "sx": "all", "ul": "", "rda": "100–275"}, {"a0": 1, "a1": 3, "sx": "all", "ul": "3,000", "rda": "460"}, {"a0": 4, "a1": 8, "sx": "all", "ul": "3,000", "rda": "500"}, {"a0": 9, "a1": 18, "sx": "all", "ul": "4,000", "rda": "1,250"}, {"a0": 14, "a1": 18, "sx": "p", "ul": "3,500", "rda": "1,250"}, {"a0": 19, "a1": 70, "sx": "all", "ul": "4,000", "rda": "700"}, {"a0": 19, "a1": 50, "sx": "p", "ul": "3,500", "rda": "700"}, {"a0": 71, "a1": 110, "sx": "all", "ul": "3,000", "rda": "700"}]}]}, "refs": [{"ar": "بروتوكولات علاج نقص D حسب العمر وعوامل الخطورة", "at": "2026-10-27", "en": "Treatment regimens by age and risk", "id": 2, "sa": "2026-10-27", "sb": "", "org": "Endocrine Society, 2011", "url": "https://doi.org/10.1210/jc.2011-0385", "kind": "", "title": "Holick MF, et al. Evaluation, Treatment, and Prevention of Vitamin D Deficiency. J Clin Endocrinol Metab 2011;96(7):1911–1930"}, {"ar": "الوقاية وعدم الفحص الروتيني للأصحاء", "at": "2026-10-27", "en": "Prevention; no routine testing in healthy people", "id": 3, "sa": "2026-10-27", "sb": "", "org": "Endocrine Society, 2024", "url": "https://doi.org/10.1210/clinem/dgae290", "kind": "", "title": "Demay MB, et al. Vitamin D for the Prevention of Disease. J Clin Endocrinol Metab 2024;109:1907–1947"}, {"ar": "الاحتياج اليومي والحد الأعلى والتداخلات", "at": "2026-10-27", "en": "Daily needs, upper limit, interactions", "id": 4, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/", "kind": "", "title": "Vitamin D: Fact Sheet for Health Professionals"}, {"ar": "حدود تشخيص نقص B12", "at": "2026-10-27", "en": "B12 diagnostic thresholds", "id": 5, "sa": "2026-10-27", "sb": "", "org": "NICE NG239, 2024", "url": "https://www.nice.org.uk/guidance/ng239", "kind": "", "title": "Vitamin B12 Deficiency in Over 16s: Diagnosis and Management"}, {"ar": "الاحتياج اليومي والتداخلات", "at": "2026-10-27", "en": "Daily needs, interactions", "id": 8, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/", "kind": "", "title": "Vitamin B12: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج اليومي والحد الأعلى", "at": "2026-10-27", "en": "Daily needs, upper limit", "id": 11, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/", "kind": "", "title": "Folate: Fact Sheet for Health Professionals"}, {"ar": "جرعة الحديد يوماً بعد يوم", "at": "2026-10-27", "en": "Alternate-day iron dosing", "id": 13, "sa": "2026-10-27", "sb": "", "org": "Lancet Haematology, 2017", "url": "https://doi.org/10.1016/S2352-3026(17)30182-5", "kind": "", "title": "Stoffel NU, et al. Iron absorption from oral iron supplements given on consecutive versus alternate days. Lancet Haematol 2017;4(11):e524–e533"}, {"ar": "جرعات الحديد للأطفال والمراهقين", "at": "2026-10-29", "en": "Iron doses for children and adolescents", "id": 14, "sa": "2026-10-29", "sb": "", "org": "American Academy of Pediatrics, Pediatrics 2026", "url": "https://doi.org/10.1542/peds.2026-077414", "kind": "", "title": "Prevention, Screening, Diagnosis, and Treatment of Iron Deficiency and Iron Deficiency Anemia in Infants, Children, and Adolescents. AAP clinical report, July 2026"}, {"ar": "الاحتياج اليومي والحد الأعلى ونسب الأملاح", "at": "2026-10-27", "en": "Daily needs, upper limit, salt percentages", "id": 15, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/", "kind": "", "title": "Iron: Fact Sheet for Health Professionals"}, {"ar": "معادلة Ganzoni والحد الأقصى للجرعة", "at": "2026-10-27", "en": "Ganzoni method, maximum dose", "id": 16, "sa": "2026-10-27", "sb": "", "org": "Medsafe (official data sheet)", "url": "https://www.medsafe.govt.nz/profs/datasheet/f/ferinjectinj.pdf", "kind": "", "title": "Ferinject (ferric carboxymaltose) Data Sheet: Ganzoni method and maximum single dose"}, {"ar": "معادلة Ganzoni لـ Venofer", "at": "2026-10-27", "en": "Ganzoni method for Venofer", "id": 17, "sa": "2026-10-27", "sb": "", "org": "Medsafe (official data sheet)", "url": "https://medsafe.govt.nz/profs/Datasheet/v/venoferinf.pdf", "kind": "", "title": "Venofer (iron sucrose) Data Sheet"}, {"ar": "الاحتياج اليومي والحد الأعلى وطريقة الأخذ", "at": "2026-10-27", "en": "Daily needs, upper limit, how to take", "id": 18, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/", "kind": "", "title": "Calcium: Fact Sheet for Health Professionals"}, {"ar": "معادلة الكالسيوم المصحح", "at": "2026-10-27", "en": "Corrected calcium formula", "id": 19, "sa": "2026-10-27", "sb": "", "org": "BMJ, 1973", "url": "https://doi.org/10.1136/bmj.4.5893.643", "kind": "", "title": "Payne RB, et al. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J 1973;4:643–646"}, {"ar": "الاحتياج اليومي والحد الأعلى والتداخلات", "at": "2026-10-27", "en": "Daily needs, upper limit, interactions", "id": 20, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/", "kind": "", "title": "Magnesium: Fact Sheet for Health Professionals"}, {"ar": "تعريف نقص المغنيسيوم ودواعي العلاج", "at": "2026-10-27", "en": "Definition and when to treat", "id": 21, "sa": "2026-10-27", "sb": "", "org": "MSD Manual Professional", "url": "https://www.msdmanuals.com/professional/endocrine-and-metabolic-disorders/electrolyte-disorders/hypomagnesemia", "kind": "", "title": "Hypomagnesemia"}, {"ar": "الجرعة الفموية والمتابعة", "at": "2026-10-27", "en": "Oral dosing and follow-up", "id": 22, "sa": "2026-10-27", "sb": "", "org": "NHS Specialist Pharmacy Service", "url": "https://www.sps.nhs.uk/articles/treating-acute-hypomagnesaemia-in-adults/", "kind": "", "title": "Treating acute hypomagnesaemia in adults"}, {"ar": "الاحتياج اليومي والحد الأعلى", "at": "2026-10-27", "en": "Daily needs, upper limit", "id": 23, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/", "kind": "", "title": "Vitamin C: Fact Sheet for Health Professionals"}, {"ar": "فيتامين C ونزلات البرد", "at": "2026-10-27", "en": "Vitamin C and colds", "id": 24, "sa": "2026-10-27", "sb": "", "org": "Cochrane Review, 2013", "url": "https://www.cochrane.org/CD000980/ARI_vitamin-c-for-the-common-cold", "kind": "", "title": "Hemilä H, Chalker E. Vitamin C for preventing and treating the common cold. CD000980"}, {"ar": "الاحتياج اليومي والحد الأعلى والتداخلات", "at": "2026-10-27", "en": "Daily needs, upper limit, interactions", "id": 25, "sa": "2026-10-27", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/", "kind": "", "title": "Zinc: Fact Sheet for Health Professionals"}, {"ar": "الزنك ونزلات البرد", "at": "2026-10-27", "en": "Zinc and colds", "id": 26, "sa": "2026-10-27", "sb": "", "org": "Cochrane Review, 2024", "url": "https://doi.org/10.1002/14651858.CD014914.pub2", "kind": "", "title": "Nault D, et al. Zinc for prevention and treatment of the common cold. CD014914"}, {"ar": "فاصل 4 ساعات عن الحديد والكالسيوم", "at": "2026-10-29", "en": "4-hour gap from iron and calcium", "id": 27, "sa": "2026-10-29", "sb": "", "org": "Pfizer (levothyroxine label)", "url": "https://www.pfizermedical.com/levoxyl/drug-interactions", "kind": "", "title": "LEVOXYL (levothyroxine sodium): Drug Interactions"}, {"ar": "مدة علاج نقص الفولات وتحذير B12", "at": "2026-10-27", "en": "Treatment duration; B12 warning", "id": 28, "sa": "2026-10-27", "sb": "", "org": "UK SmPC (electronic medicines compendium)", "url": "https://www.medicines.org.uk/emc/product/2449/smpc", "kind": "", "title": "Folic acid 1 mg/ml oral solution: Summary of Product Characteristics"}, {"ar": "نظم حقن B12 العضلية", "at": "2026-10-27", "en": "Intramuscular B12 regimens", "id": 29, "sa": "2026-10-27", "sb": "", "org": "BNF (British National Formulary)", "url": "https://bnf.nice.org.uk/drugs/hydroxocobalamin/", "kind": "", "title": "Hydroxocobalamin: indications and dose"}, {"ar": "الاحتياج والحد الأعلى والتداخلات وتحذير الحمل", "at": "2026-10-28", "en": "Needs, upper limit, interactions, pregnancy warning", "id": 30, "sa": "2026-10-28", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminA-HealthProfessional/", "kind": "", "title": "Vitamin A and Carotenoids: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج والحد الأعلى والتداخلات", "at": "2026-10-29", "en": "Needs, upper limit, interactions", "id": 31, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/", "kind": "", "title": "Vitamin E: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج الكافي والتداخل مع الوارفارين", "at": "2026-10-29", "en": "Adequate intake, warfarin interaction", "id": 32, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminK-HealthProfessional/", "kind": "", "title": "Vitamin K: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج والحد الأعلى والاعتلال العصبي والتداخلات", "at": "2026-10-29", "en": "Needs, upper limit, neuropathy, interactions", "id": 33, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/VitaminB6-HealthProfessional/", "kind": "", "title": "Vitamin B6: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج والتداخلات", "at": "2026-10-29", "en": "Needs, interactions", "id": 34, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Thiamin-HealthProfessional/", "kind": "", "title": "Thiamin: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج والحد الأعلى والآثار الجانبية والتداخلات", "at": "2026-10-28", "en": "Needs, upper limit, side effects, interactions", "id": 35, "sa": "2026-10-28", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Niacin-HealthProfessional/", "kind": "", "title": "Niacin: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج الكافي وتأثيره على التحاليل", "at": "2026-10-29", "en": "Adequate intake, lab-test interference", "id": 36, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Biotin-HealthProfessional/", "kind": "", "title": "Biotin: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج والحد الأعلى والتداخلات", "at": "2026-10-29", "en": "Needs, upper limit, interactions", "id": 37, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Iodine-HealthProfessional/", "kind": "", "title": "Iodine: Fact Sheet for Health Professionals"}, {"ar": "تحذير FDA من تأثير البيوتين على التحاليل", "at": "2026-10-29", "en": "FDA warning on biotin and lab tests", "id": 38, "sa": "2026-10-29", "sb": "", "org": "U.S. Food and Drug Administration", "url": "https://www.fda.gov/medical-devices/in-vitro-diagnostics/biotin-interference-troponin-lab-tests-assays-subject-biotin-interference", "kind": "", "title": "Biotin Interference with Troponin Lab Tests: Assays Subject to Biotin Interference"}, {"ar": "الاحتياج والحد الأعلى وأعراض الزيادة والتداخلات", "at": "2026-10-29", "en": "Needs, upper limit, toxicity, interactions", "id": 39, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Selenium-HealthProfessional/", "kind": "", "title": "Selenium: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج والحد الأعلى وتأثير الزنك", "at": "2026-10-29", "en": "Needs, upper limit, zinc effect", "id": 40, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Copper-HealthProfessional/", "kind": "", "title": "Copper: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج الكافي والتداخلات وتحذير الكلى", "at": "2026-10-29", "en": "Adequate intake, interactions, kidney caution", "id": 41, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Potassium-HealthProfessional/", "kind": "", "title": "Potassium: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج الكافي والكميات الآمنة والتداخل مع الوارفارين", "at": "2026-10-28", "en": "Adequate intake, safe amounts, warfarin", "id": 42, "sa": "2026-10-28", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/", "kind": "", "title": "Omega-3 Fatty Acids: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج", "at": "2026-10-28", "en": "Needs", "id": 43, "sa": "2026-10-28", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Riboflavin-HealthProfessional/", "kind": "", "title": "Riboflavin: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج الكافي والحد الأعلى", "at": "2026-10-28", "en": "Adequate intake, upper limit", "id": 44, "sa": "2026-10-28", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Choline-HealthProfessional/", "kind": "", "title": "Choline: Fact Sheet for Health Professionals"}, {"ar": "فاصل المضاد عن الكالسيوم والحديد والمغنيسيوم والزنك", "at": "2026-10-29", "en": "Spacing from calcium, iron, magnesium and zinc", "id": 45, "sa": "2026-10-29", "sb": "", "org": "U.S. FDA (Cipro label)", "url": "https://www.accessdata.fda.gov/drugsatfda_docs/label/2016/019537s086lbl.pdf", "kind": "d", "title": "CIPRO (ciprofloxacin) tablets: Full Prescribing Information"}, {"ar": "الاحتياج اليومي", "at": "2026-10-29", "en": "Daily needs", "id": 46, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/PantothenicAcid-HealthProfessional/", "kind": "o", "title": "Pantothenic Acid: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج اليومي والتداخلات", "at": "2026-10-29", "en": "Daily needs, interactions", "id": 47, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Chromium-HealthProfessional/", "kind": "o", "title": "Chromium: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج اليومي والحد الأعلى", "at": "2026-10-29", "en": "Daily needs, upper limit", "id": 48, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Manganese-HealthProfessional/", "kind": "o", "title": "Manganese: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج اليومي والحد الأعلى", "at": "2026-10-29", "en": "Daily needs, upper limit", "id": 49, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Molybdenum-HealthProfessional/", "kind": "o", "title": "Molybdenum: Fact Sheet for Health Professionals"}, {"ar": "الاحتياج اليومي والحد الأعلى والتداخلات", "at": "2026-10-29", "en": "Daily needs, upper limit, interactions", "id": 50, "sa": "2026-10-29", "sb": "", "org": "NIH Office of Dietary Supplements", "url": "https://ods.od.nih.gov/factsheets/Phosphorus-HealthProfessional/", "kind": "o", "title": "Phosphorus: Fact Sheet for Health Professionals"}, {"ar": "حدود الهيموغلوبين لفقر الدم حسب العمر والحمل", "at": "2026-10-29", "en": "Haemoglobin cut-offs for anaemia by age and pregnancy", "id": 51, "sa": "2026-10-29", "sb": "", "org": "World Health Organization, 2024", "url": "https://www.who.int/publications/i/item/9789240088542", "kind": "g", "title": "Guideline on haemoglobin cutoffs to define anaemia in individuals and populations"}, {"ar": "حدود Ferritin ومع وجود الالتهاب", "at": "2026-10-29", "en": "Ferritin cut-offs, including with inflammation", "id": 52, "sa": "2026-10-29", "sb": "", "org": "World Health Organization, 2020", "url": "https://www.who.int/publications/i/item/9789240000124", "kind": "g", "title": "WHO guideline on use of ferritin concentrations to assess iron status in individuals and populations"}, {"ar": "جرعات فيتامين A الوقائية للأطفال", "at": "2026-10-29", "en": "Preventive vitamin A doses for children", "id": 53, "sa": "2026-10-29", "sb": "", "org": "World Health Organization, 2011", "url": "https://www.who.int/publications/i/item/9789241501767", "kind": "g", "title": "Guideline: Vitamin A supplementation in infants and children 6–59 months of age"}, {"ar": "علاج جفاف العين والحصبة بفيتامين A", "at": "2026-10-29", "en": "Vitamin A for xerophthalmia and measles", "id": 54, "sa": "2026-10-29", "sb": "", "org": "WHO / UNICEF / IVACG, 1997", "url": "https://www.who.int/publications/i/item/9241545062", "kind": "g", "title": "Vitamin A supplements: a guide to their use in the treatment and prevention of vitamin A deficiency and xerophthalmia, 2nd ed."}, {"ar": "فيتامين D 400 IU للرضّع", "at": "2026-10-29", "en": "Vitamin D 400 IU for infants", "id": 55, "sa": "2026-10-29", "sb": "", "org": "American Academy of Pediatrics, 2008", "url": "https://doi.org/10.1542/peds.2008-1862", "kind": "g", "title": "Wagner CL, Greer FR. Prevention of rickets and vitamin D deficiency in infants, children, and adolescents. Pediatrics 2008;122(5):1142–1152"}, {"ar": "فيتامين K عند الولادة", "at": "2026-10-29", "en": "Vitamin K at birth", "id": 56, "sa": "2026-10-29", "sb": "", "org": "American Academy of Pediatrics, 2022", "url": "https://doi.org/10.1542/peds.2021-056036", "kind": "g", "title": "Hand I, et al. Vitamin K and the newborn infant. Pediatrics 2022;149(3):e2021056036"}, {"ar": "الحديد وحمض الفوليك والكالسيوم في الحمل", "at": "2026-10-29", "en": "Iron, folic acid and calcium in pregnancy", "id": 57, "sa": "2026-10-29", "sb": "", "org": "World Health Organization, 2016", "url": "https://www.who.int/publications/i/item/9789241549912", "kind": "g", "title": "WHO recommendations on antenatal care for a positive pregnancy experience"}, {"ar": "جرعة المغنيسيوم الفموية للأطفال", "at": "2026-10-29", "en": "Oral magnesium dose for children", "id": 58, "sa": "2026-10-29", "sb": "", "org": "The Royal Children's Hospital Melbourne", "url": "https://www.rch.org.au/clinicalguide/guideline_index/Hypomagnesaemia/", "kind": "g", "title": "Clinical Practice Guideline: Hypomagnesaemia"}, {"ar": "جدول جرعات Ferinject المبسّط", "at": "2026-10-29", "en": "Simplified Ferinject dosing table", "id": 59, "sa": "2026-10-29", "sb": "", "org": "UK SmPC (electronic medicines compendium)", "url": "https://www.medicines.org.uk/emc/product/5910/smpc", "kind": "d", "title": "Ferinject (ferric carboxymaltose): Summary of Product Characteristics"}, {"ar": "فاصل Dolutegravir عن الحديد والكالسيوم ومضادات الحموضة", "at": "2026-10-29", "en": "Spacing dolutegravir from iron, calcium and antacids", "id": 60, "sa": "2026-10-29", "sb": "", "org": "U.S. FDA (Tivicay label)", "url": "https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/204790s031%2C213983s004lbl.pdf", "kind": "d", "title": "TIVICAY (dolutegravir): Full Prescribing Information"}, {"ar": "فيتامين D والكالسيوم والفوسفات في القصور الكلوي", "at": "2026-10-29", "en": "Vitamin D, calcium and phosphate in kidney disease", "id": 61, "sa": "2026-10-29", "sb": "", "org": "KDIGO, 2017", "url": "https://doi.org/10.1016/j.kisu.2017.04.001", "kind": "g", "title": "KDIGO 2017 Clinical Practice Guideline Update for the Diagnosis, Evaluation, Prevention, and Treatment of Chronic Kidney Disease–Mineral and Bone Disorder (CKD-MBD). Kidney Int Suppl 2017;7(1):1–59"}, {"ar": "الحديد وفقر الدم في القصور الكلوي", "at": "2026-10-29", "en": "Iron and anemia in kidney disease", "id": 62, "sa": "2026-10-29", "sb": "", "org": "KDIGO, 2012", "url": "https://kdigo.org/guidelines/anemia-in-ckd/", "kind": "g", "title": "KDIGO Clinical Practice Guideline for Anemia in Chronic Kidney Disease. Kidney Int Suppl 2012;2(4):279–335"}, {"ar": "B12 الفموي بجرعة عالية مقابل الحقن", "at": "2026-10-29", "en": "High-dose oral versus injected B12", "id": 63, "sa": "2026-10-29", "sb": "", "org": "Cochrane Review, 2018", "url": "https://doi.org/10.1002/14651858.CD004655.pub3", "kind": "s", "title": "Wang H, et al. Oral vitamin B12 versus intramuscular vitamin B12 for vitamin B12 deficiency. Cochrane Database Syst Rev 2018;3:CD004655"}, {"ar": "نظم B12 الفموي والعضلي في التجارب", "at": "2026-10-29", "en": "Oral and IM B12 regimens in the trials", "id": 64, "sa": "2026-10-29", "sb": "", "org": "American Family Physician, 2022", "url": "https://www.aafp.org/pubs/afp/issues/2022/0600/p663.pdf", "kind": "s", "title": "Oral vs. Intramuscular Vitamin B12 for Vitamin B12 Deficiency (Cochrane for Clinicians). Am Fam Physician 2022;105(6):663"}, {"ar": "400 mcg حمض فوليك قبل الحمل", "at": "2026-10-29", "en": "400 mcg folic acid before pregnancy", "id": 65, "sa": "2026-10-29", "sb": "", "org": "CDC (U.S. Centers for Disease Control and Prevention)", "url": "https://www.cdc.gov/folic-acid/hcp/clinical-overview/index.html", "kind": "o", "title": "Folic Acid: Facts for Clinicians"}, {"ar": "جرعة حمض الفوليك العلاجية حتى 1 ملغ", "at": "2026-10-29", "en": "Therapeutic folic acid dose up to 1 mg", "id": 66, "sa": "2026-10-29", "sb": "", "org": "U.S. FDA labeling (DailyMed)", "url": "https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=FOLIC+ACID+1+MG+TABLET", "kind": "d", "title": "Folic acid tablets 1 mg: Prescribing information (dosage and administration)"}, {"ar": "4 ملغ حمض فوليك بعد حمل سابق بعيب في الأنبوب العصبي", "at": "2026-10-29", "en": "4 mg folic acid after a previous NTD pregnancy", "id": 67, "sa": "2026-10-29", "sb": "", "org": "ACOG Practice Bulletin No. 187, 2017", "url": "https://doi.org/10.1097/AOG.0000000000002412", "kind": "g", "title": "Neural Tube Defects. Obstet Gynecol 2017;130(6):e279–e290"}, {"ar": "علاج فقر الدم بعوز الحديد للبالغين وحد Ferritin", "at": "2026-10-29", "en": "Adult iron-deficiency anaemia treatment and ferritin cut-off", "id": 68, "sa": "2026-10-29", "sb": "", "org": "British Society of Gastroenterology, 2021", "url": "https://doi.org/10.1136/gutjnl-2021-325210", "kind": "g", "title": "Snook J, et al. British Society of Gastroenterology guidelines for the management of iron deficiency anaemia in adults. Gut 2021;70:2030–2051"}], "text": {"by": {"ar": "Powered by Saifaldeen", "en": "Powered by Saifaldeen"}, "w_t": {"ar": "أهلاً بك في فيتاواو", "en": "Welcome to VITAWAW"}, "hc_t": {"ar": "حاسبة جرعات الفيتامينات", "en": "Vitamin Dosing Calculator"}, "foot2": {"ar": "للتواصل", "en": "Contact:"}}, "brand": {"l1": "", "l2": "data:image/webp;base64,UklGRm4HAABXRUJQVlA4WAoAAAAgAAAAnwAAnwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDgggAUAAJAgAJ0BKqAAoAA+USiRRiOioaEk13iQcAoJZW7hdUvQQLtIirr9r2duAPLv4y8ADpAP036QHmA85L0LegB/a+oA9C/pTv2UwjPsJ/vnRK+B5I5gn7Z/huE3ao/x3y3cYTdH9oHON3JfEb0APJQ/r/GP+a/5z/x+4D/Kv7D/zuwB+4XsV/tcLn7f6GWtmASTGlT2zAJJhhlFDbUGsnEw8E/VMJ0H2/kTp+vnGsEWCY+kNr7qKo+IdPlVfRWS0gvcyK0UTWNg/F+XABuVKZL0wB05lB7OZkzOxcsLaljODy6rLjjvwBfewXqImpY1GbYuyO6zmjs5kefNYPfMFB3w7jBgyg60qe2YBJMaVPRAAP7/yb4AI/t0YyF4v8NMKp9aZJ0l9hfFnqqF96/+PY2SFsfuoTxNvN41SNg/kliRv2fPzKoww/KDBvzO23U5jjlhk6L840Dl/tyuHO2vgrS83pLoE0Nxjo8t7ZNCC1y6Zx5EFtWdioig3alWmE36tpkmnVglNDxOKzj3vmSlYk3MSHR5NHbanNJR2I2ayHPpbrdQ4/JGBgvUL9gRS8vkk37HhVW8KKCaw79+11LDto1gihIjz9gpEvR8YtGIkMF/JH9+JFJf5BfzXwQ29dIGUgDr0oOj6bfxKkQMjJX7EK8/N10gy2RN6EyWEucXGncqIUmgLvh12zr0i+T2Dl/26utPYibxgDaFJZWlhSBiZ6r7vJTrHWN4OtGEYeGoUJharrZJBQlqjPUIzwu6ruL9X0/JF2HZNk9YXCD2gPar7TKiXFS30xalqv+XGAyagw/2GEsGeIUTpQouH6sdz/kSWfaq7+jXvfYmdZjFNzu52a2zHlTgX3405Ln8d22xC3HMPNOdwIuHBWdTdA3sRgE3CnaluRoArZnVLWn+hKRGq7FcQchduLUBppCaD4ivTgxK8sE1MH7bT1Y1J/FV0zmJ9+fsnS8LW+STJ19f5MUKysDr6pWlyAryn6mY4aQuHaPPfvW0T+EtR/9hi43hP+mSWFwZzmU40s8ucm+kTCnD8+j28r7wuhpCMTfONTEdZNQ8e9Ff+KOnOQKTzGPBG4r4/7txY+j/IgrSqXKuXugc9A1F/v/14ediBfKdxwbi886v+YtQ82rJfVmht40H7iOOLjEtgoOY/Kxbp8XGE2DePv05oIo+pkYQo/8zu7Df34aLeYs1b+KugFWFpvRxGT82j+1n+N7FXXrii+q7fCsJUdACvF+t7NeExsG5FfgO7d/rULOpeCA01P35p+lE0ZzVxTFfKF1JJaNsQT+Jsqeylev8pn9ajDLX4a9lYepwrRxKAAW1riIDZaqrRQZepL11ZiI0bntPtOh5D3/GSk6t8RZ8vM/nEnkJps8Xicznv8LCMKqU7Su84J4zMhN921fX1EyNt9H9DL4/txtQ0j4ngjcBjHVrE5+Q0hwm4zxQIb+jr3iOBKLanYsCl/uh/lKS3VzZa9Zk057JMDpQeg/Q7KDDjda4z8wMW2h4ypKsOcWrF6rm9Kq1BSl3Xg9mLx+02FL+JwTtVSCDWi5XpVGD2g8QVfIBq6DttN8XMIag9LrECDUVek+kyHzwCZdAqTBjAlaTXAS0VY1I1y96tlVhqAcLiOQpYEO43uVzhy/4eMVM1ffNAMQL/5UeTkF9HCWtdsZHSyJEWg504AQwegIRmdFp+2bXZyjwSCrsK8/RgUAtNWrM18BMy8yyGiXFdbJGf8x5EmCeOrA6qy7lV89LnB751c+d4NBPdoExx9ySaVrIInzjVSuHAIi9vwjTslY2xbGb/ucKKPiDmQRQ/SUo7K25+93it3QJH6GHtOiCFS8V6cpFiQRwJucQ27n/E5y1LGCD+9ShbnXHQCWIRLTKeGAAAAA=", "url": ""}, "inter": [{"a": {"ar": "الحديد", "en": "Iron"}, "b": {"ar": "Levothyroxine", "en": "Levothyroxine"}, "d": {"ar": "افصل بينهما 4 ساعات على الأقل", "en": "Separate by at least 4 hours"}, "g": {"a": 4, "b": 4, "d": "levo"}, "k": "fe", "r": [27], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "Levothyroxine", "en": "Levothyroxine"}, "d": {"ar": "افصل بينهما 4 ساعات على الأقل", "en": "Separate by at least 4 hours"}, "g": {"a": 4, "b": 4, "d": "levo"}, "k": "ca", "r": [27], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الحديد", "en": "Iron"}, "b": {"ar": "الزنك (حديد 25 ملغ فأكثر)", "en": "Zinc (iron 25 mg or more)"}, "d": {"ar": "يقلل امتصاص الزنك إذا أُخذا معاً", "en": "Lowers zinc absorption when taken together"}, "g": {"a": 2, "b": 2, "d": "zn"}, "k": "fe", "r": [25], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "الزنك", "en": "Zinc"}, "b": {"ar": "الكينولونات والتتراسيكلينات", "en": "Quinolones and tetracyclines"}, "d": {"ar": "يؤخذ Ciprofloxacin قبل الزنك بساعتين أو بعده بـ 6 ساعات؛ وDoxycycline وTetracycline قبله بساعتين أو بعده بـ 4 إلى 6 ساعات", "en": "Take ciprofloxacin 2 hours before or 6 hours after zinc; doxycycline and tetracycline 2 hours before or 4–6 hours after"}, "g": {"a": 6, "b": 2, "d": "abx"}, "k": "zn", "r": [45, 25], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الزنك", "en": "Zinc"}, "b": {"ar": "Penicillamine", "en": "Penicillamine"}, "d": {"ar": "يقلل الزنك امتصاص Penicillamine وفعاليته", "en": "Zinc reduces penicillamine absorption and effect"}, "g": {}, "k": "zn", "r": [25], "sa": "2026-10-27", "sb": "", "sev": "moderate"}, {"a": {"ar": "المغنيسيوم", "en": "Magnesium"}, "b": {"ar": "البايفوسفونيت (Alendronate)", "en": "Bisphosphonates (alendronate)"}, "d": {"ar": "افصل بينهما ساعتين على الأقل", "en": "Separate by at least 2 hours"}, "g": {"a": 24, "b": 2, "d": "bis"}, "k": "mg", "r": [20], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "المغنيسيوم", "en": "Magnesium"}, "b": {"ar": "الكينولونات والتتراسيكلينات", "en": "Quinolones and tetracyclines"}, "d": {"ar": "يؤخذ Ciprofloxacin قبل المغنيسيوم بساعتين أو بعده بـ 6 ساعات؛ وDoxycycline وTetracycline قبله بساعتين أو بعده بـ 4 إلى 6 ساعات", "en": "Take ciprofloxacin 2 hours before or 6 hours after magnesium; doxycycline and tetracycline 2 hours before or 4–6 hours after"}, "g": {"a": 6, "b": 2, "d": "abx"}, "k": "mg", "r": [45, 20], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "المغنيسيوم", "en": "Magnesium"}, "b": {"ar": "مدرات البول ومثبطات مضخة البروتون", "en": "Diuretics and proton pump inhibitors"}, "d": {"ar": "قد تخفض المغنيسيوم مع الاستعمال الطويل، فيُراقب المستوى", "en": "May lower magnesium with long-term use; monitor levels"}, "g": {}, "k": "mg", "r": [20], "sa": "2026-10-27", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "نوع الملح", "en": "Salt form"}, "d": {"ar": "Carbonate مع الطعام، وCitrate مع الطعام أو بدونه، وبجرعة 500 ملغ أو أقل في المرة", "en": "Carbonate with food; citrate with or without food; 500 mg or less per dose"}, "g": {}, "k": "ca", "r": [18], "sa": "2026-10-27", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين D", "en": "Vitamin D"}, "b": {"ar": "Orlistat وCholestyramine والكورتيزون", "en": "Orlistat, cholestyramine, glucocorticoids"}, "d": {"ar": "تقلل امتصاص فيتامين D أو تأثيره", "en": "Reduce vitamin D absorption or effect"}, "g": {}, "k": "d", "r": [4], "sa": "2026-10-27", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين D", "en": "Vitamin D"}, "b": {"ar": "مدرات البول الثيازيدية", "en": "Thiazide diuretics"}, "d": {"ar": "تزيد خطر ارتفاع الكالسيوم مع جرعات D العالية", "en": "Raise the risk of high calcium with high vitamin D doses"}, "g": {}, "k": "d", "r": [4], "sa": "2026-10-30", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين B12", "en": "Vitamin B12"}, "b": {"ar": "Metformin ومثبطات مضخة البروتون وحاصرات H2", "en": "Metformin, PPIs, H2 blockers"}, "d": {"ar": "تقلل B12 مع الاستعمال الطويل، فيُفحص المستوى دورياً", "en": "Lower B12 with long-term use; check levels periodically"}, "g": {}, "k": "b12", "r": [8], "sa": "2026-10-27", "sb": "", "sev": "moderate"}, {"a": {"ar": "حمض الفوليك", "en": "Folic acid"}, "b": {"ar": "Methotrexate ومضادات الصرع وSulfasalazine", "en": "Methotrexate, anticonvulsants, sulfasalazine"}, "d": {"ar": "تداخل في الاتجاهين؛ يحدد الطبيب الجرعة", "en": "Two-way interaction; the doctor sets the dose"}, "g": {}, "k": "fol", "r": [11, 28], "sa": "2026-10-27", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين A", "en": "Vitamin A"}, "b": {"ar": "Orlistat", "en": "Orlistat"}, "d": {"ar": "يقلل امتصاص فيتامين A وباقي الفيتامينات الذائبة في الدهون وبيتا كاروتين، وتوصي الشركات المصنعة بفيتامينات متعددة تحتويها", "en": "Reduces absorption of vitamin A, other fat-soluble vitamins and beta-carotene; manufacturers recommend a multivitamin containing them"}, "g": {}, "k": "vita", "r": [30], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين A", "en": "Vitamin A"}, "b": {"ar": "الريتينويدات (Acitretin وBexarotene)", "en": "Retinoids (acitretin, bexarotene)"}, "d": {"ar": "أخذها مع مكملات فيتامين A يرفع خطر فرط فيتامين A", "en": "Taking them with vitamin A supplements raises the risk of hypervitaminosis A"}, "g": {}, "k": "vita", "r": [30], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "فيتامين K", "en": "Vitamin K"}, "b": {"ar": "Warfarin ومضادات التخثر الكومارينية", "en": "Warfarin and other coumarin anticoagulants"}, "d": {"ar": "التغيّر المفاجئ في كمية فيتامين K يغيّر تأثير الدواء؛ حافظ على كمية ثابتة يومياً", "en": "Sudden changes in vitamin K intake alter the drug effect; keep intake consistent"}, "g": {}, "k": "vitk", "r": [32], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "فيتامين K", "en": "Vitamin K"}, "b": {"ar": "Orlistat", "en": "Orlistat"}, "d": {"ar": "يقلل امتصاص فيتامين K، ومع الوارفارين قد يزيد زمن البروثرومبين بشكل ملحوظ", "en": "Reduces vitamin K absorption; with warfarin it may markedly increase prothrombin time"}, "g": {}, "k": "vitk", "r": [32], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "فيتامين K", "en": "Vitamin K"}, "b": {"ar": "المضادات الحيوية (خاصة السيفالوسبورينات مثل Cefoperazone)", "en": "Antibiotics (especially cephalosporins such as cefoperazone)"}, "d": {"ar": "قد تخفض فيتامين K بقتل بكتيريا الأمعاء المنتجة له؛ المكمل غير ضروري عادة إلا مع استعمال يتجاوز عدة أسابيع وغذاء فقير بفيتامين K", "en": "May lower vitamin K by killing gut bacteria that make it; supplements are usually unnecessary unless use lasts several weeks and intake is poor"}, "g": {}, "k": "vitk", "r": [32], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين K", "en": "Vitamin K"}, "b": {"ar": "Cholestyramine وColestipol", "en": "Cholestyramine, colestipol"}, "d": {"ar": "قد تقلل امتصاص فيتامين K؛ تُراقب حالته مع الاستعمال الطويل", "en": "May reduce vitamin K absorption; monitor status with long-term use"}, "g": {}, "k": "vitk", "r": [32], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين E", "en": "Vitamin E"}, "b": {"ar": "Warfarin ومضادات التخثر والصفائح", "en": "Warfarin, anticoagulants and antiplatelets"}, "d": {"ar": "الجرعات الكبيرة قد تزيد خطر النزف، خاصة مع قلة فيتامين K، والكمية المؤثرة غالباً تتجاوز 400 وحدة دولية يومياً", "en": "Large doses may increase bleeding risk, especially with low vitamin K intake; the effective amount probably exceeds 400 IU/day"}, "g": {}, "k": "vite", "r": [31], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين E", "en": "Vitamin E"}, "b": {"ar": "العلاج الكيميائي والإشعاعي", "en": "Chemotherapy and radiotherapy"}, "d": {"ar": "ينصح أطباء الأورام عادة بتجنب مكملات مضادات الأكسدة أثناء العلاج لاحتمال تقليل فعاليته، والأدلة غير حاسمة", "en": "Oncologists usually advise against antioxidant supplements during treatment because they might reduce its effectiveness; evidence is inconclusive"}, "g": {}, "k": "vite", "r": [31], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين E", "en": "Vitamin E"}, "b": {"ar": "Simvastatin مع Niacin", "en": "Simvastatin with niacin"}, "d": {"ar": "مزيج مضادات الأكسدة (فيتامين E وC والسيلينيوم وبيتا كاروتين) قلّل ارتفاع الكوليسترول النافع HDL", "en": "An antioxidant combination (vitamins E and C, selenium, beta-carotene) blunted the rise in HDL cholesterol"}, "g": {}, "k": "vite", "r": [31], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين B6", "en": "Vitamin B6"}, "b": {"ar": "Cycloserine", "en": "Cycloserine"}, "d": {"ar": "يزيد طرح B6 في البول، مما قد يزيد النوبات والسمية العصبية؛ ومكملات B6 قد تمنع ذلك", "en": "Increases urinary B6 loss, which may worsen seizures and neurotoxicity; B6 supplements can help prevent this"}, "g": {}, "k": "b6", "r": [33], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين B6", "en": "Vitamin B6"}, "b": {"ar": "مضادات الصرع (Valproate وCarbamazepine وPhenytoin)", "en": "Antiepileptics (valproate, carbamazepine, phenytoin)"}, "d": {"ar": "تزيد تكسير B6، وB6 بجرعة 200 ملغ يومياً قد يخفض مستوى Phenytoin وPhenobarbital في الدم", "en": "They increase B6 breakdown; B6 at 200 mg/day may lower blood levels of phenytoin and phenobarbital"}, "g": {}, "k": "b6", "r": [33], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين B6", "en": "Vitamin B6"}, "b": {"ar": "Theophylline", "en": "Theophylline"}, "d": {"ar": "المرضى غالباً لديهم انخفاض في B6 النشط (PLP)، مما قد يسهم في آثار عصبية منها النوبات", "en": "Patients often have low active B6 (PLP), which may contribute to neurological side effects including seizures"}, "g": {}, "k": "b6", "r": [33], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين B1", "en": "Vitamin B1"}, "b": {"ar": "Furosemide", "en": "Furosemide"}, "d": {"ar": "يرتبط بانخفاض الثيامين، وقد يصل للنقص، بسبب طرحه في البول", "en": "Linked to lower thiamin levels, possibly to deficiency, through urinary loss"}, "g": {}, "k": "b1", "r": [34], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين B1", "en": "Vitamin B1"}, "b": {"ar": "5-Fluorouracil", "en": "5-Fluorouracil"}, "d": {"ar": "سُجّلت حالات بري بري واعتلال فيرنيكه، وقد يزيد الدواء استقلاب الثيامين؛ والمكملات قد تعكس بعض التأثير", "en": "Cases of beriberi and Wernicke encephalopathy are reported; the drug may increase thiamin metabolism, and supplements might reverse some effects"}, "g": {}, "k": "b1", "r": [34], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين B3", "en": "Vitamin B3"}, "b": {"ar": "Isoniazid وPyrazinamide", "en": "Isoniazid, pyrazinamide"}, "d": {"ar": "تعيق تكوين النياسين وقد تسبب البلاجرا، وزيادة النياسين تمنع ذلك", "en": "They interrupt niacin production and can cause pellagra; extra niacin prevents it"}, "g": {}, "k": "b3", "r": [35], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين B3", "en": "Vitamin B3"}, "b": {"ar": "أدوية السكري", "en": "Antidiabetes medicines"}, "d": {"ar": "جرعات حمض النيكوتينيك الكبيرة (1.5 غرام يومياً فأكثر) ترفع السكر؛ يُراقب السكر وقد تُعدّل الجرعات", "en": "Large nicotinic acid doses (1.5 g/day or more) raise blood glucose; monitor glucose, doses may need adjusting"}, "g": {}, "k": "b3", "r": [35], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "البيوتين", "en": "Biotin"}, "b": {"ar": "تحاليل المختبر (الغدة الدرقية والتروبونين وغيرها)", "en": "Lab tests (thyroid, troponin and others)"}, "d": {"ar": "الجرعات العالية قد تعطي نتائج خاطئة، وسُجّلت وفاة بعد نتيجة تروبونين منخفضة خطأً؛ يُنصح مقدمو الرعاية بالسؤال عن البيوتين قبل تفسير التحاليل", "en": "High doses can give false results, and a death followed a falsely low troponin result; providers should ask about biotin when interpreting tests"}, "g": {}, "k": "biotin", "r": [36, 38], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "البيوتين", "en": "Biotin"}, "b": {"ar": "مضادات الصرع (Carbamazepine وPrimidone وPhenytoin وPhenobarbital)", "en": "Anticonvulsants (carbamazepine, primidone, phenytoin, phenobarbital)"}, "d": {"ar": "الاستعمال لسنة فأكثر يرتبط بانخفاض مستوى البيوتين", "en": "Use for a year or more is linked to lower biotin levels"}, "g": {}, "k": "biotin", "r": [36], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "اليود", "en": "Iodine"}, "b": {"ar": "مضادات الغدة الدرقية (Methimazole)", "en": "Antithyroid drugs (methimazole)"}, "d": {"ar": "للجرعات العالية من اليود تأثير إضافي مع الدواء قد يسبب قصور الغدة", "en": "High iodine doses add to the effect and could cause hypothyroidism"}, "g": {}, "k": "iodine", "r": [37], "sa": "2026-10-28", "sb": "", "sev": "moderate"}, {"a": {"ar": "اليود", "en": "Iodine"}, "b": {"ar": "مثبطات ACE (Lisinopril وBenazepril وFosinopril)", "en": "ACE inhibitors (lisinopril, benazepril, fosinopril)"}, "d": {"ar": "أخذ يوديد البوتاسيوم معها يزيد خطر ارتفاع البوتاسيوم", "en": "Potassium iodide with these drugs raises the risk of high potassium"}, "g": {}, "k": "iodine", "r": [37], "sa": "2026-10-28", "sb": "", "sev": "moderate"}, {"a": {"ar": "اليود", "en": "Iodine"}, "b": {"ar": "المدرات الحافظة للبوتاسيوم (Spironolactone وAmiloride)", "en": "Potassium-sparing diuretics (spironolactone, amiloride)"}, "d": {"ar": "أخذ يوديد البوتاسيوم معها يزيد خطر ارتفاع البوتاسيوم", "en": "Potassium iodide with these drugs raises the risk of high potassium"}, "g": {}, "k": "iodine", "r": [37], "sa": "2026-10-28", "sb": "", "sev": "moderate"}, {"a": {"ar": "السيلينيوم", "en": "Selenium"}, "b": {"ar": "Cisplatin", "en": "Cisplatin"}, "d": {"ar": "قد يخفض مستوى السيلينيوم في الشعر والمصل والأهمية السريرية غير معروفة، والأدلة على أن مكملاته تقلل سمية الدواء غير كافية", "en": "May lower selenium in hair and serum, of unknown clinical significance; evidence that supplements reduce its toxicity is insufficient"}, "g": {}, "k": "selenium", "r": [39], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "النحاس", "en": "Copper"}, "b": {"ar": "الزنك بجرعات عالية", "en": "High-dose zinc"}, "d": {"ar": "الإفراط في مكملات الزنك قد يسبب نقص النحاس؛ سُجّل انخفاض مؤشراته مع نحو 60 ملغ زنك يومياً لمدة تصل إلى 10 أسابيع", "en": "Excessive zinc supplements can cause copper deficiency; markers fell with about 60 mg zinc daily for up to 10 weeks"}, "g": {}, "k": "copper", "r": [40], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "البوتاسيوم", "en": "Potassium"}, "b": {"ar": "مثبطات ACE وحاصرات مستقبلات الأنجيوتنسين (Benazepril وLosartan)", "en": "ACE inhibitors and ARBs (benazepril, losartan)"}, "d": {"ar": "تقلل طرح البوتاسيوم وقد تسبب ارتفاعه؛ يُراقب المستوى خاصة مع ضعف الكلى", "en": "Reduce potassium excretion and can cause hyperkalemia; monitor levels, especially with impaired kidney function"}, "g": {}, "k": "potassium", "r": [41], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "البوتاسيوم", "en": "Potassium"}, "b": {"ar": "المدرات الحافظة للبوتاسيوم (Amiloride وSpironolactone)", "en": "Potassium-sparing diuretics (amiloride, spironolactone)"}, "d": {"ar": "تقلل طرح البوتاسيوم وقد تسبب ارتفاعه؛ يُراقب المستوى خاصة مع ضعف الكلى", "en": "Reduce potassium excretion and can cause hyperkalemia; monitor levels, especially with impaired kidney function"}, "g": {}, "k": "potassium", "r": [41], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "البوتاسيوم", "en": "Potassium"}, "b": {"ar": "مدرات البول العروية والثيازيدية (Furosemide وBumetanide وChlorothiazide وMetolazone)", "en": "Loop and thiazide diuretics (furosemide, bumetanide, chlorothiazide, metolazone)"}, "d": {"ar": "تزيد طرح البوتاسيوم وقد تسبب انخفاضه؛ يُراقب المستوى ويُبدأ المكمل عند الحاجة", "en": "Increase potassium excretion and can cause hypokalemia; monitor levels and supplement if warranted"}, "g": {}, "k": "potassium", "r": [41], "sa": "2026-10-30", "sb": "", "sev": "moderate"}, {"a": {"ar": "أوميغا-3", "en": "Omega-3"}, "b": {"ar": "Warfarin ومضادات التخثر", "en": "Warfarin and anticoagulants"}, "d": {"ar": "زيت السمك بجرعات عالية قد يطيل زمن التخثر (INR)، ومعظم الأبحاث تشير إلى أن 3 إلى 6 غرامات يومياً لا تؤثر بشكل ملحوظ؛ توصي النشرات المعتمدة بمراقبة INR دورياً", "en": "High-dose fish oil might prolong clotting time (INR), though most research shows 3–6 g/day has no significant effect; approved labels advise periodic INR monitoring"}, "g": {}, "k": "omega3", "r": [42], "sa": "2026-10-28", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "Dolutegravir", "en": "Dolutegravir"}, "d": {"ar": "الكالسيوم يخفض مستوى الدواء في الدم بشكل كبير؛ يؤخذ الدواء قبل الكالسيوم بساعتين أو بعده بـ 6 ساعات، أو معه مع وجبة طعام", "en": "Calcium can substantially lower its blood level; take the drug 2 hours before or 6 hours after calcium, or together with it with a meal"}, "g": {"a": 6, "b": 2, "d": "dtg"}, "k": "ca", "r": [60, 18], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "Lithium", "en": "Lithium"}, "d": {"ar": "الاستعمال الطويل قد يسبب ارتفاع الكالسيوم، ومكملات الكالسيوم قد تزيد هذا الخطر", "en": "Long-term use can cause hypercalcemia, and calcium supplements could increase this risk"}, "g": {}, "k": "ca", "r": [18], "sa": "2026-10-28", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "الكينولونات (Ciprofloxacin وMoxifloxacin)", "en": "Quinolones (ciprofloxacin, moxifloxacin)"}, "d": {"ar": "الكالسيوم يقلل امتصاص المضاد؛ يؤخذ Ciprofloxacin قبل الكالسيوم بساعتين أو بعده بـ 6 ساعات، ولباقي الكينولونات تُتبع نشرة الدواء", "en": "Calcium lowers the antibiotic's absorption; take ciprofloxacin 2 hours before or 6 hours after calcium, and follow the leaflet for other quinolones"}, "g": {"a": 6, "b": 2, "d": "abx"}, "k": "ca", "r": [45, 18], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الحديد", "en": "Iron"}, "b": {"ar": "Levodopa", "en": "Levodopa"}, "d": {"ar": "قد يقلل الحديد امتصاص Levodopa وبالتالي فعاليته", "en": "Iron may reduce levodopa absorption and so its effectiveness"}, "g": {}, "k": "fe", "r": [15], "sa": "2026-10-28", "sb": "", "sev": "moderate"}, {"a": {"ar": "الحديد", "en": "Iron"}, "b": {"ar": "مثبطات مضخة البروتون (Omeprazole وLansoprazole)", "en": "Proton pump inhibitors (omeprazole, lansoprazole)"}, "d": {"ar": "تقلل امتصاص الحديد، ومرضى نقص الحديد الذين يتناولونها قد لا يستجيبون جيداً للمكمل", "en": "Reduce iron absorption; iron-deficient patients taking them may respond poorly to supplements"}, "g": {}, "k": "fe", "r": [15], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "المغنيسيوم", "en": "Magnesium"}, "b": {"ar": "المدرات الحافظة للبوتاسيوم (Amiloride وSpironolactone)", "en": "Potassium-sparing diuretics (amiloride, spironolactone)"}, "d": {"ar": "تقلل طرح المغنيسيوم، عكس المدرات الأخرى", "en": "Reduce magnesium excretion, the opposite of other diuretics"}, "g": {}, "k": "mg", "r": [20], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "الحديد", "en": "Iron"}, "b": {"ar": "الكينولونات والتتراسيكلينات", "en": "Quinolones and tetracyclines"}, "d": {"ar": "الحديد يقلل امتصاص المضاد بشدة؛ يؤخذ Ciprofloxacin قبل الحديد بساعتين أو بعده بـ 6 ساعات، ولباقي المضادات تُتبع نشرة الدواء", "en": "Iron greatly lowers the antibiotic's absorption; take ciprofloxacin 2 hours before or 6 hours after iron, and follow the leaflet for other antibiotics"}, "g": {"a": 6, "b": 2, "d": "abx"}, "k": "fe", "r": [45], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "التتراسيكلينات (Doxycycline وTetracycline)", "en": "Tetracyclines (doxycycline, tetracycline)"}, "d": {"ar": "الكالسيوم يقلل امتصاص المضاد؛ يُفصل بينهما ساعتين على الأقل وتُتبع نشرة الدواء", "en": "Calcium lowers the antibiotic's absorption; separate them by at least 2 hours and follow the leaflet"}, "g": {"a": 2, "b": 2, "d": "abx"}, "k": "ca", "r": [18], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "البايفوسفونيت (Alendronate وRisedronate)", "en": "Bisphosphonates (alendronate, risedronate)"}, "d": {"ar": "يقلل الكالسيوم امتصاص الدواء؛ يؤخذ الدواء صباحاً على معدة فارغة مع ماء، والكالسيوم بعده بـ 30 دقيقة على الأقل والأفضل في وقت آخر من اليوم", "en": "Calcium lowers the medicine's absorption; take the medicine in the morning on an empty stomach with water, and calcium at least 30 minutes later, ideally at another time of day"}, "g": {"a": 24, "b": 0.5, "d": "bis"}, "k": "ca", "r": [18], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "مدرات البول الثيازيدية", "en": "Thiazide diuretics"}, "d": {"ar": "تقلل طرح الكالسيوم في البول، ومع المكملات قد يرتفع الكالسيوم في الدم؛ يُراقب مستواه", "en": "They lower calcium loss in urine; with supplements blood calcium may rise, so it is monitored"}, "g": {}, "k": "ca", "r": [18], "sa": "2026-10-30", "sb": "", "sev": "moderate"}, {"a": {"ar": "الكالسيوم", "en": "Calcium"}, "b": {"ar": "الحديد", "en": "Iron"}, "d": {"ar": "الكالسيوم يقلل امتصاص الحديد إذا أُخذا معاً؛ يُفصل بينهما ساعتين", "en": "Calcium lowers iron absorption when taken together; separate them by 2 hours"}, "g": {"a": 2, "b": 2, "d": "fe"}, "k": "ca", "r": [15, 18], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين C", "en": "Vitamin C"}, "b": {"ar": "الحديد", "en": "Iron"}, "d": {"ar": "يزيد امتصاص الحديد غير الهيمي (من النبات والمكملات)، فأخذهما معاً مفيد", "en": "It increases absorption of non-heme iron (from plants and supplements), so taking them together helps"}, "g": {}, "k": "c", "r": [23, 15], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "فيتامين C", "en": "Vitamin C"}, "b": {"ar": "العلاج الكيميائي والإشعاعي", "en": "Chemotherapy and radiotherapy"}, "d": {"ar": "يُنصح عادة بتجنب الجرعات العالية من مضادات الأكسدة أثناء العلاج إلا بإشراف طبيب الأورام، لاحتمال تقليل فعاليته، والأدلة غير حاسمة", "en": "High-dose antioxidants are usually avoided during treatment unless the oncologist agrees, as they might reduce its effect; the evidence is inconclusive"}, "g": {}, "k": "c", "r": [23], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "فيتامين C", "en": "Vitamin C"}, "b": {"ar": "Simvastatin مع Niacin", "en": "Simvastatin with niacin"}, "d": {"ar": "مزيج مضادات الأكسدة (فيتامين C وE والسيلينيوم وبيتا كاروتين) قلّل ارتفاع الكوليسترول النافع HDL", "en": "An antioxidant mix (vitamins C and E, selenium, beta-carotene) blunted the rise in HDL (\"good\") cholesterol"}, "g": {}, "k": "c", "r": [23], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "الزنك", "en": "Zinc"}, "b": {"ar": "مدرات البول الثيازيدية", "en": "Thiazide diuretics"}, "d": {"ar": "تزيد طرح الزنك في البول بنحو 60%، وقد يقل مخزونه مع الاستعمال الطويل", "en": "They raise zinc loss in urine by about 60%, which may lower zinc stores with long-term use"}, "g": {}, "k": "zn", "r": [25], "sa": "2026-10-30", "sb": "", "sev": "minor"}, {"a": {"ar": "الكروم", "en": "Chromium"}, "b": {"ar": "أدوية السكري (الإنسولين وغيره)", "en": "Diabetes medicines (insulin and others)"}, "d": {"ar": "قد يخفض الكروم السكر، فيُراقب السكر عند الجمع بينهما", "en": "Chromium may lower blood sugar, so blood sugar is monitored when they are combined"}, "g": {}, "k": "chromium", "r": [47], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "الكروم", "en": "Chromium"}, "b": {"ar": "Levothyroxine", "en": "Levothyroxine"}, "d": {"ar": "قد يقلل الكروم امتصاص الدواء؛ يؤخذ الدواء قبل الكروم بنصف ساعة على الأقل أو بعده بـ 3 إلى 4 ساعات", "en": "Chromium may lower the medicine's absorption; take the medicine at least 30 minutes before or 3–4 hours after chromium"}, "g": {}, "k": "chromium", "r": [47], "sa": "2026-10-29", "sb": "", "sev": "minor"}, {"a": {"ar": "الفوسفور", "en": "Phosphorus"}, "b": {"ar": "مضادات الحموضة (الألومنيوم والكالسيوم)", "en": "Antacids (aluminium, calcium)"}, "d": {"ar": "ترتبط بالفوسفور وتقلل امتصاصه، وقد تسبب انخفاضه مع الاستعمال الطويل", "en": "They bind phosphorus and lower its absorption, which can cause low phosphorus with long-term use"}, "g": {}, "k": "phosphorus", "r": [50], "sa": "2026-10-29", "sb": "", "sev": "moderate"}, {"a": {"ar": "الحديد", "en": "Iron"}, "b": {"ar": "Dolutegravir", "en": "Dolutegravir"}, "d": {"ar": "الحديد يخفض مستوى الدواء في الدم بشكل كبير؛ يؤخذ الدواء قبل الحديد بساعتين أو بعده بـ 6 ساعات، أو معه مع وجبة طعام", "en": "Iron can substantially lower its blood level; take the drug 2 hours before or 6 hours after iron, or together with it with a meal"}, "g": {"a": 6, "b": 2, "d": "dtg"}, "k": "fe", "r": [60], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "المغنيسيوم", "en": "Magnesium"}, "b": {"ar": "Dolutegravir", "en": "Dolutegravir"}, "d": {"ar": "مضادات الحموضة والملينات التي فيها مغنيسيوم تخفض مستوى الدواء؛ يؤخذ الدواء قبلها بساعتين أو بعدها بـ 6 ساعات", "en": "Magnesium-containing antacids and laxatives lower its level; take the drug 2 hours before or 6 hours after them"}, "g": {"a": 6, "b": 2, "d": "dtg"}, "k": "mg", "r": [60], "sa": "2026-10-29", "sb": "", "sev": "major"}, {"a": {"ar": "المغنيسيوم", "en": "Magnesium"}, "b": {"ar": "Levothyroxine", "en": "Levothyroxine"}, "d": {"ar": "مضادات الحموضة التي فيها مغنيسيوم قد تقلل امتصاص الدواء؛ يُنصح بفاصل 4 ساعات كما مع الكالسيوم والحديد", "en": "Magnesium-containing antacids may lower its absorption; a 4-hour gap is advised, as with calcium and iron"}, "g": {"a": 4, "b": 4, "d": "levo"}, "k": "mg", "r": [27], "sa": "2026-10-29", "sb": "", "sev": "moderate"}], "menus": {"bar": ["calc", "interactions", "tools", "sources"], "hide": [], "order": ["calc", "interactions", "tools", "sources", "roadmap"]}, "pages": [{"b": {"ar": "VITAWAW مشروع أكاديمي في الصيدلة أعدّه الصيدلي سيف الدين، لتبسيط حساب جرعات الفيتامينات والمعادن للصيادلة والمرضى.", "en": "VITAWAW is an academic pharmacy project by pharmacist Saifaldeen, made to simplify vitamin and mineral dosing for pharmacists and patients."}, "t": {"ar": "من نحن", "en": "About us"}, "id": "who"}, {"b": {"ar": "١. اختر الفيتامين أو المعدن، أو حاسبة الحمل أو الرضيع.\n٢. أدخل العمر والجنس ونتيجة التحليل إن وُجدت.\n٣. تظهر النتيجة فوراً: الجرعة والخطة والتحذيرات، وكل رقم مرتبط بمصدره.", "en": "1. Choose a vitamin or mineral, or the pregnancy or infant calculator.\n2. Enter age, sex and the lab result if you have one.\n3. The result appears at once: dose, plan and warnings, each number linked to its source."}, "t": {"ar": "طريقة الاستخدام", "en": "How to use"}, "id": "howto", "hidden": false}, {"b": {"ar": "للصيدلي أو للمريض؟\nاختر «صيدلي» لترى التفاصيل والمصادر والبدائل، أو «مريض» لترى كلاماً مبسطاً فقط. تجد الاختيار أعلى النتيجة وفي القائمة.\n\nهل تُحفظ بياناتي؟\nلا. ما تدخله يبقى على جهازك. سجل التحاليل وأدويتي وجدول المكملات تُحفظ على جهازك فقط ولا تُرسل لأي جهة.\n\nكيف أحوّل الجرعة إلى حبات أو قطرات أو مل؟\nتحت النتيجة أزرار تفتح الأداة المناسبة معبأة: كم حبة، كم قطرة، كم مل من الشراب.\n\nكيف أتذكر مواعيد الجرعات؟\nاضغط «أضف إلى التقويم» تحت النتيجة أو في جدول المكملات، فتُضاف المواعيد إلى تقويم هاتفك.\n\nكيف أعرض النتيجة على الطبيب؟\nاضغط «تقرير للطبيب» ثم «اطبع أو احفظ PDF»، أو «شارك برابط» ليفتح الطبيب الحاسبة بالقيم نفسها.\n\nهل تغني عن الطبيب؟\nلا. التطبيق يساعد الصيدلي والطبيب ولا يحل محلهما، خاصة للحامل والأطفال ومرضى الكلى.", "en": "For pharmacists or patients?\nChoose «Pharmacist» for details, sources and alternatives, or «Patient» for plain words only. The switch is above the result and in the menu.\n\nIs my data saved?\nNo. What you enter stays on your device. My lab results, my medicines and the supplement schedule are kept on your device only and are not sent anywhere.\n\nHow do I turn a dose into tablets, drops or mL?\nUnder the result, buttons open the right tool already filled in: tablets, drops, mL of syrup.\n\nHow do I remember the doses?\nTap «Add to calendar» under the result or in the supplement schedule, and the times are added to your phone's calendar.\n\nHow do I show the result to a doctor?\nTap «Report for the doctor» then «Print or save as PDF», or «Share by link» so the doctor opens the calculator with the same values.\n\nDoes it replace a doctor?\nNo. The app supports pharmacists and doctors and does not replace them, especially in pregnancy, children and kidney disease."}, "t": {"ar": "الأسئلة الشائعة", "en": "Frequently asked questions"}, "id": "faq"}, {"b": {"ar": "اختيار المصادر\nكل جرعة وكل حد مأخوذ من مصدر موثوق، ويظهر رقمه بجانب الرقم في النتيجة. الأولوية للإرشادات السريرية (Endocrine Society وNICE وWHO وAAP وBSG وKDIGO)، ثم المراجع الرسمية (NIH Office of Dietary Supplements للاحتياج والحد الأعلى)، ثم نشرات الأدوية الرسمية (FDA وSmPC) للتداخلات والفواصل، ثم المراجعات المنهجية (Cochrane). لا تُستخدم مواقع ثانوية عندما يوجد مصدر أصلي.\n\nعند اختلاف الإرشادات\nتذكر النتيجة الخلاف بوضوح، مثل الفرق بين إرشاد فيتامين D لعام 2011 ولعام 2024، ولا يُخفى أي رأي.\n\nالمراجعة والاعتماد\nكل إضافة أو تعديل يكتبه صيدلي من الفريق يبقى غير ظاهر للزوار حتى يراجعه الصيدلي المسؤول ويعتمده وينشره. قاعدة البيانات نفسها تفرض ذلك، ويُحفظ سجل لكل نسخة منشورة.\n\nالتحقق\nتُختبر الحاسبات آلياً على حالات طبية ثابتة تقارن النتيجة بما يقوله المصدر (44 حالة: فيتامين D وB12 والحديد والكالسيوم والمغنيسيوم والحمل والرضيع وفيتامين A)، وتُختبر الأدوات ومعادلاتها، وتُفحص روابط المصادر أسبوعياً.\n\nالحدود\nالتطبيق أداة مساعدة تعليمية، ولا يغني عن التقييم السريري. الحالات الخاصة (الحمل عالي الخطورة، القصور الكلوي، الأطفال) تُحال إلى الطبيب المختص.", "en": "Choosing sources\nEvery dose and limit comes from a trusted source, whose number appears next to it in the result. Clinical guidelines come first (Endocrine Society, NICE, WHO, AAP, BSG, KDIGO), then official references (NIH Office of Dietary Supplements for needs and upper limits), then official drug labels (FDA, SmPC) for interactions and timing, then systematic reviews (Cochrane). Secondary websites are not used where a primary source exists.\n\nWhen guidelines differ\nThe result states the difference clearly, for example between the 2011 and 2024 vitamin D guidelines, and no view is hidden.\n\nReview and approval\nEvery addition or edit by a team pharmacist stays hidden from visitors until the responsible pharmacist reviews, approves and publishes it. The database itself enforces this, and every published version is kept.\n\nValidation\nThe calculators are tested automatically on fixed medical cases that compare the result with the source (44 cases: vitamin D, B12, iron, calcium, magnesium, pregnancy, infant and vitamin A); the tools and their formulas are tested too, and source links are checked every week.\n\nLimits\nThe app is an educational support tool and does not replace clinical assessment. Special situations (high-risk pregnancy, kidney disease, children) are referred to the specialist."}, "t": {"ar": "المنهجية العلمية", "en": "Scientific method"}, "id": "method"}, {"b": {"ar": "لا نجمع أي بيانات شخصية. العمر والوزن ونتائج التحاليل التي تدخلها تبقى على جهازك فقط ولا تُرسل لأي جهة.\n\nلا نستخدم أدوات تتبّع ولا إعلانات، والخطوط محمّلة من موقعنا نفسه.\n\nيحفظ متصفحك على جهازك فقط: إعداداتك (اللغة والمظهر وآخر قسم فتحته)، وما تختار حفظه بنفسك في «سجل تحاليلي» و«أدويتي». تستطيع حذفها في أي وقت من داخل التطبيق.\n\nرابط «شارك برابط» يحمل القيم التي أدخلتها فقط، ولا تُحفظ في أي مكان.", "en": "We do not collect any personal data. The age, weight and lab results you enter stay on your device and are never sent anywhere.\n\nThere are no trackers or ads, and fonts are served from our own site.\n\nYour browser keeps on your device only your settings (language, appearance and the last section you opened) and what you choose to save in «My lab results» and «My medicines». You can delete them at any time in the app.\n\nA «Share by link» link carries only the values you entered; they are not stored anywhere."}, "t": {"ar": "سياسة الخصوصية", "en": "Privacy policy"}, "id": "privacy"}, {"b": {"ar": "المعلومات في التطبيق للتثقيف ولمساعدة الصيدلي والطبيب، ولا تغني عن الاستشارة الطبية.\n\nلا تبدأ جرعة علاجية ولا توقفها دون مراجعة الطبيب أو الصيدلي، خاصة للحامل والأطفال ومرضى الكلى.", "en": "The information in this app is for education and to support pharmacists and doctors; it does not replace medical advice.\n\nDo not start or stop a treatment dose without a doctor or pharmacist, especially in pregnancy, children and kidney disease."}, "t": {"ar": "إخلاء المسؤولية", "en": "Disclaimer"}, "id": "disclaimer"}, {"b": {"ar": "VITAWAW حاسبة لجرعات الفيتامينات والمعادن مبنية على مصادر طبية موثوقة، مع التداخلات الدوائية وأدوات صيدلانية مساعدة.\n\nكل رقم في النتيجة مرتبط بمصدره، ويمكنك فتح المصدر بالضغط على رقمه.\n\nيراجع صيدلي كل إضافة جديدة قبل أن تظهر للزوار.", "en": "VITAWAW is a vitamin and mineral dose calculator based on trusted medical sources, with drug interactions and pharmacy tools.\n\nEvery number in a result is linked to its source; tap the number to open it.\n\nA pharmacist reviews every new addition before visitors can see it."}, "t": {"ar": "حول التطبيق", "en": "About the app"}, "id": "about"}], "tools": {"hide": [], "names": {}, "order": []}, "colors": {"ul": ["#7a1f1f", "#d24b4b"], "calc": ["#0B6B6E", "#8E1B54"], "labs": ["#4c1d6e", "#9b4dca"], "sched": ["#0a5c4f", "#14a38b"], "tools": ["#00167a", "#075BFF"], "roadmap": ["#3a1678", "#7c4dff"], "sources": ["#0a4a2c", "#17915a"], "interactions": ["#7a2e00", "#d9731f"]}, "review": {"n": {"ar": "الصيدلي سيف الدين", "en": "Pharmacist Saifaldeen"}, "date": "2026-10-29"}, "contact": {"email": "vitawaw26@gmail.com", "phone": "+962775778892"}, "roadmap": [{"d": {"ar": "من جدول المكملات أو خطة العلاج اضغط «أضف إلى التقويم» فتُضاف مواعيد الجرعات إلى تقويم هاتفك وينبّهك في وقتها.", "en": "In the supplement schedule or the treatment plan, tap «Add to calendar» and the doses are added to your phone's calendar with an alert."}, "t": {"ar": "تذكير بمواعيد الجرعات", "en": "Dose reminders"}, "go": "sch", "ic": "bell", "st": "now"}, {"d": {"ar": "ترتيب أوقات أخذ المكملات معاً بحيث تُحترم فواصل التداخلات تلقائياً.", "en": "Arranges the times for all your supplements so interaction gaps are respected automatically."}, "t": {"ar": "جدول يومي ذكي للمكملات", "en": "Smart daily schedule"}, "go": "sch", "ic": "clock", "st": "now"}, {"d": {"ar": "احفظ نتائج تحاليلك وشاهد تحسّن المستوى على رسم بياني بين تحليل وآخر.", "en": "Save your test results and see your level improve on a chart from one test to the next."}, "t": {"ar": "سجل التحاليل ومتابعة التحسن", "en": "Lab history and progress"}, "go": "labs", "ic": "chart", "st": "now"}, {"d": {"ar": "نضيف فيتامينات ومعادن وتداخلات دوائية جديدة باستمرار، ويراجع صيدلي كل إضافة قبل نشرها.", "en": "We keep adding vitamins, minerals and drug interactions, and a pharmacist reviews every addition before it is published."}, "t": {"ar": "توسيع المحتوى باستمرار", "en": "Content keeps growing"}, "ic": "plus", "st": "dev"}, {"d": {"ar": "أدخل أدويتك الحالية فتظهر التداخلات التي تخصك فقط مع المكملات.", "en": "Enter the medicines you take and see only the interactions that apply to you."}, "t": {"ar": "فحص تداخلات أدويتك", "en": "Check your own medicines"}, "go": "meds", "ic": "pill", "st": "now"}, {"d": {"ar": "ملف مفصّل بالنتيجة والخطة والمصادر لطباعته أو إرساله للطبيب.", "en": "A detailed file with the result, plan and sources to print or send to your doctor."}, "t": {"ar": "تقرير PDF للطبيب", "en": "PDF report for your doctor"}, "go": "report", "ic": "share", "st": "now"}, {"d": {"ar": "جرعات مفصّلة حسب أسبوع الحمل وعمر الطفل ووزنه بإشراف مختصين.", "en": "Detailed doses by pregnancy week and by child age and weight, reviewed by specialists."}, "t": {"ar": "قسم خاص للحمل والأطفال", "en": "Pregnancy and children section"}, "go": "preg", "ic": "baby", "st": "now"}, {"d": {"ar": "صوّر علبة المكمل فيتعرّف التطبيق على التركيز ويحسب عدد الحبات مباشرة.", "en": "Photograph the supplement box and the app reads the strength and counts the tablets for you."}, "t": {"ar": "قراءة العبوة بالكاميرا", "en": "Scan the pack with your camera"}, "ic": "cam", "st": "idea"}], "nutOrder": ["d", "b12", "fol", "fe", "ca", "mg", "c", "vac", "zn", "preg", "inf", "omega3", "vita", "vite", "vitk", "b6", "b1", "b3", "iodine", "selenium", "copper", "manganese", "potassium", "b2", "choline", "b5", "chromium", "molybdenum", "biotin", "phosphorus"], "published_at": "2026-11-02T16:55:53.854502+00:00"}$vw$::jsonb, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();

-- ===================== content tables = exactly the published content above =====================
-- (the files above leave many items waiting for review; the test copy starts from what visitors see on the live site)
alter table public.sources disable trigger user;
alter table public.interactions disable trigger user;
alter table public.nutrients disable trigger user;
do $$
declare p jsonb := (select data from public.site_config where id = 'published');
begin
  delete from public.interactions;
  delete from public.sources;
  delete from public.nutrients where not builtin;
  insert into public.sources (id, org, title, url, use_ar, use_en, kind, reviewed, reviewed_at)
    select (r->>'id')::int, r->>'org', r->>'title', coalesce(r->>'url',''), coalesce(r->>'ar',''), coalesce(r->>'en',''), coalesce(r->>'kind',''),
           true, coalesce(nullif(r->>'sa',''), nullif(r->>'at',''), '2026-10-27')::timestamptz
      from jsonb_array_elements(p->'refs') r;
  update public.nutrients set hidden = (p #> '{nut,hide}') ? id, reviewed = true where builtin;
  insert into public.nutrients (id, builtin, hidden, sort, name_ar, name_en, hint_ar, hint_en, unit, dose_rows, plan_ar, plan_en, note_ar, note_en, source_ids, reviewed, reviewed_at)
    select r->>'id', false, false, (100 + o)::int, r#>>'{n,ar}', coalesce(r#>>'{n,en}',''), coalesce(r#>>'{h,ar}',''), coalesce(r#>>'{h,en}',''), r->>'uk',
           coalesce(r->'rows','[]'::jsonb), coalesce(r#>>'{plan,ar}',''), coalesce(r#>>'{plan,en}',''), coalesce(r#>>'{note,ar}',''), coalesce(r#>>'{note,en}',''),
           array(select jsonb_array_elements_text(r->'r'))::int[], true, coalesce(nullif(r->>'sa',''), '2026-10-27')::timestamptz
      from jsonb_array_elements(p #> '{nut,custom}') with ordinality as t(r, o);
  insert into public.interactions (nutrient_id, supp_ar, supp_en, with_ar, with_en, desc_ar, desc_en, severity, source_ids, gap, sort, reviewed, reviewed_at)
    select r->>'k', r#>>'{a,ar}', coalesce(r#>>'{a,en}',''), r#>>'{b,ar}', coalesce(r#>>'{b,en}',''), r#>>'{d,ar}', coalesce(r#>>'{d,en}',''),
           coalesce(r->>'sev','moderate'), array(select jsonb_array_elements_text(r->'r'))::int[], coalesce(r->'g','{}'::jsonb), (o * 10)::int,
           true, coalesce(nullif(r->>'sa',''), '2026-10-27')::timestamptz
      from jsonb_array_elements(p->'inter') with ordinality as t(r, o);
end $$;
alter table public.sources enable trigger user;
alter table public.interactions enable trigger user;
alter table public.nutrients enable trigger user;
select 'done' as vitawaw_test,
  (select count(*) from public.sources) as sources, (select count(*) from public.interactions) as interactions,
  (select count(*) from public.nutrients) as vitamins;
