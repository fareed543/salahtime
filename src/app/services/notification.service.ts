import { Injectable } from '@angular/core';
import { LocalNotifications, PendingLocalNotificationSchema } from '@capacitor/local-notifications';
import { SalahKey } from '../models/salah.model';
import { environment } from 'src/environments/environment';
import { WaqtService } from './waqt.service';
import { SettingsService } from './settings.service';

type MainSalah = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  // Only main 5 Salah
  private readonly PRAYER_NOTIFICATION_IDS: Record<MainSalah, number> = {
    fajr: 101,
    dhuhr: 102,
    asr: 103,
    maghrib: 104,
    isha: 105,
  };

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService
  ) { }

  /** List all scheduled (pending) notifications */
  async listScheduledNotifications(): Promise<PendingLocalNotificationSchema[]> {
    const result = await LocalNotifications.getPending();
    const salahIds = Object.values(this.PRAYER_NOTIFICATION_IDS);
    const salahNotifications = result.notifications.filter(n =>
      salahIds.includes(n.id)
    );
    return salahNotifications;
  }

  /** Schedule main 5 Salah notifications */
  async scheduleSalahNotifications(lat: number, lng: number) {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings) return;

    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const date = new Date();

    const times = this.waqtService.getTimes(
      date,
      lat,
      lng,
      tzOffset,
      settings.calculationMethod ?? 'karachi',
      settings.madhab ?? 'Hanafi'
    );

    const notifications: any[] = [];

    (Object.keys(times) as SalahKey[]).forEach(key => {
      if (!(key in this.PRAYER_NOTIFICATION_IDS)) return; // only main 5

      const start = new Date(times[key].start);
      if (start <= new Date()) return; // skip past times

      notifications.push({
        id: this.PRAYER_NOTIFICATION_IDS[key as MainSalah],
        title: `${this.capitalize(key)} Salah`,
        body: `Time for ${this.capitalize(key)} salah`,
        schedule: { at: start },
        channelId: environment.notificationChannelId,
        smallIcon: 'ic_launcher', // app icon
        // no sound → system default
      });
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log('Salah notifications scheduled:', notifications);
    }
  }

  /** Cancel all main Salah notifications */
  async cancelAllSalahNotifications() {
    await LocalNotifications.cancel({
      notifications: Object.values(this.PRAYER_NOTIFICATION_IDS).map(id => ({ id }))
    });
    console.log('Salah notifications cancelled');
  }


  private capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }


  async showStatusNotification(title: string, body: string) {
    await LocalNotifications.requestPermissions();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(), // unique id
          title,
          body,
          channelId: environment.notificationChannelId,
          smallIcon: 'ic_launcher',
        },
      ],
    });
  }
}
