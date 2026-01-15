import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LocationService } from 'src/app/services/location.service';

import { SalahKey, SalahSettings, SettingsData } from 'src/app/models/salah.model';
import { LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';
import { WaqtService } from 'src/app/services/waqt.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {

  farzOffsets = [
    { key: 'fajrOffset', label: 'Fajr' },
    { key: 'dhuhrOffset', label: 'Dhuhr' },
    { key: 'asrOffset', label: 'Asr' },
    { key: 'maghribOffset', label: 'Maghrib' },
    { key: 'ishaOffset', label: 'Isha' },
  ];

  calculationMethods = SettingsData;
  salahSettingsForm!: FormGroup;

  private destroy$ = new Subject<void>();
  private formInitialized = false;

  /** 🔔 Notification IDs for ALL salahs */
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

  scheduledNotifications: any[] = [];

  locationsList: any[] = [];
  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private locationService: LocationService,
    private waqtService: WaqtService,
  ) {}

  ngOnInit(): void {

    this.locationService.getLocationsList().subscribe(data => {
      this.locationsList = data;
    });

    this.settingsService.settings$
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(settings => this.initOrUpdateForm(settings!));

    this.loadScheduledNotificationsIfPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  compareCity = (a: any, b: any): boolean => {
    if (!a || !b) return false;
    return a.city === b.city && a.state === b.state; 
    // or use a unique id if you have one: a.id === b.id
  };

  private initOrUpdateForm(settings: SalahSettings) {
    if (!this.formInitialized) {
      this.buildForm(settings);
      this.formInitialized = true;
      this.handleNotificationToggle(settings.enableNotifications);
    } else {
      this.salahSettingsForm.patchValue(settings, { emitEvent: false });
    }
  }

  private buildForm(settings: SalahSettings) {
    this.salahSettingsForm = this.fb.group({
      calculationMethod: [settings.calculationMethod],
      showNafilSalah: [settings.showNafilSalah],
      showMakruhTime: [settings.showMakruhTime],
      madhab: [settings.madhab],
      locationMode: [settings.locationMode],
      city: [settings.city || null], // 👈 add this
      enableNotifications: [settings.enableNotifications],
      showHijri: [settings.showHijri],
      hijriOffset: [settings.hijriOffset],


      fajrOffset: [settings.fajrOffset ?? 0],
      dhuhrOffset: [settings.dhuhrOffset ?? 0],
      asrOffset: [settings.asrOffset ?? 0],
      maghribOffset: [settings.maghribOffset ?? 0],
      ishaOffset: [settings.ishaOffset ?? 0],
    });

    this.salahSettingsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.settingsService.updateSettings(value));

    this.salahSettingsForm.get('enableNotifications')!
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => this.handleNotificationToggle(enabled));
  }

  private async handleNotificationToggle(enabled: boolean) {
    if (!this.formInitialized) return;

    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return;

    if (enabled) {
      await this.scheduleSalahNotifications();
      setTimeout(() => this.loadScheduledNotifications(), 2000);

      await this.notificationService.showStatusNotification(
        'Notifications Enabled',
        'Salah notifications scheduled 🕌'
      );
    } else {
      await this.notificationService.cancelAllSalahNotifications();
      this.scheduledNotifications = [];
    }
  }

  /** ✅ FINAL scheduling rule */
  private shouldScheduleSalah(
    key: SalahKey,
    salah: { type: string },
    settings: SalahSettings
  ): boolean {

    if (!settings.enableNotifications) return false;

    if (salah.type === 'nafl' && !settings.showNafilSalah) return false;
    if (salah.type === 'makruh' && !settings.showMakruhTime) return false;

    return true;
  }

  /** 🔔 Generate notification title & body including time range */
  private getNotificationContent(
    key: string,
    type: string,
    start: Date,
    end: Date
  ): { title: string; body: string } {
    const name = this.capitalize(key);
    const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let title = '';
    let body = '';

    if (type === 'makruh') {
      title = `${name} Makruh`;
      body = `Makruh time: ${startTime} - ${endTime}`;
    } else if (type === 'nafil') {
      title = `${name}`;
      body = `Time: ${startTime} - ${endTime}`;
    } else { 
      title = `${name}`;
      body = `Time: ${startTime} - ${endTime}`;
    }

    return { title, body };
  }

  private async scheduleSalahNotifications() {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings) return;

    const { lat, lng } = await this.locationService.getLocation();
    const tzOffset = -new Date().getTimezoneOffset() / 60;

    const times = this.waqtService.getTimes(
      new Date(),
      lat,
      lng,
      tzOffset,
      settings.calculationMethod ?? 'karachi',
      settings.madhab ?? 'Hanafi',
      {
        fajrOffset: settings.fajrOffset,
        dhuhrOffset: settings.dhuhrOffset,
        asrOffset: settings.asrOffset,
        maghribOffset: settings.maghribOffset,
        ishaOffset: settings.ishaOffset,
      }
    );

    const notifications: any[] = [];

    (Object.keys(times) as SalahKey[]).forEach(key => {
      const salah = times[key];
      if (!salah) return;

      if (!this.shouldScheduleSalah(key, salah, settings)) return;

      const start = new Date(salah.start);
      const end = new Date(salah.end);
      if (start <= new Date()) return;

      const { title, body } = this.getNotificationContent(key, salah.type, start, end);

      notifications.push({
        id: this.PRAYER_NOTIFICATION_IDS[key],
        title,
        body,
        schedule: { at: start, allowWhileIdle: true },
        channelId: environment.notificationChannelId,
        smallIcon: 'ic_launcher',
      });
    });

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  private async loadScheduledNotificationsIfPermission() {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display === 'granted') {
      await this.loadScheduledNotifications();
    }
  }

  private async loadScheduledNotifications() {
    const pending = await LocalNotifications.getPending();
    this.scheduledNotifications = pending.notifications || [];
  }

  async onReset() {
    await this.settingsService.resetToDefaults();
    await this.notificationService.cancelAllSalahNotifications();
    this.scheduledNotifications = [];
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  async sendTestNotification() {
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const triggerTime = new Date(Date.now() + 5000); // ⏱️ 5 seconds later

  await LocalNotifications.schedule({
      notifications: [
        {
          id: 9999,
          title: 'Test Notification 🕌',
          body: 'This notification was triggered after 5 seconds.',
          schedule: {
            at: triggerTime,
            allowWhileIdle: true,
          },
          channelId: environment.notificationChannelId,
          smallIcon: 'ic_launcher',
        }
      ]
    });
  }


  sendBrowserNotification() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        setTimeout(() => {
          new Notification('Test Notification 🕌', {
            body: 'This is a browser notification'
          });
        }, 3000);
      }
    });
  }


  increment(control: string) {
    const ctrl = this.salahSettingsForm.get(control);
    if (!ctrl) return;
    const val = Number(ctrl.value) || 0;
    ctrl.setValue(val + 1);
  }

  decrement(control: string) {
    const ctrl = this.salahSettingsForm.get(control);
    if (!ctrl) return;
    const val = Number(ctrl.value) || 0;
    ctrl.setValue(Math.max(0, val - 1));
  }

}
