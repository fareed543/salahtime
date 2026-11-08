---
name: seo-performance
description: SEO and web-performance standards for the SalahTime Angular frontend (salah-times.in). Use when creating a new page, route, module or component; when changing routes, meta tags, structured data, sitemap, .htaccess, angular.json styles/scripts/budgets, or adding a dependency; and when the user asks to audit, review or fix SEO, page speed, Lighthouse, Core Web Vitals or bundle size for an existing module.
---

# SalahTime SEO & Performance Standards

These rules apply to every module in `frontend/` — existing and new. Rules have IDs so they can be referenced in reviews and commits (e.g. "fixes SEO-03").

## How to use this skill

**Building a new page/module** → follow every rule in "Rules" while writing it, then run the "New module checklist" before finishing.

**Auditing an existing module** → for each rule, check the module, then report a table: `Rule | Status (pass/fail/n.a.) | Evidence (file:line) | Fix`. Fix only what the user asks; list the rest.

**Full-site audit** → also run "Live checks" and update the "Known issues" table at the bottom (change status, never delete rows silently).

Never weaken a rule to make a change pass. If a rule genuinely doesn't fit, say so and suggest an edit to this file for the user to approve.

---

## Rules

### A. Page metadata

**SEO-01 — Every indexable route declares SEO data.**
Each route in `app-routing.module.ts` (or a child routing module) has `data.seo: SeoRouteData` with `title`, `description`, `canonicalPath`. Applied by `src/app/services/seo.service.ts`.
- Title: unique, 50–60 chars, primary keyword first, ends with `| SalahTime`.
- Description: unique, 120–160 chars, written for humans, no keyword lists.
- Dynamic pages (city, dua, masjid) call `SeoService.apply()` with values built from the data (e.g. city name), never reuse the parent route's text. Child routes inherit the parent's `data.seo`, so a page that sets its own SEO after loading data marks its route `data: { seoManaged: true }` (see duas and learn modules); `SeoService` then leaves it alone. Page JSON-LD goes through `SeoService.setSchema(id, data)` with the prerendered script's id.

**SEO-02 — Non-content routes are `noindex`.**
Settings, login/auth, OTP, subscription, admin, and any user-specific page must not be indexed and must not appear in the sitemap. Set `robots: 'noindex, follow'` in the route's `data.seo`; routes with no `data.seo` at all get `noindex, follow` automatically from `SeoService`.

**SEO-03 — Every URL ships its own tags in the raw HTML.** `tools/prerender-seo.js` (runs on `postbuild`) writes `dist/prerendered/<path>.html` for every sitemap URL: page-specific title, description, canonical, og tags, JSON-LD and a static content block inside `<app-root>` that Angular replaces on start. `.htaccess` serves those files at the real URLs. The text comes from `src/app/seo/seo-content.ts`, which the app also renders, so static and live content cannot drift — put page SEO text there, not in templates. `src/index.html` (the shell for non-prerendered routes) must have no canonical or og:url. JSON-LD a page adds at runtime must reuse the prerendered script's `id` so it replaces it. Deploy with `npm run build` / `npm run build:prod` — plain `ng build` skips the sitemap, checks and prerender.
Crawlers that don't run JS (Bing, social previews, AI crawlers) must see the page's own `<title>`, description, canonical and main content. Content routes (`/`, `/prayer-times/:city`, `/prayer-times/:country/:city/:month` (NF-010), `/sehri-iftar/:country/:city` (NF-009), `/salah-calendar/...`, `/duas/...`, `/learn/...`) must be prerendered or server-rendered. Verify with `curl -s <url> | grep -E "<title>|canonical"` — the output must match the page, not the homepage.

**SEO-04 — No meta keywords.** Don't add `<meta name="keywords">`; Google ignores it.

**SEO-05 — Share image.** Default `og:image`/`twitter:image` is `assets/images/og-image.png` (1024×500 feature graphic, with og:image:width/height/alt). Per-page images go in `data.seo.image`.

### B. Content & HTML structure

**SEO-10 — Exactly one visible `<h1>` per page.** Never use `visually-hidden`/`sr-only`/`display:none` on an `<h1>` or on any keyword text. Hidden keyword text counts as keyword stuffing.

**SEO-11 — Heading order.** `h1 → h2 → h3`, no skipped levels, headings describe the section (not "Details", "Info").

**SEO-12 — Pages are never empty.** A page must render useful content without location permission, login or a selected city (e.g. default city times, popular-city links, explanatory text). Target ≥ 300 visible words on landing pages (`/`, `/prayer-times`, calendar index, learn index). SEO text blocks (intros, FAQs, city directories) are for the website only: hide them in the native app with `Capacitor.isNativePlatform()` (see `DashboardComponent.isNativeApp`, `CityPrayerSeoComponent`), keeping the H1 visually hidden for screen readers.

**SEO-13 — Crawlable links.** Navigation to other pages uses `<a routerLink="...">` / `<a href>`, never `(click)` + `router.navigate` on a `div`/`button`. Link text describes the target ("Hyderabad prayer times", not "click here").

**SEO-14 — Internal linking.** Every page in the sitemap must be reachable by links within 3 clicks from `/`. Hub pages (home, prayer-times, calendar) link to popular cities.

**SEO-15 — Images.** Every `<img>` has meaningful `alt` (or `alt=""` if decorative), explicit `width`/`height`, `loading="lazy"` below the fold, WebP/AVIF where possible.

### C. Structured data (JSON-LD)

**SEO-20 — Schema matches visible content.** FAQ, HowTo, Event etc. may only describe content visible on that page. No FAQ schema without the FAQ on screen.

**SEO-21 — Page-specific schema lives with the page.** Only site-wide schema (`WebSite`, `Organization`) stays in `index.html`. Page schema (FAQPage, BreadcrumbList, Place/Mosque for masjid) is injected by the page component and removed on navigation.

**SEO-22 — Validate.** New schema is checked with Google's Rich Results Test before merging.

### D. Crawling & indexing

**SEO-30 — Sitemap.** Generated by `tools/generate-sitemap.js` (runs on `prebuild`): `sitemap.xml` is an index of `sitemap-pages.xml` and `sitemap-cities.xml`. New indexable pages go in its `staticPages` list with the source paths that drive their `lastmod` (date of the last git change); noindex routes must not be listed. A new sitemap file must also be added to `angular.json` assets.

**SEO-31 — Real 404s.** Unknown URLs must return HTTP 404, not 200. `src/.htaccess` serves `index.html` only for URLs matching its route rules and returns `404.html` with a 404 status for everything else. **Every new route must be added to those rules** — `tools/check-spa-routes.js` (runs on `prebuild`) fails the build if a route or sitemap URL would 404. Check: `curl -s -o /dev/null -w "%{http_code}" https://salah-times.in/does-not-exist` → `404`.

**SEO-32 — One URL per page.** HTTPS, non-www, no trailing slash (enforced in `src/.htaccess`). Query-string variants canonicalise to the clean path. Old paths redirect (like `salahtime/:city → prayer-times/:city`), never duplicate. Never send mobile and desktop to different URLs by screen width: Google indexes with a phone-sized browser, so switch layout in place at the same URL. Old single-segment city URLs (`/prayer-times/<city>`) redirect to `/prayer-times/<country>/<city>` via pages written by `tools/prerender-seo.js`.

**SEO-33 — robots.txt** stays `Allow: /` with the sitemap line; block only private paths.

### E. Performance (Core Web Vitals)

Targets on mobile (PageSpeed Insights): **LCP < 2.5 s, INP < 200 ms, CLS < 0.1, Performance score ≥ 90, SEO score = 100.**

**PERF-01 — Lazy-load every feature module.** Routes use `loadChildren`. Don't import feature modules (community, masjid, auth, duas, learn…) into `AppModule` or `SharedModule`.

**PERF-02 — Bundle budgets.** Initial bundle (JS + global CSS) is ~968 KB raw / ~226 KB transferred. `angular.json` budgets: initial warning 1 MB, error 1.1 MB. A PR may not raise budgets — reduce the bundle instead, and lower the budgets when the bundle shrinks further (long-term target ≤ 500 KB raw).

**PERF-03 — Heavy libraries load on demand.** `html2canvas`, `canvg`, chart libs, etc. are loaded with dynamic `import()` only where used. Prefer native `Intl`/`Date` over moment for new code — but keep `moment-hijri` for Hijri dates (the browser Umm al-Qura calendar differs on 60 days in the 2020s). The build uses `@angular-builders/custom-webpack`; `extra-webpack.config.js` drops moment's locale files (only the built-in English locale is used). Check new dependencies' size (bundlephobia) before adding.

**PERF-04 — One copy of each global asset.** Each stylesheet, icon font and script is included once (no duplicate Bootstrap Icons from both `node_modules` and `assets/fonts`, no duplicate `<link>` to the same CSS).

**PERF-05 — CSS weight.** Global CSS (`assets/css/app.css` + `styles.css`) target ≤ 150 KB raw. `tools/purge-theme-css.js` removes theme/vendor component families the app never uses (DataTables, Swiper, Froala, Bootstrap offcanvas/accordion/carousel…) and runs on `prebuild`: it fails if one of those families starts being used (restore its rules from git history first). `tools/optimize-app-css.js` (postbuild) then drops every rule of the built `app.css` whose classes appear nowhere in the sources and minifies it; a class built at runtime must be written as `'prefix-' + x` or `` `prefix-${x}` `` so it is detected (or add the prefix there). Icons: `tools/build-icon-subset.js` (prebuild) ships only the `bi-*` icons written literally in the sources — never build an icon name at runtime. Never add third-party URLs or missing local images in CSS. Component styles stay within the `anyComponentStyle` budget (4 KB warn / 6 KB error); shared styles go in the global stylesheets.

**PERF-06 — No layout shift.** Reserve space for async content (prayer cards, ads, images) with fixed heights/skeletons; images have dimensions; fonts use `font-display: swap`.

**PERF-07 — LCP element is fast.** The LCP element (usually the H1 or prayer-time card) renders without waiting for geolocation or API calls; preload only the true LCP image.

**PERF-08 — Change detection & lists.** `*ngFor` uses `trackBy`; prefer `OnPush` for new components; timers/intervals (countdown clocks) run outside Angular zone or are cleared in `ngOnDestroy`.

**PERF-09 — Caching.** Only files with a content hash in the name (Angular build output) get `max-age=31536000, immutable`. Unhashed CSS/JS/JSON (`assets/`, `service-worker.js`, manifest) get `no-cache` (cheap 304 via ETag); unhashed images/fonts/audio 1 week; HTML `no-cache`. The service worker is cache-first only for hashed files, network-first for everything else, and never stores a non-OK response (e.g. a 404) as the offline page. Bump `CACHE_NAME` when its caching rules change.

### F. Project-specific rules (owner-defined)

<!-- Add your own standard rules here, using the next free ID in the right series (SEO-xx / PERF-xx). Example:
**SEO-40 — City pages title format.** `Prayer Times in {City} Today – Fajr, Dhuhr, Asr, Maghrib, Isha | SalahTime`
-->

---

## New module checklist

Run before calling a new page/module done:

- [ ] Route lazy-loaded (PERF-01) with `data.seo` filled in (SEO-01), or `noindex` (SEO-02)
- [ ] One visible `<h1>`, ordered headings (SEO-10, SEO-11)
- [ ] Renders content with no location/login (SEO-12)
- [ ] Links are `<a routerLink>` with descriptive text (SEO-13)
- [ ] Images: alt, width/height, lazy (SEO-15)
- [ ] Schema only for visible content, injected by the page (SEO-20, SEO-21)
- [ ] Added to / excluded from `tools/generate-sitemap.js` (SEO-30)
- [ ] New URL pattern added to the `index.html` rules in `src/.htaccess`; `node tools/check-spa-routes.js` passes (SEO-31)
- [ ] `ng build --configuration=production` passes budgets with no new warnings (PERF-02)
- [ ] No new heavy dependency in the initial bundle (PERF-03)
- [ ] `trackBy`, timers cleaned up (PERF-08)

## Live checks

```bash
# Raw HTML tags for a URL (must be page-specific — SEO-03)
curl -s https://salah-times.in/prayer-times/hyderabad | grep -oE "<title>[^<]*</title>|<link rel=\"canonical\"[^>]*>"

# 404 status (SEO-31)
curl -s -o /dev/null -w "%{http_code}\n" https://salah-times.in/does-not-exist

# Bundle sizes after a production build (PERF-02/05)
ls -lS frontend/dist/salahtime/*.js frontend/dist/salahtime/*.css | head
```

In the browser pane, run on the page and read: visible word count, `h1` list and visibility, images missing `alt`/dimensions, CLS/LCP via `PerformanceObserver`, and resource sizes via `performance.getEntriesByType('resource')`.

Official scores: https://pagespeed.web.dev/ (mobile) and Google Search Console → Page indexing.

---

## Known issues (audit 2026-10-05; live re-audit 2026-11-08 — rows 1–9, 14–18, 20 verified on salah-times.in with curl; PageSpeed API quota was exhausted, so CWV not measured)

| # | Rule | Issue | Where | Status |
|---|------|-------|-------|--------|
| 1 | SEO-03 | All 2,113 sitemap URLs serve the homepage title/description/canonical in raw HTML; no prerender/SSR | `src/index.html`, build | Fixed (2,130 pages prerendered: home, /prayer-times, 16 country pages, 2,103 cities, 9 static pages; verified on Apache 2.4) — live (Jenkins FO release 2026-11-08). Learn topics and dua detail pages are not prerendered yet |
| 2 | SEO-12 | Homepage shows only a search box without a city (~36 visible words) | `components/dashboard/dashboard.component.html` | Fixed (intro, tool links, popular cities and FAQ always shown; 346 words) — live (Jenkins FO release 2026-11-08) |
| 3 | SEO-10 | Homepage `<h1>` is `visually-hidden` and keyword-stuffed | `components/dashboard/dashboard.component.html` | Fixed (visible, translated `DASHBOARD.PAGE_TITLE`) — live (Jenkins FO release 2026-11-08) |
| 4 | SEO-20 | FAQ schema (Fajr/Maghrib/Zuhr rakat) not visible on any page | `src/index.html` | Fixed (visible "Salah FAQ" on homepage, schema built from same data) — live (Jenkins FO release 2026-11-08) |
| 5 | SEO-21 | FAQ schema in `index.html` appears on every URL | `src/index.html` | Fixed (removed from `index.html`; dashboard and city page add/remove their own schema) — live (Jenkins FO release 2026-11-08) |
| 6 | SEO-31 | Unknown URLs return HTTP 200 | `src/.htaccess` / hosting | Fixed (`.htaccess` serves `index.html` only for known routes, else 404; `tools/check-spa-routes.js` guards it on prebuild; tested on Apache 2.4) — live (Jenkins FO release 2026-11-08; `/does-not-exist` → 404 verified). Unknown city slugs returned 200 (soft 404) — **fixed 2026-11-09, not released**: `.htaccess` 404s any `prayer-times|duas|learn/<…>` URL without a prerendered file (only when `prerendered/` is uploaded); verified on local Apache — `FEEDBACK_2026-11-09_seo-audit-fixes.md` |
| 7 | SEO-14 | Homepage doesn't link to city pages | dashboard | Fixed (30 popular city links + "Browse all cities in India") — live (Jenkins FO release 2026-11-08) |
| 8 | SEO-11 | Homepage has no `<h2>` sections | dashboard | Fixed (h2: about, popular cities, FAQ) — live (Jenkins FO release 2026-11-08) |
| 9 | SEO-02 | `SeoService` always sets `index, follow`; `/settings` is indexable | `services/seo.service.ts`, routing | Fixed (`robots` in `SeoRouteData`; settings, masjid-display and routes without SEO data are `noindex`) — live (Jenkins FO release 2026-11-08). `noindex` was only set by JavaScript — **fixed 2026-11-09, not released**: `prerender-seo.js` writes a `noindex.html` shell and `.htaccess` serves it for private routes (a header was avoided: the site is behind Hostinger's CDN); `dashboard`, `tasbih`, `salahtime/*` 301 at the server |
| 10 | PERF-02/03 | `main.js` 1.1 MB raw (272 KB br) | build | Fixed (moment locales dropped via `extra-webpack.config.js`: `main.js` 1.10 MB → 803 KB raw, initial 1.26 MB → 968 KB, 270 → 226 KB transferred; budgets tightened to 1 MB / 1.1 MB) — live (Jenkins FO release 2026-11-08). Regressed to 845 KB live (2026-11-08) — **fixed 2026-11-09, not released**: calendar moved to a lazy `SalahCalendarModule`, time picker only in `CommunityModule`, onboarding (native app only) loaded on demand → `main.js` 673 KB, initial 760 KB raw / 186 KB transferred. Lower the budgets to 850 KB / 950 KB once released |
| 11 | PERF-05 | `assets/css/app.css` 852 KB raw | `src/assets/css/app.css` | Fixed (742 → 438 KB raw, 87 → 53 KB gzip; computed styles identical on 15 pages) — live (Jenkins FO release 2026-11-08). 583 KB render-blocking CSS live — **reduced 2026-11-09, not released**: `tools/optimize-app-css.js` (postbuild) purges + minifies the built `app.css` 438 → 126 KB; `tools/build-icon-subset.js` (prebuild) ships 161 of 2,078 icons, `styles.css` 131 → 55 KB. Total 181 KB — still over the 150 KB target (next: `styles.scss` itself) |
| 12 | PERF-04 | Bootstrap Icons font loaded twice | `angular.json` styles + `assets/fonts` | Fixed in source (commit 50bb4b5) — live (Jenkins FO release 2026-11-08) |
| 13 | PERF-04 | `styles.css` linked twice in built HTML | build output | Not an issue: the second link is inside `<noscript>` (Angular critical-CSS pattern) |
| 14 | SEO-04 | `<meta name="keywords">` present | `src/index.html` | Fixed — live (Jenkins FO release 2026-11-08) |
| 15 | SEO-05 | `og:image` is the small logo | `src/index.html`, `seo.service.ts` | Fixed (og-image.png 1024×500) — live (Jenkins FO release 2026-11-08) |
| 16 | SEO-30 | Sitemap has no `<lastmod>`; 317 KB single file | `tools/generate-sitemap.js` | Fixed (sitemap index → `sitemap-pages.xml` + `sitemap-cities.xml`, `lastmod` from git history) — live (Jenkins FO release 2026-11-08) |
| 17 | SEO-32 | Below 768px (incl. Googlebot smartphone) `prayerScreenGuard` redirects `/prayer-times/:country/:city` to `/all-prayer-times/...`, which has a generic title, no H1, no city schema and canonical `/all-prayer-times` — under mobile-first indexing every city page collapses into one URL | `services/device-info.service.ts`, `all-prayer-times` route | Fixed (both layouts render at `/prayer-times/...` via `PrayerTimesPageComponent`; shared `CityPrayerSeoService` + `app-city-prayer-seo`; `/all-prayer-times` 301s) — live (Jenkins FO release 2026-11-08) |
| 18 | PERF-09 | Unhashed files (`assets/css/app.css`, images, `service-worker.js`) were cached `immutable` for a year, and the service worker cached CSS/JS/images forever, so returning visitors never got updates | `src/.htaccess`, `src/service-worker.js` | Fixed (see PERF-09) — live (Jenkins FO release 2026-11-08) |
| 19 | SEO-31 | Service worker stored every navigation response as the offline `index.html`, including the new 404 pages | `src/service-worker.js` | Fixed (only OK responses cached; cache v2) — live (Jenkins FO release 2026-11-08) |
| 20 | SEO-32 | Google still indexes old city URLs `/prayer-times/<city>` (seen in Search Console, e.g. `/prayer-times/bengaluru`); they split ranking with `/prayer-times/<country>/<city>` | `tools/prerender-seo.js` | Fixed (2,098 old URLs get a static page with an instant meta-refresh redirect + canonical to the new URL; same city the app picks; country slugs excluded) — live (Jenkins FO release 2026-11-08) |
| 21 | PERF-06/07 | First paint was unstyled (white page, plain links) until JavaScript ran: the theme CSS `assets/css/app.css` was only added by `AppComponent`, and `inlineCritical` loaded `styles.css` async with critical CSS computed from the empty shell, not the prerendered content | `src/app/app.component.ts`, `angular.json`, `tools/prerender-seo.js` | Fixed (`inlineCritical` off; postbuild links `app.css` after `styles.css` in `index.html` and every prerendered page; prerendered sections use the app card markup + `src/styles/_seo-prerender.scss`) — live (Jenkins FO release 2026-11-08) |
| 22 | SEO-14 | City pages' "Prayer times in more cities in India" block links the first ~25 cities alphabetically (Agartala, Agra, Ahmedabad…) on every city page, not nearby / same-state cities — weak relevance, and most cities get no links from their neighbours | `tools/prerender-seo.js`, `app-city-prayer-seo` | **Fixed 2026-11-09, not released** — "Prayer times in cities near X": 12 nearest by coordinates (`nearbyCities()` in `seo-content.ts`), in the prerendered page and the app |
| 23 | SEO-30/SEO-14/SEO-03/SEO-01 | 15 duas in 35 categories and the 3 Learn topics had routes but no sitemap entries and no links in the prerendered hubs; at runtime every `/duas/<x>` and `/learn/<x>` took the hub's title + canonical (inherited `data.seo`); `/duas/<x>/<id>` was a server 404 | `tools/generate-sitemap.js`, `tools/prerender-seo.js`, `seo.service.ts`, duas/learn components | **Fixed 2026-11-09, not released** — category/topic pages prerendered with all their text, `sitemap-duas.xml` + `sitemap-learn.xml`, hubs link them; dua/step/quiz URLs share the parent's page and canonical; `data.seoManaged` routes set their own SEO + JSON-LD at runtime |
| 24 | SEO-12 (data) | State names are listed as cities: `/prayer-times/india/arunachal-pradesh`, `/prayer-times/india/manipur` | city data feeding `sitemap-cities.xml` | **Fixed in the build 2026-11-09, not released** — `CITY_URL_REDIRECTS` in `seo-content.ts` (Manipur → Imphal, Arunachal Pradesh → Itanagar, also `delhi` → New Delhi); still to correct in Back office → Locations |
| 25 | SEO-14 (coverage) | Large Muslim-population cities have no page: Ghaziabad, Noida, Thane, Mumbra, Bhiwandi, Murshidabad, Nellore, Hubballi, Kayalpattinam (Oneindia ranks with one page per district) | city data | **Fixed 2026-11-09, not released** — CR-008: 35 cities added to `locations.json` (cities, not districts; owner's choice), alternate spellings redirect; times match AlAdhan |
| 26 | SEO-21 (opportunity) | City pages' schema has `City` + `FAQPage` + `BreadcrumbList` but no `geo` coordinates; Oneindia and ihadis add `Place` + `GeoCoordinates` | `tools/prerender-seo.js` | Open, low (2026-11-08) |
| 27 | PERF-07 | Every page preloads `assets/images/logo.png`; on prerendered pages the LCP element is the H1 / prayer card text, so the preload competes with CSS | `src/index.html` | Open, verify with PageSpeed (2026-11-08) |
