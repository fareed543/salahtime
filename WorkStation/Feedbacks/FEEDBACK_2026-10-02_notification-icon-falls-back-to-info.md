# FEEDBACK 2026-10-02 — Notifications show a blue "i" instead of the app icon

| Field | Value |
|---|---|
| **Screen** | All notifications (Azan + Zikar) |
| **Severity** | Medium |
| **Status** | Fixed in working tree — device verification pending |

## Symptom

Every SalahTime notification shows Android's blue "i" info icon.

## Root Cause

1. `capacitor.config.ts:10` sets `smallIcon: 'ic_stat_salah'`. The plugin resolves it by name at
   runtime, so release `shrinkResources` (`android/app/build.gradle:31-32`) removes
   `res/drawable/ic_stat_salah.xml`. The lookup then falls back to
   `android.R.drawable.ic_dialog_info` (`node_modules/@capacitor/local-notifications/.../LocalNotificationManager.java:469`).
2. `frontend/.gitignore:51` ignored everything in `res/` except `raw/*.mp3`, so the icon was never
   committed and CI builds (`.github/workflows/android-release.yml`) never had it.
3. The drawable's path data is the default Android robot head, not the SalahTime logo.

## Fix

- Added `@drawable/ic_stat_salah` to `res/raw/keep.xml`.
- Replaced the robot `drawable/ic_stat_salah.xml` with white-on-transparent PNGs traced from the
  app logo `frontend/src/assets/images/logo.png` (note: that file is WebP data with a `.png` name):
  `drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_stat_salah.png` at 24/36/48/72/96 px, artwork inside
  the 22 dp live area. Preview: `evidence/ic_stat_salah-preview.png`.
- `.gitignore` now un-ignores `res/raw/keep.xml` and `res/drawable-*dpi/ic_stat_salah.png` (splash images stay ignored).

## Verification

- [ ] Release APK contains `res/drawable-*/ic_stat_salah.png`.
- [ ] Notification shows the app icon, tinted brand green `#195147` (`capacitor.config.ts` `iconColor`, changed from the old blue `#488AFF`).
