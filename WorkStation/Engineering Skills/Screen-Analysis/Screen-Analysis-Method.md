# Screen Analysis — Method

How to produce one screen-wise analysis report. The report shape is in
`Screen-Analysis-Template.md`; this file holds every rule about *what goes in
it* and *why*. Read both before writing a report.

## Unit of Analysis

- **One report per screen ID** in `Product/Screens/SCREEN_INVENTORY.md`.
  A screen = one routed component (or one full-screen overlay). Multiple
  routes served by the same component (e.g. `/prayer-times/:city` and
  `/prayer-times/:country/:city`) are **one** screen; each route is listed in
  the report's Entry Points table.
- **Dialogs are analysed inside their parent screen's report**, in the
  *Dialogs* section. A dialog opened from several screens (Settings dialog,
  Azan Reminder dialog) is analysed in full **once** — in the report of the
  first screen listed against it in the inventory — and the other reports
  point to it.
- **Shared components** (`screen-header`, `location-loader`,
  `world-prayer-times`, …) are not re-analysed per screen; findings about them
  go in their `SOCK/` entry. A screen report only notes *how the screen uses
  them*.
- File name: `Product/Screens/<ScreenID>_<PascalName>.md`
  (e.g. `SCR-07_Zikar.md`).

## Procedure

1. **Read the code, all of it.** The component `.ts`, `.html`, `.scss`, its
   feature module + routing, every dialog it opens, and every service method
   it calls (follow the call into the service — do not assume from the name).
2. **Trace each user action** to its outcome: UI event → handler → service →
   storage / API / native plugin → what the user sees.
3. **Check both platforms.** Every screen runs on web *and* inside Capacitor
   on Android. For each native touchpoint (notifications, geolocation,
   haptics, share, filesystem, status bar) state what happens on each.
4. **Run it when possible** (`ng serve` in the browser pane; device/emulator
   for native behaviour). Mark any finding not verified at runtime as
   `Code-reading only`.
5. **Fill the template top to bottom**, then set the inventory row's status.

## Analysis Dimensions

Each dimension is a section of the template. State `None.` when a dimension
genuinely has nothing — an empty section reads as skipped, `None.` reads as
checked.

| # | Dimension | What to check |
|---|---|---|
| D1 | Purpose & entry | What the screen is for; every route, guard, query param, and every place that navigates to it |
| D2 | UI composition | Sections in render order; shared components and dialogs used |
| D3 | User actions | Every interactive element → handler → outcome |
| D4 | Data & state | Services, API endpoints, localStorage keys, observables, subscriptions and their teardown |
| D5 | Native / platform | Capacitor plugins used; web vs Android behaviour; permissions |
| D6 | States | Loading, empty, error, offline, permission-denied — present or missing |
| D7 | i18n | Hard-coded strings vs translation keys; RTL readiness (Urdu/Arabic) |
| D8 | Performance | Change detection, heavy work in templates, timers/intervals, unsubscribed streams, bundle weight, list rendering |
| D9 | Accessibility | Labels, roles, focus order, contrast, tap-target size |
| D10 | SEO (public routes only) | `data.seo` present and accurate, canonical path, sitemap inclusion |
| D11 | Security & privacy | Guarding, data exposed, input handling, tokens in storage |

## Findings

- Every finding has an **ID** `<ScreenID>-F<nn>`, a **severity**, a
  **dimension**, **evidence** (`path:line`), the **impact** on the user, and a
  **recommendation**.
- **Severity scale:**

  | Severity | Meaning |
  |---|---|
  | `Critical` | Broken core function, data loss, security exposure |
  | `High` | Feature works wrongly or not at all for a significant group of users/devices |
  | `Medium` | Degraded experience, missing state, notable performance cost |
  | `Low` | Polish, consistency, minor a11y/i18n gap |
  | `Info` | Observation, no action needed now |

- **No evidence, no finding.** Suspicions without a line reference go to
  *Open Questions*, not *Findings*.
- A finding fixed during analysis also gets a `Feedbacks/` entry; the report
  links to it and marks the finding `Fixed`.

## Writing Rules

- Facts only — no methodology text inside the report (it lives here).
- Use repo-relative paths so links work from the repo root.
- Don't restate stack facts from `Project-Context.md`; point to it.
- Keep the *Summary* to what a product owner needs: health, top 3 issues,
  recommended next action.
