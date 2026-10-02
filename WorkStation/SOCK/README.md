# SOCK — Shared Objects & Components Catalogue

Catalogue of reusable building blocks in SalahTime. Before building something
new, check here; when a screen report finds a shared piece, record it here
(once) and let screen reports point to it.

## Planned files

| File | Holds |
|---|---|
| `Services.md` | `frontend/src/app/services/*` — purpose, key methods, storage keys, used by |
| `SharedComponents.md` | `frontend/src/app/shared/*` non-dialog components (`screen-header`, `location-loader`, `world-prayer-times`, `country-city-list`, `autocomplete-control`, `route-back-button`, `spinner-overlay`, …) |
| `Dialogs.md` | DLG-01 … DLG-06 (see `Product/Screens/SCREEN_INVENTORY.md`) |
| `Models.md` | `frontend/src/app/models/*` (e.g. `azan.model.ts`, `salah.model.ts`) |
| `NativeAssets.md` | Notification sounds, channels and icons |

Entry format: **Name** · Path · Purpose · Public API · Used by · Known issues (finding IDs).
