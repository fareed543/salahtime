import { KeyValue } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment-hijri';
import { Router } from '@angular/router';
import { delay, filter, Subscription } from 'rxjs';
import { isFriday, SALAH_ORDER, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService, SalahReminderPreference } from 'src/app/services/notification.service';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import { AppLocation, LocationService } from 'src/app/services/location.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';
import { AppTranslateService } from 'src/app/services/translate.service';
import { DialogService } from 'src/app/services/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { AzanReminderDialogComponent } from 'src/app/shared/azan-reminder-dialog/azan-reminder-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly farzSalahs: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  readonly farzSalahSet = new Set<SalahKey>(this.farzSalahs);
  readonly salahNameKeys: Record<SalahKey, string> = {
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
  readonly weekDays = ['DASHBOARD.WEEKDAYS.SUN', 'DASHBOARD.WEEKDAYS.MON', 'DASHBOARD.WEEKDAYS.TUE', 'DASHBOARD.WEEKDAYS.WED', 'DASHBOARD.WEEKDAYS.THU', 'DASHBOARD.WEEKDAYS.FRI', 'DASHBOARD.WEEKDAYS.SAT'];
  readonly quickActions = [
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.PRAYER_TIMES', iconClass: 'bi bi-person-standing', route: '/salahtime', enabled: true },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.QURAN', iconClass: 'bi bi-book', route: null, enabled: false },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.SAHRI_IFTAR', iconClass: 'bi bi-moon-stars', route: '/ramzan', enabled: true },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.TASBIH', iconClass: 'bi bi-flower1', route: '/tasbih', enabled: true },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.QIBLA', iconClass: 'bi bi-compass', route: '/qibla-direction', enabled: true },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.ASMA_UL_HUSNA', iconClass: 'bi bi-stars', route: null, enabled: false },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.DUAS', iconClass: 'bi bi-journal-richtext', route: '/duas', enabled: true },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.ISLAMIC_VIDEOS', iconClass: 'bi bi-collection-play', route: null, enabled: false },
    { labelKey: 'DASHBOARD.QUICK_ACTIONS.LIVE', iconClass: 'bi bi-broadcast', route: null, enabled: false }
  ] as const;
  readonly settingsLinks = [
    {
      titleKey: 'DASHBOARD.SETTINGS_LINKS.SETUP_TITLE',
      subtitleKey: 'DASHBOARD.SETTINGS_LINKS.SETUP_SUBTITLE',
      icon: 'bi-shield-exclamation',
      route: '/settings'
    },
    {
      titleKey: 'DASHBOARD.SETTINGS_LINKS.TIMETABLE_TITLE',
      subtitleKey: 'DASHBOARD.SETTINGS_LINKS.TIMETABLE_SUBTITLE',
      icon: 'bi-calendar2-week',
      route: '/salah-calendar'
    },
    {
      titleKey: 'DASHBOARD.SETTINGS_LINKS.HELP_TITLE',
      subtitleKey: 'DASHBOARD.SETTINGS_LINKS.HELP_SUBTITLE',
      icon: 'bi-question-circle',
      route: '/about'
    }
  ] as const;

  currentSalah: SalahKey | null = null;
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;
  prayedSalahs: Record<SalahKey, boolean> = {} as Record<SalahKey, boolean>;
  activeDate = new Date();
  progressMode: 'week' | 'month' | 'forty' = 'week';

  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;
  showSettingsDialog = false;
  isLoggedIn = false;
  reminderPreferences: Partial<Record<SalahKey, SalahReminderPreference>> = {};

  private lastLocation: { lat: number; lng: number } | null = null;
  private isCalculated = false;

  private subs = new Subscription();
  private highlightTimer?: any;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private localStorageService: LocalStorageService,
    private notificationService: NotificationService,
    private dialogService: DialogService,
    private matDialog: MatDialog,
    private i18n: AppTranslateService,
    private router: Router,
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

  async ngOnInit() {
    this.hydrateLoggedInState();
    this.loadPrayedSalahs();
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

  async getLocationAndTimes(showLoader = true) {
    if (showLoader) {
      this.loading = true;
    }
    this.errorMessage = null;
    this.isCalculated = false;
    this.loadPrayedSalahs();

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error(this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_NOT_SET', {}));
      }

      let lat: number;
      let lng: number;

      if (location.source === 'manual') {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      } else {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      }

      this.ngZone.run(() => {
        this.lastLocation = { lat, lng };
        this.recalculateIfReady(showLoader);
      });
    } catch (error) {
      this.ngZone.run(() => {
        if (showLoader) {
          this.loading = false;
        }
        this.handleLocationError();
      });
    }
  }

  private recalculateIfReady(showLoader = true) {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    setTimeout(() => {
      this.computeSalahTimes(
        this.lastLocation!.lat,
        this.lastLocation!.lng,
        showLoader
      );
    });
  }

  private computeSalahTimes(lat: number, lng: number, showLoader = true) {
    try {
      const tzOffset = -new Date().getTimezoneOffset() / 60;
      const date = new Date(this.activeDate);

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
        this.syncPrayedSalahsWithAvailableTimes();
        if (showLoader) {
          this.loading = false;
        }
      });
    } catch (error) {
      this.ngZone.run(() => {
        if (showLoader) {
          this.loading = false;
        }
        this.errorMessage = this.i18n.translateWithParams('DASHBOARD.ERRORS.FAILED_TO_CALCULATE', {});
      });
    }
  }

  private handleLocationError() {
    this.errorMessage =
      this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_REQUIRED', {});
  }

  isFarzSalah(key: SalahKey): boolean {
    return this.farzSalahSet.has(key);
  }

  isPrayed(key: SalahKey): boolean {
    return !!this.prayedSalahs[key];
  }

  togglePrayed(key: SalahKey): void {
    if (!this.isFarzSalah(key)) {
      return;
    }

    this.prayedSalahs = {
      ...this.prayedSalahs,
      [key]: !this.prayedSalahs[key]
    };
    this.persistPrayedSalahs();
    this.refreshProgressState();
  }

  openSalahDetail(key: SalahKey): void {
    const salahTime = this.salahTimeList[key];

    if (!salahTime) {
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

      const enabled = await this.notificationService.enableReminderAndSync(key, {
        enabled: true,
        sound: result.azanId === 'default' ? 'default' : 'azan',
        azanId: result.azanId
      });

      if (enabled) {
        this.loadReminderPreferences();
      }
    });
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

  markAllAsPrayed(): void {
    const nextState = { ...this.prayedSalahs };

    this.farzSalahs.forEach((key) => {
      if (this.salahTimeList[key]) {
        nextState[key] = true;
      }
    });

    this.prayedSalahs = nextState;
    this.persistPrayedSalahs();
    this.refreshProgressState();
  }

  markTrackedAsPrayed(): void {
    const nextState = { ...this.prayedSalahs };

    this.trackedFarzKeys.forEach((key) => {
      if (this.salahTimeList[key]) {
        nextState[key] = true;
      }
    });

    this.prayedSalahs = nextState;
    this.persistPrayedSalahs();
    this.refreshProgressState();
  }

  get prayedCount(): number {
    return this.farzSalahs.filter((key) => this.prayedSalahs[key]).length;
  }

  get totalFarzCount(): number {
    return this.farzSalahs.filter((key) => !!this.salahTimeList[key]).length;
  }

  get trackedFarzKeys(): SalahKey[] {
    const now = new Date();

    return this.farzSalahs.filter((key) => {
      const salah = this.salahTimeList[key];
      if (!salah) {
        return false;
      }

      if (this.isSameDay(this.activeDate, now)) {
        return salah.start.getTime() <= now.getTime();
      }

      return this.activeDate.getTime() < now.getTime();
    });
  }

  get trackedCount(): number {
    return this.trackedFarzKeys.length;
  }

  get trackedPrayedCount(): number {
    return this.trackedFarzKeys.filter((key) => this.prayedSalahs[key]).length;
  }

  get allTrackedPrayed(): boolean {
    return this.trackedCount > 0 && this.trackedPrayedCount === this.trackedCount;
  }

  get progressRingValue(): number {
    if (!this.trackedCount) {
      return 0;
    }

    return Math.round((this.trackedPrayedCount / this.trackedCount) * 100);
  }

  get formattedGregorianDate(): string {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }).format(this.activeDate);
  }

  get formattedHijriDate(): string {
    const hijriParts = this.getHijriDateParts(this.activeDate);

    return this.i18n.formatHijriDate(hijriParts);
  }

  get monthYearLabel(): string {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric'
    }).format(this.activeDate);
  }

  get progressDays(): Array<{ date: Date; label: string; day: number; isActive: boolean; progress: number }> {
    const baseDate = new Date(this.activeDate);
    const todayIndex = baseDate.getDay();
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - todayIndex);

    return this.weekDays.map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        label,
        day: date.getDate(),
        isActive: this.isSameDay(date, this.activeDate),
        progress: this.getProgressForDate(date)
      };
    });
  }

  get monthProgressDays(): Array<{ date: Date; day: number; isActive: boolean; isCurrentMonth: boolean; progress: number }> {
    const startOfMonth = new Date(this.activeDate.getFullYear(), this.activeDate.getMonth(), 1);
    const endOfMonth = new Date(this.activeDate.getFullYear(), this.activeDate.getMonth() + 1, 0);
    const start = new Date(startOfMonth);
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(endOfMonth);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const days: Array<{ date: Date; day: number; isActive: boolean; isCurrentMonth: boolean; progress: number }> = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const date = new Date(cursor);
      days.push({
        date,
        day: date.getDate(),
        isActive: this.isSameDay(date, this.activeDate),
        isCurrentMonth: date.getMonth() === this.activeDate.getMonth(),
        progress: this.getProgressForDate(date)
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  get fortyDayCurrentStreak(): number {
    const state = this.getFortyDayStreakState();
    return state.streak;
  }

  get fortyDayProgressDays(): Array<{ dayNumber: number; progress: number; complete: boolean; isCurrent: boolean }> {
    const state = this.getFortyDayStreakState();
    const streak = state.streak;

    return Array.from({ length: 40 }, (_, index) => {
      const dayNumber = index + 1;
      return {
        dayNumber,
        progress: dayNumber <= streak ? 100 : 0,
        complete: dayNumber <= streak,
        isCurrent: dayNumber === state.nextDay
      };
    });
  }

  get fortyDayTargetReached(): boolean {
    return this.fortyDayCurrentStreak >= 40;
  }

  get fortyDayDaysLeft(): number {
    return Math.max(40 - this.fortyDayCurrentStreak, 0);
  }

  get progressDateLabel(): string {
    if (this.progressMode === 'month') {
      return this.monthYearLabel;
    }

    if (this.progressMode === 'forty') {
      return this.i18n.translateWithParams('DASHBOARD.FORTY_DAY.CURRENT_DAY', {
        day: this.getFortyDayStreakState().nextDay
      });
    }

    const week = this.progressDays;
    if (!week.length) {
      return this.monthYearLabel;
    }

    const first = week[0].date;
    const last = week[week.length - 1].date;
    const sameYear = first.getFullYear() === last.getFullYear();
    const sameMonth = sameYear && first.getMonth() === last.getMonth();

    if (sameMonth) {
      return `${new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(first)} ${first.getDate()} - ${last.getDate()} ${last.getFullYear()}`;
    }

    if (sameYear) {
      return `${new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(first)} ${first.getDate()} - ${new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(last)} ${last.getDate()} ${last.getFullYear()}`;
    }

    return `${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).format(first)} - ${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).format(last)}`;
  }

  shiftActiveDate(days: number): void {
    const next = new Date(this.activeDate);
    next.setDate(next.getDate() + days);
    this.activeDate = next;
    this.getLocationAndTimes(false);
  }

  shiftProgressWindow(direction: -1 | 1): void {
    if (this.progressMode === 'forty') {
      return;
    }

    const next = new Date(this.activeDate);

    if (this.progressMode === 'month') {
      next.setMonth(next.getMonth() + direction);
    } else {
      next.setDate(next.getDate() + (direction * 7));
    }

    this.activeDate = next;
    this.getLocationAndTimes(false);
  }

  setProgressMode(mode: 'week' | 'month' | 'forty'): void {
    this.progressMode = mode;
    this.refreshProgressState();
  }

  selectProgressDate(date: Date): void {
    this.activeDate = new Date(date);
    this.getLocationAndTimes(false);
  }

  private refreshProgressState(): void {
    this.prayedSalahs = { ...this.prayedSalahs };
  }

  openQuickAction(route: string | null, enabled: boolean): void {
    if (!enabled || !route) {
      return;
    }

    void this.router.navigate([route]);
  }

  openRoute(route: string): void {
    void this.router.navigate([route]);
  }

  openSettingsDialog(): void {
    this.showSettingsDialog = true;
  }

  closeSettingsDialog(): void {
    this.showSettingsDialog = false;
  }

  private getFortyDayStreakState(): { streak: number; nextDay: number } {
    let streak = 0;
    let anchor = new Date(this.activeDate);

    while (streak < 40 && !this.isDateFullyCompleted(anchor)) {
      anchor.setDate(anchor.getDate() - 1);
      if (this.daysBetween(anchor, this.activeDate) > 40) {
        return { streak: 0, nextDay: 1 };
      }
    }

    for (let index = 0; index < 40; index += 1) {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() - index);

      if (!this.isDateFullyCompleted(date)) {
        break;
      }

      streak += 1;
    }

    return {
      streak,
      nextDay: Math.min(streak + 1, 40)
    };
  }

  private loadReminderPreferences(): void {
    this.reminderPreferences = this.notificationService.getReminderPreferences();
  }

  private get prayedSalahStorageKey(): string {
    const year = this.activeDate.getFullYear();
    const month = String(this.activeDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.activeDate.getDate()).padStart(2, '0');
    return `dashboard-prayed-salahs-${year}-${month}-${day}`;
  }

  private loadPrayedSalahs(): void {
    const saved =
      this.localStorageService.getItem<Partial<Record<SalahKey, boolean>>>(
        this.prayedSalahStorageKey
      ) ?? {};

    const nextState = {} as Record<SalahKey, boolean>;
    SALAH_ORDER.forEach((key) => {
      nextState[key] = !!saved[key];
    });

    this.prayedSalahs = nextState;
  }

  private syncPrayedSalahsWithAvailableTimes(): void {
    const nextState = { ...this.prayedSalahs };

    this.farzSalahs.forEach((key) => {
      if (!this.salahTimeList[key]) {
        nextState[key] = false;
      }
    });

    this.prayedSalahs = nextState;
    this.persistPrayedSalahs();
  }

  private persistPrayedSalahs(): void {
    this.localStorageService.setItem(this.prayedSalahStorageKey, this.prayedSalahs);
  }

  private getProgressForDate(date: Date): number {
    const saved = this.localStorageService.getItem<Partial<Record<SalahKey, boolean>>>(
      this.getPrayedSalahStorageKey(date)
    ) ?? {};
    const prayed = this.farzSalahs.filter((key) => !!saved[key]).length;
    return Math.round((prayed / this.farzSalahs.length) * 100);
  }

  private isDateFullyCompleted(date: Date): boolean {
    const saved = this.localStorageService.getItem<Partial<Record<SalahKey, boolean>>>(
      this.getPrayedSalahStorageKey(date)
    ) ?? {};

    return this.farzSalahs.every((key) => !!saved[key]);
  }

  private getPrayedSalahStorageKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `dashboard-prayed-salahs-${year}-${month}-${day}`;
  }

  private isSameDay(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  }

  private daysBetween(first: Date, second: Date): number {
    const start = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    const end = new Date(second.getFullYear(), second.getMonth(), second.getDate());
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
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

    const fallbackDay = Number(fallback.find((part) => part.type === 'day')?.value ?? 1);
    const fallbackMonth = Number(fallback.find((part) => part.type === 'month')?.value ?? 1);
    const fallbackYear = Number(fallback.find((part) => part.type === 'year')?.value ?? 1447);

    return {
      day: Number.isFinite(fallbackDay) ? fallbackDay : 1,
      month: Number.isFinite(fallbackMonth) ? fallbackMonth : 1,
      year: Number.isFinite(fallbackYear) ? fallbackYear : 1447
    };
  }

  private hydrateLoggedInState(): void {
    this.isLoggedIn = this.localStorageService.hasNonEmptyItem('accessToken');
  }
}
