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

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private locationService: LocationService,
    private waqtService: WaqtService,
  ) {}

  ngOnInit(): void {
    this.settingsService.settings$
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(settings => this.initOrUpdateForm(settings!));

    this.loadScheduledNotificationsIfPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
      enableNotifications: [settings.enableNotifications],
      showHijri: [settings.showHijri],
      hijriOffset: [settings.hijriOffset],
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
    } else if (type === 'nafl') {
      title = `${name}`;
      body = `Time: ${startTime} - ${endTime}`;
    } else { // farz
      title = `${name} Salah`;
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
      settings.madhab ?? 'Hanafi'
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
}
