# Build & Release Reference — SalahTime

> Never record secret values here. Refer to where they are configured.

## Local Android build — `frontend/build-apk.bat`

1. Bump version (`node tools/bump-app-version.js` → `android/gradle.properties`).
2. `npm run sync:app-version` → environment files.
3. `npm run build:prod` (sitemap is regenerated in `prebuild:prod`).
4. `npx cap copy android` → `npx cap sync android`.
5. `gradlew clean` → `gradlew assembleRelease` (APK) → `gradlew bundleRelease` (AAB).

## CI — GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | Output |
|---|---|---|
| `deploy-frontend.yml` | push to `main` | `frontend/dist/salahtime` → main domain over FTP/FTPS |
| `deploy-backoffice.yml` | push to `main` | `backoffice/dist/oneportal` → back-office subdomain |
| `android-release.yml` | manual | Signed `.apk` + `.aab` artifacts; optional Play upload |

Secrets are listed (names only) in `DEPLOYMENT_AUTOMATION.md` at the repo root.

## Manual EC2 deploy scripts (repo root)

`deploy-api-ec2.bat`, `deploy-backoffice-ec2.bat`, `deploy-frontend-ec2.bat`.

## Release checks for notification changes

- Every new sound file is in `res/raw/` **and** in `res/raw/keep.xml`.
- Any resource looked up by name at runtime (sounds, notification icon `ic_stat_salah`) is in `keep.xml` **and** un-ignored in `frontend/.gitignore`, so CI builds include it.
- Channel ID version bumped if channel sound/importance changed.
- Verify the built APK contains the sound: open it as a zip and check `res/raw/`.
