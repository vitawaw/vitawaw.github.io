# Security model · نموذج الأمان

Last full review: 2026-10-28 (version 1.2.0).

## Who can do what

| Who | Can | Cannot |
|---|---|---|
| Visitor | Read the **published** snapshot (`site_config` row `published`). | Read drafts, unreviewed items, members or history; write anything. |
| Editor (invited) | Read and edit content and the draft. Every edit is marked *awaiting review*. | Approve, publish, delete permanently, manage members. |
| Owner (pharmacist) | Everything an editor can, plus approve and publish. | Delete permanently (soft delete only; history is kept). |

- **Sign-up is invite-only.** A database trigger rejects any e-mail that is not in `private.invites`.
- **Row level security** is on for every table. Table grants follow least privilege (migration `security_hardening`).
- **Only the public anon key** is in the page. The `service_role` key is never used by the site.
- **Visitor privacy:** calculator inputs (age, weight, lab values) never leave the browser. Fonts are self-hosted,
  so no request goes to Google. There are no analytics or trackers.

## Defences against injected code (XSS)

1. **Database:** CHECK constraints refuse `<` or `>` in any stored text, links must be `http(s)://`,
   ids must match `^[a-z0-9_]+$`, severity is one of `major / moderate / minor`.
2. **Page:** every piece of external data goes through `clean()` (`js/config.js`) and is escaped with `esc()`
   before it is placed in HTML.
3. **Browser:** a strict Content-Security-Policy (`_headers`) allows scripts only from this site and one pinned
   Supabase library version, and lets the page connect only to this site and the project's Supabase.

## HTTP security headers (`_headers`)

`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY` / `frame-ancestors 'none'` (no clickjacking), `Referrer-Policy`,
`Permissions-Policy` (camera, microphone, location off), `Cross-Origin-Opener-Policy`.

## Findings of the 2026-10-28 review

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Content saved in the database (nutrient names, source links, roadmap status, e-mail) could be rendered as HTML, so an editor account (or a stolen one) could inject a script that runs for visitors. | Medium | **Fixed** in 1.2.0 (3 layers above). Tested with malicious data. |
| 2 | Source links accepted `javascript:` URLs in the page. | Medium | **Fixed** (database check + page check). |
| 3 | Visitors and signed-in users had broad table privileges (e.g. TRUNCATE) that RLS does not cover; not reachable through the API but unnecessary. | Low | **Fixed**: least-privilege grants. |
| 4 | Old `publish_config()` (publishes without review) was still callable by signed-in users (owner check inside). | Low | **Fixed**: execute revoked. |
| 5 | No Content-Security-Policy or security headers. | Low | **Fixed**: `_headers`. |
| 6 | Google Fonts shared every visitor's IP address with Google. | Privacy | **Fixed**: self-hosted fonts. |
| 7 | Leaked-password protection (HaveIBeenPwned) is off in Supabase Auth. | Low | **Owner action**: Supabase dashboard → Authentication → Passwords (available on paid plans). |
| 8 | Owner account protected by password only. | Low | Recommended: enable MFA (planned). |

## Owner tools on the worker

`POST /api/check-links` verifies the Supabase session token, requires the `owner` or `editor` role, and only fetches
URLs already stored in the `sources` table (at most 15 per request), so it cannot be used as an open proxy.

## Reporting a problem

E-mail vitawaw26@gmail.com. Please do not publish details before a fix is released.
