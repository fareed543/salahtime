import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AzanAlarmNative } from '../plugins/azan-alarm.plugin';
import { ReminderPermissions } from '../plugins/reminder-permissions.plugin';

export type ReminderPermissionKey = 'notifications' | 'exactAlarms' | 'battery' | 'fullScreen';

export type ReminderPermissionStatus = Record<ReminderPermissionKey, boolean>;

const AUTOSTART_MANUFACTURERS = ['xiaomi', 'redmi', 'poco', 'oppo', 'realme', 'vivo', 'iqoo', 'oneplus', 'huawei', 'honor', 'tecno', 'infinix', 'itel'];

/** Longest wait for the user to come back from a system settings screen. */
const SETTINGS_RETURN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Everything Android needs for azan to ring on time: notification permission, exact alarms
 * ("Alarms & reminders"), a battery-optimisation exemption and, on Android 14+, full-screen alarms
 * (the azan Stop screen over the lock screen; Google Play can switch it off). On web only
 * notifications apply.
 */
@Injectable({ providedIn: 'root' })
export class ReminderPermissionsService {
  readonly isNative = Capacitor.isNativePlatform();
  private readonly isAndroid = Capacitor.getPlatform() === 'android';

  get applicableKeys(): ReminderPermissionKey[] {
    if (!this.isNative) {
      return ['notifications'];
    }
    // fullScreen last: its settings screen does not report back, so it must not open under another one.
    return this.isAndroid ? ['notifications', 'exactAlarms', 'battery', 'fullScreen'] : ['notifications', 'exactAlarms', 'battery'];
  }

  async getStatus(): Promise<ReminderPermissionStatus> {
    const [notifications, exactAlarms, battery, fullScreen] = await Promise.all([
      this.hasNotificationPermission(),
      this.hasExactAlarms(),
      this.hasBatteryExemption(),
      this.hasFullScreenAlarm()
    ]);

    return { notifications, exactAlarms, battery, fullScreen };
  }

  /**
   * These OEMs block background work beyond Android's battery optimisation through their own
   * "Autostart" switch, which apps cannot request. Users have to turn it on themselves.
   */
  async needsAutostartHint(): Promise<boolean> {
    if (!this.isNative) {
      return false;
    }

    try {
      const manufacturer = (await ReminderPermissions.getBatteryOptimizationStatus()).manufacturer ?? '';
      return AUTOSTART_MANUFACTURERS.some((name) => manufacturer.includes(name));
    } catch {
      return false;
    }
  }

  async request(key: ReminderPermissionKey): Promise<boolean> {
    switch (key) {
      case 'notifications':
        return this.requestNotificationPermission();
      case 'exactAlarms':
        return this.requestExactAlarms();
      case 'battery':
        return this.requestBatteryExemption();
      case 'fullScreen':
        return this.requestFullScreenAlarm();
    }
  }

  private async hasFullScreenAlarm(): Promise<boolean> {
    if (!this.isAndroid) {
      return true;
    }

    try {
      return (await AzanAlarmNative.getFullScreenStatus()).allowed;
    } catch {
      return true;
    }
  }

  private async requestFullScreenAlarm(): Promise<boolean> {
    if (await this.hasFullScreenAlarm()) {
      return true;
    }

    try {
      // Opens Android's "Full-screen notifications" screen for SalahTime; it resolves at once,
      // so wait until the user is back in the app before checking again.
      const back = this.waitForReturnToApp();
      await AzanAlarmNative.openFullScreenSettings();
      await back;
    } catch (error) {
      console.warn('[ReminderPermissions] Full-screen settings failed', error);
    }
    return this.hasFullScreenAlarm();
  }

  /** Resolves when the app is hidden by a settings screen and then visible again (or after a time-out). */
  private waitForReturnToApp(): Promise<void> {
    return new Promise((resolve) => {
      let wasHidden = false;
      const done = () => {
        document.removeEventListener('visibilitychange', onChange);
        clearTimeout(timer);
        resolve();
      };
      const onChange = () => {
        if (document.hidden) {
          wasHidden = true;
        } else if (wasHidden) {
          done();
        }
      };
      const timer = setTimeout(done, SETTINGS_RETURN_TIMEOUT_MS);
      document.addEventListener('visibilitychange', onChange);
    });
  }

  private async hasNotificationPermission(): Promise<boolean> {
    try {
      return (await LocalNotifications.checkPermissions()).display === 'granted';
    } catch {
      return false;
    }
  }

  private async requestNotificationPermission(): Promise<boolean> {
    try {
      const current = await LocalNotifications.checkPermissions();
      const result = current.display === 'granted' ? current : await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch {
      return false;
    }
  }

  private async hasExactAlarms(): Promise<boolean> {
    if (!this.isNative) {
      return true;
    }

    try {
      return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      // Older Android versions have no exact-alarm toggle; alarms are exact by default.
      return true;
    }
  }

  private async requestExactAlarms(): Promise<boolean> {
    if (await this.hasExactAlarms()) {
      return true;
    }

    try {
      // Opens Android's "Alarms & reminders" screen; resolves when the user returns.
      return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      return this.hasExactAlarms();
    }
  }

  private async hasBatteryExemption(): Promise<boolean> {
    if (!this.isNative) {
      return true;
    }

    try {
      return (await ReminderPermissions.getBatteryOptimizationStatus()).ignoring;
    } catch {
      return true;
    }
  }

  private async requestBatteryExemption(): Promise<boolean> {
    if (!this.isNative) {
      return true;
    }

    try {
      return (await ReminderPermissions.requestIgnoreBatteryOptimizations()).ignoring;
    } catch {
      return this.hasBatteryExemption();
    }
  }
}
