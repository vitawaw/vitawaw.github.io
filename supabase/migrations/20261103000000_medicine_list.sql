-- VITAWAW 1.13.0: the list of medicines on «My medicines» (names the site recognizes) is editable by the team.
-- The owner edits it in the draft like any setting (published with «Publish»).
-- An invited pharmacist with the «interactions» permission may PROPOSE changes: they wait under draft.team.medcat
-- and the owner approves or rejects them in 🔔. Texts and info pages stay the owner's alone (as since 1.12.0).
-- Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site: older pages never send "medcat", and pharmacists could not write the draft before.

-- 1. who may write the draft: the owner, or a pharmacist who edits interactions (his write is reduced by the guard below)
alter policy "team inserts draft" on public.site_config with check (id = 'draft' and (private.can_edit('text') or private.can_edit('inter')));
alter policy "team updates draft" on public.site_config using (id = 'draft' and (private.can_edit('text') or private.can_edit('inter'))) with check (id = 'draft');

-- 2. the guard: same as before for the owner; a pharmacist's write keeps everything as the owner left it and only adds his proposal
create or replace function private.draft_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare base jsonb; m jsonb;
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
  -- a pharmacist: only the medicine list, and only with the «interactions» permission
  m := case when private.can_edit('inter') then new.data -> 'medcat' else null end;
  new.data := base;  -- everything else stays as the owner left it
  if m is not null and jsonb_typeof(m) = 'array' and m is distinct from coalesce(base #> '{team,medcat}', base -> 'medcat') then
    new.data := base || jsonb_build_object('team', coalesce(base -> 'team', '{}'::jsonb) || jsonb_build_object('medcat', m, 'by', auth.uid(), 'at', now()));
  end if;
  return new;
end $$;
