-- VITAWAW 1.17.1 visit counting: daily limits (full review, 2026-11-05).
-- log_hits() can also be called straight from the public Supabase address, bypassing the site's worker, so someone could
-- send made-up visits to fill the free database. Now:
--   * at most 2000 people and 2000 count rows a day (a new row beyond that is ignored; existing rows still count up),
--   * counts older than 400 days are removed too (people already were),
--   * an item name is at most 24 characters (the site's own names are shorter).
-- Real use is far below these limits (the site expects a few hundred people a day). Safe to run twice. Run on BOTH projects.
create or replace function public.log_hits(p jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'Asia/Baghdad')::date;
  h smallint := extract(hour from (now() at time zone 'Asia/Baghdad'))::smallint;
  dev text := p->>'device'; lg text := p->>'lang'; c text := coalesce(p->>'country', ''); v text := p->>'vid'; e jsonb;
  k text; it text; full_rows boolean;
begin
  if jsonb_typeof(p) is distinct from 'object' or dev not in ('phone','tablet','pc') or lg not in ('ar','en')
     or c !~ '^[A-Z]{0,2}$' or v !~ '^[0-9a-f]{16}$' or jsonb_typeof(p->'e') is distinct from 'array' then return; end if;
  if (select count(*) from public.stat_people s where s.day = d) < 2000 then
    insert into public.stat_people (day, vid, device) values (d, v, dev) on conflict do nothing;
  end if;
  full_rows := (select count(*) from public.stat_counts s where s.day = d) >= 2000;
  for e in select value from jsonb_array_elements(p->'e') limit 40 loop
    k := e->>0; it := coalesce(e->>1, '');
    if jsonb_typeof(e) = 'array' and k in ('open','calc','tool','section','page') and it ~ '^[a-z0-9_:-]{0,24}$' then
      if full_rows then
        update public.stat_counts s set n = s.n + 1
         where s.day = d and s.hour = h and s.kind = k and s.item = it and s.device = dev and s.lang = lg and s.country = c;
      else
        insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n)
        values (d, h, k, it, dev, lg, c, 1)
        on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
      end if;
    end if;
  end loop;
  if h = 3 then   -- once a day is enough: keep about a year
    delete from public.stat_people where day < d - 400;
    delete from public.stat_counts where day < d - 400;
  end if;
end $$;
revoke all on function public.log_hits(jsonb) from public;
grant execute on function public.log_hits(jsonb) to anon, authenticated;
