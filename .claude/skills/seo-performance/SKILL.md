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
- Dynamic pages (city, dua, masjid) call `SeoService.apply()` with values built from the data (e.g. city name), never reuse the parent route's text.

**SEO-02 — Non-content routes are `noindex`.**
Settings, login/auth, OTP, subscription, admin, and any user-specific page must not be indexed and must not appear in the sitemap. Set `robots: 'noindex, follow'` in the route's `data.seo`; routes with no `data.seo` at all get `noindex, follow` automatically from `SeoService`.

**SEO-03 — Every URL ships its own tags in the raw HTML.** `tools/prerender-seo.js` (runs on `postbuild`) writes `dist/prerendered/<path>.html` for every sitemap URL: page-specific title, description, canonical, og tags, JSON-LD and a static content block inside `<app-root>` that Angular replaces on start. `.htaccess` serves those files at the real URLs. The text comes from `src/app/seo/seo-content.ts`, which the app also renders, so static and live content cannot drift — put page SEO text there, not in templates. `src/index.html` (the shell for non-prerendered routes) must have no canonical or og:url. JSON-LD a page adds at runtime must reuse the prerendered script's `id` so it replaces it. Deploy with `npm run build` / `npm run build:prod` — plain `ng build` skips the sitemap, checks and prerender.
Crawlers that don't run JS (Bing, social previews, AI crawlers) must see the page's own `<title>`, description, canonical and main content. Content routes (`/`, `/prayer-times/:city`, `/salah-calendar/...`, `/duas/...`, `/learn/...`) must be prerendered or server-rendered. Verify with `curl -s <url> | grep -E "<title>|canonical"` — the output must match the page, not the homepage.

**SEO-04 — No meta keywords.** Don't add `<meta name="keywords">`; Google ignores it.

**SEO-05 — Share image.** Default `og:image`/`twitter:image` is `assets/images/og-image.png` (1024×500 feature graphic, with og:image:width/height/alt). Per-page images go in `data.seo.image`.

### B. Content & HTML structure

**SEO-10 — Exactly one visible `<h1>` per page.** Never use `visually-hidden`/`sr-only`/`display:none` on an `<h1>` or on any keyword text. Hidden keyword text counts as keyword stuffing.

**SEO-11 — Heading order.** `h1 → h2 → h3`, no skipped levels, headings describe the section (not "Details", "Info").

**SEO-12 — Pages are never empty.** A page must render useful content without location permission, login or a selected city (e.g. default city times, popular-city links, explanatory text). Target ≥ 300 visible words on landing pages (`/`, `/prayer-times`, calendar index, learn index).

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

**PERF-05 — CSS weight.** Global CSS (`assets/css/app.css` + `styles.css`) target ≤ 150 KB raw. `tools/purge-theme-css.js` removes theme/vendor component families the app never uses (DataTables, Swiper, Froala, Bootstrap offcanvas/accordion/carousel…) and runs on `prebuild`: it fails if one of those families starts being used (restore its rules from git history first). Never add third-party URLs or missing local images in CSS. Component styles stay within the `anyComponentStyle` budget (4 KB warn / 6 KB error); shared styles go in the global stylesheets.

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

## Known issues (audit 2026-10-05)

| # | Rule | Issue | Where | Status |
|---|------|-------|-------|--------|
| 1 | SEO-03 | All 2,113 sitemap URLs serve the homepage title/description/canonical in raw HTML; no prerender/SSR | `src/index.html`, build | Fixed (2,130 pages prerendered: home, /prayer-times, 16 country pages, 2,103 cities, 9 static pages; verified on Apache 2.4) — not deployed. Learn topics and dua detail pages are not prerendered yet |
| 2 | SEO-12 | Homepage shows only a search box without a city (~36 visible words) | `components/dashboard/dashboard.component.html` | Fixed (intro, tool links, popular cities and FAQ always shown; 346 words) — not deployed |
| 3 | SEO-10 | Homepage `<h1>` is `visually-hidden` and keyword-stuffed | `components/dashboard/dashboard.component.html` | Fixed (visible, translated `DASHBOARD.PAGE_TITLE`) — not deployed |
| 4 | SEO-20 | FAQ schema (Fajr/Maghrib/Zuhr rakat) not visible on any page | `src/index.html` | Fixed (visible "Salah FAQ" on homepage, schema built from same data) — not deployed |
| 5 | SEO-21 | FAQ schema in `index.html` appears on every URL | `src/index.html` | Fixed (removed from `index.html`; dashboard and city page add/remove their own schema) — not deployed |
| 6 | SEO-31 | Unknown URLs return HTTP 200 | `src/.htaccess` / hosting | Fixed (`.htaccess` serves `index.html` only for known routes, else 404; `tools/check-spa-routes.js` guards it on prebuild; tested on Apache 2.4) — not deployed. Unknown city slugs under `/prayer-times` still 200 (canonical → `/prayer-times`) until prerendering |
| 7 | SEO-14 | Homepage doesn't link to city pages | dashboard | Fixed (30 popular city links + "Browse all cities in India") — not deployed |
| 8 | SEO-11 | Homepage has no `<h2>` sections | dashboard | Fixed (h2: about, popular cities, FAQ) — not deployed |
| 9 | SEO-02 | `SeoService` always sets `index, follow`; `/settings` is indexable | `services/seo.service.ts`, routing | Fixed (`robots` in `SeoRouteData`; settings, masjid-display and routes without SEO data are `noindex`) — not deployed |
| 10 | PERF-02/03 | `main.js` 1.1 MB raw (272 KB br) | build | Fixed (moment locales dropped via `extra-webpack.config.js`: `main.js` 1.10 MB → 803 KB raw, initial 1.26 MB → 968 KB, 270 → 226 KB transferred; budgets tightened to 1 MB / 1.1 MB) — not deployed |
| 11 | PERF-05 | `assets/css/app.css` 852 KB raw | `src/assets/css/app.css` | Fixed (742 → 438 KB raw, 87 → 53 KB gzip; computed styles identical on 15 pages) — not deployed |
| 12 | PERF-04 | Bootstrap Icons font loaded twice | `angular.json` styles + `assets/fonts` | Fixed in source (commit 50bb4b5) — not deployed |
| 13 | PERF-04 | `styles.css` linked twice in built HTML | build output | Not an issue: the second link is inside `<noscript>` (Angular critical-CSS pattern) |
| 14 | SEO-04 | `<meta name="keywords">` present | `src/index.html` | Fixed — not deployed |
| 15 | SEO-05 | `og:image` is the small logo | `src/index.html`, `seo.service.ts` | Fixed (og-image.png 1024×500) — not deployed |
| 16 | SEO-30 | Sitemap has no `<lastmod>`; 317 KB single file | `tools/generate-sitemap.js` | Fixed (sitemap index → `sitemap-pages.xml` + `sitemap-cities.xml`, `lastmod` from git history) — not deployed |
| 17 | SEO-32 | Below 768px (incl. Googlebot smartphone) `prayerScreenGuard` redirects `/prayer-times/:country/:city` to `/all-prayer-times/...`, which has a generic title, no H1, no city schema and canonical `/all-prayer-times` — under mobile-first indexing every city page collapses into one URL | `services/device-info.service.ts`, `all-prayer-times` route | Fixed (both layouts render at `/prayer-times/...` via `PrayerTimesPageComponent`; shared `CityPrayerSeoService` + `app-city-prayer-seo`; `/all-prayer-times` 301s) — not deployed |
| 18 | PERF-09 | Unhashed files (`assets/css/app.css`, images, `service-worker.js`) were cached `immutable` for a year, and the service worker cached CSS/JS/images forever, so returning visitors never got updates | `src/.htaccess`, `src/service-worker.js` | Fixed (see PERF-09) — not deployed |
| 19 | SEO-31 | Service worker stored every navigation response as the offline `index.html`, including the new 404 pages | `src/service-worker.js` | Fixed (only OK responses cached; cache v2) — not deployed |
| 20 | SEO-32 | Google still indexes old city URLs `/prayer-times/<city>` (seen in Search Console, e.g. `/prayer-times/bengaluru`); they split ranking with `/prayer-times/<country>/<city>` | `tools/prerender-seo.js` | Fixed (2,098 old URLs get a static page with an instant meta-refresh redirect + canonical to the new URL; same city the app picks; country slugs excluded) — not deployed |
