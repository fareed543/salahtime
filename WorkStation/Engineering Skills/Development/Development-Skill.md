# Development — Skill

How to implement a change in the SalahTime codebase so it matches the
existing code. Used at CR/NF step 5 (`../Change-Request/CR-Method.md`). These
conventions are **observed from the code** (2026-10-02) — follow them unless a
CR explicitly changes one.

## Before Writing Code

1. The CR's design (step 3) is approved.
2. Read the relevant screen report(s), SOCK entries and LLDs.
3. Read the actual files you will change — docs can lag the code.
4. Work on a feature branch, never on `main` (pushing `main` triggers web deploys).

## Frontend (`frontend/`) — Angular 16

| Topic | Convention | Example |
|---|---|---|
| Component style | **NgModule-based** — no standalone components in the app | `components/tasbih/tasbih.module.ts` |
| Feature layout | One folder per feature under `src/app/components/<feature>/`, with its own lazy module + `RouterModule.forChild` routes | `TasbihModule` |
| New route | Add a child route in `app-routing.module.ts` under `MainLayoutComponent` with `loadChildren` **and** `data.seo` (title, description, canonicalPath) | `/zikar` route |
| Redirects | Old/alias paths use `redirectTo` with `pathMatch: 'full'` | `/tasbih` → `/zikar` |
| Auth-only route | `canActivate: [AuthGuard]` | Community routes |
| Services | `src/app/services/<name>.service.ts`, `@Injectable({ providedIn: 'root' })` | `RamadanApiService` |
| API calls | One `<Area>ApiService` per controller; URL `${environment.apiUrl}http-<controller>/<action>`; return `Observable` | `ramadan-api.service.ts` |
| Auth header | Added automatically by `AuthInterceptor` from localStorage `accessToken`; a 401 clears auth and routes to `/login` — don't add headers manually | `services/auth.interceptor.ts` |
| Loading spinner | Automatic via `SpinnerInterceptor` for HTTP calls | `services/spinner.interceptor.ts` |
| Storage | Through `LocalStorageService`, never `localStorage` directly | — |
| Dialogs | Angular Material `MatDialog`; dialog component declared in the opening feature's module, or its own module under `src/app/shared/` if reused | `ZikarNotificationDialogComponent` |
| Shared UI | Reuse `src/app/shared/*` (`screen-header`, `route-back-button`, `location-loader`, …) — check `SOCK/` first | — |
| Translations | ngx-translate, **UPPER_SNAKE keys**, optionally nested by section. Add every new key to **all 13 files** in `src/assets/i18n/` (en, ar, es, fr, hi, hi-latn, id, ms, ta, te, te-latn, tr, ur). Arabic and Urdu are RTL | `ALL_PRAYER_TIMES.FARZ_TITLE` |
| Styling | Bootstrap 5 + component `.scss`; icons from `bootstrap-icons` | — |
| Dates / times | `moment`, `moment-timezone`, `moment-hijri`; prayer times only via `WaqtService` | — |
| Environments | `src/environments/environment*.ts`; version fields are written by `tools/sync-app-version.js` — don't hand-edit them | — |

## Native (Capacitor 7, Android)

| Topic | Convention |
|---|---|
| Notifications | Only through `NotificationService`; never call `LocalNotifications` from a component |
| Channels | Immutable on Android — when sound/importance changes, **bump the version** in the channel ID (`salah_azan_v5_`, `zikar_v5_`) |
| Sounds | Add the `.mp3` to `android/app/src/main/res/raw/` **and** to `res/raw/keep.xml` (release builds shrink resources) |
| Plugin patch | `tools/patch-local-notifications.js` runs on `postinstall` — re-check it after upgrading `@capacitor/local-notifications` |
| Web fallback | Every native call must not crash on web; guard with permission checks / try-catch as existing services do |
| Sync | After web changes: `npx cap sync android` (done by `build-apk.bat`) |

## API (`api/`) — Yii2

| Topic | Convention | Example |
|---|---|---|
| Controllers | `api/controllers/`; `Http<Area>Controller` for the user app, `Admin<Area>Controller` for the back office | `HttpRamadanController` |
| URL | Pretty URLs: `http-ramadan/program-list` → `HttpRamadanController::actionProgramList()` | — |
| CORS | `behaviors()` adds `yii\filters\Cors` with `params['allowedOrigins']` — copy the existing block for new controllers | `HttpRamadanController.php` |
| Auth | Bearer token matched against `Customer.authKey` (`getAuthorizedUser()`) | `HttpRamadanController.php` |
| Models | ActiveRecord in `api/models/` | `Customer.php` |
| Schema changes | A migration in `api/migrations/` named `m<yymmdd>_<hhmmss>_<action>_<table>.php` — never edit the DB by hand | `m241220_101150_create_customer_table.php` |

## Back Office (`backoffice/`)

Separate Angular 16 app (`oneportal`) using the `Admin*` API controllers.
When a CR changes data the user app reads, check whether a back-office screen
edits that same data.

## Verify Before Handing Back

- [ ] `npm run build:prod` succeeds in `frontend/` (and `backoffice/` if touched).
- [ ] `ng test` passes for touched areas (15 spec files exist today).
- [ ] Behaviour checked on web (`ng serve`).
- [ ] Native changes checked on a device/emulator from a **release** build.
- [ ] New translation keys present in all 13 language files.
- [ ] CR doc §6 Verification filled in with real results — failures reported, not hidden.
