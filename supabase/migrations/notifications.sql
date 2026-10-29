-- VITAWAW 1.6.4: notifications.
-- The owner sees which pharmacist made each waiting change ("by" in get_content), and a pharmacist receives a
-- notification when the owner approves or rejects their change (review_change writes it).
-- Compatible with 1.6.0–1.6.3: get_content() only gains a "by" key; review_change() keeps its arguments.

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
