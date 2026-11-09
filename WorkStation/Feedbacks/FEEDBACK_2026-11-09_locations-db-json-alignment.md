# FEEDBACK 2026-11-09 — Back-office locations vs locations.json: alignment and cleanup

| Field | Value |
|---|---|
| **Screens** | Back office → Locations; website city pages; app city search |
| **Severity** | Medium (one city's prayer times wrong; states would be lost on the first location release) |
| **Status** | Fixed — local DB aligned; dev/prod SQL + release pending |
| **Source** | Owner request 2026-11-09: "is the BO location data aligned with the generated JSON? clean up and add the JSON data to the DB" |

## Findings (local DB `salahtime`, read-only comparison first)

| Check | Result | Evidence |
|---|---|---|
| DB vs JSON | 2,103 DB cities = the JSON before CR-008: no name or coordinate difference > ~2 km, nothing only in the DB; the 35 CR-008 cities only in the JSON | `bt_cities` ⨝ `bt_countries` vs `frontend/src/assets/locations.json` |
| Duplicates in the JSON | 7 cities listed twice: Nizamabad, Chittoor, Guntur, Nandyal, Tirupati, Peddapalli (identical) and **Mahabubabad (17.8051, 80.5805 vs 17.6004, 80.0054)** | `locations.json` at `d21a4da` |
| Mahabubabad coordinates | The first entry (used by the website and in the DB) is ~60 km from the town (OSM 17.5957, 79.9999): prayer times shifted by ~2 minutes | Nominatim settlement lookup |
| State names as cities | `Manipur`, `Arunachal Pradesh` in DB and JSON | — |
| States | The DB has no states by design (`api/migrations/m261011_100000_remove_states_from_locations.php`: "locations are country → city"); the release has no `state` (`api/components/LocationRelease.php:50-61`). The website's city pages use the state from the JSON, so the first location release would have removed it from every city page — at build time (`frontend/tools/sync-locations.js`) and in the browser/app (`LocationService.refreshLocationRelease`, `frontend/src/app/services/location.service.ts:297`) | — |
| Location releases | None published yet; bt_location_observance not present locally | `bt_location_release`, build log "nothing released from the back office yet" |

## Fix

- `frontend/src/assets/locations.json`: 7 duplicates and the 2 state-name entries removed (2,145 → 2,136); Mahabubabad → 17.6004, 80.0054. Their URLs keep redirecting (`CITY_URL_REDIRECTS`).
- `database/2026-11-09_locations_align_with_json.sql` (re-runnable, looks India up by slug): deletes the 2 state-name rows, corrects Mahabubabad, inserts the 35 CR-008 cities (timezone Asia/Kolkata). Existing city IDs and per-city time zones (US, Indonesia, Canada) are kept.
- Owner decision: **states stay out of the DB** (honour the 11 Oct decision). `frontend/tools/sync-locations.js` and `LocationService.addBundledStates()` give each released city the state it has in the bundled `locations.json` (match on country + city slug); the build warns about Indian cities without a state.

## Verification

- [x] Backup before change: `D:\xampp\mysql\backup\salahtime-locations-before-2026-11-09.sql` (bt_cities, bt_countries).
- [x] Script run on the local DB: 2,103 → 2,136 cities; second run changes nothing.
- [x] Full comparison after: DB 2,136 = JSON 2,136, 0 differences in name, country, latitude, longitude; 0 inactive.
- [x] Release simulation (release-shaped list from the local DB through the new merge): 1,005 / 1,005 Indian cities keep their state.
- [x] `npm run build:prod` (2,136 city pages, Manipur redirect, Mahabubabad Fajr 4:57 AM), `tsc`, 164 / 164 unit tests.
- [x] Production copy imported locally (2026-11-09): all 16 migrations up to `m261027_120000` already applied, 2,103 cities, no `bt_location_observance`. Backup `D:\xampp\mysql\backup\salahtime-production-copy-before-2026-11-09.sql`.
- [x] `database/2026-11-09_production.sql` (Part 1 locations, Part 2 drop 9 unused tables) run twice on that copy: 16 countries, 2,136 cities, 0 differences from `locations.json`; 47 → 38 tables. Local API on the copy: `http-location/countries`, `http-location/search?q=ghaziabad` (finds the new city), `http-calendar/adjustments`, `zakat/city-list`, `http-ramadan/masjid-list`, `http-location/latest-release`, `http-blog/sitemap-list` → 200.
- [ ] Run `database/2026-11-09_production.sql` on production (full backup first), then Back office → Locations → Release.

## Unused tables dropped (Part 2 of `database/2026-11-09_production.sql`)

No model, controller, back-office or website code reads them (checked 2026-11-09):

| Table | Rows (prod) | Why it is unused |
|---|---|---|
| `bt_city`, `bt_country`, `bt_state`, `bt_location_country` | 27, 6, 0, 0 | Old location tables; the app uses `bt_cities` / `bt_countries` (`LocationCity`, `LocationCountry`; `City` extends `LocationCity`); states removed 2026-10-11 |
| `bt_festival`, `bt_festival_occurrence`, `bt_observance_profile` | 2, 2, 0 | Festival observances: `Festival`, `FestivalOccurrence`, `Country` models deleted in commit `4e55e77`; `bt_location_observance` does not exist; no screen calls it |
| `bt_customer_type_permission` | 0 | Never read |
| `bt_app_menu` | 5 | Never read; the app menu is `frontend/src/assets/menu-config.json` |

Follow-up (code, not done): `AdminCalendarController` still has the dead observance actions (`use app\models\Festival`, `Country`, `ObservanceProfile`, lines 7–13, 241, 299–373) — remove them in a cleanup CR. `ZakatController::actionLocationPrices` reads `bt_city_price`, which production does not have.

## Owner follow-ups

- New cities added in the back office need their state added to `locations.json` (the build lists any Indian city without one).
