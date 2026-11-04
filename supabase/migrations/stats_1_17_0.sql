-- VITAWAW 1.17.0 visit statistics (owner: «اريد داشبورد ... فيها كل شيء للزيارات و كم شخص استخدم الموقع»).
-- Anonymous by design: no name, no e-mail, no IP address, no cookie and no stored identifier.
--   * stat_counts: how many times something happened, per hour (page opened, calculator used, tool opened, section, info page),
--     with only the device type (phone / tablet / computer), the language and the country code.
--   * stat_people: one row per visitor per day, keyed by a 16-character hash the edge worker makes from (day + IP + browser + salt);
--     the hash changes every day, so a person can never be followed from one day to the next. Rows older than 400 days are dropped.
-- Writing: only through public.log_hits(), which the site's worker calls (it checks every value). Reading: only the owner, through
-- public.site_stats(). Visitors and invited pharmacists cannot read anything. Safe to run twice; nothing live depends on it.
-- Run it on BOTH projects (test first). The test project also gets demo numbers from stats_demo_test.sql (never the live one).

create table if not exists public.stat_counts (
  day     date     not null,
  hour    smallint not null check (hour between 0 and 23),
  kind    text     not null check (kind in ('open','calc','tool','section','page')),
  item    text     not null default '' check (item ~ '^[a-z0-9_:-]{0,40}$'),
  device  text     not null check (device in ('phone','tablet','pc')),
  lang    text     not null check (lang in ('ar','en')),
  country text     not null default '' check (country ~ '^[A-Z]{0,2}$'),
  n       integer  not null default 0 check (n >= 0),
  primary key (day, hour, kind, item, device, lang, country)
);
create table if not exists public.stat_people (
  day     date not null,
  vid     text not null check (vid ~ '^[0-9a-f]{16}$'),
  device  text not null check (device in ('phone','tablet','pc')),
  primary key (day, vid)
);
alter table public.stat_counts enable row level security;
alter table public.stat_people enable row level security;
revoke all on public.stat_counts from public, anon, authenticated;
revoke all on public.stat_people from public, anon, authenticated;
-- no policies at all: nobody reads or writes the tables directly; the two functions below are the only doors

-- the worker's call: {vid, device, lang, country, e:[[kind,item],…]} — at most 40 events per call
create or replace function public.log_hits(p jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'Asia/Baghdad')::date;
  h smallint := extract(hour from (now() at time zone 'Asia/Baghdad'))::smallint;
  dev text := p->>'device'; lg text := p->>'lang'; c text := coalesce(p->>'country', ''); v text := p->>'vid'; e jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' or dev not in ('phone','tablet','pc') or lg not in ('ar','en')
     or c !~ '^[A-Z]{0,2}$' or v !~ '^[0-9a-f]{16}$' or jsonb_typeof(p->'e') is distinct from 'array' then return; end if;
  insert into public.stat_people (day, vid, device) values (d, v, dev) on conflict do nothing;
  for e in select value from jsonb_array_elements(p->'e') limit 40 loop
    if jsonb_typeof(e) = 'array' and (e->>0) in ('open','calc','tool','section','page') and coalesce(e->>1, '') ~ '^[a-z0-9_:-]{0,40}$' then
      insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n)
      values (d, h, e->>0, coalesce(e->>1, ''), dev, lg, c, 1)
      on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
    end if;
  end loop;
  delete from public.stat_people where day < d - 400;   -- keep about a year
end $$;
revoke all on function public.log_hits(jsonb) from public;
grant execute on function public.log_hits(jsonb) to anon, authenticated;

-- the owner's dashboard: everything for the last p_days days (1–365) and the same totals for the period before, to compare
create or replace function public.site_stats(p_days integer) returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
declare
  n int := greatest(1, least(coalesce(p_days, 7), 365));
  today date := (now() at time zone 'Asia/Baghdad')::date;
  d0 date := today - (n - 1); p0 date := d0 - n;
begin
  if (select private.my_role()) is distinct from 'owner' then raise exception 'owner only'; end if;
  return jsonb_build_object(
    'days', n, 'from', d0, 'to', today,
    'opens',    (select coalesce(sum(s.n), 0) from public.stat_counts s where s.kind = 'open' and s.day >= d0),
    'people',   (select count(*) from public.stat_people p where p.day >= d0),
    'calcs',    (select coalesce(sum(s.n), 0) from public.stat_counts s where s.kind = 'calc' and s.day >= d0),
    'tools',    (select coalesce(sum(s.n), 0) from public.stat_counts s where s.kind = 'tool' and s.day >= d0),
    'prev', jsonb_build_object(
      'opens',  (select coalesce(sum(s.n), 0) from public.stat_counts s where s.kind = 'open' and s.day >= p0 and s.day < d0),
      'people', (select count(*) from public.stat_people p where p.day >= p0 and p.day < d0),
      'calcs',  (select coalesce(sum(s.n), 0) from public.stat_counts s where s.kind = 'calc' and s.day >= p0 and s.day < d0),
      'tools',  (select coalesce(sum(s.n), 0) from public.stat_counts s where s.kind = 'tool' and s.day >= p0 and s.day < d0)),
    -- over time: by hour for one day, by day otherwise
    'series', case when n = 1 then
        (select coalesce(jsonb_agg(jsonb_build_array(x.h, x.v) order by x.h), '[]'::jsonb) from
          (select g.h, coalesce((select sum(s.n) from public.stat_counts s where s.kind = 'open' and s.day = today and s.hour = g.h), 0) v
             from generate_series(0, 23) g(h)) x)
      else
        (select coalesce(jsonb_agg(jsonb_build_array(x.d, x.v, x.p) order by x.d), '[]'::jsonb) from
          (select g.d::date d,
                  coalesce((select sum(s.n) from public.stat_counts s where s.kind = 'open' and s.day = g.d::date), 0) v,
                  (select count(*) from public.stat_people p where p.day = g.d::date) p
             from generate_series(d0, today, interval '1 day') g(d)) x) end,
    'top', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
        select t.kind k, jsonb_agg(jsonb_build_array(t.item, t.v) order by t.v desc) v from (
          select s.kind, s.item, sum(s.n) v, row_number() over (partition by s.kind order by sum(s.n) desc) r
            from public.stat_counts s where s.day >= d0 and s.kind in ('calc','tool','section','page') group by s.kind, s.item) t
        where t.r <= 12 group by t.kind) q),
    'device',  (select coalesce(jsonb_object_agg(x.k, x.v), '{}'::jsonb) from (select p.device k, count(*) v from public.stat_people p where p.day >= d0 group by p.device) x),
    'lang',    (select coalesce(jsonb_object_agg(x.k, x.v), '{}'::jsonb) from (select s.lang k, sum(s.n) v from public.stat_counts s where s.kind = 'open' and s.day >= d0 group by s.lang) x),
    'country', (select coalesce(jsonb_agg(jsonb_build_array(x.k, x.v) order by x.v desc), '[]'::jsonb) from
                 (select s.country k, sum(s.n) v from public.stat_counts s where s.kind = 'open' and s.day >= d0 and s.country <> '' group by s.country order by 2 desc limit 8) x)
  );
end $$;
revoke all on function public.site_stats(integer) from public, anon;
grant execute on function public.site_stats(integer) to authenticated;
