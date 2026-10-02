# FDS — <Module Name> (<MOD>)

> Rules: `FDS-Method.md`. Delete this line when filled in.

| Field | Value |
|---|---|
| **Mode** | As-built / Delta for <CR-nnn> |
| **Screens** | <SCR-nn, …> (see `Product/Screens/SCREEN_INVENTORY.md`) |
| **Last updated** | <yyyy-mm-dd> · <RE-3 / CR-nnn> |

## 1. Purpose

<2–3 sentences: what the module does for the user.>

## 2. Capabilities

| ID | Capability | Actor | Screens | Platform |
|---|---|---|---|---|
| <MOD>-CAP-01 | <…> | User / Admin / System | <SCR-nn> | Web + Android / Android only |

## 3. Business Rules

| ID | Rule | Evidence | Status |
|---|---|---|---|
| <MOD>-BR-01 | <plain sentence> | `path:line` | Active / Retired (<CR-nnn>) |

## 4. Validation Rules

| ID | Field / Input | Rule | Where enforced | Error | Evidence |
|---|---|---|---|---|---|
| <MOD>-VR-01 | <field> | <rule> | Frontend / API / Both | <MOD>-ERR-nn | `path:line` |

## 5. States

<State model if the module has one (e.g. reminder enabled/disabled, subscription states) — or `None.`>

| State | Entered when | Left when | Evidence |
|---|---|---|---|

## 6. Settings & Configuration

| ID | Setting | Values / Default | Stored in | Evidence |
|---|---|---|---|---|
| <MOD>-CFG-01 | <…> | <…> | localStorage `<key>` / DB `<table.column>` / environment | `path:line` |

## 7. Errors & Messages

| ID | Condition | Message shown (EN) | Translation key | Evidence |
|---|---|---|---|---|

## 8. Dependencies

<Other modules, external services (Play Store, analytics, geolocation), back-office data — or `None.`>

## Open Questions

1. <…>
