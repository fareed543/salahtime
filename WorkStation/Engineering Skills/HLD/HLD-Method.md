# HLD — Method

The **High-Level Design** describes *how a module is built*, across six
"hats". Business behaviour comes from the FDS — the HLD references FDS IDs,
never restates them.

## The Six Hats (SalahTime mapping)

| Hat | Covers in SalahTime |
|---|---|
| **H1 Data** | MySQL tables, Yii2 ActiveRecord models (`api/models/`), frontend models (`frontend/src/app/models/`), `localStorage` keys, bundled data (`assets/`) |
| **H2 Process** | End-to-end flows: user action → component → service → API → DB → response; background flows (notification sync, app resume, midnight refresh) |
| **H3 Rules** | Where each FDS rule is enforced (component / service / API) — a pointer table, not the rule text |
| **H4 API & Integration** | Yii2 endpoints the module calls (`http-<controller>/<action>`), request/response shape, auth, CORS; external services |
| **H5 UI** | Screens, dialogs and shared components — points to screen reports, adds only cross-screen navigation |
| **H6 Events & Native** | Capacitor plugins, notifications + channels, permissions, app lifecycle events, analytics events |

## Rules

- **As-built mode:** every row carries `path:line` evidence.
- **Delta mode (CR/NF):** only the hats a change touches are written in the
  CR doc; merged into the module HLD at doc ripple.
- A hat with nothing in it says `None.`.
- Flows in H2 use Mermaid `sequenceDiagram` or `flowchart` — keep to the
  steps that cross a boundary (component ↔ service ↔ API ↔ native).
- Anything reused from `SOCK/` is referenced by its SOCK entry, not described again.
