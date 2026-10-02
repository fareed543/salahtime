# FEEDBACK 2026-10-02 — Two Zikar reminders arrive at once; only the first plays

| Field | Value |
|---|---|
| **Screen** | SCR-07 Zikar / Tasbih (DLG-04 Zikar Notification) |
| **Severity** | High |
| **Status** | Fixed in working tree — device verification pending |

## Symptom

Two Zikar notifications appear at the same moment; only the first plays its sound.

## Root Cause

1. `targetSdkVersion = 36` (`frontend/android/variables.gradle`). From Android 14,
   `SCHEDULE_EXACT_ALARM` is denied by default on new installs, and the app never
   asked the user for it.
2. Without it the plugin falls back to an **inexact** alarm
   (`node_modules/@capacitor/local-notifications/.../LocalNotificationManager.java:380-386`,
   `setAndAllowWhileIdle`). Android may defer and **batch** inexact alarms,
   especially in Doze.
3. Zikar slots are 1–10 minutes apart, so consecutive reminders were delivered
   together, and Android's per-app alert rate limit (one sound per ~1 s) silenced
   the second.

## Related design defects fixed at the same time

| Defect | Evidence (before) |
|---|---|
| Only 12 notifications scheduled once (3–4 for a single category); reminders then stopped for good | `notification.service.ts` `scheduleZikarNotifications`, IDs `700 + index` |
| Enabled / interval / category not persisted — screen showed "off" while reminders were still pending | `tasbih.component.ts:33-34` (fields only in memory) |
| Queue never refilled on launch / resume | `prayer-notification-sync.service.ts` (salah only) |
| Dialog always preselected the first category | `zikar-notification-dialog.component.ts` |

## Fix

- **Exact alarms requested** when reminders are enabled
  (`requestExactAlarmsIfNeeded` → `LocalNotifications.changeExactNotificationSetting()`).
- **Rolling queue** of 48 reminders (`ZIKAR_QUEUE_SIZE`), IDs `40000–40047`, anchored to
  the enable time so refills keep the same rhythm and dua order. Sized to keep total
  pending alarms under Android's 500-per-app cap (salah uses up to 420).
- **Refill on launch / resume / midnight** via `PrayerNotificationSyncService.executeSync`.
- **Config persisted** in localStorage `zikar-reminder-config`
  (`enabled`, `category`, `intervalMinutes`, `anchorAt`, `items`); the screen and dialog
  restore it. The counter's own category and counts are left untouched.
- Legacy IDs `700–711` still cancelled so old installs clean up.
- Channels created once per distinct sound.

## Verification

- [x] `npx tsc -p tsconfig.app.json --noEmit` — no errors.
- [ ] On device: enabling reminders opens "Alarms & reminders" when not granted.
- [ ] With 1-minute interval, reminders arrive one per minute, each with its sound.
- [ ] Reopen Zikar screen → reminder state shows ON with saved interval.
- [ ] `adb shell dumpsys alarm | findstr salahtime` shows exact (`RTC_WAKEUP`, window 0) zikar alarms.

## Known limits / follow-ups

- If the user declines exact alarms, Android may still batch reminders — OS behaviour, not fixable in app code.
- Reminder text is translated when reminders are enabled; changing app language later keeps the old text until reminders are saved again.
- Reminders stop after 48 slots if the app is never opened (e.g. 48 min at a 1-minute interval, 8 h at 10 minutes).
