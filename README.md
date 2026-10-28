# VITAWAW

حاسبة جرعات الفيتامينات والمعادن مبنية على مصادر طبية موثوقة، بالعربية والإنكليزية.
A source-based vitamin and mineral dose calculator (Arabic / English).

- Live: https://billowing-glade-6627.vitawaw26.workers.dev
- Version history: [CHANGELOG.md](CHANGELOG.md) · Security model: [SECURITY.md](SECURITY.md)

---

## ملخص بالعربية

- **الموقع** ملفات ثابتة (HTML وCSS وJavaScript) بدون أي مرحلة بناء، تُنشر تلقائياً على Cloudflare من GitHub.
- **المحتوى الطبي** (الفيتامينات والتداخلات والمصادر) في قاعدة بيانات Supabase، ويحرّره المالك من واجهة المالك داخل الموقع.
- **أي عنصر جديد** لا يظهر للزوار قبل أن يعتمده الصيدلي المالك وينشره.
- **لكل ملف** وصف في أوله يشرح ما فيه، ودليل المطوّر أدناه يشرح أين يُعدَّل كل شيء.

---

## Architecture

```
Browser ──► Cloudflare (static files: index.html, css/, js/, fonts/)      free, unlimited, cached worldwide
   │
   ├──► /api/content  ──► src/worker.js ──► Supabase (published row)      cached 60 s at the edge
   │
   └──► Supabase Auth + REST (owner / editor only, after login)          protected by row level security
```

- **No build step.** Plain scripts in `js/` share one global scope and are loaded in order by `index.html`.
  Open `index.html` through any static server and it works.
- **Content**: Supabase tables `sources`, `nutrients`, `interactions` (one row per item, with a `reviewed` flag).
  The owner's **Publish** button calls `publish_site()`, which writes a snapshot of *reviewed* items to
  `site_config` row `published`. Visitors only ever read that snapshot.
- **Visitors' data never leaves the device.** Ages, weights and lab values are not sent anywhere.

## File map

| Path | What it is |
|---|---|
| `index.html` | Page markup only (tabs, forms, dialogs). Texts come from `data-t="key"` attributes. |
| `css/app.css` | All styles. Colours are CSS variables at the top (light and dark). |
| `js/config.js` | Version, Supabase project, default content, `clean()` for external data. |
| `js/i18n.js` | Arabic / English dictionary `I18N` and the `T()` / `L()` helpers. |
| `js/data.js` | Built-in sources and interactions (fallback when the database is unreachable). |
| `js/util.js` | `esc()`, `normAr()`, `$()`, `fmt()`, source badges. |
| `js/validation.js` | Allowed ranges for inputs and error messages. |
| `js/render.js` | Draws the result card. |
| `js/calculators.js` | **Medical dose logic** for the 8 built-in nutrients. |
| `js/content.js` | Builds lists from the content; table-based calculator for added nutrients. |
| `js/tools.js` | Unit converter, tablet count, corrected calcium, Ganzoni. |
| `js/lists.js` | Interactions (with search), sources, roadmap, contact. |
| `js/ui.js` | Tabs, modes, patient card, theme, language switch, event wiring. |
| `js/published.js` | Loads published content for visitors. |
| `js/owner.js` | Owner / editor interface (login, edit, review, publish). |
| `js/boot.js` | Start-up. |
| `src/worker.js` | Cloudflare Worker: `/api/content` with edge caching, daily keep-alive. |
| `_headers` | Security headers (CSP etc.) and cache rules for static files. |
| `sw.js` | Offline support for the installed app. |
| `fonts/` | Self-hosted Cairo and Tajawal (SIL OFL). |
| `supabase/migrations/` | Every database change, in order. |
| `tests/` | Automated tests (see below). |
| `tools/set_version.py` | Sets the version in every file at once. |

## Common tasks

| I want to… | Do this |
|---|---|
| Change a text | Find its key in `js/i18n.js` (search the Arabic text), edit both languages. |
| Add a text | Add `key:['عربي','English']` to `I18N`, then `data-t="key"` in HTML or `T('key')` in JS. |
| Change a dose rule | `js/calculators.js`, function of that nutrient. Cite the source with `R([n])`. |
| Add a vitamin / interaction / source | No code needed: owner interface → add → approve → publish. |
| Change colours / layout | `css/app.css`. Owner can also change page colours from the site. |
| Change the database | New file `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, apply it, commit it. |

## Running and testing locally

```bash
python3 -m http.server 8000          # then open http://localhost:8000
                                     # (/api/content is not available locally; the page falls back to Supabase)
python3 tests/owner_flow.py          # owner + visitor + editor flows, needs Playwright (pip install playwright)
node tests/worker_test.mjs           # edge worker: caching, stale copy, 304, routing
```

The Playwright test uses a fake Supabase (`tests/fake_supabase.js`) and applies the real Content-Security-Policy
from `_headers`, so a blocked script fails the test.

## Release process

1. Work on a branch `release/X.Y.Z`. Every push builds a **preview URL** on Cloudflare (production is untouched).
2. `python3 tools/set_version.py X.Y.Z` and add a section to `CHANGELOG.md`. **Run it before every push that changes `css/` or `js/`**: it stamps each file link with a content hash so browsers never mix a new page with old scripts. `python3 tests/check_assets.py` fails if you forgot.
3. Run the tests, check the preview link on a phone and a computer.
4. Merge into `main`: Cloudflare deploys to production automatically.

Versioning follows `MAJOR.MINOR.PATCH`. Content edits made by the owner are data, not releases.

## Capacity (free plans, approximate)

| Part | Limit | What it means |
|---|---|---|
| Static files (page, scripts, fonts) | Unlimited and free on Cloudflare | No limit on page views. |
| `/api/content` (Worker) | 100,000 requests / day free | About **100,000 visits a day** (≈3 million a month). Each browser re-uses the content for 60 s. Above that, the page reads Supabase directly. Workers Paid ($5/month) raises it to 10 million requests a month. |
| Supabase | 5 GB egress / month, 500 MB database, 50,000 auth users | The worker calls Supabase about once a minute per edge location, so visitor traffic barely touches it. |
| Supabase pausing | Free projects pause after 7 idle days | Prevented by the worker's daily cron request. |

Check current numbers on the Cloudflare and Supabase pricing pages before relying on them.
