import { Component, OnInit } from '@angular/core';
import * as moment from 'moment-hijri';
import { PrayerKey, PrayerTime } from '../../dashboard/salah.model';
import { SalahSettings, SettingsService } from 'src/app/settings/settings.service';
import { WaqtService } from 'src/app/waqt.service';
import { LocationService } from 'src/app/location.service';

@Component({
  selector: 'app-current-time',
  templateUrl: './current-time.component.html',
  styleUrls: ['./current-time.component.scss']
})
export class CurrentTimeComponent implements OnInit {

  dayOfWeek = '';
  day = '';
  month = '';
  year = '';
  islamicDay = '';
  islamicDateNumber = '';
  islamicMonthName = '';
  islamicYear = '';

  // Current Salah
  currentSalah: PrayerKey | null = null;
  currentSalahTime: string = '';
  countdown: string = '';  // ⬅ Countdown display

  prayerTimes: Record<PrayerKey, PrayerTime> = {} as any;
  settings!: SalahSettings;

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private locationService: LocationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateDates();
    this.updateIslamicDate();

    // Load prayer times once settings are available
    this.settingsService.settings$.subscribe(async settings => {
      this.settings = settings;
      await this.loadPrayerTimes();
    });

    // Update countdown every second
    setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /** Load prayer times from WaqtService */
  async loadPrayerTimes() {
    try {
      const location = await this.locationService.getLocation();
      const tzOffset = -new Date().getTimezoneOffset() / 60;
      const date = new Date();
      const method = this.settings?.calculationMethod ?? 'karachi';

      const times = this.waqtService.getTimes(date, location.lat, location.lng, tzOffset, method);

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

      // Immediately set current Salah
      const current = this.waqtService.getCurrentSalah(this.prayerTimes);
      this.currentSalah = current.key;
      this.currentSalahTime = current.timeRange;

      // Initialize countdown
      this.updateCountdown();

    } catch (err) {
      console.error('Failed to load prayer times:', err);
    }
  }

  /** Update countdown until the end of the current Salah */
  updateCountdown() {
    if (!this.currentSalah || !this.prayerTimes[this.currentSalah]) {
      this.countdown = '';
      return;
    }

    const endTime = this.prayerTimes[this.currentSalah].end.getTime();
    const now = new Date().getTime();
    let diff = endTime - now;

    if (diff < 0) {
      this.countdown = '00:00:00';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * (1000 * 60);
    const seconds = Math.floor(diff / 1000);

    this.countdown = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  updateDates() {
    const now = new Date();
    this.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    this.day = now.getDate().toString();
    this.month = now.toLocaleDateString('en-US', { month: 'long' });
    this.year = now.getFullYear().toString();
  }

  updateIslamicDate() {
    const now = moment();
    this.islamicDay = now.format('dddd');
    this.islamicDateNumber = now.format('iD');
    this.islamicMonthName = now.format('iMMMM');
    this.islamicYear = now.format('iYYYY');
  }
}
