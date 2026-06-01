import { KeyValue } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { delay, filter, Subscription } from 'rxjs';
import { SALAH_ORDER, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import { AppLocation, LocationService } from 'src/app/services/location.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly farzSalahs: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  readonly farzSalahSet = new Set<SalahKey>(this.farzSalahs);
  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly quickActions = [
    { label: 'Qibla', icon: '🕋', route: '/qibla-direction', enabled: true },
    { label: 'Quran', icon: '📗', route: null, enabled: false },
    { label: 'Duas', icon: '🤲', route: null, enabled: false },
    { label: 'Tasbih', icon: '📿', route: null, enabled: false }
  ] as const;
  readonly settingsLinks = [
    {
      title: 'Setup & Troubleshooting',
      subtitle: 'Permissions, location and compass help',
      icon: 'bi-shield-exclamation',
      route: '/settings'
    },
    {
      title: 'Prayer Settings',
      subtitle: 'Adjust calculation method and prayer preferences',
      icon: 'bi-sliders2',
      route: '/settings'
    },
    {
      title: 'View Monthly Timetable',
      subtitle: 'Open the full salah calendar',
      icon: 'bi-calendar2-week',
      route: '/salah-calendar'
    },
    {
      title: 'Help',
      subtitle: 'Read app guidance and information',
      icon: 'bi-question-circle',
      route: '/about'
    }
  ] as const;

  currentSalah: SalahKey | null = null;
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;
  prayedSalahs: Record<SalahKey, boolean> = {} as Record<SalahKey, boolean>;
  activeDate = new Date();
  progressMode: 'week' | 'month' = 'week';

  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;

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
    private router: Router,
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
    this.loadPrayedSalahs();
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
          city: 'Current Location',
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
      console.warn('Location access failed', err);
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
    this.loadPrayedSalahs();

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error('Location not set');
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
        this.loading = false;
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = 'Failed to calculate prayer times.';
      });
    }
  }

  private handleLocationError() {
    this.errorMessage =
      'Please select a city or enable auto location from settings.';
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
  }

  get prayedCount(): number {
    return this.farzSalahs.filter((key) => this.prayedSalahs[key]).length;
  }

  get totalFarzCount(): number {
    return this.farzSalahs.filter((key) => !!this.salahTimeList[key]).length;
  }

  get formattedGregorianDate(): string {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }).format(this.activeDate);
  }

  get formattedHijriDate(): string {
    const hijri = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).formatToParts(this.activeDate);
    const value = hijri
      .filter((part) => ['day', 'month', 'year'].includes(part.type))
      .map((part) => part.value)
      .join(' ');

    return `${value} AH`;
  }

  get monthYearLabel(): string {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric'
    }).format(this.activeDate);
  }

  get progressDays(): Array<{ date: Date; label: string; day: number; isActive: boolean }> {
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
        isActive: this.isSameDay(date, this.activeDate)
      };
    });
  }

  shiftActiveDate(days: number): void {
    const next = new Date(this.activeDate);
    next.setDate(next.getDate() + days);
    this.activeDate = next;
    this.getLocationAndTimes();
  }

  setProgressMode(mode: 'week' | 'month'): void {
    this.progressMode = mode;
  }

  selectProgressDate(date: Date): void {
    this.activeDate = new Date(date);
    this.getLocationAndTimes();
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

  private isSameDay(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  }
}
