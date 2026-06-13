import { KeyValue } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { delay, filter, Subscription } from 'rxjs';
import { SALAH_DETAILS, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { DialogService } from 'src/app/services/dialog.service';
import { AppLocation, LocationService } from 'src/app/services/location.service';
import { NotificationService, SalahReminderPreference } from 'src/app/services/notification.service';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';
import { MatDialog } from '@angular/material/dialog';
import { AzanReminderDialogComponent } from 'src/app/shared/azan-reminder-dialog/azan-reminder-dialog.component';

@Component({
  selector: 'app-salahtime',
  templateUrl: './salahtime.component.html',
  styleUrls: ['./salahtime.component.scss']
})
export class SalahtimeComponent implements OnInit, OnDestroy {
  readonly salahNameKeys: Partial<Record<SalahKey, string>> = {
    sahri: 'SAHRI',
    fajr: 'FAJR',
    tulu: 'DASHBOARD.SALAH_NAMES.TULU',
    ishraq: 'ISHRAQ',
    chast: 'CHAST',
    zawal: 'ZAWAL',
    dhuhr: 'DHUHR',
    asr: 'ASR',
    gurub: 'DASHBOARD.SALAH_NAMES.GURUB',
    iftar: 'IFTAR',
    maghrib: 'MAGHRIB',
    awabin: 'AWABIN',
    isha: 'ISHA',
    tahajjud: 'TAHAJJUD'
  };
  currentSalah: SalahKey | null = null;
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;

  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;
  showSettingsDialog = false;
  reminderPreferences: Partial<Record<SalahKey, SalahReminderPreference>> = {};

  private lastLocation: { lat: number; lng: number } | null = null;
  private isCalculated = false;

  private subs = new Subscription();
  private highlightTimer?: any;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone,
    private dialogService: DialogService,
    private matDialog: MatDialog,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private notificationService: NotificationService,
    private i18n: AppTranslateService,
  ) {}

  originalOrder = (
    a: KeyValue<SalahKey, SalahTime>,
    b: KeyValue<SalahKey, SalahTime>
  ): number => {
    const order: SalahKey[] = [
      'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
      'dhuhr', 'asr', 'gurub', 'iftar', 'maghrib',
      'awabin', 'isha', 'tahajjud'
    ];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  async ngOnInit() {
    this.loadReminderPreferences();
    await this.requestLocationFirst();
  }

  private async requestLocationFirst() {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        this.ngZone.run(() => {
          this.listenToSettings();
        });
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      }

      this.ngZone.run(() => { this.useCurrentLocation(); });
    } catch (error) {
      this.ngZone.run(() => {
        this.listenToSettings();
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.highlightTimer) {
      clearInterval(this.highlightTimer);
    }
  }

  async useCurrentLocation(): Promise<void> {
    try {
      const loc: AppLocation = await this.locationService.getLocation();
      const selection: LocationSelection = {
        source: 'auto',
        city: {
          city: this.i18n.translateWithParams('DASHBOARD.CURRENT_LOCATION', {}),
          coordinates: {
            latitude: loc.lat,
            longitude: loc.lng
          }
        }
      };
      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          location: selection
        });
      }
    } catch (err) {
      console.warn(this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_ACCESS_FAILED', {}), err);
    } finally {
      this.listenToSettings();
      this.loading = false;
    }
  }

  private listenToSettings() {
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0)
      )
      .subscribe(settings => {
        this.settings = settings;
        this.getLocationAndTimes();
      });

    this.subs.add(sub);
  }

  async getLocationAndTimes() {
    this.loading = true;
    this.errorMessage = null;
    this.isCalculated = false;

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error(this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_NOT_SET', {}));
      }

      const lat = location.city.coordinates.latitude;
      const lng = location.city.coordinates.longitude;

      this.ngZone.run(() => {
        this.lastLocation = { lat, lng };
        this.recalculateIfReady();
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  private recalculateIfReady() {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    setTimeout(() => {
      this.computeSalahTimes(
        this.lastLocation!.lat,
        this.lastLocation!.lng
      );
    });
  }

  private computeSalahTimes(lat: number, lng: number) {
    try {
      const tzOffset = -new Date().getTimezoneOffset() / 60;
      const date = new Date();

      const methodId = this.settings!.calculationMethod ?? 'karachi';
      const madhab = this.settings!.madhab ?? 'Hanafi';

      const times = this.waqtService.getTimes(
        date,
        lat,
        lng,
        tzOffset,
        methodId,
        madhab,
        {
          sahriOffset: this.settings!.sahriOffset,
          fajrOffset: this.settings!.fajrOffset,
          dhuhrOffset: this.settings!.dhuhrOffset,
          asrOffset: this.settings!.asrOffset,
          iftarOffset: this.settings!.iftarOffset,
          maghribOffset: this.settings!.maghribOffset,
          ishaOffset: this.settings!.ishaOffset
        }
      );

      const parsed: Record<SalahKey, SalahTime> = {} as any;

      (Object.keys(times) as SalahKey[]).forEach(key => {
        parsed[key] = {
          start: new Date(times[key].start),
          end: new Date(times[key].end),
          type: times[key].type,
          icon: times[key].icon,
          color: times[key].color
        };
      });

      this.ngZone.run(() => {
        this.salahTimeList = parsed;
        this.loading = false;
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = this.i18n.translateWithParams('DASHBOARD.ERRORS.FAILED_TO_CALCULATE', {});
      });
    }
  }

  private handleLocationError() {
    this.errorMessage =
      this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_REQUIRED', {});
  }

  canShowSalahDetail(key: SalahKey): boolean {
    return !!SALAH_DETAILS[key];
  }

  openSalahDetail(key: SalahKey): void {
    const salahTime = this.salahTimeList[key];

    if (!salahTime || !this.canShowSalahDetail(key)) {
      return;
    }

    this.dialogService.openSalahDetail(key, salahTime);
  }

  getSalahDisplayName(key: SalahKey): string {
    const translationKey = this.salahNameKeys[key];
    return translationKey ? this.i18n.translateWithParams(translationKey, {}) : (SALAH_DETAILS[key]?.name ?? key);
  }

  getReminderSoundLabel(key: SalahKey): string {
    const preference = this.reminderPreferences[key];
    if (preference?.sound === 'default') {
      return this.i18n.translateWithParams('DASHBOARD.REMINDER.SOUNDS.DEFAULT', {});
    }

    if (preference?.azanId) {
      return preference.azanId
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    return this.i18n.translateWithParams('DASHBOARD.REMINDER.SOUNDS.AZAN', {});
  }

  formatPrayerTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  isReminderEnabled(key: SalahKey): boolean {
    return !!this.reminderPreferences[key]?.enabled;
  }

  async onReminderIconClick(key: SalahKey): Promise<void> {
    if (this.isReminderEnabled(key)) {
      await this.disableReminder(key);
      return;
    }

    const preference = this.notificationService.getReminderPreference(key);
    const dialogRef = this.matDialog.open(AzanReminderDialogComponent, {
      autoFocus: false,
      panelClass: 'azan-reminder-dialog-panel',
      data: {
        selectedAzanId: preference.sound === 'azan' ? (preference.azanId ?? 'default') : 'default',
        salahName: this.getSalahDisplayName(key)
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result?.azanId) {
        return;
      }

      const permissionGranted = await this.notificationService.ensurePermission();
      if (!permissionGranted) {
        return;
      }

      if (result.azanId !== 'default') {
        await this.notificationService.ensureAzanNotificationChannel(result.azanId);
      }

      this.notificationService.setReminderPreference(key, {
        enabled: true,
        sound: result.azanId === 'default' ? 'default' : 'azan',
        azanId: result.azanId
      });
      this.loadReminderPreferences();

      if (this.settings?.enableNotifications) {
        await this.notificationService.syncSalahNotifications();
      }
    });
  }

  openSettingsDialog(): void {
    this.showSettingsDialog = true;
  }

  closeSettingsDialog(): void {
    this.showSettingsDialog = false;
  }

  private loadReminderPreferences(): void {
    this.reminderPreferences = this.notificationService.getReminderPreferences();
  }

  private async disableReminder(key: SalahKey): Promise<void> {
    const current = this.notificationService.getReminderPreference(key);
    this.notificationService.setReminderPreference(key, {
      ...current,
      enabled: false
    });
    this.loadReminderPreferences();

    if (this.settings?.enableNotifications) {
      await this.notificationService.syncSalahNotifications();
    }
  }
}
