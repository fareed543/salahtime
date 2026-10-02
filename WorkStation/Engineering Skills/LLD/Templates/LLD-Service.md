# LLD — S-<ServiceName> (Angular Service)

| Field | Value |
|---|---|
| **Mode** | As-built / Delta for <CR-nnn> |
| **File** | `frontend/src/app/services/<name>.service.ts` |
| **Provided in** | `root` |
| **Depends on** | <services, plugins, HttpClient> |
| **Used by** | <SCR-nn, other services> |
| **SOCK entry** | `SOCK/Services.md#<name>` |

## Public API

| Method | Inputs | Returns | Behaviour (FDS refs) |
|---|---|---|---|
| `<method>()` | <params> | `Promise<…>` / `Observable<…>` | <one line> (<MOD>-BR-nn) |

## State & Storage

| Item | Kind | Key / Field | Shape |
|---|---|---|---|
| <prefs> | localStorage | `<key>` | <type> |

## Constants

| Name | Value | Why it matters |
|---|---|---|
| <`CHANNEL_PREFIX`> | <`salah_azan_v5_`> | <bump when channel config changes> |

## Key Algorithms

<Step list for any non-trivial logic (scheduling, calculation) — or `None.`>

## Error Handling

| Failure | Handling |
|---|---|
| <permission denied> | <returns false, logs warning> |
