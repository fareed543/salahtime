# LLD — Method

The **Low-Level Design** is a build-ready spec for one unit: precise enough
that an AI or developer can implement or safely change it without
re-deriving the design.

## When to Write One

| Situation | LLD? |
|---|---|
| Reverse engineering a simple screen or CRUD endpoint | **No** — the screen report + HLD cover it |
| Reverse engineering a logic-heavy service, complex API action or native integration | **Yes** (as-built) |
| CR/NF size **L**, or any new/changed complex unit | **Yes** (delta) |
| CR/NF size S/M | Only if a unit's logic changes non-trivially |

## Categories and Templates

| Cat | Unit | Template | Lives in code at |
|---|---|---|---|
| **D** Data | MySQL table + migration + Yii2 model | `Templates/LLD-Data.md` | `api/migrations/`, `api/models/` |
| **A** API | One Yii2 controller action | `Templates/LLD-API.md` | `api/controllers/` |
| **S** Service | One Angular service | `Templates/LLD-Service.md` | `frontend/src/app/services/` |
| **U** Screen | One Angular component (new/changed screens only) | `Templates/LLD-Screen.md` | `frontend/src/app/components/` |
| **N** Native | One Capacitor capability (plugin, channel, permission, raw asset) | `Templates/LLD-Native.md` | `frontend/android/`, `NotificationService` etc. |

**Build order for a change:** D → A → S → U → N (data first; native last
because it depends on services and screens).

## Rules

- Every cell is a concrete value (name, type, path, literal). Unknown →
  `<MISSING>`; intentionally empty → `—`.
- Business rules are referenced by FDS ID, never restated.
- File naming: `<Cat>-<UnitName>.md` (e.g. `S-NotificationService.md`).
- As-built LLDs live in `Product/Modules/<Module>/LLD/`; CR LLDs in the CR
  folder, then are merged into the module LLD at doc ripple.
