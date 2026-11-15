# GitHub Actions: website release on merge + every night (no laptop needed)

The workflow `.github/workflows/website-release.yml` (CR-022) builds `frontend/` on GitHub's servers
and uploads it to Hostinger with the same build as the Jenkins job. The upload is `deploy/zip-deploy.js`:
the changed files go up as **one zip** with a one-time PHP script (`deploy/zip-deploy.php`, random name and
key) that backs the live site up into `/Backup`, unzips (assets first, HTML last), removes old files and
deletes itself. Per-file FTP from GitHub's servers takes ~1.2 s a file (a full nightly run would take ~5 h).
It keeps the same `.deploy-manifest.json` as Jenkins' `deploy/ftp-deploy.js`, so either can release.
Optional variable `WEBSITE_URL` (default `https://salah-times.in`) is where the script is called.

It runs:

| When | What it builds |
|---|---|
| A merge (push) into the release branch, e.g. `feature-dev/1.0.54` → `develop/1.0.54`, that changes website files (`frontend/`, the uploader or this workflow) | The merged commit |
| Every night at **00:05 IST** (18:35 UTC; GitHub may start it a few minutes late) | The latest commit on the release branch |
| By hand: **Actions → Website release → Run workflow** | The release branch, or a branch you type |

A merge into any other `develop/...` branch (an old release) is ignored, so it never overwrites the
live site. Only one upload runs at a time; a run that starts during another one waits.

## Setup (once)

1. **Create the release branch** on GitHub, e.g. `develop/1.0.54` from `feature-dev/1.0.54`.
2. **GitHub → the repo → Settings → Secrets and variables → Actions.**
   - **Variables** tab → **New repository variable**: `WEBSITE_BRANCH` = `develop/1.0.54`.
   - **Secrets** tab: `FRONTEND_FTP_SERVER`, `FRONTEND_FTP_USERNAME`, `FRONTEND_FTP_PASSWORD` must hold
     the **same Hostinger FTP login Jenkins uses** (credential `hostinger-ftp-fo`, host
     `SALAHTIME_FTP_HOST`). Update them if they hold an older login.
   - Optional variables: `WEBSITE_FTP_DIR` (default `/`: the login opens in the website folder),
     `WEBSITE_FTP_SECURE` = `false` if Hostinger refuses FTPS.
3. **Put the workflow file on `main` too.** GitHub runs a nightly schedule only from the default
   branch's copy, and the merge trigger from the release branch's copy. Adding it to `main` does not
   start the old `Deploy Frontend Website` workflow (that one watches `frontend/**` only).
4. **Turn off the Jenkins nightly:** push the updated `Jenkinsfile` (no `triggers` block), then run the
   Jenkins job once (untick **DEPLOY** for a build-only run) so Jenkins forgets the schedule. Until then
   both would upload at 00:05.
5. **Test:** Actions → Website release → **Run workflow**. Green = live. The next morning, check that
   the 00:05 run is green.

## New release branch

Change the `WEBSITE_BRANCH` variable (e.g. to `develop/1.0.55`). No code change.

## Good to know

- Uses GitHub Actions minutes: a run takes a few minutes (build ~1 min + one zip). Private
  repositories get 2,000 free minutes a month on the free plan; public ones are unlimited.
- GitHub turns a schedule off after 60 days with no activity in a **public** repository; any commit
  turns it back on.
- Failed run: open it → the red step → the last lines say what failed. GitHub also emails the repo
  owner. If the backup fails, nothing on the site changes. A leftover `_zd_*.php` / `_zd_*.zip` in the
  site folder (only if a run was killed mid-way) is safe to delete; the script answers 404 without its key.
- Backups and restore are the same as the Jenkins job: [`JENKINS.md`](JENKINS.md) → Backups.
- The old `Deploy Frontend Website` workflow (push to `main`) uses a different uploader that does not
  update `.deploy-manifest.json`; don't release the website through `main`.
