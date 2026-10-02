# FEEDBACK 2026-10-02 — Zikar notification plays no sound in release build

| Field | Value |
|---|---|
| **Screen** | SCR-07 Zikar / Tasbih (DLG-04 Zikar Notification) |
| **Severity** | High |
| **Status** | Fixed in working tree — device verification pending |

## Symptom

The Zikar test notification (and scheduled Zikar reminders) appear without
audio on Android. Adhan notifications on the same build play their sound.

## Root Cause

`frontend/android/app/build.gradle:31-32` enables `minifyEnabled` and
`shrinkResources` for release. Resource shrinking removes any `res/raw` file
not referenced from compiled Java/Kotlin. Sounds are referenced only by name
from JavaScript, so every one of them is a removal candidate.

`frontend/android/app/src/main/res/raw/keep.xml` protected only the 17 Adhan
files. The 12 Zikar files (`subhanallah` … `ya_hayyu_ya_qayyum`) were not
listed, so they were stripped from the release APK and the notification
channel's sound URI pointed at a missing resource.

## Fix

1. Added all 12 Zikar sounds to `tools:keep` in `res/raw/keep.xml`.
2. Bumped the Zikar channel ID prefix `zikar_v4_` → `zikar_v5_` in
   `frontend/src/app/services/notification.service.ts` (`ensureZikarNotificationChannel`),
   because Android channels are immutable and devices that ran the broken
   build already hold the old channels.

## Verification

- [ ] Release APK contains `res/raw/subhanallah.mp3`.
- [ ] Zikar test notification plays the sound on a device (clear data / reinstall if an old install stays silent).

## Prevention

Any new sound file must be added to both `res/raw/` and `res/raw/keep.xml`
(recorded in `Engineering Skills/Environment/Build-and-Release.md`).
