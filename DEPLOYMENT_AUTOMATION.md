# Deployment Automation

This repository now includes GitHub Actions workflows to automate your current release flow.

## What is automated

1. `Deploy Frontend Website`
   Builds `frontend/dist/salahtime` and uploads it to your main domain.
2. `Deploy Backoffice Website`
   Builds `backoffice/dist/oneportal` and uploads it to your subdomain.
3. `Build Android Release`
   Builds a signed Android `.aab` and `.apk`, stores them as GitHub Action artifacts, and can optionally upload the `.aab` to Google Play.

## Recommended release flow

1. Push code to the `main` branch.
2. GitHub Actions automatically deploys:
   - `frontend` changes to `https://salah-times.in/`
   - `backoffice` changes to your backoffice subdomain
3. When you need a mobile release, open `Actions` in GitHub and run `Build Android Release`.
4. If Play Store upload is configured, run it with `upload_to_play = true`.

## GitHub secrets to add

Add these in `GitHub -> Settings -> Secrets and variables -> Actions`.

### Frontend deployment secrets

- `FRONTEND_FTP_SERVER`
- `FRONTEND_FTP_USERNAME`
- `FRONTEND_FTP_PASSWORD`
- `FRONTEND_FTP_TARGET_DIR`

### Backoffice deployment secrets

- `BACKOFFICE_FTP_SERVER`
- `BACKOFFICE_FTP_USERNAME`
- `BACKOFFICE_FTP_PASSWORD`
- `BACKOFFICE_FTP_TARGET_DIR`

### Optional Android signing secrets

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

### Optional Play Store upload secret

- `PLAY_STORE_SERVICE_ACCOUNT_JSON`

## Optional GitHub repository variables

If your hosting supports FTPS, add these repository variables:

- `FRONTEND_FTP_PROTOCOL` = `ftps`
- `FRONTEND_FTP_PORT` = `21` or your host port
- `BACKOFFICE_FTP_PROTOCOL` = `ftps`
- `BACKOFFICE_FTP_PORT` = `21` or your host port

If you do not set them, the workflows use plain FTP on port `21`.

## Important note before using Android CI

Your current [frontend/android/gradle.properties](D:\xampp\htdocs\salah-time\frontend\android\gradle.properties) contains a keystore path and passwords in the repository. That is risky.

Recommended next step:

1. Rotate the current keystore passwords.
2. Move signing credentials fully to GitHub Secrets.
3. Keep real secrets out of the repo going forward.

## One issue I noticed

[backoffice/build-apk.bat](D:\xampp\htdocs\salah-time\backoffice\build-apk.bat) points to `D:\apps\oneportal`, but this repository's backoffice app is under `D:\xampp\htdocs\salah-time\backoffice`. Also, there is no `backoffice/android` folder right now, so Android automation is only ready for `frontend`.

## First test plan

1. Push these workflow files to GitHub.
2. Add the FTP secrets.
3. Run `Deploy Frontend Website` manually once.
4. Confirm the uploaded `server-dir` is correct.
5. Run `Deploy Backoffice Website` manually once.
6. After that, normal pushes to `main` should deploy automatically.
