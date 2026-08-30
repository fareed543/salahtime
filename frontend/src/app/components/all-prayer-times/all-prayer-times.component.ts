import { KeyValue } from '@angular/common';
import { Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment-hijri';
import { delay, filter, Subscription } from 'rxjs';
import { getSalahDetail, isFriday, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { DialogService } from 'src/app/services/dialog.service';
import { LocationService } from 'src/app/services/location.service';
import { NotificationService, SalahReminderPreference } from 'src/app/services/notification.service';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';
import { MatDialog } from '@angular/material/dialog';
import { AzanReminderDialogComponent } from 'src/app/shared/azan-reminder-dialog/azan-reminder-dialog.component';

@Component({
  selector: 'app-all-prayer-times',
  templateUrl: './all-prayer-times.component.html',
  styleUrls: ['./all-prayer-times.component.scss']
})
export class AllPrayerTimesComponent implements OnInit, OnDestroy {
  readonly farzPrayerOrder: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  readonly otherPrayerOrder: SalahKey[] = ['tahajjud', 'sahri', 'tulu', 'ishraq', 'chast', 'zawal', 'gurub', 'iftar', 'awabin'];
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

  salahTimeList: Record<SalahKey, SalahTime> = {} as any;
  activeDate = new Date();
  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;
  showSettingsDialog = false;
  reminderPreferences: Partial<Record<SalahKey, SalahReminderPreference>> = {};
  isDesktopView = false;

  private lastLocation: { lat: number; lng: number } | null = null;
  private isCalculated = false;
  private subs = new Subscription();
  private settingsListenerInitialized = false;

  constructor(
    private readonly waqtService: WaqtService,
    private readonly ngZone: NgZone,
    private readonly dialogService: DialogService,
    private readonly matDialog: MatDialog,
    private readonly settingsService: SettingsService,
    private readonly locationService: LocationService,
    private readonly notificationService: NotificationService,
    private readonly i18n: AppTranslateService
  ) {}

  originalOrder = (
    a: KeyValue<SalahKey, SalahTime>,
    b: KeyValue<SalahKey, SalahTime>
  ): number => {
    const order: SalahKey[] = [
      'tahajjud', 'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
      'dhuhr', 'asr', 'gurub', 'iftar', 'maghrib',
      'awabin', 'isha'
    ];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  get farzPrayerCards(): Array<KeyValue<SalahKey, SalahTime>> {
    return this.toPrayerCards(this.farzPrayerOrder);
  }

  get otherPrayerCards(): Array<KeyValue<SalahKey, SalahTime>> {
    return this.toPrayerCards(this.otherPrayerOrder);
  }

  get showPrayerContent(): boolean {
    return !this.isDesktopView;
  }

  async ngOnInit(): Promise<void> {
    this.updateViewportState();
    this.loadReminderPreferences();
    await this.requestLocationFirst();
  }

  @HostListener('window:resize')
  updateViewportState(): void {
    this.isDesktopView = window.innerWidth >= 992;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private async requestLocationFirst(): Promise<void> {
    try {
      await this.useCurrentLocation();
    } finally {
      this.ngZone.run(() => {
        this.listenToSettings();
      });
    }
  }

  async useCurrentLocation(): Promise<void> {
    try {
      const resolved = await this.locationService.resolveEffectiveLocation(true);
      const selection: LocationSelection = resolved.selection;
      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          locationMode: 'auto',
          location: selection,
          city: selection.city
        });
      }
    } catch (err) {
      console.warn(this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_ACCESS_FAILED', {}), err);
    } finally {
      this.listenToSettings();
      this.loading = false;
    }
  }

  private listenToSettings(): void {
    if (this.settingsListenerInitialized) {
      return;
    }

    this.settingsListenerInitialized = true;
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0)
      )
      .subscribe(settings => {
        if (!settings) {
          return;
        }

        this.settings = settings;
        this.getLocationAndTimes();
      });

    this.subs.add(sub);
  }

  async getLocationAndTimes(showLoader = true): Promise<void> {
    if (showLoader) {
      this.loading = true;
    }
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
        this.recalculateIfReady(showLoader);
      });
    } catch {
      this.ngZone.run(() => {
        if (showLoader) {
          this.loading = false;
        }
        this.errorMessage = this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_REQUIRED', {});
      });
    }
  }

  private recalculateIfReady(showLoader = true): void {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    setTimeout(() => {
      this.computeSalahTimes(this.lastLocation!.lat, this.lastLocation!.lng, showLoader);
    });
  }

  private computeSalahTimes(lat: number, lng: number, showLoader = true): void {
    try {
      const country = this.settings?.location?.city?.country;
      const tzOffset = country === 'India'
        ? 5.5
        : country === 'Saudi Arabia'
          ? 3
          : -new Date().getTimezoneOffset() / 60;
      const date = new Date(this.activeDate);

      const times = this.waqtService.getTimes(
        date,
        lat,
        lng,
        tzOffset,
        this.settings!.calculationMethod ?? 'karachi',
        this.settings!.madhab ?? 'Hanafi',
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
        if (showLoader) {
          this.loading = false;
        }
      });
    } catch {
      this.ngZone.run(() => {
        if (showLoader) {
          this.loading = false;
        }
        this.errorMessage = this.i18n.translateWithParams('DASHBOARD.ERRORS.FAILED_TO_CALCULATE', {});
      });
    }
  }

  get formattedGregorianDate(): string {
    return this.i18n.formatDate(this.activeDate, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  get formattedHijriDate(): string {
    const parts = this.getHijriDateParts(this.activeDate);
    return this.i18n.formatHijriDate(parts);
  }

  shiftActiveDate(days: number): void {
    const next = new Date(this.activeDate);
    next.setDate(next.getDate() + days);
    this.activeDate = next;
    this.getLocationAndTimes(false);
  }

  openSettingsDialog(): void {
    this.showSettingsDialog = true;
  }

  closeSettingsDialog(): void {
    this.showSettingsDialog = false;
  }

  openReminderDefaultsDialog(): void {
    const preference = this.notificationService.getGlobalReminderPreference();
    const dialogRef = this.matDialog.open(AzanReminderDialogComponent, {
      autoFocus: false,
      panelClass: 'azan-reminder-dialog-panel',
      data: {
        selectedAzanId: preference.sound === 'azan' ? (preference.azanId ?? 'default') : 'default',
        salahName: this.i18n.translateWithParams('DASHBOARD.REMINDER.DEFAULT_TITLE', {})
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result?.azanId) {
        return;
      }

      this.notificationService.setGlobalReminderPreference({
        sound: result.azanId === 'default' ? 'default' : 'azan',
        azanId: result.azanId
      });
      await this.notificationService.applyGlobalReminderPreferenceToEnabledRemindersAndSync();
      this.loadReminderPreferences();
    });
  }

  canShowSalahDetail(key: SalahKey): boolean {
    return !!getSalahDetail(key, this.activeDate);
  }

  openSalahDetail(key: SalahKey): void {
    const salahTime = this.salahTimeList[key];
    if (!salahTime || !this.canShowSalahDetail(key)) {
      return;
    }

    this.dialogService.openSalahDetail(key, salahTime);
  }

  getSalahDisplayName(key: SalahKey): string {
    if (key === 'dhuhr' && isFriday(this.activeDate)) {
      return this.i18n.translateWithParams('JUMUAH', {});
    }

    const translationKey = this.salahNameKeys[key];
    return translationKey ? this.i18n.translateWithParams(translationKey, {}) : key;
  }

  canShowReminder(key: SalahKey): boolean {
    return this.salahTimeList[key]?.type !== 'makruh';
  }

  isReminderEnabled(key: SalahKey): boolean {
    return !!this.reminderPreferences[key]?.enabled;
  }

  getReminderSoundLabel(key: SalahKey): string {
    const preference = this.reminderPreferences[key];
    if (preference?.sound === 'default') {
      return this.i18n.translateWithParams('DASHBOARD.REMINDER.SOUNDS.DEFAULT', {});
    }

    if (preference?.azanId) {
      return preference.azanId
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    return this.i18n.translateWithParams('DASHBOARD.REMINDER.SOUNDS.AZAN', {});
  }

  async onReminderIconClick(key: SalahKey): Promise<void> {
    if (this.isReminderEnabled(key)) {
      await this.disableReminder(key);
      return;
    }

    const preference = this.notificationService.getGlobalReminderPreference();
    const enabled = await this.notificationService.enableReminderAndSync(key, {
      ...preference,
      enabled: true
    });

    if (enabled) {
      this.loadReminderPreferences();
    }
  }

  formatPrayerTime(date: Date): string {
    return this.i18n.formatPrayerTime(date, (this.settings?.timeFormat ?? '12h') !== '24h');
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
    await this.notificationService.syncSalahNotifications();
  }

  private getHijriDateParts(date: Date): { day: number; month: number; year: number } {
    const hijriDate = moment(date).locale('en');
    const day = Number(hijriDate.format('iD'));
    const month = Number(hijriDate.format('iM'));
    const year = Number(hijriDate.format('iYYYY'));

    if (
      Number.isFinite(day) && day > 0 &&
      Number.isFinite(month) && month >= 1 && month <= 12 &&
      Number.isFinite(year) && year > 0
    ) {
      return { day, month, year };
    }

    const fallback = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);

    return {
      day: Number(fallback.find(part => part.type === 'day')?.value ?? 1),
      month: Number(fallback.find(part => part.type === 'month')?.value ?? 1),
      year: Number(fallback.find(part => part.type === 'year')?.value ?? 1447)
    };
  }

  private toPrayerCards(order: SalahKey[]): Array<KeyValue<SalahKey, SalahTime>> {
    return order
      .filter(key => !!this.salahTimeList[key])
      .map(key => ({
        key,
        value: this.salahTimeList[key]
      }));
  }
}
