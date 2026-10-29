# CLAUDE.md — handoff notes for Claude Code

Read this first. It explains how the owner works, the rules that must not be broken, where things are,
and where the project stands. Details: `README.md` (architecture, file map, tests), `SECURITY.md`, `CHANGELOG.md`.

## The owner
- **سيف الدين (Saifaldeen)**, pharmacist. VITAWAW is his **academic pharmacy project**; he will present and explain it in detail.
- Talk to him **in Arabic**, addressing him in the **masculine**. Keep replies short and clear; he is not a programmer.
- He wants: professional, simple, fast, secure, private. **Proposals before big changes** ("اعطني المقترحات قبل التنفيذ").
  For small fixes just do them.
- He judges by looking at the site on **phone, iPad and computer**. Always check all three sizes (Playwright screenshots).
- He rejected 1.5.0 completely because the layout felt messy ("خربطه"). Change the look **in small, reviewable steps**
  and keep the existing design and colours unless he asks otherwise.

## Release workflow (always)
1. Work on a branch `release/X.Y.Z` from `main`. Every push builds a Cloudflare **preview**:
   `https://release-X-Y-Z-billowing-glade-6627.vitawaw26.workers.dev` (dots → dashes). Production is untouched.
2. Before every push that changes `css/` or `js/`: `python3 tools/set_version.py X.Y.Z` (content-hashed asset URLs;
   without it browsers load stale scripts) and add a section to `CHANGELOG.md` (Arabic).
3. Run the tests (below), send him the preview link.
4. **Only when he says «جاهز» (or clearly approves publishing)**: merge into `main` and push → production
   `https://billowing-glade-6627.vitawaw26.workers.dev`.
- Commit messages end with the attribution lines the session asks for.

## Rules that must never be broken
- Never put the Supabase **service_role** key in the page or the repo. The page uses only the public anon key (`js/config.js`).
- Never ask for, print or handle his passwords. He creates passwords himself.
- Sign-up stays **invite-only** (`private.invites` + trigger). Only the owner invites.
- **Soft delete only** for content (the `deleted` / `hidden` flags; history in `config_history`).
- New or edited medical content by a pharmacist is `reviewed = false` and **never reaches visitors** until the owner approves
  and publishes (`publish_site()` copies only reviewed rows).
- Permissions are enforced **in the database** (RLS, `private.can_edit(kind)`, `save_content()` checks, `draft_guard` trigger),
  not only in the page. Any new editable feature needs the matching database rule.
- No `<` or `>` in stored text (CHECK constraints) and all external data goes through `clean()` then `esc()`.
- CSP in `_headers`: scripts only from this site + pinned `supabase-js@2.45.4` on jsDelivr. Don't add other script hosts.
- Medical numbers: every dose rule must cite a trusted source (`R([n])` in `js/calculators.js`); check
  `tests/medical_cases.py` after any change.

## Database (Supabase project `zrlapysswtqrwfsywbvl`, eu-central-1)
- Every change = a new file in `supabase/migrations/` named with the **version Supabase assigns** when applied
  (check with list_migrations, rename the file to match).
- Changes must stay **compatible with the version currently live** (production may be older than the branch).
- The free project pauses after 7 idle days; the worker's daily cron (`src/worker.js`) keeps it awake.
- Supabase security advisor warnings about `publish_site` / `team_*` being callable by signed-in users are expected:
  each checks the owner role inside.

## Where things are (no build step; plain scripts loaded in order by `index.html`)
- Menus (1.6.3, like Facebook — he chose this): `js/nav.js`. Phones/tablets (<1024px): tab bar at the bottom (`nav.tabs`:
  calc, tools, interactions, sources + ☰ `#t-menu`); ☰ opens the page `#menu` (PAGES includes 'menu'): account card,
  management, shortcut tiles, settings, log out. Wide screens (≥1024px): the same menu as a fixed side menu `#side`
  with the five sections on top; tab bar hidden. Both are drawn by `menuHTML(r)` ('m' page, 'd' side) via `renderMenu()`;
  `adminGroups()` = management part. «More» and the ☰ drawer of 1.6.0 no longer exist. `openSheet()` = floating window;
  info pages = `CFG.pages` (defaults in `js/config.js`).
- Pharmacist accounts: `js/team.js` (owner only) + migration `*_pharmacist_accounts.sql`.
- Owner/pharmacist editing, save, publish, login: `js/owner.js`. `CAN(kind)` / `ISOWNER()` in `nav.js`.
- Texts: `js/i18n.js` (`key:['عربي','English']`). Every visible text must exist in **both** languages.

## Tests (run before every preview)
```
python3 tests/owner_flow.py      # owner / visitor / pharmacist flows (fake Supabase: tests/fake_supabase.js)
python3 tests/menu_flow.py       # menus, floating windows, info pages, pharmacist accounts, 3 screen sizes → tests/shots/
python3 tests/medical_cases.py   # dose results against expected values
python3 tests/i18n_audit.py en   # and `ar`: nothing left in the other language (slow, ~5 min each)
python3 tests/check_assets.py    # asset hashes match (forgot set_version.py?)
node tests/worker_test.mjs       # edge worker
```
Gotcha: CSS class names are global; `details.more` already exists (that's why the ⋯ panel is `.mpanel`). Search before naming.

## Where we are (2026-10-29)
- **Live: 1.6.6** (he said «تم و جاهز» on 2026-10-29; includes 1.6.5). 1.6.6: he approved all 10 review proposals («كلها»): 44px touch targets, larger small text,
  patient mode hides pills/IV-iron tools, inline dialog errors (`dialog({err:{i,msg}})`) + sticky actions, red destructive
  buttons (`danger`), publish summary (`pubSummary()`), phone owner bar (short status, discard first), calm edit mode
  (`#o-texts` toggles body.textedit), invite key (`#join=email&k=key`, checked by guard_signup), pharmacists' texts/pages
  wait under draft.team (owner decides in 🔔, `decideTexts()`). Migration `20261029162711_invite_key_and_text_review.sql` is applied (checked).
- **1.6.5** (live with 1.6.6): fixes from a 4-agent full review (frontend, speed/worker, DB, UX). DB part =
  `20261029160710_review_hardening.sql` (applied by him, checked).
  UX proposals from that review were sent to him and wait for his choice (touch targets 44px, inline dialog errors, red
  destructive buttons, publish summary, phone owner bar status, calmer edit mode…).
- 1.6.4 (published before 1.6.5/1.6.6; main fast-forwarded from branch `ccr-cad26eca-o7h5hm`). Contents: 1.6.4 = 🔔 notifications page (`#notif`, `renderNotif()`/`decide()` in
  owner.js; owner approves/rejects there via `review_change`, pharmacists see decisions from table `notifications`) and one
  publishing bar (`#obar`: preview · save · publish · discard), removed from the menu. Migration `20261029133847_notifications.sql`
  **is applied** (he ran it in the SQL editor; checked: table + RLS, names in get_content, review_change notifies). 1.6.3 = Facebook-style menus he approved, on top of 1.6.2: he asked to redesign the interface and menus to be easy and like other
  apps, and to fix everything without asking him back. Includes 1.6.1:, from his request for a full review: a pharmacist's edit or deletion of
  approved content waits for the owner (approved version kept in column `pub`, `get_content()` returns `pv` / `del`,
  owner decides with `review_change()`; window «تعديلات وحذف من الصيادلة»), publish uses approved versions only,
  SRI on supabase-js. The migration `20261029121426_pending_review_versions.sql` **is applied** (he ran it in the Supabase
  SQL editor on 2026-10-29 because the MCP approval prompt never reached his tablet; it is not in list_migrations).
  Checked: publishing now gives exactly the live content (35 sources / 20 interactions / 2 custom vitamins).
- Supabase MCP write tools (apply_migration, write execute_sql) need an approval that does not show on his tablet app.
  If a DB change is needed again, give him the raw GitHub link + the SQL editor link (…/project/zrlapysswtqrwfsywbvl/sql/new)
  and tell him to make sure the button says «Run», not «Run selected».
- He clarified: the pharmacists he invites are limited assistants to the owner (not the pharmacists who visit the site).
- Before that, live was 1.6.0 (☰ / ⋯ menus, info pages, pharmacist accounts, 1.3.0 medical fixes).
- Old branches `release/1.4.0` (1.4.1) and `release/1.5.0` were **not** published. 1.5.0 was rejected; don't reuse it.
  1.4.x ideas not yet in 1.6.0: changing the app name/logo from the owner panel, an owner-chosen source type,
  the medical review stamp, and a link checker on the worker. Bring any of them back only if he asks, re-done in the 1.6.0 style.
- Next session: ask what he wants next (his remaining feedback, the ~60 items in 🔔, or the academic material).
- About 60 content items wait for his review in the owner view (vitamins, interactions, sources).

## Backlog he mentioned (not started)
- Academic material for the presentation: validation document, algorithm flowcharts, academic write-up, slide deck.
  Ask first: university, college, project title, names, template.
- Optional: an AI translate button (Arabic ↔ English) in edit dialogs (offered, not approved); MFA for the owner;
  leaked-password protection (Supabase dashboard, paid plan).
