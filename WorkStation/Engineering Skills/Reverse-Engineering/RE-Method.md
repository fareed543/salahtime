# Reverse Engineering — Method

**Purpose:** SalahTime is largely built. This method turns the existing code
into **as-built documentation** — the baseline every future Change Request
and New Feature is designed against (`../Change-Request/CR-Method.md`).

## Core Rules

1. **Code is the source of truth.** An as-built doc describes what the code
   *does*, not what anyone intended. Where intent and behaviour differ, record
   the behaviour and raise the gap as a finding.
2. **Every fact carries evidence** — a repo-relative `path:line`. A statement
   that cannot be traced to code is either moved to *Open Questions* or
   confirmed with the user and marked `(confirmed by user)`.
3. **Mark confidence** on anything inferred rather than read directly:
   `(inferred)` — e.g. a business rule deduced from a condition whose purpose
   is not stated anywhere.
4. **Document, don't fix.** Reverse engineering never changes code. Defects
   found go to the screen report's *Findings* and, if fixed later, through a
   CR or a `Feedbacks/` entry.
5. **One owner per fact** (see `../../CLAUDE.md`). A rule lives in the FDS, an
   endpoint in the HLD's H4, a shared service in `SOCK/` — other docs point.

## Phases and Outputs

Work **module by module** (module list: `Product/Modules/README.md`). Within
a module, run the phases in order — each phase reads the previous one's output.

| Phase | Input | Output | Template |
|---|---|---|---|
| RE-0 Inventory | Routing, folders | `Product/Screens/SCREEN_INVENTORY.md`, API controller list | — *(done 2026-10-02 for frontend)* |
| RE-1 Screen analysis | Each screen's component, template, dialogs, services | `Product/Screens/<ScreenID>_<Name>.md` | `../Screen-Analysis/Screen-Analysis-Template.md` |
| RE-2 Shared catalogue | Services, shared components, models, native assets met in RE-1 | `SOCK/*.md` entries | `SOCK/README.md` entry format |
| RE-3 As-built FDS | RE-1 reports + service/API code | `Product/Modules/<Module>/FDS.md` | `../FDS/FDS-Template.md` |
| RE-4 As-built HLD | RE-3 + API controllers, models, DB schema | `Product/Modules/<Module>/HLD.md` | `../HLD/HLD-Template.md` |
| RE-5 As-built LLD | Only for **complex units** (see below) | `Product/Modules/<Module>/LLD/<Unit>.md` | `../LLD/Templates/*` |
| RE-6 Status | — | Module `CURRENT_STATUS.md`, inventory rows, `Product/CURRENT_STATUS.md` | — |

### When an as-built LLD is worth writing (RE-5)

Write one only where a future change would be risky without it:

- Logic-heavy services (e.g. `waqt.service.ts` calculations,
  `notification.service.ts` scheduling and channels).
- API actions with non-trivial business logic or multi-table writes.
- Native integrations (notifications, geolocation, filesystem).

Simple screens and CRUD endpoints are fully covered by RE-1 + HLD — no LLD.
The screen report **is** the as-built screen LLD; never write both.

## Back Office and API

The back office (`backoffice/`) and API (`api/`) follow the same phases:
RE-0 inventory first (back-office routes; API controller → action list),
then they join the module whose data they manage — e.g. `AdminCalendar` and
`HttpCalendar` both belong to the Prayer Times / Calendar module's HLD H4.

## Done Criteria for a Module

- [ ] Every screen in the module has an RE-1 report (status `Done` in the inventory).
- [ ] Every shared piece it uses has a SOCK entry.
- [ ] FDS lists every business rule, validation and error the module enforces, each with evidence.
- [ ] HLD covers all six hats; every API endpoint the module calls is in H4.
- [ ] Complex units have an LLD.
- [ ] Open Questions reviewed with the user; confirmed answers folded in.
- [ ] Module marked **Baseline** in `Product/Modules/README.md` — from this point, changes to it go through a CR.
