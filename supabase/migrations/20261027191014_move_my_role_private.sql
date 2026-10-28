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
