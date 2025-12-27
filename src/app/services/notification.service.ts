import { Injectable } from '@angular/core';
import {
  LocalNotifications,
  PendingLocalNotificationSchema
} from '@capacitor/local-notifications';

import { environment } from 'src/environments/environment';

type MainSalah = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly PRAYER_NOTIFICATION_IDS: Record<MainSalah, number> = {
    fajr: 101,
    dhuhr: 102,
    asr: 103,
    maghrib: 104,
    isha: 105,
  };

  /* ------------------------------------------------------------------ */
  /* Permissions                                                         */
  /* ------------------------------------------------------------------ */

  async ensurePermission(): Promise<boolean> {
    const permission = await LocalNotifications.requestPermissions();

    if (permission.display !== 'granted') {
      console.warn('[Notification] Permission not granted');
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Status / UI Notifications                                           */
  /* ------------------------------------------------------------------ */

  async showStatusNotification(title: string, body: string) {
    if (!(await this.ensurePermission())) return;

    await this.scheduleNotification({
      id: Date.now(),
      title,
      body,
      delayMs: 1000
    });
  }

  async showTestNotification() {
    if (!(await this.ensurePermission())) return;

    await this.scheduleNotification({
      id: 999,
      title: 'Test Notification',
      body: 'Notification is working 🎉',
      delayMs: 2000
    });
  }

  /* ------------------------------------------------------------------ */
  /* Salah Notifications                                                 */
  /* ------------------------------------------------------------------ */

  async cancelAllSalahNotifications() {
    await LocalNotifications.cancel({
      notifications: Object.values(this.PRAYER_NOTIFICATION_IDS)
        .map(id => ({ id }))
    });

    console.log('[Notification] Salah notifications cancelled');
  }

  async listScheduledSalahNotifications(): Promise<PendingLocalNotificationSchema[]> {
    const result = await LocalNotifications.getPending();
    const ids = Object.values(this.PRAYER_NOTIFICATION_IDS);

    return result.notifications.filter(n => ids.includes(n.id));
  }

  /* ------------------------------------------------------------------ */
  /* Internal Helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async scheduleNotification(opts: {
    id: number;
    title: string;
    body: string;
    delayMs?: number;
    at?: Date;
  }) {
    const scheduleAt =
      opts.at ?? new Date(Date.now() + (opts.delayMs ?? 0));

    await LocalNotifications.schedule({
      notifications: [{
        id: opts.id,
        title: opts.title,
        body: opts.body,
        schedule: { at: scheduleAt },
        channelId: environment.notificationChannelId,
        smallIcon: 'ic_launcher'
      }]
    });
  }
}
