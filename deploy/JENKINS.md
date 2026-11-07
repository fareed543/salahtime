# Jenkins: build and upload the website (FO) to Hostinger

One Jenkins job builds `frontend/` and uploads it to Hostinger by FTP.

- **Release:** open the job → **Build with Parameters** → **Build**.
- **Every night at 00:05 IST** it runs by itself, so the prayer times in Google's titles stay
  current (CR-006). This needs the Jenkins computer to be switched on at that time.

The work is done by two files already in the repo: `Jenkinsfile` (the steps) and
`deploy/ftp-deploy.js` (the upload).

## Setup (once)

You already have Node.js and Git. Check that Node is version 20 or newer: open Command Prompt and type
`node -v`.

### Step 1: Install Jenkins

1. Download the **Windows** installer from https://www.jenkins.io/download/ (LTS).
2. Run it and keep the defaults.
3. Open **http://localhost:8080**. The first page asks for a password: the installer prints the file
   path where it is saved. Open that file and paste the password.
4. Click **Install suggested plugins**, then create your admin user.

### Step 2: Note your Hostinger FTP details

In **hPanel → Files → FTP Accounts**, note the **FTP host**, **username**, **password** and the
**folder** the website is served from (usually `/public_html`). These are the same details your FTP
program uses.

### Step 3: Save the logins in Jenkins

**Manage Jenkins → Credentials → System → Global credentials → Add credentials**

1. **Kind:** Username with password. **Username / Password:** your Hostinger FTP login.
   **ID:** `hostinger-ftp-fo` (type exactly this). **Create.**
2. Add one more: **Username:** your GitHub username. **Password:** a GitHub token (GitHub → Settings →
   Developer settings → Personal access tokens → generate one with *repo* access). **ID:** `github`.
   **Create.**

### Step 4: Tell Jenkins where to upload

**Manage Jenkins → System → Global properties** → tick **Environment variables** → **Add**:

| Name | Value |
|---|---|
| `SALAHTIME_FTP_HOST` | your FTP host, e.g. `ftp.salah-times.in` |
| `SALAHTIME_FO_FTP_DIR` | the website folder, e.g. `/public_html` |

Use the folder as your FTP program shows it after logging in. If the login opens directly inside
`public_html`, use `/`. For SalahTime's FTP account the login opens in the website folder, so the value is `/`. **Save.**

Optional: `SALAHTIME_FTP_SECURE` = `false` if Hostinger refuses a secure (FTPS) connection.

### Step 5: Create the job

1. Jenkins home → **New Item** → name `salahtime-website` → **Pipeline** → **OK**.
2. Scroll to **Pipeline**:
   - **Definition:** Pipeline script from SCM
   - **SCM:** Git
   - **Repository URL:** `https://github.com/fareed543/salahtime.git`
   - **Credentials:** the `github` one from Step 3
   - **Branch Specifier:** `*/feature-dev/1.0.54`
   - **Script Path:** `Jenkinsfile`
3. **Save** → **Build Now** once. This first run builds and uploads with the defaults, and teaches
   Jenkins the options and the nightly schedule. From then on the job shows **Build with Parameters**.

## Releasing

**Build with Parameters** → **Build**. Options:
- **BRANCH:** which branch to build (default `feature-dev/1.0.54`). The nightly run always uses the
  default, so when you start a new release branch, change the default in `Jenkinsfile` and the job's
  Branch Specifier.
- **DEPLOY:** untick to only build and check for errors, without uploading.
- **UPLOAD_PRERENDERED** (on by default; the nightly run needs it): also back up and upload `prerendered/`, the
  ~4,500 SEO pages crawlers get (and the page the site serves first for `/`, `/asr-time`, city
  pages…). Off = those live pages stay as they were and keep working. Hostinger drops the FTP
  connection every few hundred files; the uploader reconnects and carries on, so a run with it on
  takes ~30–45 minutes.

Green = done. Red = open the build → **Console Output**; the last lines say what failed.

## Backups

Before every upload the job zips the live website into `/Backup/FO<yyyymmdd>-<hhmm>.zip` (India
time) on Hostinger. If the backup fails, nothing is uploaded. Only the **2 newest** FO backups are
kept: older FO zips and old hand-made `FO<yyyymmdd>` folders in `/Backup` are deleted. `BO...` and
other backups are never touched. The zip holds the website's own files only (top-level files,
`assets/`, `prerendered/`), not `api/`, `backoffice/` or the backups.

**To restore:** hPanel → File Manager → `/Backup` → extract the zip → copy its contents over the
website folder. Then delete `.deploy-manifest.json` there, so the next release re-sends every file.

Optional settings (Global properties): `SALAHTIME_FO_BACKUP_DIR` (default `/Backup`),
`SALAHTIME_FO_BACKUP_KEEP` (default `2`).

## Good to know

- **The first upload sends everything** (about 4,600 files) and takes 10–20 minutes. After that only
  changed files go up. The uploader keeps a list of what it uploaded in `.deploy-manifest.json` inside
  the website folder on Hostinger. Don't delete that file. If you do, the next run just uploads
  everything again.
- Bundles go up first and HTML pages last, so visitors never get a page whose files are missing.
  Old bundles from earlier uploads are removed. Files the uploader never uploaded are left alone.
- **The nightly run publishes whatever is on the branch at 00:05**, including pushed but unfinished
  work. Push work in progress to a different branch.
- **"node is not recognized" in the console:** Jenkins runs as a Windows service and can't see your
  Node. Restart Jenkins after installing Node (`services.msc` → Jenkins → Restart). If it still
  fails, set the service to log on as your Windows user.
- **Test without uploading anything:**
  `node deploy/ftp-deploy.js frontend/dist/salahtime --dry-run`

## Back office job (BO)

A second job, `salahtime-backoffice`, releases `backoffice/` (built into `dist/oneportal`) to
`/backoffice` on the same FTP account, with the same `hostinger-ftp-fo` credential and
`SALAHTIME_FTP_HOST`. It has no nightly run: release with **Build with Parameters** → **Build**.

- Before uploading it zips the live back office into `/Backup/BO<yyyymmdd>-<hhmm>.zip` and keeps the
  newest 2 BO backups. FO and BO backups share `/Backup` but each only counts its own prefix.
- The build checks that `index.html` and `.htaccess` are in `dist/oneportal`, as
  `backoffice/build-production.bat` does. It does **not** bump the back-office version: the version
  shown is the one committed in `backoffice/src/environment/environment*.ts`.
- Optional settings: `SALAHTIME_BO_FTP_DIR` (default `/backoffice`), `SALAHTIME_BO_BACKUP_DIR`
  (default `/Backup`), `SALAHTIME_BO_BACKUP_KEEP` (default `2`).
- Create it like the website job (Step 5) with name `salahtime-backoffice` and **Script Path**
  `Jenkinsfile.backoffice`.

## Android job (Google Play)

Job `salahtime-android` (`Jenkinsfile.android`) builds the signed app from `frontend/` and publishes it
to Google Play (`com.wallet.salahtime`). Release: **Build with Parameters** → **Build**.

| Option | Meaning |
|---|---|
| `UPLOAD` | Untick to only build. The signed `.aab` and `.apk` are kept with the build in Jenkins (install the `.apk` on a phone to test). |
| `TRACK` | `production` (default), `internal`, `alpha` (Closed testing), `beta` (Open testing). |
| `STATUS` | `completed` = roll out (after Google's review). `draft` = you press **Start rollout** in Play Console. |
| `RELEASE_NOTES` | "What's new" text (English, 500 characters). |

**Version:** with `UPLOAD` ticked, Jenkins asks Play for the highest versionCode ever uploaded and builds
+1, named `1.0.<code>`. With `UPLOAD` unticked it builds the version committed in
`frontend/android/gradle.properties`. Jenkins does not commit the version back to git.

### Setup (once)

Credentials (**Manage Jenkins → Credentials → System → Global**):

| ID | Kind | What |
|---|---|---|
| `play-service-account` | Secret file | Google Play service-account JSON key, with release rights on the app in Play Console → Users and permissions |
| `android-upload-keystore` | Secret file | The upload keystore (`frontend/my-release-key.keystore`) |
| `android-key-alias` | Secret text | Key alias |
| `android-keystore-password` | Secret text | Keystore password |
| `android-key-password` | Secret text | Key password |

Global properties: `SALAHTIME_JAVA_HOME` (JDK 21, e.g. `C:/Program Files/Java/jdk-21`) and
`SALAHTIME_ANDROID_HOME` (Android SDK, e.g. `C:/Users/<you>/AppData/Local/Android/Sdk`).

Create the job like the website job (Step 5) with name `salahtime-android` and **Script Path**
`Jenkinsfile.android`.
