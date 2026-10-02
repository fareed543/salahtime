# LLD — A-<controller>-<action> (API)

| Field | Value |
|---|---|
| **Mode** | As-built / Delta for <CR-nnn> |
| **Endpoint** | `<METHOD> http-<controller>/<action>` |
| **Controller** | `api/controllers/<X>Controller.php::action<Y>()` |
| **Auth** | Bearer token → `Customer.authKey` / None / Back-office access |
| **Called by** | `<FrontendService.method()>`, <back-office service> |

## Request

| Field | Source | Type | Required | FDS ref |
|---|---|---|---|---|
| <field> | query / body / header | string / int / file | Yes / No | <MOD>-VR-nn |

## Processing Steps

| # | Step | Tables read / written | FDS ref |
|---|---|---|---|
| 1 | <e.g. resolve user from token> | `customer` (R) | — |

## Response

| Case | HTTP | Body shape |
|---|---|---|
| Success | 200 | `{ <fields> }` |
| <Validation error> | <code> | `{ <fields> }` → <MOD>-ERR-nn |

## Side Effects

<Emails, file uploads, notifications — or `None.`>
