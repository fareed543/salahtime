# FEEDBACK 2026-11-08 — First Jenkins website releases fail (5 runs) before the first upload

| Field | Value |
|---|---|
| **Screens** | — (release pipeline: Jenkins job `salahtime-website`) |
| **Severity** | High (no release possible) |
| **Status** | Fixed — builds #6 and #7 released to Hostinger |
| **Source** | First run of the Jenkins job set up for CR-006 (build #1, 2026-11-08) |

## Findings

| Check | Result | Evidence |
|---|---|---|
| Build #1 console | `Step does not take a single required parameter - use named parameters instead` at every `run('…')` call; nothing built or uploaded | Jenkins build #1 console, lines 59, 61, 69, 80 of the Jenkinsfile at `814c1a6` |
| Cause | The helper `def run(String command)` has the same name as a step an installed Jenkins plugin provides, so the pipeline compiler calls that step instead of the helper | `Jenkinsfile:9` at `814c1a6` |
| Build #2: `npm ci` refused the lockfile | `Missing: fsevents@2.3.3 … @esbuild/* from lock file` — npm 11 on the Jenkins machine requires optional platform packages in the lock | `frontend/package-lock.json` at `b8f5826` |
| Builds #3–#4: backup failed | Hostinger drops the FTP control connection about every 250 commands (`read ECONNRESET`); one `downloadToDir` / `removeDir` for ~4,600 files cannot finish in one connection | Jenkins builds #3, #4 console; `deploy/ftp-deploy.js` at `814c1a6` |
| Also risky in the script sandbox | `env[name]` (dynamic lookup) and `scm.userRemoteConfigs` may need admin script approval | `Jenkinsfile:18`, `Jenkinsfile:52` at `814c1a6` |

## Fix

`Jenkinsfile` (commit `b8f5826`):
- Helper renamed `run` → `cmd` — `Jenkinsfile:9`, calls at `:59`, `:61`, `:69`, `:80`.
- `requireEnv(name, value)` takes the value (`env.SALAHTIME_FTP_HOST`) instead of `env[name]` — `Jenkinsfile:17`, `:72-73`.
- Checkout uses the repo URL directly instead of `scm.userRemoteConfigs` — `Jenkinsfile:52`.

Then:
- `frontend/package-lock.json`: 25 missing optional entries added, no version changed (commit `e951229`).
- `deploy/ftp-deploy.js`: every FTP action reconnects and retries (`retry()`); backup downloads file by file; old backup folders deleted file by file (`removeTree()`), and a failed clean-up is a warning, not a release blocker (commits `58f2ec7`, `be60c57`, `320d394`).
- Release without `prerendered/` for now: Jenkins `UPLOAD_PRERENDERED` (default off) → `FTP_SKIP_DIRS=prerendered`; skipped folders are not uploaded, backed up or removed (commit `25bd7ea`).

## Verification

- [x] Jenkins linter (`/pipeline-model-converter/validate`): "Jenkinsfile successfully validated".
- [x] Build #3–#4: production build + prerender pass on Jenkins (2,423 pages).
- [x] Build #6 (2026-11-08): backup `/Backup/FO20261108-0109.zip` (123 files, 7.0 MB), 123 files uploaded, SUCCESS. `https://salah-times.in/index.html` serves the new `main.708fb4e9401c9656.js`; `/asr-time` 200; `backoffice/` untouched (200).
- [x] Build #7 (2026-11-08) with `UPLOAD_PRERENDERED` on (now the default): backup `/Backup/FO20261108-0126.zip`, 4,521 files uploaded in ~17 min (17 reconnects), SUCCESS. Live: `/` serves `main.708fb4e9401c9656.js`; `/asr-time/india/indore` title "Asr Time Today in Indore – 4:09 PM"; Hyderabad description carries today's five times.
