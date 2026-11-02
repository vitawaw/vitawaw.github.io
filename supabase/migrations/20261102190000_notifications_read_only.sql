-- VITAWAW 1.12.1: a pharmacist may only mark his own notifications as read (before, he could change any field of them).
-- Run the whole file in the Supabase SQL editor (the button must say «Run», not «Run selected»).
-- Compatible with the live site: the page only ever updates the "read" column.
revoke update on public.notifications from authenticated, anon;
grant update (read) on public.notifications to authenticated;
