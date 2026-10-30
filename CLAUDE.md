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
python3 tests/tools_flow.py      # tool formulas + calculator → tools links
python3 tests/i18n_audit.py en   # and `ar`: nothing left in the other language (slow, ~5 min each)
python3 tests/check_assets.py    # asset hashes match (forgot set_version.py?)
node tests/worker_test.mjs       # edge worker
node tests/worker_links_test.mjs # link check
```
Gotcha: CSS class names are global; `details.more` already exists (that's why the ⋯ panel is `.mpanel`). Search before naming.

## Where we are (2026-10-30)
- **1.12.0** (preview, waiting for «جاهز»): menus step 1 + his request. Main pages are `NAVIDS` in nav.js: calc, interactions, tools,
  notif, sources, roadmap, sched, labs, ul (sched/labs/ul = own pages `.tpage`, sections tool-sch/tool-labs/tool-ul moved out of tools;
  `openTool('sch'|'labs'|'ul')` goes to the page). `CFG.nav={order,bar,hide}` (config.js default, owner only, published with settings):
  `NAV()` normalises it, `renderTabs()` orders the bar (class `offbar` = in ☰ on phones), `navHidden()`; owner manager `openNavManager()`
  (Menu → Management → «القوائم»: drag, in bar ≤4, hide, `editNavText()` name/title/description = CFG.text keys in EDITABLE, colors).
  He chose: bar = الحاسبة · التداخلات · الأدوات · 🔔 + ☰; «أدويتي» stays in interactions. 🔔 for everyone: `pubItems()` in owner.js
  (lab result ≥90 days old, saved schedule `vw-sch`, roadmap «now» items; seen keys in localStorage `vw-seen`), visitor part in `#notif-p`;
  team badge counts team work only. Header (<1024px, he asked): 🔍 `#hsearch` right of the name, 🔔 `#hnotif` (+ `#hnt-count`) left of it (mirrored in English). Result buttons: main + «المزيد ⋯» (`details.rmore`).
  Wide screens keep the side menu (no top icons). Next: step 2 (1.13.0, placements/refinement) — ask him first.
- **Live: 1.11.1** (he said «جاهز» on 2026-10-30; includes 1.11.0; DB file `20261030140000_versions_and_pages.sql` applied and checked): full wording review (he chose «الصيدلي» everywhere and American English); glossary: المقدار اليومي الموصى به (RDA),
  المدخول الكافي (AI), الحد الأعلى الآمن (UL), جرعة المداومة, طبيب النسائية والتوليد. Keep these terms in new texts.
- **1.11.0** (live with 1.11.1): roadmap status `now` + `go` (GO map in lists.js, owner picks in editFeature); calendar .ics
  (`icsFile()/icsDownload()/schCalendar()` in tools.js, `r.cal` in calculators); lab history `#tool-labs` (`LABT`, `LABS` in
  localStorage vw-labs, `labChart()`), `r.lab`; doctor report `openReport()/repHTML()` in render.js (+ print CSS, `#rep`);
  one search `openSearch()/gsResults()` in nav.js (button at the top of the menu); share link `shareLink()/loadShared()` in ui.js
  (`#c=` base64url, `FORMIDS`); previous versions `openVersions()/restoreVersion()` in owner.js + RPC `restore_version` in
  `20261030140000_versions_and_pages.sql` (also adds pages faq/method and roadmap statuses to the draft; he runs it, then publishes).
  Speed: `tools/prefill_i18n.py` (run by set_version.py) writes Arabic texts into index.html; `js/pre.js` (not deferred) decides the
  welcome card/theme/dir before paint. Lighthouse mobile 100/100/96/100 (96 = local /api/content 404 only).
  Next: menu redesign like Facebook in two steps (1.12.0 menus + 🔔 for everyone + search in the header + tools grid; 1.13.0 placements).
- 2026-10-30: he approved all waiting items and published (checked: 0 pending; live content 62 sources, 61 interactions, 15 with timing).
  Next: ask what he wants next (validation document reminder is due today ~21:00 UTC; optional local product presets for the syrup tool).
- 1.10.0 (he said «جاهز» on 2026-10-30; includes 1.9.0; DB file applied and checked: same DB file `20261030000000_interaction_timing.sql`, which now also adds
  `at` (reviewed date) to sources and sources 61–62 KDIGO). Sources page `usedIn()` + `ISRC` filter in lists.js; `srcLine()` in render.js
  (copy + patient card); link check: worker `/api/links?ids=` (≤25, only published URLs, cached 1 day) + `linksHTML()/linksCheck()`
  in owner.js (🔔, weekly, kept in localStorage vw-links); one kidney option `#ckd` → `CKD()` in calculators.js (replaced ren/mgren).
  Secondary sources replaced (he chose option A: adult ferritin below 45, BSG 2021): new 63–68, old 1, 6, 7, 9, 10, 12 hidden by the
  same DB file (pending in 🔔). `ferCut()`/`ferLow()` in calculators.js. 44 medical cases.
- **1.9.0** (live with 1.10.0): interactions integration. `interactions.gap` jsonb {d: schedule item, b, a hours} — migration
  `20261030000000_interaction_timing.sql` (he runs it; also content: sources 60, Dolutegravir, Mg–levothyroxine, timings).
  Client: INTER[i][9] = timing; `schRules()` in tools.js (interaction timing beats `SCDEF`); `interHTML()` in render.js (result shows
  the supplement's interactions, `IKEYS` for preg/inf/vac); `icActs()`/`schPair()`/«أدويتي» (`MEDS`, `MEDSCH`, localStorage vw-meds) in lists.js;
  owner dialog editInter has the timing fields. Compatible with the live DB before the migration (save_content ignores "g").
- 1.8.0. The content file `content_review_vitamins.sql` was run (2026-10-29); its 35 items wait in 🔔 for approval.
- **Live: 1.8.0** (he said «جاهز» on 2026-10-29; includes 1.7.0 and 1.6.9; main fast-forwarded from this branch): his 12 tool proposals. tools.js: `SALTS` (tablet counter, salts
  per element), `ferTable()` (Ferinject SmPC table, source 59), `mlc()` syrup/drops tool `#tool-ml`, daily schedule `#tool-sch`
  (`SCI` items, `SCGAP` minimum gaps, `schSolve()` search). Results open tools filled: render.js reads `r.ml`, `r.sch`, `r.ca`,
  `r.units`, `r.ul` (button labels `tb_*`). render() keeps #res when the HTML is unchanged (first tap after typing was lost).
  Test: `python3 tests/tools_flow.py`.
- **1.7.0** (live with 1.8.0): his 9 approved scientific proposals. Iron Hb + ferritin (`hbCut()` WHO 2024,
  `ferCut()` AAP/WHO), Active B12 (NICE), Mg children by weight (RCH, source 58), new built-in calculators `preg` (fPreg), `inf` (fInf),
  `vac` (fVA, WHO vitamin A) in BUILTIN; tools `#tool-ul` (UL checker, `ULT` in tools.js) and `#tool-u` (unit converter, `UCV`);
  review stamp `CFG.review` (owner: menu → site → ختم المراجعة الطبية; default his name + 2026-10-29). Fields shown per calculator by
  `showFor()` (data-for / data-not). Sources 51–58 are in DEF_REFS and in `content_review_vitamins.sql` (run by him).
- **1.6.9** (preview, under 1.7.0): scientific review of all vitamin content (he approved all fixes). Code: vitamin D adult
  from 19 (ES 2011 children 1–18), infant weekly option; DEF_REFS 14/27 URLs. Content: `content_review_vitamins.sql` (he runs
  it): Ca–quinolone timing fix (2 h before / 6 h after, FDA Cipro label = source 45), 12 new interactions, B5/chromium/
  manganese/molybdenum/phosphorus (NIH, sources 46–50), sources 14/27 updated. All of it lands as waiting items in 🔔.
  NIH/NICE/Medscape block automated fetching from this environment: values were checked against the reference DRIs and
  sensitive points by web search; suggest he spot-checks a few.
- 1.6.8 (he said «جاهز» on 2026-10-29; includes 1.6.7). 1.6.8: owner edits a pharmacist's name + permissions (`teamEdit()`, RPC
  `team_rename` added to `texts_fix_and_two_step.sql`), roadmap ↑↓ removed, interactions draggable inside a severity group,
  two round footer logos (`CFG.brand` {l1,l2,url}: owner uploads, `shrinkImage()` → 160px data URL, clean() validates;
  `renderBrand()` in lists.js), tool fields aligned. Footer text: he set «Powered by Saifaldeen» himself (draft text `by`).
- **1.6.7** (live with 1.6.8): his notes after 1.6.6 — session resumes after refresh (`resumeSession()` in boot),
  draft_guard upsert double-pass bug fixed (pharmacist texts were lost), account & security sheet (`openAccount()`:
  password with current-password check, TOTP two-step with QR via supabase auth.mfa, sign out other devices; DB enforces
  aal2 through `private.mfa_ok()` in my_role/can_edit), drag-to-reorder (`sortable()` in util.js: vitamins → CFG.nutOrder
  published with settings, info pages, roadmap), label الصيدلاني, small logo in footer. Migration `20261029203200_texts_fix_and_two_step.sql`
  is applied (checked: draft_guard fix, mfa_ok in my_role/can_edit, team_rename).
- 1.6.6 (published 2026-10-29; includes 1.6.5). 1.6.6: he approved all 10 review proposals («كلها»): 44px touch targets, larger small text,
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
  He asked to be reminded about the validation document (reminder set for 2026-10-30 ~21:00 UTC, scheduled task «تذكير: وثيقة التحقق»).
  Ask first: university, college, project title, names, template.
- Optional: an AI translate button (Arabic ↔ English) in edit dialogs (offered, not approved); MFA for the owner;
  leaked-password protection (Supabase dashboard, paid plan).
