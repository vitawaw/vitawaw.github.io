-- VITAWAW 1.14.0 (owner: «نفذها كلها بالتسلسل»): two texts the owner typed are corrected in his DRAFT (he sees them, then publishes).
--  * the welcome title used the Arabic spelling of the name; everywhere else it is VITAWAW
--  * the menu group «مشاركه و تحميل التطبيق» → «مشاركة وتثبيت التطبيق» (ة, no space after و, and the button says «تثبيت»)
-- Safe to run twice; changes nothing if he already changed these texts himself.
do $$
begin
  if not exists (select 1 from public.site_config where id = 'draft') then
    insert into public.site_config (id, data, updated_at) select 'draft', data, now() from public.site_config where id = 'published';
  end if;
  update public.site_config set data = jsonb_set(data, '{text,w_t}', '{"ar":"أهلاً بك في VITAWAW","en":"Welcome to VITAWAW"}'::jsonb), updated_at = now()
   where id = 'draft' and data #>> '{text,w_t,ar}' = 'أهلاً بك في فيتاواو';
  update public.site_config set data = jsonb_set(data, '{menus,groups,names,apps}', '{"ar":"مشاركة وتثبيت التطبيق","en":"Share and install the app"}'::jsonb), updated_at = now()
   where id = 'draft' and data #>> '{menus,groups,names,apps,ar}' = 'مشاركه و تحميل التطبيق';
end $$;
