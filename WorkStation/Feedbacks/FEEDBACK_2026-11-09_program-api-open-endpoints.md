# FEEDBACK 2026-11-09 — Program API: user search leaks passwords and login tokens; member, packet and stats endpoints have no permission checks

| Field | Value |
|---|---|
| **Screens** | API `http-ramadan/*` (Programs SCR-15, Subscription SCR-16) — no screen called the worst endpoints |
| **Severity** | Critical (account takeover) |
| **Status** | Fixed in code, verified locally — API deploy + `authKey` reset on production pending |

## Report

While checking the Sehri / Iftar program feature (NF-012 intake, 2026-11-09), the program endpoints were
probed on the local API without a token.

## Findings

| Check | Result | Evidence |
|---|---|---|
| `GET http-ramadan/customer-search?query=a`, no token | HTTP 200, 10 users with **every column**: `password` (hash), `authKey` (the bearer token), `otp`, `mobile_verification_code`, `email_verification_code` | `api/controllers/HttpRamadanController.php:1279` (before fix) — no auth, `->asArray()->all()` |
| `POST http-ramadan/assign-member`, no token | Reached field validation (400); no login check, so anyone could make anyone an organiser (role 1) | `HttpRamadanController.php:1307` (before fix) |
| `http-ramadan/update-subscriber-packet` | No login; sets `id_program = 1` on **every** row of `bt_subscriber_packets`. Not called during the check | `HttpRamadanController.php:1072` (before fix) |
| `assign-packets`, `get-assigned-packets` | Any signed-in user could write / read packets of any user in any program; upsert matched user + date only, so two programs on the same day overwrote each other | `HttpRamadanController.php:1003`, `:1109`, `:1129` (before fix) |
| `packets-per-day` | Any signed-in user saw totals of every program | `HttpRamadanController.php:1607` (before fix) |
| `program-details`, no token | HTTP 200 with organiser / volunteer names | `HttpRamadanController.php:1372` (before fix) |
| Frontend / back-office callers | None of `customer-search`, `assign-member`, `update-subscriber-packet`, `assign-packets`, `get-assigned-packets`, `packets-per-day` is called by `frontend/` or `backoffice/` | repo-wide search 2026-11-09 |

## Fix

- Removed `customer-search`, `assign-member`, `update-subscriber-packet`, `assign-packets`,
  `get-assigned-packets`, `packets-per-day`. Replaced by NF-012 endpoints that all go through one check,
  `requireProgramTeam()` (signed in **and** admin / volunteer of that program, or super admin), and return only
  needed fields (member search masks the mobile number) — `HttpRamadanController.php`, section
  "NF-012 Sehri & Iftar programs".
- `program-details` requires login.
- `bt_subscriber_packets` gets a unique key (program, customer, date) — `database/2026-11-09_nf012_programs.sql`.

## Verification

- [x] Local API without a token: `customer-search`, `update-subscriber-packet`, `assign-packets`,
  `packets-per-day`, `assign-member` → 404; `program-members`, `program-stats`, `program-packets`,
  `program-details` → 401.
- [x] NF-012 role test (55 checks) — subscribers get 403 on every team endpoint, member search returns masked
  mobiles — see `Product/Change Requests/NF-012_program-members-volunteers-packets/NF-012.md` §6.
- [ ] Deploy the API to production.
- [ ] **Production: reset every user's `authKey`** after the deploy (tokens may have been read through
  `customer-search`); everyone signs in again once — `database/2026-11-09_production_reset_logins.sql`
  (tested on the production snapshot: 389 users, 389 distinct new tokens).
- [ ] Production: check the web server access log for `customer-search` / `update-subscriber-packet` calls to see
  whether either was used.
