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
python3 tests/owner_panel.py     # 1.16.0 owner panel: edit mode, appearance, page editor, 3 sizes, undo, publish list, follow-up tools
python3 tests/stats_flow.py      # 1.17.0 visit counting + owner dashboard, 3 sizes
python3 tests/menu_flow.py       # menus, floating windows, info pages, pharmacist accounts, 3 screen sizes → tests/shots/
python3 tests/medical_cases.py   # dose results against expected values
python3 tests/tools_flow.py      # tool formulas + calculator → tools links
python3 tests/i18n_audit.py en   # and `ar`: nothing left in the other language (slow, ~5 min each)
python3 tests/check_assets.py    # asset hashes match (forgot set_version.py?)
node tests/worker_test.mjs       # edge worker
node tests/worker_links_test.mjs # link check
```
Gotcha: CSS class names are global; `details.more` already exists (that's why the ⋯ panel is `.mpanel`). Search before naming.

## Where we are (2026-11-03)
- 2026-11-03 final review: CLAUDE.md was served publicly (not in .assetsignore) → added (Live: 1.14.3, he said «جاهز» 2026-11-03). Live crawl 8 runs (3 sizes × pro/pt, ar+en on phone): 0 errors, 32 calculators all give results; links 60 ok + 12 blocked (403 publishers), 0 broken.
- 2026-11-03 review + load test (report sent to him): live DB healthy (13 MB, RLS on all 7 public tables, anon = read published row only,
  no anon writes/RPC, definer functions all check owner + fixed search_path; advisor = expected definer warnings, leaked-password (paid),
  1 unused index). Owner has NO MFA factor yet. Load test on the PREVIEW (node fetch, 3200 requests, up to 200 concurrent): 0 errors,
  ~400 req/s (client-bound), p95 1.8 s at 200 conc. Limit = Workers free 100k requests/day (/api/content ≈ 1 per page open; static
  assets free); page falls back to Supabase direct. /api/content 29 KB compressed, css+js 183 KB. Live writes from bash are blocked.
- **1.17.0 (preview)**: his «اريد داشبورد … للزيارات و كم شخص استخدم الموقع» → proposal 1 (anonymous own counting). Client
  `js/stats.js`: `statHit(kind,item)` queue (open at boot, section/tool in show(), calc in render() once per visit per K, page in
  openPage) → `statFlush()` sendBeacon `/api/hit` on hidden/pagehide/30 events; off for OWN.on, FRAME, webdriver/localhost
  (tests set `__STATS_TEST`), GPC/DNT. Worker `hit()`: robots skipped, Origin check, ≤4 KB, device (page hint `dv` or UA),
  cf.country, vid = sha256(Baghdad day|IP|UA|STATS_SALT or anon key)[0:16] → RPC `log_hits`. DB `stats_1_17_0.sql`: tables
  stat_counts (per hour) / stat_people (per day, 400 days), RLS no policies, `log_hits` (anon) + `site_stats(p_days)` (owner
  only). Page `#stats` (PAGES, owner only in show()), TEAMX tile 'stats' (menu + follow-up), `openStats()/drawStats()`, SVG chart
  `stChart()`, `.st*` CSS. Test site: «جرّب مثالاً» [data-stex] / «مسح البيانات» [data-stclr] on the dashboard (body.demo only) → `STEX` + `stDemo(k)`
  = sample numbers made in the page (nothing written). Demo data `stats_demo_test.sql` (TEST only, optional; refuses when real visits exist; demo vids start 'de').
  Privacy page «عدّ الزيارات بلا هوية» in DEFAULT_CFG + draft file `content_1_17_0.sql` (both projects). Test `tests/stats_flow.py`
  (in CI). The 3 SQL files are NOT applied anywhere yet (MCP approval timed out on TEST too) → he runs them.
- **Live: 1.16.4** (he said «انشر» on 2026-11-04; main fast-forwarded; checked online: live = no example buttons, empty fields; test = examples).
- **1.16.4**: install bar «ثبّت تطبيق VITAWAW الآن»; `toolActs()` (tools.js, boot) puts `.tact` under each tool's fields =
  «جرّب مثالاً» ([data-tex], test site only) + «مسح البيانات» ([data-tclr], `TOOLCLR`); NO pre-filled numbers on either site (boot no
  longer fills); labs example saves 2 results; `#schk.sch{display:block}` fixed the schedule groups sitting side by side on wide screens.
  check_assets.py also fails if index.html tool inputs carry value=. tools_flow 104.
- **1.16.3**: examples ONLY on the test site: body.demo when IS_PREVIEW (boot.js) → calc #example / [data-ex] / tool `.tex`
  buttons (CSS hides them otherwise); `TOOLEX` + `toolExamples()` (tools.js) for the 9 tools; on the test site boot pre-fills the tools;
  the live index.html tool inputs have no value= any more (conv/cca/gz show «—» when empty). UL reviewed vs NIH (all values match);
  `ULSUP` e/b3/fol/mg = supplements only, others food + supplements (`.ulsc` tag + row note). tools_flow 103.
- **1.16.2**: his 5 notes: «3 أحجام» title row + sizes row (`.sztop`/`.szsizes`); `TEAMX()` (nav.js) = team pages (log, links)
  shared by menu G.short and follow-up «+ إضافة» ('x:<key>', mergeCfg allows); UL per day/week (`#ulper`, ÷7) + «ما هو الحد الأعلى؟»
  box, tl_t «…الحد الأعلى اليومي؟»; install bar `installBar()` (ui.js) hidden when standalone / appinstalled (vw-installed) / × this
  visit (sessionStorage vw-instx) / frame. tools_flow 101.
- **Live: 1.16.1** (he said «انشر على الموقع الاصلي» on 2026-11-04; main fast-forwarded). content_1_16_1.sql is in the LIVE draft
  (checked); the live PUBLISHED pages were still the old ones at release → he must log in on the live site and press «نشر».
- **1.16.1**: medicine ✎ in edit mode (o-texts also calls renderMedCat); tools items editable by the owner via
  CFG.tools.items {'sch:<id>'|'ul:<id>'|'lab:<id>': {n,h,off}} (`TI()`, `tiTx()`, `tiPen()`, `editToolItem()` in tools.js; mergeCfg
  validates); schedule grouped (SCSUP supplements / medicines, `.scg` cards), new SCI cef/mmf/pen + SCDEF label gaps (80/81/83/25),
  MEDSCH words, «أضف أدوية المريض» `#scmine` ticks MEDS; UL vitamin A note on retinoids. tools_flow 100.
  The 8 help pages rewritten (texts in DEFAULT_CFG for about/who/privacy/disclaimer + DRAFT file `content_1_16_1.sql`, tested
  locally: replaces t/b by id, keeps order/hidden/other pages, appends missing, twice-safe). `paras()` wraps every «## heading» and
  what follows in `section.pgc` (card).
- 2026-11-04 general review after 1.16.0: he approved + published (0 waiting, 79 sources / 81 interactions live, activity log 18 lines).
  Live crawl phone ar/en, iPad, PC: 0 errors, 0 overflow, all 32 calculators give results, no Arabic left in English. CI was red
  since it was added (menu_flow wrote to a path of this machine) → fixed, now green. Headers OK, /api/links 401 without a session,
  repo files not served. Open: owner MFA (0), leaked-password protection (paid), Node 20 deprecation warning in CI actions.
- **Live: 1.16.0** (he said «تمام انشر» on 2026-11-04; main fast-forwarded). DB for live = ONE file `release_1_16_0_live.sql`
  (content_1_15_0 + content_1_16_0 + cleanup_1_16_0 + activity_log_1_16_0, each twice-safe); he runs it in the SQL editor of both
  projects — DONE by him on 2026-11-04 and checked on BOTH (activity table + 7 log triggers, publish_config gone, owner invite closed,
  sources 79–85, 8 interactions waiting, draft roadmap 12 items). Left for him: approve the 8 in 🔔 → publish.
- **1.16.0 (includes 1.15.0 + 1.14.6)**: his «نفذ الاقتراحات و التصحيحات و الملاحضات» + notes. ONE tile design (css end of app.css):
  #picker/#tgrid/.mtiles = 4 per row on every size, `.tico` badge (VBADGE/vBadge in content.js; tools reuse `.ttl-ic svg`). ⋮⋮ + ✎ on
  every item: `EPEN()` + `EDB()` (content.js) — actBtns = drag + pend + ✎ only; hide/delete/reset live in each editor's dialog
  (editRef/editInter/editNut/editFeature/editPage, `editBuiltin(k)` = CFG.text n_k/h_k + hide, `editTool(id)` names + CFG.text desc,
  `mgEdit(key)`/`mgGroupEdit` in nav.js = names via CFG.text (MGTEXT, SECKEY) + mgoff). MEDIT() = owner always (no textedit needed).
  Interactions + medicines one column; medicine A–Z (`MCSORT`, `.mclet`). #links = «فحص المصادر»: full #reflist with `lkBadge()`
  (owner.js). Install in settings (.m3 = 3). Labels: أدوية المريض / سجل التحاليل. Zinc `czg=dia` (WHO 2004, source 85 in DEF_REFS).
  Worker /api/links needs a team session token (`teamOnly`, Supabase /auth/v1/user). CI `.github/workflows/tests.yml`.
  Owner panel round (his «نفذها كلها»): ⋮⋮/✎ only with body.textedit (`EDITING()` in content.js; #o-texts visible for the whole
  team; refreshAll on toggle); `editLook()` = one live sheet (fonts, sizes sb/sh/st 0.85–1.3 → --fst for tile names, section colours,
  logos; LOOK0 undo); page editor `.mdbar` (## / ** / -) + `#mdprev`, `paras()` renders them after esc(); dialog field type 'html';
  «3 أحجام» `openSizes()` = same-origin iframe `?frame=1` (pre.js FRAME, boot frameDraft() reads localStorage vw-frame; _headers
  frame-ancestors 'self' + SAMEORIGIN); undo `UNDO` stack in changed() (reset on save/reload), `autoSave()` 60 s; publish dialog lists
  `pubList()` with «اذهب إليه». Then: roadmap like interactions (status chips with counts, one card per line, sorted RMORD, `.rmst-*`),
  admin items movable/renamable (keys 'ad-<id>', MGTEXT), elevated cards/tiles (`--elev`, `--edge`). Follow-up tools = `CFG.tools.follow`
  (tool ids, 'p:<section>', 'pg:<page>'; FOLLOW0 default; `fItem()`, `openFollowAdd()`, `editFollow()`, mergeCfg validates).
  Test file `tests/owner_panel.py` (3 sizes).
  Activity log («سجل الإجراءات»): table public.activity written ONLY by triggers (private.log_content on sources/interactions/
  nutrients, log_config on site_config draft, log_publish on config_history, log_team on members + private.invites); RLS select =
  owner all / others own rows; no client writes. File `activity_log_1_16_0.sql` (tested on a local Postgres 16 with a mock auth
  schema, twice-safe). Client `openLog()`/`drawLog()` in owner.js (LOGF/LOGW filters, LOGFIELD labels), menu tile key 'log';
  shows lg_nodb until the SQL is run. Fake: window.__ACTIVITY.
  FIXED a stray `@media (max-width:420px){` left by 1.15.0 that limited all later CSS to phones.
  DB: `cleanup_1_16_0.sql` (revoke unused owner invite, drop publish_config) and `content_1_16_0.sql` (sources 79–85, 8 interactions,
  draft privacy text + roadmap) — NOT yet applied anywhere (the MCP approval timed out); apply TEST first, then LIVE at release.
- **1.15.0 (preview, includes 1.14.6)**: his «اريد حذف وضع المريض»: MODE stays 'pro' (i18n.js) but nothing switches it: setMode,
  #modeg, welcome «who» row, menu «وضع العرض», PROONLY, SECKEY proxy, body.ptm/.ptl, R()/srcLine patient branches all removed; boot
  removes vw-mode. Patient card (r.pt in calculators, pcard in ui.js) KEPT (pharmacist hands it over). Info pages faq/about/method/who
  fixed in DEFAULT_CFG + DB draft file `content_1_15_0.sql` (exact-sentence replaces; applied on TEST via pg_net, md5 b52ea61b…;
  apply on LIVE at release, then he publishes). Dead code removed (grouped interactions, IGOPEN, folded link box, rm_next); search
  fields get aria-label. Full review report written (Claude Docs). Findings to propose: unused owner invite (revoke), legacy
  publish_config (drop), old previews release-1-4/1-5/1-6 still serve old code on the LIVE DB, /api/links open to anyone, no CI.
- **1.14.6 (preview)**: his notes: «أدويتي» only on its own page (#mymed HTML moved into #medsb; interactions page ignores MEDS:
  `mine` only when onMeds); link check only on #links (#lkbox HTML in #linksb, fold code removed, lkShow only when #reflist sits in
  #linksb); interactions = one flat card list (grouped=false; IGOPEN code unused); owner hides menu groups/items from visitors:
  CFG.menus.groups.off ['g:<id>' | item key] (mergeCfg keeps it), 👁 `.mgeye` in edit mode (`mgToggle`), visitors filtered, team sees
  «· مخفي», recentItem skips hidden sections for visitors. No DB change (menus are owner settings).
- **Live: 1.14.5** (he said «جاهز» on 2026-11-03; main fast-forwarded): he chose «كل الأقسام في المكانين»: navMore() no longer excludes bar sections, so «الأقسام» tiles = every
  section (hidden ones only for the team, no sources in patient mode, no hidden/PROONLY tools); the special p-sources tile is gone.
- **Live: 1.14.4** (he said «جاهز» on 2026-11-03; main fast-forwarded; the first Workers Build of 7d9318f failed after ~10 min with no log on both main and the branch; Cloudflare incident «Workers and Pages build errors» 14:46–18:10 UTC; rebuilt after their fix): the p-sources tile in «الأقسام» is for EVERYONE in pharmacist mode (owner, team, visitor), never patient mode;
  link-check tile stays team-only.
- **Live: 1.14.2** (he said «جاهز» on 2026-11-03; main fast-forwarded): team (OWN.on, not preview, not patient mode) always gets a «sources» tile (key p-sources) in «الأقسام»
  (G.short in nav.js) even when sources is in the bar — he could not find it there.
- **Live: 1.14.1** (he said «جاهز» on 2026-11-03; main fast-forwarded). content_1_14_1.sql applied on LIVE (version 20261103075928;
  checked g20 o31 d12 s7 c2, all still reviewed). Kinds reach visitors when he publishes.
- **1.14.1**: SECTIONS + meds, sch, labs (SECTOOL sch→tool-sch, labs→tool-labs; go()/show() map them; tabs #t-meds #t-sch
  #t-labs in index.html, short bar labels «الجدول»/«تحاليلي»); they appear in the nav manager (bar/order/rename/colors/hide) and as
  «الأقسام» tiles via navMore (manual labs/meds tiles removed). Patient mode: no duplicate «sources→labs» when labs is a section.
  Also `ul` (tool-ul, #t-ul; hidden in patient mode like PROONLY), tools page split: FOLLOW sch/ul/labs after `h3.tgh` «أدوات المتابعة»;
  interaction group summary = grid (name / chips + arrow at the end).
  Second round (his «نفذ النقطتين مع الملاحظات»): ONE identity — the team's add button `.oadd.otop` is the first thing under the banner
  in every section (#nadd in #nadm above #nsw, static #iadd/#radd in index.html, #mcaddw on #meds, #rmaddw above the roadmap chips);
  sections without add start with search. Sources: one full list; `#rtfilters` (RTF = all|g|o|d|s|c|x, `rtOf`) ABOVE the search, vitamin chips `#sfilters`
  (SF) BELOW it, both combine, `.fc` counts follow the other filter + search (also on #filters); editRef presets the kind from RTF.
  `#lkbox` on the sources page = folded `details.lkd` (LKOPEN), open on #links. Roadmap h2 rm_next removed. Team sees interactions grouped too; sortable() only moves inside the same parent and passes the
  item (renderInter keeps the reorder inside the group). #rmlegend uses the equal chip grid. DB `content_1_14_1.sql` (explicit kind
  for all 72 sources, 77→c 78→s 22→g 38→o, keeps reviewed/pub): applied on TEST and LIVE.
- **Live: 1.14.0** (he said «جاهز» on 2026-11-03; main fast-forwarded). content_1_14_0.sql applied by Claude on the live DB (version
  20261103060053): the two owner texts are fixed in the live DRAFT; they reach visitors when he publishes.
- **1.14.0**: his «نفذها كلها بالتسلسل» on the 24-item design review + owner fonts. `bidiFix()` (util.js, used by esc() and
  T() in Arabic): Latin «و» Latin → «،», «وLatin» → «و Latin» (in Tajawal/Cairo a lone و beside Latin looks like «g»). Font sizes:
  every px font size in app.css is `calc(Npx*var(--fsb|--fsh,1))` on the scale 12/13/14/15/17/20/24 (--fsh where the rule uses
  --f-display). Owner `CFG.look` {fb,fh,sb,sh} (fonts tajawal|cairo|system, sizes 0.9–1.2) → `applyLook()` (ui.js, in applyColors,
  cached in localStorage vw-look for pre.js), dialog `editLook()` (owner.js, Menu → Site appearance «الخطوط وأحجامها»). Interactions
  grouped by supplement (`details.igrp`, IGOPEN) only with no filter/search/meds and not for the team; `.cgrid` rows auto height.
  Picker: special calculators after an `h3.pkh` «حاسبات خاصة» (content.js). TOOLSUB tool subtitles; shorter result button labels;
  touch sizes 44 (pointer:coarse); contrast vars `--royal-t`; visitor 🔔 = last 3 'now' roadmap items. DB: content_1_14_0.sql fixes
  two owner texts in the DRAFT (w_t, menus.groups.names.apps). tools_flow 97.
- **Live: 1.13.0** (he said «جاهز» on 2026-11-03; main fast-forwarded). Claude APPLIED on the live DB via apply_migration (it worked from
  here this time): `20261103043132_medicine_list.sql` and `content_1_13_0.sql` (version 20261103043252); checked: 10 new sources +
  12 interactions + 3 renamed interactions waiting in 🔔, draft roadmap (10) and the 5 corrected pages identical to the test DB.
  He must: log in → approve in 🔔 → publish (roadmap, pages and new content reach visitors only then).
- **1.13.0 (preview)**: his «طبقها كلها مع الملاحضات» after the scientific review (every item checked against its source; 2 proposals
  dropped for lack of an official source: vegan B12 dose in pregnancy, vitamin D + digoxin). Patient mode: `R()` (util.js) and `srcLine()`
  return nothing, search has no sources, `SECKEY` is a Proxy (sources → 'tl_labs'), show('sources') → tools/tool-labs, `body.ptm`
  swaps the #t-sources tab to «تحاليلي» (`.ptl` spans/svg); doctor report (openReport) still lists sources (it is for the doctor).
  Iron: pregnant branch in fFe (WHO ANC: 30–60 / 120 mg daily, source 57) + `#fetri` trimester → hbCut. `RDAL(age)` = AI label under 1 year
  (also custom vitamins). Calcium under 1 → no supplement. New built-in calculators `bar` (fBar, ASMBS 2016 Table 3 = source 69) and
  `thi` (fThi, NHS SPS 2024 = 70, NHS Highland/BNF = 71). Sources 69–75 are in DEF_REFS and fall back from code until published
  (content.js, ids ≥69 only). DB content `supabase/migrations/content_1_13_0.sql` (sources 69–75 + 12 interactions, reviewed=false,
  safe to run twice). 62 medical cases.
  Tools round (same version): SCI items `bik`/`elt`/`gaba` + SCDEF rules (labels 75/72/74), `SCDOSES`/`doseTimes()` for multi-dose
  items (abx ×2, gaba ×3); MEDSCH + DRUG_AR names; `DRUG_CLASS` (levofloxacin → quinolone…) in iTerms; LABT `ab12` (NICE) and `fol`
  (WHO 2015, source 76) + Hb lines 12/13; ULT copper/manganese/molybdenum/choline/phosphorus; UCV `znl`/`cul` (source 78); SALTS `za`
  (source 77). Sources 76–78 also in content_1_13_0.sql. tools_flow 84 checks. Review: all DOIs valid (NIH/BNF/publishers answer 403 to
  scripts — not broken), i18n 758 pairs checked (h_inf, o_nrows_ph fixed), content ar/en numbers match. Roadmap item «قسم خاص للحمل
  والأطفال» over-claims (by pregnancy week, specialists): fixed in the roadmap update below.
  Pages round: own pages `meds` and `links` (PAGES); `sharedParts(p)` in ui.js MOVES #mymed+#ilist / #lkbox+#reflist between the
  page and their homes (`#…-home` anchors) so there is one list/check; renderInter on 'meds' shows only MEDS matches (`mp_none`),
  #links shows the list only after a number is tapped (`.lkf`); tiles in the menu (links only for CAN('refs')); colours copied from
  interactions/sources. Roadmap (10 items, + bar/thi, GO bar/thi, meds → page) in DEFAULT_CFG and as a DRAFT update in
  content_1_13_0.sql (§4: jsonb_set roadmap on the draft, or a new draft from published). Names unified (n_d «فيتامين D», labs B12,
  الموليبدنوم, n_thi «نقص فيتامين B1 (الثيامين)»); §3 of the SQL renames البايفوسفونيت→البيسفوسفونات and الكورتيزون→الكورتيكوستيرويدات
  as pending edits (pub kept). tools_flow 88.
  Third round (2026-11-03): medicine list `medBase()` (CFG.medcat [{en,ar[],hide}] or DRUG_AR), `renderMedCat()`/`editMed()` on #meds
  (#medcat, search #mcq), iTerms/medCatalog/medHits read it; pharmacists (CAN('inter')) save → draft_guard keeps ONLY team.medcat
  (migration `20261103043132_medicine_list.sql`: policies text OR inter + new guard), owner approves in 🔔 (medChanges/decideTexts).
  Menu groups: `CFG.menus.groups` {order,names,items} (mergeCfg), MGROUPS recent/short/help/apps/admin/contact/settings, edit mode =
  owner + body.textedit (✎ `mgRename`, ⋮⋮ `mgSortable` with sortable(…, hsel)); who + suggest now in «help». Pages who/about/howto/faq/
  method rewritten in content_1_13_0.sql §5 (draft) and DEFAULT_CFG (who/about). «من نحن» lists MEU + the 4 team names he gave.
  tools_flow 93.
  Any interface text: T() uses CFG.text[key] for every I18N key without HTML (`TXOK`); `openTexts()`/`drawTexts()` (owner.js, Menu →
  Site appearance → tx_all) searches all keys; editText keeps {placeholders}; decorate() puts ✎ on every [data-t] heading/paragraph
  (not inside buttons/links/labels). Labels: nv_order «تعديل وترتيب القوائم», pg_order_l «تعديل وترتيب الصفحات», o_texts «تعديل وترتيب».
- **1.12.2 (preview)**: preview links use a separate free Supabase project **vitawaw-test** (`qzxdvdesscsyqbaqyuqb`, same org): `SB_LIVE`/`SB_TEST`/`IS_PREVIEW`
  in config.js (*.workers.dev ≠ production → test), `_headers` connect-src has both, `wrangler.jsonc` previews vars → test, production cron
  also wakes the test project (`TEST_SUPABASE_*` vars). Built by `supabase/test_project_setup.sql` (all migrations except the 3 content-only
  files + copy of the live published content + content tables rebuilt from it; refuses to run twice). APPLIED by Claude on 2026-11-02
  (pg_net fetched the raw file, md5-checked, `execute`d in one migration; schema fingerprint identical to live; pg_net is still enabled there,
  dropping it needs an approval). He signs up on the preview with vitawaw26@gmail.com («لدي دعوة»; owner invite is in the file).
  Trick for big SQL without pasting: apply_migration on the TEST project works from here (live writes still need his approval).
  Every future DB migration must be applied to BOTH projects (test first).
  Old branches release/1.1.0–1.6.0 and ci-probe are KEPT (he decided not to delete them). Their old preview links still use the LIVE DB;
  he was told not to use them. This session cannot delete branches or push tags (only its own branch).
- **1.12.1** also has his answers to the full review: red preview bar (`.pvbar` from pre.js on *.workers.dev ≠ production), owner backup `downloadBackup()` (owner.js), «امسح بياناتي» `clearMyData()` (nav.js), DB file `20261102190000_notifications_read_only.sql` (he must run it), review stamp picker in `editReview()` + `REV0()` maps «الصيدلي سيف الدين» → «د. سيف الدين», hidden tools/vitamins gone everywhere (`toolHidden()`, `nutOff()`), result buttons grid, menu: «المساعدة والمعلومات» heading, contact above settings, empty result box hidden (`#calc.nores`), search on sources `#ssearch` and tools `#tsearch` (`toolSearch()`), login `dialog({two:true})`, password rules `PWRULES`/`pwOK()` (8+, A-Z, a-z, 0-9, symbol) on every new password, 🔔 = sheet `openNotif()` (moves `#notifbox`). Pending from him: MFA on his account (he does it), a second free Supabase project for previews (needs him to create it).
- **Live: 1.12.1** (he said «جاهز» on 2026-11-02; main fast-forwarded): link check — all three counts clickable (`LKF` ok/broken/blocked, `LINKS.ok` saved by new checks), scroll to the list; vitamin chips `#filters`/`#sfilters` as an equal grid 3/5/7. Custom domain: he postponed it (he will tell which domain/registrar; it is set in Cloudflare → Workers → Domains, not in the owner page).
- **Live: 1.12.0** (he approved publishing on 2026-11-02: «نعم موافق اعطني الروابط لانشرة»; main fast-forwarded from this branch).
  DB file `20261102120000_stamps_and_science_only.sql` APPLIED by him and checked (3 author columns, private.stamp_name, can_edit text owner-only). Redirect URLs added by him.
  He also has to add the production + preview URLs in Supabase → Auth → URL configuration for «forgot password», and log in → save → publish
  (how-to/FAQ split, menus/tools settings).
- **1.12.0 (second try)**: built on 1.11.1 with only the items he picked from the proposals (he pasted them).
  Bottom bar (<1024px): calc · interactions · tools · 🔔 + ☰ (`.offbar` = sources, roadmap → ☰ tiles). Computers: header shows a
  Facebook-like top bar (`#hsearch` start side, section tabs as icons in the middle incl. sources, 🔔 `#t-notif` and ☰ `#t-menu`
  absolute on the end side); ☰ on computers = `toggleSide()` (body.noside, localStorage vw-side). Same `menuHTML()` on the ☰ page
  and in `#side`: account card, search, «اختصاراتك» (`RECENT` vw-recent via `rememberRecent()` in show()/openTool), shortcut tiles,
  folding `details.macc` (`MOPEN`): help, settings, privacy, management (`adminGroups()` rows: مظهر الموقع/التواصل/الصيادلة/النشر,
  `openColors()`, `openPagesOrder()` drag+edit+new), mine; logout. 🔔 for everyone: `pubItems()` in owner.js, visitor part `#notif-p`.
  His notes after the first look (done): header `#hsearch` (start) + `#hnotif` (end) on phones/iPad, bar calc · interactions · tools ·
  sources (+☰), `#t-notif` only on computers; calc = vitamin list, a vitamin opens `#v-<k>` (`openNut()`, `CALCV`, `#calc.cv`, back
  `#cbackb`); owner buttons sit on each vitamin (`.pkw` wrapper + `.pka`, `renderNutAdmin()`; `#nadm` = add/bulk only); tools page =
  `#tgrid` rectangles, a tool opens `#tool-x` (`TOOLV`, `#tools.tv`, `#tback`); «اقترح ميزة» = `openContact()` sheet; management =
  separate accordions (look / contact / team incl. review stamp / pub), one open at a time (`MOPEN` string, `name="macc-r"`).
  Second round of his notes (done): equal cards `.cgrid` (interactions), `ol.refs`, `.rm-grid` (1/2/3 columns, `grid-auto-rows:1fr`,
  clamped text, tap → whole card in a sheet `.cardfull`); roadmap filter `RMF` (`data-rmf`); page 'suggest' = built-in info page
  (`SUGGEST()`/`allPages()` in nav.js, contact block cloned into it, `#roadmap .contact` hidden); `splitHowto()` in owner.js splits the
  faq page into howto + faq on owner login (he saves + publishes); all tools open as pages (`openTool()` → `openToolPage()`,
  `TOOLFROM`/`toolBack()`); menu bottom: tiles, howto/faq rows, contact `.m3` (3), privacy accordion + install + share, management,
  mine, settings `.m3` (3) last; pharmacists page `#team` (PAGES 'team', owner only, `openTeamPage()`/`renderTeam()` in team.js, ACT.t).
  Third round (done, he answered: password = كلمة السر, stamp option 1, contact kept for owner but hidden for pharmacists, NO single
  control-panel page): 👁 on password fields (`data-peye`), «نسيت كلمة المرور» = `resetPasswordForEmail` + `recoverPassword()` on
  `#…type=recovery` (needs the preview/production URLs in Supabase → Auth → URL configuration); `CFG.menus` {order,bar,hide} (NOT `nav`:
  the rejected attempt published a `nav` key) with `NAV()`/`renderTabs()`/`openNavManager()`/`editNavText()`, menu tiles = `navMore()`;
  `CFG.tools` {order,hide,names} via `toolList()`/`toolName()`, owner buttons `data-tled`/`data-tlhide`, `PROONLY` hidden in patient mode;
  link check box `#lkbox` on sources (`renderLinks()`, filter `LKF`, `linksAuto()` when the team opens sources); stamps `sb`/`sa` →
  REFS[9..10], INTER[10..11], CUST[k].sb (`stampHTML()` in render.js); pharmacists: PERMS without 'text', `CAN('text')` owner only.
  DB file `20261102120000_stamps_and_science_only.sql` (author column + content_guard + stamp_name + j_* + publish_site + can_edit,
  and the fix: content_guard set `sort` on sources, which have no sort column → a pharmacist's edit of a source failed). Tested on the
  local Postgres; he must run it in the SQL editor.
  Preview gotcha (2026-11-02): a successful Workers Build did not update the preview alias (it kept serving the previous commit's
  files). Check what the preview really serves with `curl -s <preview>/ | grep -o 'nav.js?v=[^"]*'` against index.html before
  telling him a change is live; a new push re-triggers the build.
  Test gotcha: `python3 tests/medical_cases.py | grep -ci fail` prints 0 even when the script CRASHES (Traceback, no «FAIL»).
  Always check the exit code / count the «ok» lines (44). It crashed from the vitamin-page change until 2026-11-02 (fixed; 44/44 pass).
- **1.12.0 was REJECTED** («ابقى على اخر اصدار تم نشره لم يعجبني هذا»): live stays 1.11.1. The preview branch was set back to 1.11.1
  by a restore commit; the 1.12.0 work (own pages for schedule/labs/UL, CFG.nav menu manager, 🔔 for everyone + header 🔍/🔔,
  tools page as tiles, grouped ☰ with folding lists) is in the commits a3b8546…5f75622 if he ever asks for a piece of it.
  Do not bring it back unless he asks; change the look only in small steps he approves one by one.
  He had published a `nav` setting into the site config from the 1.12.0 preview; 1.11.1 ignores it (harmless).
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
