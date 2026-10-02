# LLD — N-<CapabilityName> (Native / Capacitor)

| Field | Value |
|---|---|
| **Mode** | As-built / Delta for <CR-nnn> |
| **Plugin** | `@capacitor/<plugin>` <version> |
| **Wrapped by** | `<Service>` (`frontend/src/app/services/<file>`) |
| **Patched?** | <`tools/patch-local-notifications.js` / No> |

## Android Configuration

| Item | Value | File |
|---|---|---|
| Permission | <`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`> | `android/app/src/main/AndroidManifest.xml` |
| Channel ID | <`zikar_v5_<sound>`> (immutable — bump on change) | `notification.service.ts` |
| Raw asset | <`subhanallah.mp3`> — **also listed in `res/raw/keep.xml`** | `android/app/src/main/res/raw/` |
| Icon | <`ic_stat_salah`> | `capacitor.config.ts` |

## Behaviour

| Scenario | Web | Android |
|---|---|---|
| <permission granted> | <…> | <…> |
| <permission denied> | <…> | <…> |
| <app killed / device rebooted> | — | <…> |

## Verification on Device

- [ ] <built release APK contains the asset>
- [ ] <behaviour checked on Android version N>
