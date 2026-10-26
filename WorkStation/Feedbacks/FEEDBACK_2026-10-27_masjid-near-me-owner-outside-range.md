# FEEDBACK 2026-10-27 — "Masjids near me" lists masjids outside the chosen range

| Field | Value |
|---|---|
| **Screens** | Masjid list (`/masjid`) → "Masjids near me" range chips |
| **Severity** | Medium |
| **Status** | Fixed in code — API deploy pending |

## Report

On https://salah-times.in/masjid with **2 km** selected, the list showed masjids at 2.2 km, 8.4 km and 17 km.

## Findings

| Check | Result | Evidence |
|---|---|---|
| Web app sends the chosen range | OK: `?lat=&lng=&radius=<km>` | `frontend/src/app/services/ramadan-api.service.ts:54` |
| Production API, signed out, around Kelambakkam (12.79, 80.22) | Correct: 2 km → 1 masjid (0.33 km); 10 km → 2; 50 km → 3 | `GET api.salah-times.in/http-ramadan/masjid-list?...&radius=2` |
| Signed in | **Every masjid the viewer owns is listed, whatever its distance** | `api/controllers/HttpRamadanController.php:545` (SQL `OR id_customer = viewer`), `:559` (PHP filter keeps owner's) |
| Intent of that exception | Only for masjids **without** a pin, so an owner can find theirs and pin it | comment at `api/controllers/HttpRamadanController.php:533-534` |

Signed-out results are correct, so the extra rows come from the owner exception: the reporting account is presumed to own the 8.4 km and 17 km masjids (not checked; no DB query).

## Fix

- SQL: the owner exception now needs `latitude IS NULL OR longitude IS NULL` (`HttpRamadanController.php:546-550`).
- PHP: a masjid with a pin is kept only when within range, owner or not; an unpinned one only for its owner (`HttpRamadanController.php:563-566`).

## Verification

- [x] `php -l` passes.
- [ ] Not run locally (XAMPP stopped).
- [ ] After API deploy, signed in as the owner on `/masjid`: 2 km shows only masjids within 2 km; widening to 10/50 km brings the others back; an owned masjid with no pin still appears (without a distance chip).
