# FEEDBACK 2026-10-25 — Masjid map pin not saved / loses decimals, map shows a different spot

| Field | Value |
|---|---|
| **Screens** | Masjid edit form → map pin (enter manually), masjid details |
| **Severity** | Medium |
| **Status** | Fixed — SQL and app released to production 2026-10-25 |

## Report

Owner entered latitude `11.7745256`, longitude `78.2071182`; "we are not allowing this much length",
and the map shows a different location.

## Findings

| Check | Result | Evidence |
|---|---|---|
| App parses and stores 7 decimals | OK | `frontend/src/app/components/community/masjid/masjid.component.ts:1340` |
| API rounds to 7 decimals, model accepts | OK | `api/controllers/HttpRamadanController.php:696-697`, `api/models/Masjid.php:58-59` |
| Local DB column | `decimal(10,7)` | `SHOW COLUMNS FROM bt_masjid` (local, read-only) |
| Round trip on local stack | `11.7745256, 78.2071182` saved, read back and JSON-encoded unchanged | model save in a rolled-back transaction |
| Pin label after "Apply" | **Rounded to 5 decimals** (`11.77453, 78.20712`) — looks truncated | `frontend/src/app/components/community/masjid/masjid.component.ts:1215` (was `toFixed(5)`) |
| Production DB column | Not checked (no access). The SQL used `ADD COLUMN IF NOT EXISTS`, so a column that already existed with a shorter type (float / fewer decimals) would have been kept and would drop digits | `database/2026-10-12_masjid_coordinates.sql:11-12` |
| Masjid 4 (`/masjid/bengaluru/madrasa-o-masjid-e-noorul-uloom`) shows no pin although the owner saved one | `masjid-details` returns `latitude: null`; local row has `NULL`; a `save-masjid` POST at 2026-10-25 11:17:54 returned 200 but stored no position | `bt_masjid` id 4 (local, read-only); Apache `access.log` |
| **Typed coordinates are dropped unless "Apply" is pressed** — Save sends the old (empty) pin | `frontend/src/app/components/community/masjid/masjid.component.ts:1435` (save never read `manualLat`/`manualLng`) |

## Fix

- Save first applies coordinates still sitting in the open manual boxes, and stops with the "invalid" warning if they can't be read (`masjid.component.ts:1441`; `applyManualPin()` now returns whether it worked, `:1266`).

- `pinLabel()` shows the saved value in full instead of `toFixed(5)`.
- `database/2026-10-12_masjid_coordinates.sql` and section 3/7 of `database/2026-10-20_production_pending.sql`
  now also `MODIFY COLUMN` both columns (`:17`, `:163`) to `decimal(10,7)` — a no-op where already correct.

## Verification

- [x] Local round trip keeps all 7 decimals.
- [x] Unit tests `frontend/src/app/components/community/masjid/masjid.component.spec.ts` ("masjid map pin": typed, pasted and Maps-link input, Save without Apply, save payload, map/directions links, invalid input, cleared pin) — 19/19 pass. The file's older tests were repaired first: they didn't compile (missing `NotifyService` argument, `hasContactCard` removed in 7d154ae).
- [ ] On production: `SHOW COLUMNS FROM bt_masjid WHERE Field IN ('latitude','longitude');` — if not `decimal(10,7)`, run the SQL, then re-save the affected masjid's pin (digits already lost are not recoverable).
- [ ] App: enter the coordinates manually, Apply → label shows `11.7745256, 78.2071182`; map link opens the right spot.
