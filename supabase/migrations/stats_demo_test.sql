-- VITAWAW 1.17.0 — DEMO visit numbers for the TEST project ONLY (vitawaw-test, qzxdvdesscsyqbaqyuqb). NEVER run it on the live project.
-- The owner asked: «الموقع التجريبي ضع له بيانات و الرئيسي بدون بيانات» (the test site is opened by fewer than 100 people).
-- Fills the last 90 days with a small, realistic pattern (0–6 people a day, mostly phones, mostly Iraq and Arabic) so the
-- dashboard has something to show. Demo visitors carry codes that start with 'de'. Run stats_1_17_0.sql first.
-- Safe to run again: it first removes the previous demo rows, and it refuses to run once real visits have been counted.
do $$
declare
  today date := (now() at time zone 'Asia/Baghdad')::date;
  d date; k int; i int; j int; r float8;
  dev text; lg text; c text; h int; v text;
  calcs text[] := array['d','d','d','fe','fe','b12','b12','fol','ca','mg','zn','c','preg','inf','vac','bar','thi'];
  tools text[] := array['ul','ul','sch','sch','labs','pill','d','ca','ml','u','gz'];
  secs  text[] := array['calc','calc','calc','tools','tools','interactions','interactions','sources','meds','roadmap'];
  pages text[] := array['about','privacy','who','disclaimer','faq','howto'];
  cs    text[] := array['IQ','IQ','IQ','IQ','IQ','IQ','IQ','IQ','IQ','IQ','IQ','IQ','JO','SA','AE','TR','DE','GB'];
begin
  if exists (select 1 from public.stat_people where vid not like 'de%') then
    raise exception 'real visits are already counted here — the demo numbers are only for the test project';
  end if;
  delete from public.stat_counts;            -- only demo rows can be here (checked above)
  delete from public.stat_people;
  perform setseed(0.17);
  for d in select g::date from generate_series(today - 89, today, interval '1 day') g loop
    k := floor(random() * 4)::int + case when d > today - 21 then 2 else 0 end + case when extract(isodow from d) in (5,6) then 0 else 1 end - 1;
    if d = today then k := least(k, 3); end if;
    for i in 1..greatest(k, 0) loop
      r := random(); dev := case when r < .66 then 'phone' when r < .82 then 'tablet' else 'pc' end;
      lg := case when random() < .82 then 'ar' else 'en' end;
      c := cs[1 + floor(random() * array_length(cs, 1))::int];
      h := case when d = today then floor(random() * greatest(1, extract(hour from (now() at time zone 'Asia/Baghdad'))::int + 1))::int
                else 8 + floor(random() * 16)::int end;
      v := 'de' || substr(md5(d::text || '-' || i), 1, 14);
      insert into public.stat_people (day, vid, device) values (d, v, dev) on conflict do nothing;
      for j in 1..(1 + floor(random() * 2.4)::int) loop
        insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n) values (d, least(h + j - 1, 23), 'open', '', dev, lg, c, 1)
          on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
      end loop;
      for j in 1..floor(random() * 4)::int loop
        insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n) values (d, h, 'calc', calcs[1 + floor(random() * array_length(calcs, 1))::int], dev, lg, c, 1)
          on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
      end loop;
      for j in 1..floor(random() * 2.5)::int loop
        insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n) values (d, h, 'tool', tools[1 + floor(random() * array_length(tools, 1))::int], dev, lg, c, 1)
          on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
      end loop;
      for j in 1..(1 + floor(random() * 3)::int) loop
        insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n) values (d, h, 'section', secs[1 + floor(random() * array_length(secs, 1))::int], dev, lg, c, 1)
          on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
      end loop;
      if random() < .35 then
        insert into public.stat_counts as s (day, hour, kind, item, device, lang, country, n) values (d, h, 'page', pages[1 + floor(random() * array_length(pages, 1))::int], dev, lg, c, 1)
          on conflict (day, hour, kind, item, device, lang, country) do update set n = s.n + 1;
      end if;
    end loop;
  end loop;
end $$;
