# ST-00019 — City timezone and per-country Hijri date: test cases

Customer report: an India user viewing a Saudi city saw wrong prayer times, and the Hijri date did not
match Saudi Arabia (Saudi is often one day ahead of India).

Fix: prayer times use the selected city's timezone; Hijri date adjustments belong to a country and the
app applies only the selected location's country's adjustments, plus the user's own ±day offset.

## Automated tests

| Spec | Covers | Cases |
|---|---|---|
| `frontend/src/app/utils/location-timezone.spec.ts` | Timezone resolution, UTC offsets (DST, half-hour, multi-zone), "now" in the city, fallbacks | 20 |
| `frontend/src/app/services/hijri-calendar.service.spec.ts` | Country filtering of adjustments, user offset, load failures | 15 |
| `frontend/src/app/services/location.service.timezone.spec.ts` | Backfilling a timezone for cities saved by older app versions | 10 |
| `backoffice/src/app/calendar/date-adjustment.component.spec.ts` | Country filter, required country, duplicate rules, save errors | 15 |

Frontend: the whole suite runs green, so run it all (from `frontend/`):

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Backoffice: its other existing specs do not compile yet, so if a full run fails on them, use a spec
tsconfig whose `include` lists only `date-adjustment.component.spec.ts` (`--ts-config`).

## Manual test cases

Status column: fill in Pass / Fail / Blocked while testing.

### A. Database migration

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| A1 | Positive | Back up DB. Run `database/2026-10-19_hijri_adjustment_country.sql` in phpMyAdmin (or `php yii migrate` locally). | `bt_hijri_calendar_adjustment` has `country_id` and index `idx-hijri-calendar-adjustment-country`; `bt_migration` has `m261019_100000_add_country_to_hijri_calendar_adjustment`. | |
| A2 | Positive | Run the check query at the bottom of the SQL file. | Every existing adjustment (e.g. Muharram 1448) shows country **India**. | |
| A3 | Negative | Run the SQL file a second time. | No error, no duplicate column/index/migration row (script is idempotent). | |
| A4 | Negative | Deploy the new API **without** running the SQL first (staging only). | Calendar endpoints fail on the missing column — confirms the SQL must run before the API deploy. | |

### B. API

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| B1 | Positive | `GET http-calendar/adjustments` | Each item has `countryId`, `countrySlug`, `countryName` (e.g. `india`, `India`); only active items. | |
| B2 | Positive | `GET admin/calendar-adjustments` with a back-office token | Same country fields on every item, inactive items included. | |
| B3 | Positive | `POST admin/save-calendar-adjustments` with items that each have a valid `countryId` | 200, response lists the items with their country. | |
| B4 | Positive | Save the same Hijri month for India and Pakistan | Both rows saved. | |
| B5 | Negative | Save an item without `countryId` (or `0`) | 422, `Select the country for <month year>.`; **nothing** changed in the table (transaction rolled back). | |
| B6 | Negative | Save an item with a `countryId` that does not exist (e.g. 99999) | 422 with a Country validation error; nothing changed. | |
| B7 | Negative | Call `admin/save-calendar-adjustments` without a token / with an app-user token | 401/403 as before; nothing changed. | |
| B8 | Negative | `GET http-calendar/adjustments` for an adjustment whose country was later deleted | Item returned with `countryId: null`, empty slug — the app then applies it to every country (no crash). | |

### C. Back office — Calendar › Date Adjustment

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| C1 | Positive | Open the page | Country filter (All countries + active countries A–Z); each month shows a country badge. | |
| C2 | Positive | Filter = Pakistan | Only Pakistan's months; the first one is selected. | |
| C3 | Positive | Filter = Saudi Arabia, click **Add** | New month pre-filled with Saudi Arabia. | |
| C4 | Positive | Add Rabi al-Thani 1448 for India and for Pakistan, Save | "saved successfully"; both remain after reload. | |
| C5 | Negative | Filter = All countries, **Add**, leave Country empty, Save | Red Country field, error "Select the country for …", nothing saved. | |
| C6 | Negative | Add the same month twice for India, Save | Error "… is added more than once for India", nothing saved. | |
| C7 | Negative | Set Updated end date before Updated start date, Save | Error about the end date, nothing saved. | |
| C8 | Negative | Filter to a country with no adjustments | Message: no adjustments, app uses the calculated date. Form hidden. | |
| C9 | Negative | Stop the API, open the page | Error messages for adjustments/countries; page does not crash. | |

### D. App — prayer times in the city's timezone (test with phone/PC in India)

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| D1 | Positive | Pick **Riyadh** manually | Home, Prayer Times, All Prayer Times, Calendar and Sehri/Iftar show Riyadh local times (Maghrib around 5:20 PM in October, not ~7:50 PM). | |
| D2 | Positive | With Riyadh selected | Current prayer and countdown follow Riyadh's clock (2.5 h behind India). | |
| D3 | Positive | Pick **Chennai** | Times are India times, same as before the fix. | |
| D4 | Positive | Pick **New York**, compare a January and a July date in the monthly calendar | Times shift by one hour across daylight saving; both match a reference site. | |
| D5 | Positive | Pick **Phoenix** | No daylight-saving jump between January and July. | |
| D6 | Positive | Pick **Jayapura** (Indonesia, UTC+9) | Times in Jayapura local time, not Jakarta's. | |
| D7 | Positive | Use **current location** (auto) | Times use the phone's timezone; travelling (e.g. Yercaud → Chennai) still updates the city on open. | |
| D8 | Positive | Enable notifications with Riyadh selected | Notifications fire at the real moment of Riyadh's prayer (i.e. Riyadh time converted to India time). | |
| D9 | Negative | Old install: a city saved before this release (no timezone stored), e.g. Chicago | On first open the timezone is filled from the location list; times show Chicago time. | |
| D10 | Negative | Saved city not in the list, in a multi-zone country (US/Canada/Indonesia) | No crash; falls back to the phone's timezone. | |
| D11 | Negative | No internet, location list from bundled file | Times still in the city's timezone (bundled list carries timezones after the build sync). | |

### E. App — Hijri date per country

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| E1 | Positive | India city, today | Hijri date follows India's adjustments (e.g. 7 Jumada al-Awwal 1448 on 19 Oct 2026). | |
| E2 | Positive | Saudi city, same day | One day ahead of India (8 Jumada al-Awwal 1448). | |
| E3 | Positive | Compare Home, Prayer Times, All Prayer Times, Calendar, Sehri/Iftar and Masjid display for one city | Same Hijri date on every screen. | |
| E4 | Positive | Back office: add an adjustment for Pakistan; open the app with a Pakistan city | Pakistan's adjustment applies; India and Saudi cities unchanged. | |
| E5 | Positive | Switch India → Saudi → India | Hijri date changes with the location each time. | |
| E6 | Negative | City in a country with no adjustments (e.g. UAE) | Standard calculated date, no error. | |
| E7 | Negative | Adjustment marked inactive in back office | Not applied in the app. | |
| E8 | Negative | Adjustments API unreachable | Calculated date shown, no error on screen. | |

### F. App — Settings › Hijri date adjustment

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| F1 | Positive | Tap **+** once | Value 1; Hijri date on Home moves one day ahead. | |
| F2 | Positive | Tap **−** to −1 | Hijri date moves one day back. | |
| F3 | Positive | Close and reopen the app | Offset kept. | |
| F4 | Positive | Change language (e.g. Urdu, Arabic) | Card title and help text translated; RTL layout correct. | |
| F5 | Negative | Tap **+** at 2 / **−** at −2 | Button disabled; value stays within −2…+2. | |
| F6 | Negative | Reset default settings | Offset back to 0. | |

### G. Regression

| ID | Type | Steps | Expected | Status |
|---|---|---|---|---|
| G1 | Positive | Calendar special dates (e.g. Eid Milad-un-Nabi) | Still shown on the right dates. | |
| G2 | Positive | Mark prayers as prayed on Home with a remote city selected | Tracked count only includes prayers that have started in that city. | |
| G3 | Positive | Salah offsets (Fajr +5 etc.) with Riyadh | Offsets still applied on top of Riyadh times. | |
