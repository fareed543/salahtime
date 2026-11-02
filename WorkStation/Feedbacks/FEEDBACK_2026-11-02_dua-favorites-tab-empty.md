# FEEDBACK 2026-11-02 — Favourite duas do not appear in the Favourites tab

| Field | Value |
|---|---|
| **Screens** | Duas (`/duas`) → My duas → Favourites; Dua detail (`/duas/:categorySlug/:duaId`) |
| **Severity** | Medium |
| **Status** | Fixed — web verified; Android APK pending |
| **Source** | Support Desk ST-00023 (2026-10-28): "Favorate Dua are not in favorates tab." |

## Findings

| Check | Result | Evidence |
|---|---|---|
| Where the heart saves | `localStorage` key `dua-detail-<categorySlug>-<duaId>` | `frontend/src/app/components/duas/dua-detail/dua-detail.component.ts:255-259` |
| Data the My duas tab read | Raw `duas.json` via `getCollection()` — every category except `all` lists dua **ids** (numbers), not entries | `frontend/src/assets/data/duas.json` (`daily: [4,11,12]`); old `dua-categories.component.ts:60` |
| Resulting lookup key | `dua.id` of a number is `undefined` → `dua-detail-daily-undefined`, never matches what the detail page saved | old `dua-categories.component.ts:162` |
| Duas favourited from "All" | Skipped — the `all` category was filtered out | old `dua-categories.component.ts:139` |
| Side effect of the same raw data | "All" card count showed the sum of category references (63) instead of 15 duas | old `buildAllDuas` in `dua-categories.component.ts` |

So the Favourites, Completed and Notes sections were always empty.

## Fix

`frontend/src/app/components/duas/dua-categories/dua-categories.component.ts`:
- Read the resolved categories (`DuaDataService.getCategories()`, which maps ids to entries) — `:61`.
- My duas checks every category including `all` (specific ones first) and lists each dua once per section — `:119-157`.
- Removed `buildAllDuas`; the "All" card now shows the 15 duas from `duas.json`.

Saved state is unchanged (same keys), so favourites users already made now appear without migration.

## Verification

- [x] Web (:4300, Hinglish): favourited `/duas/daily/4` and `/duas/all/2` → My duas → Favourites shows 2 (After waking up · Subah, After eating · Sabhi).
- [x] "All" card shows 15.
- [x] Production build passes.
- [ ] Android APK.
