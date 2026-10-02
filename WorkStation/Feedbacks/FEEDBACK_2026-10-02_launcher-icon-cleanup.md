# FEEDBACK 2026-10-02 — Android launcher icon: Gemini artefacts and template background

| Field | Value |
|---|---|
| **Screen** | Android home screen / app drawer / Play Store |
| **Severity** | Medium |
| **Status** | Fixed in working tree — `processReleaseResources` passes; device check pending |

## Findings

| Problem | Evidence |
|---|---|
| Launcher PNGs came from the Gemini image: uneven border + sparkle watermark | `res/mipmap-*/ic_launcher*.png` |
| Adaptive background was the Android Studio template (bright green `#3DDC84` grid) | `res/drawable/ic_launcher_background.xml` |
| Adaptive foreground held the whole rounded-square logo, not just the artwork, so launchers masked a square inside a square | `res/mipmap-*/ic_launcher_foreground.png` |
| `values/ic_launcher_background` was `#FFFFFF` | `res/values/ic_launcher_background.xml:3` |

## Fix (from `play-store-assets/brand/logo-clean-1024.png`)

| File | Sizes (mdpi → xxxhdpi) | Content |
|---|---|---|
| `mipmap-*/ic_launcher_foreground.png` | 108 / 162 / 216 / 324 / 432 | Mint artwork only, transparent, inside the 66 dp safe zone |
| `drawable/ic_launcher_background.xml` | vector | Solid `@color/ic_launcher_background` |
| `values/ic_launcher_background.xml` | — | `#195147` |
| `mipmap-*/ic_launcher.png` | 48 / 72 / 96 / 144 / 192 | Clean rounded-square logo (Android 7 and older) |
| `mipmap-*/ic_launcher_round.png` | 48 / 72 / 96 / 144 / 192 | Green circle + artwork |
| `play-store-assets/brand/play-store-icon-512.png` | 512 | Full-square icon for the Play Console |

Previous files backed up in the session scratchpad (`launcher-backup/`). Preview: `evidence/launcher-icon-preview.png`.

## Note

Only `res/raw/*` (and the notification icon) are tracked in git, so these launcher files live only in the
local Android project. `.github/workflows/android-release.yml` runs `npx cap sync android` on a checkout that
has no Android project, so CI Android builds can't work until the Android project is committed.

## Verification

- [x] `gradlew :app:processReleaseResources` succeeds.
- [ ] Home-screen icon shows the clean logo after installing the new build (some launchers cache icons until reboot).
- [ ] Upload `play-store-icon-512.png` as the Play Store app icon.
