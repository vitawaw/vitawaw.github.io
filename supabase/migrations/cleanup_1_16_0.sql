-- VITAWAW 1.16.0 cleanup from the full review (owner: «نفذ الاقتراحات»). Safe to run twice; compatible with every live version.
-- 1. The first owner invite was never marked used (the account was made before invites were tracked). It is closed now,
--    only when that e-mail already has an account, so nobody else can ever sign up with it. The owner's access does not
--    depend on this row (roles come from the members table).
update private.invites i set revoked = true
 where i.role = 'owner' and i.used_at is null and not i.revoked
   and exists (select 1 from auth.users u where lower(u.email) = lower(i.email));
-- 2. The old publish function from 1.0 is not used by any version since publish_site() (it was already closed to everyone).
drop function if exists public.publish_config(text);
