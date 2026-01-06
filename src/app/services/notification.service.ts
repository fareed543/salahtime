import { Injectable } from '@angular/core';
import {
  LocalNotifications,
  PendingLocalNotificationSchema
} from '@capacitor/local-notifications';

import { environment } from 'src/environments/environment';
import { SalahKey } from '../models/salah.model';

type MainSalah = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly PRAYER_NOTIFICATION_IDS: Record<SalahKey, number> = {
    sahri: 201,
    fajr: 202,
    tulu: 203,
    ishraq: 204,
    chast: 205,
    zawal: 206,
    dhuhr: 207,
    asr: 208,
    gurub: 209,
    iftar: 210,
    maghrib: 211,
    awabin: 212,
    isha: 213,
    tahajjud: 214,
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
        schedule: { at: scheduleAt, allowWhileIdle: true },
        channelId: environment.notificationChannelId,
        smallIcon: 'ic_launcher'
      }]
    });
  }
}
