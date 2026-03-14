import { KeyValue } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { delay, filter, Subscription } from 'rxjs';
import * as moment from 'moment-hijri';
import { SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import { AppLocation, LocationService } from 'src/app/services/location.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';
import { Router } from '@angular/router';

const SALAH_ORDER: SalahKey[] = [
  'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
  'dhuhr', 'asr', 'gurub', 'maghrib', 'awabin', 'iftar', 'isha', 'tahajjud'
];

@Component({
  selector: 'app-salah-widget',
  templateUrl: './salah-widget.component.html',
  styleUrls: ['./salah-widget.component.scss']
})
export class SalahWidgetComponent implements OnInit, OnDestroy {

  showNafilSalah = false;
  // ------------------------------------------------------
  // Dashboard variables
  // ------------------------------------------------------

  /** Full ordered list of all salah times (for dashboard view) */
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;

  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;

  // ------------------------------------------------------
  // Current-time / widget variables
  // ------------------------------------------------------

  /** Day label, e.g. "Monday" */
  dayOfWeek = '';
  day = '';
  month = '';
  year = '';

  /** The salah key that is currently active */
  currentSalah: SalahKey | null = null;

  /** Human-readable time range of the current salah */
  currentSalahTime = '';

  /** HH:MM:SS countdown to end of current salah */
  countdown = '';

  // ------------------------------------------------------
  // Sorting helpers
  // ------------------------------------------------------

  /** Shows ALL salah in canonical order (dashboard) */
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

  /** Shows only the 5 main salah (widget view) */
  fiveSalahOrder = (
    a: KeyValue<SalahKey, SalahTime>,
    b: KeyValue<SalahKey, SalahTime>
  ): number => {
    const order: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  // ------------------------------------------------------
  // Private state
  // ------------------------------------------------------

  private lastLocation: { lat: number; lng: number } | null = null;
  private isCalculated = false;
  private subs = new Subscription();
  private highlightTimer?: any;
  private countdownTimer?: any;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private router: Router
  ) {}

  // ------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------

  async ngOnInit(): Promise<void> {
    this.updateDates();
    await this.requestLocationFirst();

    // Tick every second for countdown + current salah highlight
    this.countdownTimer = window.setInterval(() => {
      this.updateCurrentSalah();
      this.updateCountdown();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.highlightTimer) clearInterval(this.highlightTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  // ------------------------------------------------------
  // Location bootstrapping
  // ------------------------------------------------------

  private async requestLocationFirst(): Promise<void> {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        this.ngZone.run(() => this.listenToSettings());
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      }
      // ✅ Granted
      this.ngZone.run(() => this.useCurrentLocation());
    } catch {
      // ❌ Denied or error – fall back to saved settings
      this.ngZone.run(() => this.listenToSettings());
    }
  }

  async useCurrentLocation(): Promise<void> {
    try {
      const loc: AppLocation = await this.locationService.getLocation();
      const selection: LocationSelection = {
        source: 'auto',
        city: {
          city: 'Current Location',
          coordinates: { latitude: loc.lat, longitude: loc.lng }
        }
      };
      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({ ...current, location: selection });
      }
    } catch (err) {
      console.warn('Location access failed', err);
    } finally {
      this.listenToSettings();
      this.loading = false;
    }
  }

  // ------------------------------------------------------
  // Settings subscription
  // ------------------------------------------------------

  private listenToSettings(): void {
    const sub = this.settingsService.settings$
      .pipe(filter(s => !!s), delay(0))
      .subscribe(settings => {
        this.settings = settings;
        this.getLocationAndTimes();
      });
    this.subs.add(sub);
  }

  // ------------------------------------------------------
  // Resolve coordinates from settings
  // ------------------------------------------------------

  async getLocationAndTimes(): Promise<void> {
    this.loading = true;
    this.errorMessage = null;
    this.isCalculated = false;

    try {
      const location = this.settings?.location;
      if (!location) throw new Error('Location not set');

      // Both 'manual' and 'auto' are stored identically in coordinates
      const lat = location.city.coordinates.latitude;
      const lng = location.city.coordinates.longitude;

      this.ngZone.run(() => {
        this.lastLocation = { lat, lng };
        this.recalculateIfReady();
      });
    } catch {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  // ------------------------------------------------------
  // Calculation
  // ------------------------------------------------------

  private recalculateIfReady(): void {
    if (!this.lastLocation || !this.settings || this.isCalculated) return;
    this.isCalculated = true;

    // Let spinner render before heavy calculation
    setTimeout(() => this.computeSalahTimes(this.lastLocation!.lat, this.lastLocation!.lng));
  }

  private computeSalahTimes(lat: number, lng: number): void {
    try {
      const tzOffset = -new Date().getTimezoneOffset() / 60;
      const date = new Date();
      const methodId = this.settings!.calculationMethod ?? 'karachi';
      const madhab   = this.settings!.madhab ?? 'Hanafi';

      const times = this.waqtService.getTimes(date, lat, lng, tzOffset, methodId, madhab, {
        sahriOffset:   this.settings!.sahriOffset,
        fajrOffset:    this.settings!.fajrOffset,
        dhuhrOffset:   this.settings!.dhuhrOffset,
        asrOffset:     this.settings!.asrOffset,
        iftarOffset:   this.settings!.iftarOffset,
        maghribOffset: this.settings!.maghribOffset,
        ishaOffset:    this.settings!.ishaOffset
      });

      const parsed: Record<SalahKey, SalahTime> = {} as any;
      (Object.keys(times) as SalahKey[]).forEach(key => {
        parsed[key] = {
          start: new Date(times[key].start),
          end:   new Date(times[key].end),
          type:  times[key].type,
          icon:  times[key].icon,
          color: times[key].color
        };
      });

      this.ngZone.run(() => {
        this.salahTimeList = parsed;
        this.loading = false;
        // Immediately reflect the new times in the current-salah display
        this.updateCurrentSalah();
        this.updateCountdown();
      });
    } catch {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = 'Failed to calculate prayer times.';
      });
    }
  }

  // ------------------------------------------------------
  // Current salah & countdown (from CurrentTimeComponent)
  // ------------------------------------------------------

  updateCurrentSalah(): void {
    const current = this.getCurrentSalahInfo(this.salahTimeList);

    if (!current.key || !current.start || !current.end) {
      this.currentSalah = null;
      this.currentSalahTime = '';
      return;
    }

    this.currentSalah = current.key;
    this.currentSalahTime =
      `${current.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ` +
      `${current.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  updateCountdown(): void {
    const current = this.getCurrentSalahInfo(this.salahTimeList);

    if (!current.key || !current.end) {
      this.countdown = '';
      return;
    }

    const diff = current.end.getTime() - Date.now();

    if (diff <= 0) {
      this.moveToNextSalah(current.index);
      return;
    }

    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    this.countdown = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
  }

  moveToNextSalah(currentIndex: number): void {
    const nextKey  = SALAH_ORDER[(currentIndex + 1) % SALAH_ORDER.length];
    const next     = this.salahTimeList[nextKey];
    if (!next) return;

    const start = new Date(next.start);
    const end   = new Date(next.end);
    if (end <= start) end.setDate(end.getDate() + 1);

    this.currentSalah = nextKey;
    this.currentSalahTime =
      `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ` +
      `${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  getCurrentSalahInfo(salahTimes: Record<SalahKey, SalahTime>): {
    key: SalahKey | null;
    start: Date | null;
    end: Date | null;
    index: number;
  } {
    const now = new Date();

    for (let i = 0; i < SALAH_ORDER.length; i++) {
      const key   = SALAH_ORDER[i];
      const salah = salahTimes[key];
      if (!salah) continue;

      const start = new Date(salah.start);
      const end   = new Date(salah.end);
      if (end <= start) end.setDate(end.getDate() + 1);

      if (now >= start && now < end) {
        return { key, start, end, index: i };
      }
    }

    return { key: null, start: null, end: null, index: -1 };
  }

  // ------------------------------------------------------
  // Date helpers (from CurrentTimeComponent)
  // ------------------------------------------------------

  updateDates(): void {
    const now      = new Date();
    this.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    this.day       = String(now.getDate());
    this.month     = now.toLocaleDateString('en-US', { month: 'long' });
    this.year      = String(now.getFullYear());
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : String(num);
  }

  // ------------------------------------------------------
  // Error handling
  // ------------------------------------------------------

  private handleLocationError(): void {
    this.errorMessage = 'Please select a city or enable auto location from settings.';
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}