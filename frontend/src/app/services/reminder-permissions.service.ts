import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ReminderPermissions } from '../plugins/reminder-permissions.plugin';

export type ReminderPermissionKey = 'notifications' | 'exactAlarms' | 'battery';

export type ReminderPermissionStatus = Record<ReminderPermissionKey, boolean>;

/**
 * Everything Android needs for azan to ring on time: notification permission, exact alarms
 * ("Alarms & reminders") and a battery-optimisation exemption. On web only notifications apply.
 */
@Injectable({ providedIn: 'root' })
export class ReminderPermissionsService {
  readonly isNative = Capacitor.isNativePlatform();

  get applicableKeys(): ReminderPermissionKey[] {
    return this.isNative ? ['notifications', 'exactAlarms', 'battery'] : ['notifications'];
  }

  async getStatus(): Promise<ReminderPermissionStatus> {
    const [notifications, exactAlarms, battery] = await Promise.all([
      this.hasNotificationPermission(),
      this.hasExactAlarms(),
      this.hasBatteryExemption()
    ]);

    return { notifications, exactAlarms, battery };
  }

  async request(key: ReminderPermissionKey): Promise<boolean> {
    switch (key) {
      case 'notifications':
        return this.requestNotificationPermission();
      case 'exactAlarms':
        return this.requestExactAlarms();
      case 'battery':
        return this.requestBatteryExemption();
    }
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
