import { KeyValue } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { WaqtService } from '../waqt.service';

import { PrayerTime, PrayerKey } from './salah.model';
import { SalahSettings, SettingsService } from '../settings/settings.service';

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
    private settingsService: SettingsService
  ) {}

  // Sorting order for View
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
    /** 🔥 LIVE SETTINGS UPDATE */
    this.settingsService.settings$.subscribe((settings: SalahSettings) => {
      this.settings = settings;
      this.recalculateIfNeeded();
    });

    /** Initial Load */
    this.getLocationAndTimes();

    /** Update Current Salah Every 60s */
    setInterval(() => this.highlightCurrentSalah(), 60000);
  }

  /** Recalculate times only when settings change AND location is available */
  private recalculateIfNeeded() {
    if (this.lastLocation) {
      this.computePrayerTimes(this.lastLocation.lat, this.lastLocation.lng);
    }
  }

  /** Get Location + Prayer Times */
  async getLocationAndTimes() {
    this.loading = true;
    this.errorMessage = null;

    try {
      const pos = await this.getGeolocation();

      this.ngZone.run(() => {
        this.lastLocation = { lat: pos.latitude, lng: pos.longitude };
        this.computePrayerTimes(pos.latitude, pos.longitude);
      });

    } catch (err) {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  /** Unified Geolocation Helper */
  private async getGeolocation(): Promise<{ latitude: number; longitude: number }> {

    if (Capacitor.getPlatform() === 'web') {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }),
          err => reject(err)
        );
      });
    }

    const perm = await Geolocation.requestPermissions();
    if (perm.location !== 'granted') throw new Error("Location Permission Denied");

    const pos = await Geolocation.getCurrentPosition();
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude
    };
  }

  /** Main Calculation */
  computePrayerTimes(lat: number, lng: number) {
    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const date = new Date();

    const method = this.settings?.calculationMethod ?? 'karachi';

    const times = this.waqtService.getTimes(
      date, lat, lng, tzOffset, method
    );

    const parsed: Record<PrayerKey, PrayerTime> = {} as any;

    (Object.keys(times) as PrayerKey[]).forEach((key: PrayerKey) => {
      parsed[key] = {
        start: new Date(times[key].start),
        end: new Date(times[key].end),
        type: times[key].type
      };
    });

    this.prayerTimes = parsed;
    this.loading = false;

    this.highlightCurrentSalah();
  }

  /** Identify Current Waqt */
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

  handleLocationError() {
    this.errorMessage =
      'Oops! Unable to access your location. Please enable permissions.';
  }
}
