# ST-00016 — Exact location name when online: test cases

Customer report: a user in Yercaud (Tamil Nadu) saw "Salem" as their location. Production builds set
`offline: true`, so the app never asked for the place name and always showed the nearest city in its
built-in list. Yercaud is not in that list; Salem (~15 km away) is.

Fix: when the phone is online the app asks the API for the exact place name, whatever the `offline`
flag says. Offline, a failed lookup, a lookup slower than 6 s, or a lookup with no place name all fall
back to the nearest listed city. The API asks OpenStreetMap at zoom 14 (keeps towns and villages) with
English names, and caches each address for 30 days per ~110 m (`detail=1`: ~11 m).

Prayer times were never wrong: they always used the real GPS coordinates. Only the name changes.

## Automated tests

| Spec | Covers | Cases |
|---|---|---|
| `frontend/src/app/services/location.service.name.spec.ts` | Online name in an offline build, request params, GPS coordinates kept, saved "Salem" replaced, manual city untouched; offline, 503, network error, 6 s timeout, "Current Location"/empty answers, empty city list, no needless settings write | 14 (6 positive, 8 negative) |

Run from `frontend/` (the whole suite, 92 specs, runs green):

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Against the code before the fix, 10 of the 14 fail.

## Manual test cases

Status column: fill in Pass / Fail / Blocked while testing.

Coordinates used below: **Yercaud** 11.7748, 78.2090 · **Salem** 11.6538, 78.1554 ·
**a village** (e.g. Kolli Hills, 11.2485, 78.3387). To fake a location, use Android Studio emulator
› Extended controls › Location, a mock-location app on a test phone, or Chrome DevTools › Sensors
on the web build.

### A. API — `GET http-location/reverse-geocode`

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| A1 | Positive | `?lat=11.7748&lng=78.2090` | 200, `city: "Yercaud"`, `displayName: "Yercaud, Tamil Nadu, India"`, `pincode: "636600"`. | |
| A2 | Positive | Chennai `13.0827, 80.2707`, Riyadh `24.7136, 46.6753`, Dubai `25.2048, 55.2708` | `Chennai, Tamil Nadu, India` · `Riyadh, Riyadh Region, Saudi Arabia` · `Dubai, Dubai Emirate, United Arab Emirates` — all in English, not local script. | |
| A3 | Positive | A small village's coordinates | The village/town name, not the district. | |
| A4 | Positive | Repeat A1 with `lat=11.77481&lng=78.20903` (≈1 m away) | Same name, answered from cache (well under 1 s); `coordinates` echo the new values. | |
| A5 | Positive | A1 with `&detail=1` | Also returns `area` and `street` keys (may be null). Masjid address lookup still works. | |
| A6 | Negative | No `lat`/`lng`, or `lat=abc` | 422, `Valid lat and lng are required.` | |
| A7 | Negative | Block outbound internet on the API server (staging only), call a **new** spot | 503, `Unable to resolve location name right now.`; nothing cached, so the next call retries. | |
| A8 | Negative | Middle of the sea, e.g. `10.0, 70.0` | 200 with `city: "Current Location"` (or 503); no PHP error. | |

### B. App — location name when online

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| B1 | Positive | Fresh install, internet on, location set to Yercaud, allow location | Home location field shows **Yercaud, Tamil Nadu, India**. | |
| B2 | Positive | Existing install that shows "Salem" (auto location), at Yercaud, internet on; reopen the app | Changes to **Yercaud** on its own, no reinstall or clearing data needed. | |
| B3 | Positive | Tap **Use my location** in the location field | Yercaud shown. | |
| B4 | Positive | Same name on Home, Prayer Times, All Prayer Times, Sehri/Iftar | Every screen shows Yercaud. | |
| B5 | Positive | Compare prayer times before and after the fix at the same spot | Unchanged (times always used the GPS position). | |
| B6 | Positive | Move Yercaud → Salem → Chennai (mock location), reopen each time | Name follows: Yercaud, Salem, Chennai. | |
| B7 | Positive | Pick **Salem** manually while standing in Yercaud | Stays **Salem**; switching back to auto shows Yercaud. | |
| B8 | Positive | Onboarding on a new install at Yercaud | Onboarding shows Yercaud. | |

### C. App — fallbacks (negative)

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| C1 | Negative | Airplane mode (location on), Yercaud | Shows **Salem** (nearest listed city); prayer times still correct; no error. | |
| C2 | Negative | Turn internet back on, reopen | Updates to **Yercaud**. | |
| C3 | Negative | Wi-Fi connected but no internet (captive portal / router unplugged) | Within ~6 s shows Salem; screen does not hang on the loader. | |
| C4 | Negative | API down (staging) | Salem shown, no error message, prayer times load. | |
| C5 | Negative | Deny location permission | Same behaviour as before the fix (permission prompt / message); no lookup made. | |
| C6 | Negative | Location in the sea or a place with no name | Nearest listed city shown, never "Current Location" while the list is available. | |
| C7 | Negative | Open and close Home several times within 10 minutes | One lookup at most (check API log / network tab); the home loader does not flicker. | |

### D. Regression

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| D1 | Positive | Masjid form › **Use current location** | Address fills (street/area/city/pincode) as before. | |
| D2 | Positive | Masjid form › pincode 636601 | City/state fill from India Post as before. | |
| D3 | Positive | City search in the location field (online and offline) | Same results as before. | |
| D4 | Positive | Prayer notifications with auto location | Fire at the same times as before; no extra notification after the name change. | |
| D5 | Positive | Nearby masjids list at Yercaud | Same list as before (uses coordinates, not the name). | |
