import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from 'src/app/services/notification.service';

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
    { key: 'sahriOffset', label: 'Sahri' },
    { key: 'fajrOffset', label: 'Fajr' },
    { key: 'dhuhrOffset', label: 'Dhuhr' },
    { key: 'asrOffset', label: 'Asr' },
    { key: 'iftarOffset', label: 'Iftar' },
    { key: 'maghribOffset', label: 'Maghrib' },
    { key: 'ishaOffset', label: 'Isha' },
  ];

  calculationMethods = SettingsData;
  salahSettingsForm!: FormGroup;

  private destroy$ = new Subject<void>();
  private formInitialized = false;

  /** 🔔 Notification IDs */
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
private lastNotificationHash: string | null = null;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private waqtService: WaqtService
  ) {}

  // ------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------

  ngOnInit(): void {
this.settingsService.settings$
    .pipe(filter(Boolean), takeUntil(this.destroy$))
    .subscribe(settings => {
      this.initOrUpdateForm(settings!);
      this.handleSettingsChangeForNotifications(settings!);
    });

  this.loadScheduledNotificationsIfPermission();
  }

  private async handleSettingsChangeForNotifications(settings: SalahSettings) {
  if (!settings.enableNotifications) return;

  // Create a hash of notification-critical fields
  const hash = JSON.stringify({
    location: settings.location,
    calculationMethod: settings.calculationMethod,
    madhab: settings.madhab,
    offsets: {
      sahri: settings.sahriOffset,
      fajr: settings.fajrOffset,
      dhuhr: settings.dhuhrOffset,
      asr: settings.asrOffset,
      maghrib: settings.maghribOffset,
      iftar: settings.iftarOffset,
      isha: settings.ishaOffset
    },
    showNafil: settings.showNafilSalah,
    showMakruh: settings.showMakruhTime
  });

  // ⛔ No real change → do nothing
  if (hash === this.lastNotificationHash) return;

  this.lastNotificationHash = hash;

  // 🔁 Reschedule notifications
  await this.notificationService.cancelAllSalahNotifications();
  await this.scheduleSalahNotifications();

  setTimeout(() => this.loadScheduledNotifications(), 1000);
}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ------------------------------------------------------
  // Form
  // ------------------------------------------------------

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
      madhab: [settings.madhab],
      location: [settings.location],
      enableNotifications: [settings.enableNotifications],
      showNafilSalah: [settings.showNafilSalah],
      showMakruhTime: [settings.showMakruhTime],
      sahriOffset: [settings.sahriOffset ?? 0],
      fajrOffset: [settings.fajrOffset ?? 0],
      dhuhrOffset: [settings.dhuhrOffset ?? 0],
      asrOffset: [settings.asrOffset ?? 0],
      iftarOffset: [settings.iftarOffset ?? 0],
      maghribOffset: [settings.maghribOffset ?? 0],
      ishaOffset: [settings.ishaOffset ?? 0],
    });

    // ✅ MERGED update (location preserved)
    this.salahSettingsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.settingsService.updateSettings({
          ...value
        });
      });
  }

  // ------------------------------------------------------
  // Notifications
  // ------------------------------------------------------

  private async handleNotificationToggle(enabled: boolean) {
    if (!this.formInitialized) return;

    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return;

    if (enabled) {
      await this.notificationService.cancelAllSalahNotifications();
      await this.scheduleSalahNotifications();
      setTimeout(() => this.loadScheduledNotifications(), 1500);

      await this.notificationService.showStatusNotification(
        'Notifications Enabled',
        'Salah notifications scheduled 🕌'
      );
    } else {
      await this.notificationService.cancelAllSalahNotifications();
      this.scheduledNotifications = [];
    }
  }

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

  private getNotificationContent(
    key: string,
    type: string,
    start: Date,
    end: Date
  ): { title: string; body: string } {
    const name = this.capitalize(key);
    const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      title: type === 'makruh' ? `${name} Makruh` : name,
      body: `Time: ${startTime} - ${endTime}`
    };
  }

  // ------------------------------------------------------
  // 🔑 LOCATION FROM SETTINGS ONLY
  // ------------------------------------------------------

  private async scheduleSalahNotifications() {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings?.location) return;

    let lat: number;
    let lng: number;

    if (settings.location.source === 'manual') {
      lat = settings.location.city.coordinates.latitude;
      lng = settings.location.city.coordinates.longitude;
    } else {
      lat = settings.location.city.coordinates.latitude;
      lng = settings.location.city.coordinates.longitude;
    }

    const tzOffset = -new Date().getTimezoneOffset() / 60;

    const times = this.waqtService.getTimes(
      new Date(),
      lat,
      lng,
      tzOffset,
      settings.calculationMethod ?? 'karachi',
      settings.madhab ?? 'Hanafi',
      {
        sahriOffset: settings!.sahriOffset,
        fajrOffset: settings!.fajrOffset,
        dhuhrOffset: settings!.dhuhrOffset,
        asrOffset: settings!.asrOffset,
        iftarOffset: settings!.iftarOffset,
        maghribOffset: settings!.maghribOffset,
        ishaOffset: settings!.ishaOffset
      }
    );

    const notifications: any[] = [];

    (Object.keys(times) as SalahKey[]).forEach(key => {
      const salah = times[key];
      if (!salah) return;

      if (!this.shouldScheduleSalah(key, salah, settings)) return;

      const start = new Date(salah.start);
      if (start <= new Date()) return;

      const { title, body } =
        this.getNotificationContent(key, salah.type, start, new Date(salah.end));

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

  // ------------------------------------------------------
  // Helpers
  // ------------------------------------------------------

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
    ctrl.setValue(val - 1);
  }
}
