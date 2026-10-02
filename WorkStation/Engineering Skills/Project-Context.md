# Project Context — SalahTime

**Status:** Living project-level context. Every method, template and report
in this workstation relies on these facts — update here, never restate
elsewhere.

## Applications

| App | Folder | Stack | Ships as |
|---|---|---|---|
| SalahTime (user app) | `frontend/` | Angular 16, Angular Material/CDK 16, Bootstrap 5, ngx-translate 14, moment / moment-hijri / moment-timezone | Web (`https://salah-times.in/`) **and** Android app via Capacitor 7 |
| One Portal (back office) | `backoffice/` | Angular 16, Capacitor 7 (no `android/` folder yet), boxicons | Web (back-office subdomain) |
| API | `api/` | PHP, Yii2 basic template | Hosted API (`https://dev-api.salah-times.in/` in current env files) |
| Database | `database/` | MySQL (dump `u596948110_dev_salahtime.sql`) | — |

## User App (frontend) — Key Facts

- **Capacitor app id:** `com.wallet.salahtime`; web build output `dist/salahtime`.
- **Capacitor plugins:** local-notifications, geolocation, filesystem, haptics,
  share, status-bar.
- **`postinstall` patches `@capacitor/local-notifications`** via
  `tools/patch-local-notifications.js` — any notification analysis must read
  that patch first.
- **Notification sounds** are Android raw resources in
  `frontend/android/app/src/main/res/raw/`. Release builds use
  `minifyEnabled` + `shrinkResources`, so every sound must also be listed in
  `res/raw/keep.xml` (see `Feedbacks/FEEDBACK_2026-10-02_zikar-sound-stripped-by-shrinker.md`).
- **Android notification channels are immutable** — channel IDs are versioned
  in `notification.service.ts` (`salah_azan_v5_*`, `zikar_v5_*`); bump the
  version whenever channel sound/config changes.
- **Routing:** `frontend/src/app/app-routing.module.ts`, lazy feature modules
  under `src/app/components/*`. All main screens render inside
  `MainLayoutComponent`; auth screens render inside `AuthShellComponent`.
- **Auth:** `AuthGuard` (`src/app/services/auth.guard.ts`) protects most
  Community routes.
- **i18n:** ngx-translate through `AppTranslateService`.
- **SEO:** each route carries `data.seo` (title, description, canonicalPath);
  `tools/generate-sitemap.js` runs before every build.
- **Offline:** `environment.offline = true`; `ConnectivityService` drives the
  offline screen.
- **Versioning:** `APP_VERSION_CODE` / `APP_VERSION_NAME` in
  `frontend/android/gradle.properties`, bumped by `tools/bump-app-version.js`
  and synced into the environment files by `tools/sync-app-version.js`.

## API — Controllers

`AdminCalendar`, `Admin`, `AdminLocation`, `AdminLocations`, `Auth`, `Budget`,
`HttpAppVersion`, `HttpCalendar`, `HttpCard`, `HttpCategory`, `HttpEvent`,
`HttpLocation`, `HttpMenu`, `HttpRamadan`, `Zakat` (all under
`api/controllers/`).

## Build & Release

See `Environment/Build-and-Release.md`.
