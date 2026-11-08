# FEEDBACK 2026-11-09 — SEO audit fixes: soft 404s, private pages indexable, bundle and CSS weight, city links, duas/learn not crawlable, state names as cities

| Field | Value |
|---|---|
| **Screens** | City pages, Settings / auth / community private pages, Duas, Learn, Salah calendar, whole-site CSS/JS |
| **Severity** | High (indexing) / Medium (performance) |
| **Status** | Fixed in code, verified locally — not released |
| **Source** | Live SEO audit vs competitors, 2026-11-08 (`.claude/skills/seo-performance/SKILL.md` → Known issues 6, 9–11, 22–24) |

## Findings (live site, 2026-11-08)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `curl https://salah-times.in/prayer-times/india/notacity-xyz` | 200, homepage title, `index, follow`, no canonical (soft 404) | `frontend/src/.htaccess:81` (any `prayer-times/x/y` served `index.html`) |
| 2 | `curl https://salah-times.in/settings` | raw HTML `index, follow` + homepage title; `noindex` only after JavaScript | `frontend/src/app/services/seo.service.ts:57`, shell `frontend/src/index.html` |
| 3 | Live `main.708fb4e9401c9656.js` | 845 KB raw; initial JS + CSS 1,017 KB (> 1 MB budget warning) | `SharedModule` declared `CalenderComponent`, `TimePickerDialogComponent`; `AppModule` imported `OnboardingModule` (`frontend/src/app/app.module.ts:35`) |
| 4 | Render-blocking CSS | `assets/css/app.css` 449 KB + `styles.css` 134 KB = 583 KB (target 150 KB) | full `bootstrap-icons.css` (2,078 icons) in `frontend/angular.json:49`; unpurged theme `app.css` |
| 5 | City page "more cities" block | first 24 cities alphabetically (Agartala, Agra, …) on every city page; the app showed no nearby list at all | `frontend/tools/prerender-seo.js:193` |
| 6 | `/duas`, `/learn` raw HTML + sitemaps | no links to categories/topics, no sitemap entries; at runtime every `/duas/<x>` and `/learn/<x>` took the hub's title and canonical (`SeoService` uses the parent route's `data.seo`), and `/duas/<x>/<id>` was a server 404 | `frontend/src/.htaccess:84`, `seo.service.ts:94-104` |
| 7 | City list | `Arunachal Pradesh` and `Manipur` listed as cities (state names, state-centre coordinates); `/prayer-times/india/delhi` (no such entry, only New Delhi) returned 200 | `frontend/src/assets/locations.json` (synced from the back-office location release) |

Correction to the audit: there are **15** unique duas (in the `all` category); the other 34 categories list dua ids into it (78 references), see `DuaDataService.normalizeCategories`.

## Fix

- **Soft 404** — `src/.htaccess`: when `prerendered/` exists, any `prayer-times|duas|learn/<…>` URL without a prerendered file returns 404.
- **Private pages** — `tools/prerender-seo.js` writes `noindex.html` (shell with `noindex, follow`); `src/.htaccess` serves it for settings, report-issue, profile, auth, programs, subscription, halqa, area, users, masjid-display, `masjid/<id>`, `blog/write|my-articles`. `dashboard`, `tasbih`, `salahtime/*` now 301 at the server. `tools/check-spa-routes.js` accepts both shells.
- **Bundle** — `CalenderComponent` moved to `shared/calender/calender.module.ts`; `/salah-calendar` lazy via `salah-calendar.module.ts`; `TimePickerDialogComponent` imported only by `CommunityModule`; onboarding (native app only) loaded on demand in `AppComponent.showOnboardingScreen()`.
- **CSS** — `tools/build-icon-subset.js` (prebuild) writes `src/styles/bootstrap-icons-subset.css` (161 icons used); `tools/optimize-app-css.js` (postbuild) drops `app.css` rules whose classes appear nowhere in the sources (safe prefixes for library and runtime-built classes) and minifies it. The source `app.css` is unchanged.
- **Nearby cities** — `nearbyCities()` in `src/app/seo/seo-content.ts`, used by the prerender and `CityPrayerSeoComponent` ("Prayer times in cities near X", 12 nearest).
- **Duas / Learn** — `seo-content.ts`: `duaCategoriesFromData`, `duaCategoryMeta/Schema`, `learnTopicFromData`, `learnTopicMeta/Schema`. Prerendered: hubs with links, 35 category pages (every dua: Arabic, transliteration, meaning, reference), 3 topic pages (every step, ruling, note, "if missed"); dua/step/quiz URLs get a copy of the parent page (same canonical). `sitemap-duas.xml`, `sitemap-learn.xml`. At runtime `data.seoManaged` makes `SeoService` skip those routes; `DuaListComponent` and `LearnComponent` apply the page's own SEO and JSON-LD (`SeoService.setSchema`).
- **City URLs** — `CITY_URL_REDIRECTS` (`seo-content.ts`): `india/manipur → india/imphal`, `india/arunachal-pradesh → india/itanagar`, `india/delhi → india/new-delhi`; redirect pages for both URL shapes, removed from sitemap and city lists. Name matching was rejected: it also caught Puducherry, Dubai, Abu Dhabi and Istanbul.

## Verification

- [x] `npm run build:prod` passes: initial bundle 989 → 760 KB raw (230 → 186 KB transferred), `main.js` 825 → 673 KB (live: 845 KB), `styles.css` 131 → 55 KB, built `app.css` 438 → 126 KB. Prerender: 2,459 pages (35 dua categories, 3 learn topics), 98 detail copies, 3 city redirects; 2,101 city URLs (Puducherry, Dubai, Abu Dhabi, Istanbul kept).
- [x] Unit tests: 161 of 161 pass (`ng test`, ChromeHeadless), incl. 4 new in `src/app/seo/seo-content.spec.ts`.
- [x] Local Apache 2.4 (dist as DocumentRoot, `.htaccess` with the HTTPS rule disabled for the test only): `/prayer-times/india/notacity-xyz`, `/prayer-times/notacity`, `/duas/nope`, `/learn/nope` → 404 `noindex`; `/settings`, `/login`, `/profile`, `/masjid/new`, `/masjid/123`, `/blog/write` → 200 with `noindex, follow` in the raw HTML; `/dashboard`, `/tasbih`, `/salahtime/hyderabad` → 301; `/prayer-times/india/manipur` → Imphal, `/arunachal-pradesh` → Itanagar, `/delhi` (both URL shapes) → New Delhi; `/duas/food-drink`, `/duas/food-drink/1`, `/learn/wudu`, `/learn/wudu/intention`, `/learn/wudu/quiz` → 200 with the category/topic canonical; city, prayer, masjid, blog, zikar pages unchanged.
- [x] Rendered in headless Chrome (DevTools protocol): `/duas/food-drink(/1)` title "Food & Drink Duas: Before eating, After eating | SalahTime", canonical `/duas/food-drink`, `dua-category-schema`, dialog opens on `/1`; `/learn/wudu(/intention)` canonical `/learn/wudu`, `learn-topic-schema`; `/settings` `noindex`; `/salah-calendar` (lazy) renders; Chennai and Srinagar show "Prayer times in cities near …" (Chennai: Navalur, Tiruvallur, Gummidipundi, Arakkonam, Kanchipuram, Puttur …).
- [x] CSS purge: computed styles of every element (52 properties + `::before` content/font) with the purged vs the full `app.css` on 19 pages × 412 px and 1366 px — identical on all; the only differences were the rotation angle of two running spinner animations on `/masjid`.
- [ ] Android app: onboarding now loads on demand — check first launch on a device/emulator (fresh install) before the next APK.
- [ ] After release: live `curl` checks above against `https://salah-times.in`.

## Owner follow-ups

- Back office → Locations: rename/remove the `Arunachal Pradesh` and `Manipur` entries and release; then drop them from `CITY_URL_REDIRECTS`.
- `src/assets/data/learn.json` is `reviewStatus: "draft"` and topic summaries say "sample essentials" / "sample lessons" — these now appear in Google snippets for `/learn/ghusl` and `/learn/namaz`.
- After release: Search Console → request indexing for `/duas`, `/learn` and a few city pages; submit `sitemap.xml` again.
