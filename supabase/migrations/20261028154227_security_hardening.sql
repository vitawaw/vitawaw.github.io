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
