# Screen Inventory — SalahTime (frontend)

Source of truth for the list of screens. Derived from
`frontend/src/app/app-routing.module.ts` and each feature module's routes
(2026-10-02). Paths are relative to `frontend/src/app/`. Size = lines in
`.ts` / `.html`.

**Status values:** `Not started` · `In progress` · `Done`
**Priority:** P1 = core daily use / native features / largest code; P2 = secondary features; P3 = static or simple.

## Main App

| ID | Screen | Route(s) | Guard | Component | Size | Services | Dialogs | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| SCR-01 | Dashboard (Home) | `/` (`/dashboard` → redirect) | — | `components/dashboard/dashboard.component.ts` | 812 / 265 | AppTranslate, Dialog, LocalStorage, Location, Notification, Settings, Waqt | Settings, Azan Reminder | P1 | Not started |
| SCR-02 | Prayer Times | `/prayer-times`, `/:city`, `/:country/:city` (`/salahtime*` → redirect) | — | `components/salahtime/salahtime.component.ts` | 1182 / 210 | AppTranslate, Dialog, Location, Notification, Settings, Waqt | Settings, Azan Reminder, Salah Detail | P1 | Not started |
| SCR-03 | Country Cities | `/prayer-times/:country` | — | `components/salahtime/country-cities.component.ts` | 93 / 25 | Location | — | P3 | Not started |
| SCR-04 | All Prayer Times | `/all-prayer-times`, `/:city`, `/:country/:city` | `prayerScreenGuard` (`:city` routes) | `components/all-prayer-times/all-prayer-times.component.ts` | 436 / 107 | AppTranslate, Dialog, Location, Notification, Settings, Waqt | Settings, Azan Reminder | P1 | Not started |
| SCR-05 | Settings | `/settings` | — | `components/settings/settings.component.ts` | 202 / 197 | AppTranslate, Notification, Settings | Azan Reminder | P1 | Not started |
| SCR-06 | Sehri / Iftar | `/sehri-iftar` | — | `components/ramzan/ramzan.component.ts` | 168 / 52 | HijriCalendar, Settings, Waqt | — | P2 | Not started |
| SCR-07 | Zikar / Tasbih | `/zikar` (`/tasbih` → redirect) | — | `components/tasbih/tasbih.component.ts` | 350 / 175 | AppTranslate, LocalStorage, Notification | Zikar Notification | P1 | Not started |
| SCR-08 | Learn | `/learn`, `/:topicId`, `/:topicId/:entryId`, `/:topicId/quiz` (4 views) | — | `components/learn/learn.component.ts` | 91 / 78 | AppTranslate, LearnData | — | P2 | Not started |
| SCR-09 | Dua Categories | `/duas` | — | `components/duas/dua-categories/dua-categories.component.ts` | 214 / 87 | AppTranslate, DuaData, LocalStorage | — | P2 | Not started |
| SCR-10 | Dua List / Detail | `/duas/:categorySlug`, `/:categorySlug/:duaId` | — | `components/duas/dua-list/dua-list.component.ts` | 158 / 24 | AppTranslate, DuaData | Dua Detail | P2 | Not started |
| SCR-11 | Qibla Direction | `/qibla-direction` | — | `components/qibla-direction/qibla-direction.component.ts` | 290 / 113 | AppTranslate, LocalStorage, Location | — | P1 | Not started |
| SCR-12 | Salah Calendar | `/salah-calendar` | — | `shared/calender/calender.component.ts` | 460 / 106 | AppTranslate, HijriCalendar, Settings, Waqt | — | P2 | Not started |
| SCR-13 | About | `/about` | — | `components/about/about.component.ts` | 10 / 34 | — | — | P3 | Not started |
| SCR-14 | Privacy Policy | `/privacy-policy` | — | `components/privacy-policy/privacy-policy.component.ts` | 10 / 144 | — | — | P3 | Not started |

## Community

| ID | Screen | Route(s) | Guard | Component | Size | Services | Dialogs | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| SCR-15 | Programs | `/programs`, `/programs/:id` | `AuthGuard` | `components/community/programs/programs.component.ts` | 738 / 383 | AppTranslate, LocalStorage, RamadanApi | — | P1 | Not started |
| SCR-16 | Subscription | `/subscription`, `/subscription/:programId` | `AuthGuard` | `components/community/subscription/subscription.component.ts` | 257 / 98 | LocalStorage, RamadanApi | — | P2 | Not started |
| SCR-17 | Masjid | `/masjid`, `/masjid/:id` | `AuthGuard` | `components/community/masjid/masjid.component.ts` | 1144 / 346 | AppTranslate, LocalStorage, RamadanApi | — | P1 | Not started |
| SCR-18 | Halqa / Area | `/halqa`, `/area`, `/halqa/:id`, `/area/:id` | `AuthGuard` | `components/community/halqa/halqa.component.ts` | 262 / 172 | AppTranslate, LocalStorage, RamadanApi | — | P2 | Not started |
| SCR-19 | Zakat Calculator | `/zakat-calculator` | — | `components/community/zakat-calculator/zakat-calculator.component.ts` | 64 / 76 | ZakatApi | — | P2 | Not started |
| SCR-20 | User Details | `/users/:id` | — *(no guard — confirm intended)* | `components/community/user-details/user-details.component.ts` | 65 / 86 | AuthApi | — | P2 | Not started |
| SCR-21 | Profile | `/profile` | `AuthGuard` | `components/community/profile/profile.component.ts` | 147 / 102 | AuthApi, LocalStorage | — | P2 | Not started |

## Auth (rendered inside `AuthShellComponent`)

| ID | Screen | Route | Guard | Component | Size | Services | Dialogs | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| SCR-22 | Login | `/login` | — | `components/auth/login/login.component.ts` | 94 / 68 | AuthApi | — | P2 | Not started |
| SCR-23 | Sign Up | `/register` | — | `components/auth/signup/signup.component.ts` | 101 / 86 | AuthApi | — | P2 | Not started |
| SCR-24 | Forgot Password | `/forgot-password` | — | `components/auth/forgot-password/forgot-password.component.ts` | 102 / 46 | AuthApi | — | P2 | Not started |
| SCR-25 | Verify OTP | `/verify-password-otp` | — | `components/auth/verify-password-otp/verify-password-otp.component.ts` | 228 / 49 | AuthApi | — | P2 | Not started |
| SCR-26 | Reset Password | `/reset-password` | — | `components/auth/reset-password/reset-password.component.ts` | 94 / 44 | AuthApi | — | P2 | Not started |

## Overlay Screens (not routed — rendered from `app.component.html`)

| ID | Screen | Steps / Trigger | Component | Size | Services | Priority | Status |
|---|---|---|---|---|---|---|---|
| OVL-01 | Onboarding | Language → Location → Search → Confirm Location → Notifications → Madhab | `components/onboarding/onboarding.component.ts` (+ `steps/*`) | 184 / 42 (+ 6 steps) | AppTranslate, LocalStorage, Location, Notification, Settings | P1 | Not started |
| OVL-02 | Offline Screen | `ConnectivityService` reports offline | `shared/offline-screen/offline-screen.component.ts` | 19 / 12 | Connectivity | P3 | Not started |

## Dialogs (analysed inside the first parent screen listed)

| ID | Dialog | Component | Opened from | Analysed in |
|---|---|---|---|---|
| DLG-01 | Settings | `shared/dialogs/settings-dialog/` | SCR-01, SCR-02, SCR-04 | SCR-01 |
| DLG-02 | Azan Reminder | `shared/azan-reminder-dialog/` | SCR-01, SCR-02, SCR-04, SCR-05 | SCR-01 |
| DLG-03 | Salah Detail | `components/salahtime/salah-detail-dialog/` (via `shared/dialog-host`) | SCR-02 | SCR-02 |
| DLG-04 | Zikar Notification | `shared/zikar-notification-dialog/` | SCR-07 | SCR-07 |
| DLG-05 | Dua Detail | `shared/dialogs/dua-detail-dialog/` (renders `components/duas/dua-detail`) | SCR-10 | SCR-10 |
| DLG-06 | Language Selection | `shared/language-selection/` | `layouts/main-layout` | OVL-01 |

## Totals

26 routed screens · 2 overlay screens · 6 dialogs. P1 = 9 · P2 = 15 · P3 = 4.
