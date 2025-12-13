import { KeyValue } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { WaqtService } from '../waqt.service';
import { PrayerTime, PrayerKey } from './salah.model';
import { SalahSettings, SettingsService } from '../settings/settings.service';
import { LocationService } from '../location.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  currentSalah: PrayerKey | null = null;
  prayerTimes: Record<PrayerKey, PrayerTime> = {} as any;

  loading = false;
  errorMessage: string | null = null;

  settings!: SalahSettings;
  private lastLocation: { lat: number; lng: number } | null = null;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone,
    private settingsService: SettingsService,
    private locationService: LocationService // ✅ Inject service
  ) {}

  // Sorting order for view
  originalOrder = (
    a: KeyValue<PrayerKey, PrayerTime>,
    b: KeyValue<PrayerKey, PrayerTime>
  ): number => {
    const order: PrayerKey[] = [
      'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
      'dhuhr', 'asr', 'gurub', 'iftar', 'maghrib',
      'awabin', 'isha', 'tahajjud'
    ];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  ngOnInit(): void {
    // 🔥 Live settings update
    this.settingsService.settings$.subscribe((settings: SalahSettings) => {
      this.settings = settings;
      this.recalculateIfNeeded();
    });

    // Initial load
    this.getLocationAndTimes();

    // Update current Salah every 60s
    setInterval(() => this.highlightCurrentSalah(), 60000);
  }

  /** Recalculate times if settings change AND location is available */
  private recalculateIfNeeded() {
    if (this.lastLocation) {
      this.computePrayerTimes(this.lastLocation.lat, this.lastLocation.lng);
    }
  }

  /** Get location + prayer times using LocationService */
  async getLocationAndTimes() {
    this.loading = true;
    this.errorMessage = null;

    try {
      const pos = await this.locationService.getLocation();

      this.ngZone.run(() => {
        this.lastLocation = { lat: pos.lat, lng: pos.lng };
        this.computePrayerTimes(pos.lat, pos.lng);
      });

    } catch (err) {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  /** Optional: force refresh location */
  async refreshLocation() {
    this.locationService.clearCache();
    await this.getLocationAndTimes();
  }

  /** Compute prayer times */
  computePrayerTimes(lat: number, lng: number) {
    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const date = new Date();
    const method = this.settings?.calculationMethod ?? 'karachi';

    const times = this.waqtService.getTimes(date, lat, lng, tzOffset, method);

    const parsed: Record<PrayerKey, PrayerTime> = {} as any;

    (Object.keys(times) as PrayerKey[]).forEach((key: PrayerKey) => {
      parsed[key] = {
        start: new Date(times[key].start),
        end: new Date(times[key].end),
        type: times[key].type,
         icon: times[key].icon,    
         color: times[key].color  
      };
    });

    this.prayerTimes = parsed;
    this.loading = false;

    this.highlightCurrentSalah();
  }

  /** Identify current Salah */
  highlightCurrentSalah() {
    if (!this.prayerTimes) return;

    const now = new Date();
    let last: PrayerKey | null = null;

    (Object.entries(this.prayerTimes) as [PrayerKey, PrayerTime][])
      .forEach(([key, value]) => {
        const start = new Date(value.start);
        const end = new Date(value.end);

        if (now >= start && now <= end) {
          this.currentSalah = key;
          return;
        }

        if (now >= start) last = key;
      });

    this.currentSalah = last;
  }

  /** Handle location errors */
  handleLocationError() {
    this.errorMessage =
      'Oops! Unable to access your location. Please enable permissions.';
  }
}
