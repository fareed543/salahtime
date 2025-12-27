import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LocationService } from 'src/app/services/location.service';
import { WaqtService } from 'src/app/waqt.service';
import { SalahKey, SalahSettings, SettingsData } from 'src/app/models/salah.model';

import { LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';

type MainSalah = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

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

  /** Fixed IDs for main 5 Salah */
  private readonly PRAYER_NOTIFICATION_IDS: Record<MainSalah, number> = {
    fajr: 101,
    dhuhr: 102,
    asr: 103,
    maghrib: 104,
    isha: 105,
  };

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private locationService: LocationService,
    private waqtService: WaqtService,
  ) {}

  // ----------------------------------
  // Lifecycle
  // ----------------------------------
  ngOnInit(): void {
    this.settingsService.settings$
      .pipe(
        filter(Boolean),
        takeUntil(this.destroy$)
      )
      .subscribe(settings => this.initOrUpdateForm(settings!));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ----------------------------------
  // Form handling
  // ----------------------------------
  private initOrUpdateForm(settings: SalahSettings) {
    if (!this.formInitialized) {
      this.buildForm(settings);
      this.formInitialized = true;

      // Initial toggle handling
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

    // Save settings
    this.salahSettingsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.settingsService.updateSettings(value);
      });

    // Toggle notifications
    this.salahSettingsForm.get('enableNotifications')!
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => this.handleNotificationToggle(enabled));
  }

  // ----------------------------------
  // Notification toggle
  // ----------------------------------
  private async handleNotificationToggle(enabled: boolean) {
    if (!this.formInitialized) return;

    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if (enabled) {
      await this.scheduleSalahNotifications();
      await this.notificationService.showStatusNotification(
        'Notifications Enabled',
        'Salah notifications have been set successfully 🕌'
      );
    } else {
      await this.notificationService.cancelAllSalahNotifications();
      await this.notificationService.showStatusNotification(
        'Notifications Disabled',
        'Salah notifications have been turned off'
      );
    }
  }

  // ----------------------------------
  // Salah scheduling (CORE LOGIC)
  // ----------------------------------
  private async scheduleSalahNotifications() {
    const { lat, lng } = await this.locationService.getLocation();
    const settings = this.settingsService.getCurrentSettings();
    if (!settings) return;

    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const today = new Date();

    const times = this.waqtService.getTimes(
      today,
      lat,
      lng,
      tzOffset,
      settings.calculationMethod ?? 'karachi',
      settings.madhab ?? 'Hanafi'
    );

    const notifications: any[] = [];

    (Object.keys(times) as SalahKey[]).forEach(key => {
      if (!(key in this.PRAYER_NOTIFICATION_IDS)) return;

      const start = new Date(times[key].start);
      if (start <= new Date()) return;

      notifications.push({
        id: this.PRAYER_NOTIFICATION_IDS[key as MainSalah],
        title: `${this.capitalize(key)} Salah`,
        body: `Time for ${this.capitalize(key)} salah`,
        schedule: { at: start },
        channelId: environment.notificationChannelId,
        smallIcon: 'ic_launcher',
      });
    });

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  // ----------------------------------
  // Utils
  // ----------------------------------
  async onReset() {
    await this.settingsService.resetToDefaults();
    await this.notificationService.cancelAllSalahNotifications();
  }

  async scheduleTestNotification() {
    const time = new Date(Date.now() + 2000);
    await LocalNotifications.schedule({
      notifications: [{
        id: 999,
        title: 'Test Notification',
        body: 'Notification is working 🎉',
        schedule: { at: time },
        channelId: environment.notificationChannelId,
        smallIcon: 'ic_launcher',
      }]
    });
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
