# Current Status — SalahTime Workstation

**Last updated:** 2026-11-09 (NF-012 programs) · **Workstation version:** 1.1.0 · **Code branch:** `feature-dev/1.0.54`

## Where we are

- Workstation v1.1.0: all Engineering Skills written for both tracks
  (Reverse Engineering + Change Requests) — index `Engineering Skills/README.md`.
- RE-0 Inventory done for the frontend: `Product/Screens/SCREEN_INVENTORY.md`
  (26 routed + 2 overlay screens, 6 dialogs).
- **No screen reports or module baselines yet.** First CR opened: CR-001.

## Module documents (Claude Docs)

Module-by-module as-built docs are published as Claude Docs (decided 2026-10-02):

| Module | Doc | Status |
|---|---|---|
| Prayer Times | https://claude.ai/code/artifact/4d787664-9eda-4be3-91cc-d7423b9964d1 | Draft — 28 findings, awaiting review |

## Next (Track 1 — Reverse Engineering)

1. Pilot module **Zikar** end to end (RE-1 SCR-07 → RE-2 SOCK → RE-3 FDS →
   RE-4 HLD → RE-5 `S-NotificationService` LLD) to prove the templates;
   adjust templates from what the pilot shows.
2. Then remaining modules in this order: Prayer Times → Settings & Reminders →
   Onboarding → Qibla → Community → Duas → Ramadan → Learn → Auth.
3. RE-0 for back office (routes) and API (controller → action list).

## Track 2 — Change Requests

Ready to use now via `Engineering Skills/Change-Request/CR-Method.md`. A CR on
a module that is not yet baselined starts with a focused RE-1 of the affected
screens.

- **CR-001** (2026-10-25) — timing-board reader can use Claude or ChatGPT,
  chosen in Back office → Settings → OCR Settings. Built and verified locally;
  real provider call and deploy pending —
  `Change Requests/CR-001_timing-board-ai-provider/CR-001.md`.
- **CR-002** (2026-10-26) — masjid display board: waqt start/end, nafil and
  makruh windows, azan + jamat countdowns, beep, owner-set colours. Design
  approved 2026-10-27; built and partly verified on web (board, colours,
  no-pin, phone, unit tests, both builds). Pending: run
  `database/2026-10-27_masjid_display_colors.sql`, check the owner colour form
  with the API, hear the beep live, Android APK —
  `Change Requests/CR-002_masjid-display-board-upgrade/CR-002.md`.
- **NF-003** (2026-10-27) — Blog: any logged-in user writes articles (SEO
  fields, live SEO score), editors approve / reject with reason / propose
  changes the author accepts; every save is a version with a full timeline;
  views, author pages, sitemap + prerender. Built and verified locally (API,
  web, back office). Pending: run `database/2026-10-27_blog_module.sql` on
  dev/prod, deploy API before the frontend build (prerender reads
  `http-blog/sitemap-list`), Android APK, FCM push check —
  `Change Requests/NF-003_blog-module/NF-003.md`.
- **CR-004** (2026-10-30) — action results in back office and frontend shown
  as SweetAlert: success / warning as toasts, errors as a centered popup with
  OK; load errors and field hints stay inline. Design approved 2026-10-30;
  built, both production builds and unit tests pass, warning + error popups
  checked in the browser. Pending: success toasts with a live API (:4200 /
  :4201), back-office popups in the browser, Android status-bar offset, APK —
  `Change Requests/CR-004_sweetalert-action-notifications/CR-004.md`.
- **CR-005** (2026-11-02, ST-00024) — Tinglish (`te-latn`, 844 strings) and
  Hinglish (`hi-latn`, 843 strings) rewritten in Roman letters; Report Issue
  flag icon added to the header before the language button. Design approved
  2026-11-02; built, web verified (desktop + phone width), prod build passes.
  Pending: Android APK —
  `Change Requests/CR-005_tinglish-roman-and-header-report/CR-005.md`.
- **CR-006** (2026-11-07) — search CTR (Search Console: 192K impressions, 0.1 % CTR): 9 prayer
  pages (`/asr-time` …) + 270 city versions, today's IST times in prerendered titles/descriptions,
  home title "Salah Times Today…", default city (New Delhi) on the website when no location is
  saved, prayer links from home and city pages, daily 00:05 IST scheduled deploy. Website only:
  Android app unchanged by design. Design approved 2026-11-07; built, 157 unit tests + prod build
  pass, web verified locally (phone width). Pending: Android check, desktop-width visual check,
  Rich Results Test, request indexing, check the first nightly Jenkins run. **Live since 2026-11-08**
  (Jenkins build #7, incl. `prerendered/` with today's times in titles) —
  `Change Requests/CR-006_search-ctr-prayer-pages/CR-006.md`.
- **CR-007** (2026-11-08) — Qibla without a compass: Google satellite map with a Qibla line toward
  the Kaaba (auto when no compass; Compass / Map switch for all) + sun guide. Draft, design awaiting
  approval; needs a Google Maps key (owner) —
  `Change Requests/CR-007_qibla-without-compass/CR-007.md`.
- **CR-008 / NF-009 / NF-010** (2026-11-09) — from the SEO audit: 35 missing Indian cities;
  Ramadan 2027 Sehri & Iftar page per Indian city (target live 1 Dec 2026); monthly timetable page
  per city (current + next month). Designs approved 2026-11-09 (India Ramadan start 9 Feb, current +
  next month, 35 cities); **built and verified locally** (build: 2,136 city + 1,005 Ramadan + 2,010
  month pages; 164 tests; local Apache; rendered SEO; new cities' times match AlAdhan). Committed `d21a4da`
  (pushed, not released). Pending: Jenkins release **before 1 Dec 2026**, Android check, enter the
  Ramadan 1448 moon-sighting date for India in Back office → Calendar when known.
- **Locations DB ↔ JSON** (2026-11-09) — local DB aligned with `locations.json` (2,136 cities, 0
  differences); JSON cleaned (7 duplicates, 2 state names, Mahabubabad coordinates). States stay out of
  the DB (11 Oct decision); the build and the app keep them from the bundled JSON on a release.
  Production copy checked locally: all migrations already applied; only
  **`database/2026-11-09_production.sql`** is needed (locations + drop 9 unused tables), tested twice on
  the copy. Pending: run it on production (backup first), then the first location release —
  `Feedbacks/FEEDBACK_2026-11-09_locations-db-json-alignment.md`.
- **NF-012** (2026-11-09) — Sehri & Iftar programs: gender at signup + same-gender member lists (team sees
  both), masjid picker + employment on a redesigned profile, "Programs near you" with Enrol on Home, program
  console (Members · Distribution · Stats), volunteers edit subscribed members' profiles with history, masjid
  members. Design approved 2026-11-09 (all 12 questions as recommended,
  https://claude.ai/artifact/LWe2TkLws6zdF6qaZvVhgh). Built; local DB migrated; **API role test 55/55**, 167 unit
  tests, dev build OK. Translations + prod build done. Pending: owner's UI role test (test accounts `nf012.test.*`,
  local only), Android. **Production DB:** `database/2026-11-09_production_nf012.sql` (tested on the production
  snapshot) before the API deploy, then `2026-11-09_production_reset_logins.sql` after it —
  `Change Requests/NF-012_program-members-volunteers-packets/NF-012.md`.
- **Program API security fix** (2026-11-09, Critical) — `customer-search` returned password hashes and login
  tokens without login; member / packet endpoints had no permission checks. Fixed locally with NF-012. Pending:
  API deploy, then reset every `authKey` on production —
  `Feedbacks/FEEDBACK_2026-11-09_program-api-open-endpoints.md`.
- **ST-00023 fix** (2026-11-02) — favourite / completed / noted duas now show
  in Duas → My duas; web verified, APK pending —
  `Feedbacks/FEEDBACK_2026-11-02_dua-favorites-tab-empty.md`.

## SEO

- **Live SEO audit vs competitors** (2026-11-08) — earlier fixes confirmed live (prerendered city
  pages, real 404s, sitemap index, old-URL redirects). Open: soft 404 for unknown city slugs,
  `/settings` indexable in raw HTML, `main.js` back over the 1 MB budget (845 KB), 583 KB
  render-blocking CSS, alphabetical "more cities" links, duas/learn pages not crawlable, missing
  cities (Ghaziabad, Noida, Thane, Bhiwandi…), state names listed as cities. Rows 6, 9–11, 22–27 in
  `.claude/skills/seo-performance/SKILL.md` → Known issues. Main competitors: Oneindia (page per
  district), IslamicFinder, UrduPoint, ihadis, clicktime.in.
- **Audit fixes** (2026-11-09) — all 7 fixed in code, verified locally (build, 161 tests, local Apache,
  rendered SEO, CSS computed-style diff): `Feedbacks/FEEDBACK_2026-11-09_seo-audit-fixes.md`. Committed
  `d21a4da` (not pushed, not released). Pending: Jenkins release, Android first-launch onboarding check,
  fix Manipur / Arunachal Pradesh in Back office → Locations, review `learn.json` "sample" summaries,
  Search Console resubmit. Still open from the audit: CSS 181 KB vs 150 KB target, missing cities
  (Ghaziabad, Noida, Thane, Bhiwandi…), Ramadan 2027 city pages, schema geo coordinates.

## Releases (Jenkins, local: http://localhost:8080)

- **Website (FO):** job `salahtime-website` (`Jenkinsfile`) — manual release + nightly 00:05 IST,
  uploads to `public_html`, backup `/Backup/FO<date>-<time>.zip` (keep 2). `prerendered/` on by default.
- **Back office (BO):** job `salahtime-backoffice` (`Jenkinsfile.backoffice`) — manual release only,
  uploads to `/backoffice`, backup `/Backup/BO<date>-<time>.zip` (keep 2). First release 2026-11-08 OK.
- **Android (Google Play):** job `salahtime-android` (`Jenkinsfile.android`, `deploy/play-upload.js`) —
  manual; versionCode = Play's highest + 1; track production by default. Build-only run #2 (2026-11-08)
  OK: signed v1.0.116 `.aab`/`.apk`, same upload certificate as local builds. **Paused:** the
  `play-service-account` credential (Secret file) is not in Jenkins yet; then run a read-only
  versionCode check before the first production upload.
- Setup and restore: `deploy/JENKINS.md`. The GitHub deploy workflows still run on pushes to `main`.

## Open items

1. **Private keys tracked in git** — `salah-time.pem`,
   `aws/LightsailDefaultKey-ap-south-1.pem`, `frontend/my-release-key.keystore`,
   `backoffice/one-portal-key.keystore`. Owner: user. Remove from tracking, add
   to `.gitignore`, rotate server keys; back up the release keystore safely.
2. `/users/:id` has no `AuthGuard` — confirm whether intended (SCR-20).
3. Zikar sound fix applied on the working tree but **not yet verified on a
   device** — see `Feedbacks/FEEDBACK_2026-10-02_zikar-sound-stripped-by-shrinker.md`.
