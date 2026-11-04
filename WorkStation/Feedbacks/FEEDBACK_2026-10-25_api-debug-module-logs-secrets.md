# FEEDBACK 2026-10-25 — API writes request bodies (passwords, API keys) to runtime/debug on the server

| Field | Value |
|---|---|
| **Screens** | API (all requests) — back-office login, Settings → OCR / SMS keys |
| **Severity** | High |
| **Status** | Fixed in code — not yet deployed; server `runtime/debug` still to delete |

## Report

While verifying CR-001 (OCR provider settings), typed test API keys and the admin login password were
found in local `api/runtime/debug/*.data` files. Question: does production write the same files?

## Findings

| Check | Result | Evidence |
|---|---|---|
| Entry file the server runs | `api/index.php` — it loads `/home/u596948110/api-app/...` (Hostinger home dir); locally `api/.htaccess` routes to `web/index.php` instead | `api/index.php:6-9` |
| `YII_ENV` on the server | Hardcoded `'dev'` (with `YII_DEBUG` false), so `YII_ENV_DEV` is true in production | `api/index.php:3-4` |
| Debug + gii modules | Enabled whenever `YII_ENV_DEV` | `api/config/web.php:106` (before fix) |
| What the debug module records | Its log target saves every request (headers, body, session) to `runtime/debug/*.data`. `allowedIPs` only limits who can open the panel, and `YII_DEBUG=false` does not stop the recording | yii2-debug `Module::bootstrap()` |
| Production server files | Not checked (no server access) — very likely present given the entry file above | — |

## Fix

- `api/config/web.php`: debug and gii are enabled only when `YII_ENV_DEV` **and** `.env` `YII_ENV` is `local`.
  The `.env` value already selects params/DB, so dev-api / prod (`YII_ENV=dev` / `prod`) get neither module,
  whatever the server's `index.php` defines. `allowedIPs` is pinned to `127.0.0.1` / `::1`.
- Entry files are unchanged (the server's copy of `index.php` doesn't need re-uploading).

## Verification

- [x] `php -l api/config/web.php` — no syntax errors.
- [x] Loading `config/web.php` with `YII_ENV` constant `'dev'` (as on the server): `.env YII_ENV=local` → modules `debug, gii`;
  `dev` → none; `prod` → none.
- [ ] Deploy `api/config/web.php` to the server.
- [ ] On the server, delete `~/api-app/runtime/debug/` (and check `runtime/logs/` for request dumps). Its contents
  are old requests and may hold passwords and keys.
- [ ] Rotate any real keys or passwords entered through the back office while the old config was live
  (admin login password, OCR / SMS provider keys).
- [ ] Confirm the server `.env` sets `YII_ENV` (dev or prod): if it were missing it would default to `local`
  and turn debug back on.
