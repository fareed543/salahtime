# FEEDBACK 2026-11-08 — Back office build fails on a clean checkout (moment-hijri from frontend/node_modules)

| Field | Value |
|---|---|
| **Screens** | Back office → Calendar date adjustment; Developer → Calendar |
| **Severity** | High (back office cannot be built by Jenkins) |
| **Status** | Fixed — released by Jenkins 2026-11-08; Hijri screen check pending |
| **Source** | First run of the Jenkins job `salahtime-backoffice` (build #1, 2026-11-08) |

## Findings

| Check | Result | Evidence |
|---|---|---|
| Build #1 console | `Module not found: Error: Can't resolve '../../../../frontend/node_modules/moment-hijri'` | Jenkins `salahtime-backoffice` build #1 |
| Cause | Two components `require` moment-hijri by a relative path into the **website's** `node_modules`; `backoffice/package.json` lists neither `moment` nor `moment-hijri`. It only built on a PC where `frontend/node_modules` exists next to it | `backoffice/src/app/calendar/date-adjustment.component.ts:7`, `backoffice/src/app/developer/calendar/calendar.component.ts:6` (before `ac8032a`) |

## Fix

Commit `ac8032a`:
- `backoffice/package.json`: `moment` `^2.30.1`, `moment-hijri` `^3.0.0` (same as `frontend/package-lock.json`: 2.30.1 / 3.0.0).
- Both components: `require('moment-hijri')` — `date-adjustment.component.ts:7`, `developer/calendar/calendar.component.ts:6`.

## Verification

- [x] Local `ng build --configuration=production` passes; output has `index.html` and `.htaccess` (bundle-size warning only, as before).
- [x] Jenkins `salahtime-backoffice` build #2 (2026-11-08): SUCCESS — backup `/Backup/BO20261108-0135.zip` (118 files, 6.0 MB), 118 files uploaded; `https://salah-times.in/backoffice/` serves `main.97241ab851434516.js` (same as the build); `/backoffice/settings` reload 200.
- [ ] Back office in the browser: Calendar date adjustment shows Hijri dates.
