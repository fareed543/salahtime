import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment-hijri';
import { Subscription } from 'rxjs';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { LocationService } from 'src/app/services/location.service';
import { SalahSettings } from 'src/app/models/settings.model';
import { SalahKey, SalahTime } from 'src/app/models/salah.model';

@Component({
  selector: 'app-current-time',
  templateUrl: './current-time.component.html',
  styleUrls: ['./current-time.component.scss']
})
export class CurrentTimeComponent implements OnInit, OnDestroy {

  dayOfWeek = '';
  day = '';
  month = '';
  year = '';
  islamicDay = '';
  islamicDateNumber = '';
  islamicMonthName = '';
  islamicYear = '';

  currentSalah: SalahKey | null = null;
  currentSalahTime = '';
  countdown = '';

  prayerTimes: Record<SalahKey, SalahTime> = {} as any;
  settings!: SalahSettings;
  private location!: { lat: number; lng: number };

  private settingsSub!: Subscription;
  private timerId!: number;

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private locationService: LocationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateDates();
    this.updateIslamicDate();

    this.location = await this.locationService.getLocation();

    this.settingsSub = this.settingsService.settings$
      .subscribe(settings => {
        if (!settings) return;
        this.settings = settings;
        this.loadSalahTimes();
      });

    this.timerId = window.setInterval(() => {
      this.updateCurrentSalah();
      this.updateCountdown();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
    clearInterval(this.timerId);
  }

  loadSalahTimes() {
    if (!this.settings || !this.location) return;

    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const date = new Date();

    const times = this.waqtService.getTimes(
      date,
      this.location.lat,
      this.location.lng,
      tzOffset,
      this.settings.calculationMethod,
      this.settings.madhab
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

    this.prayerTimes = parsed;
    this.updateCurrentSalah();
  }

  updateCurrentSalah() {
    const current = this.getCurrentSalahWithNext(this.prayerTimes);
    this.currentSalah = current.key;
    this.currentSalahTime = current.timeRange;
  }

  updateCountdown() {
    const current = this.getCurrentSalahWithNext(this.prayerTimes);

    if (!current.nextStart) {
      this.countdown = '';
      return;
    }

    const diff = current.nextStart.getTime() - Date.now();
    if (diff <= 0) {
      this.countdown = '00:00:00';
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    this.countdown = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : String(num);
  }

  updateDates() {
    const now = new Date();
    this.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    this.day = String(now.getDate());
    this.month = now.toLocaleDateString('en-US', { month: 'long' });
    this.year = String(now.getFullYear());
  }

  updateIslamicDate() {
    const now = moment();
    this.islamicDay = now.format('dddd');
    this.islamicDateNumber = now.format('iD');
    this.islamicMonthName = now.format('iMMMM');
    this.islamicYear = now.format('iYYYY');
  }

  /** Enhanced current Salah detection with next prayer info */
  getCurrentSalahWithNext(prayerTimes: Record<SalahKey, SalahTime>): {
    key: SalahKey | null;
    timeRange: string;
    nextKey: SalahKey | null;
    nextStart: Date | null;
  } {
    const now = new Date();
    const keys = Object.keys(prayerTimes) as SalahKey[];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const { start, end } = prayerTimes[key];
      let prayerEnd = new Date(end);
      if (prayerEnd <= start) prayerEnd.setDate(prayerEnd.getDate() + 1);

      if (now >= start && now <= prayerEnd) {
        const nextIndex = (i + 1) % keys.length;
        const nextKey = keys[nextIndex];
        let nextStart = new Date(prayerTimes[nextKey].start);
        if (nextStart <= now) nextStart.setDate(nextStart.getDate() + 1);
        return {
          key,
          timeRange: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${prayerEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          nextKey,
          nextStart
        };
      }
    }

    // fallback to last prayer
    const lastKey = keys[keys.length - 1];
    let lastEnd = new Date(prayerTimes[lastKey].end);
    if (lastEnd <= prayerTimes[lastKey].start) lastEnd.setDate(lastEnd.getDate() + 1);

    const nextKey = keys[0];
    let nextStart = new Date(prayerTimes[nextKey].start);
    if (nextStart <= now) nextStart.setDate(nextStart.getDate() + 1);

    return {
      key: lastKey,
      timeRange: `${prayerTimes[lastKey].start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${lastEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      nextKey,
      nextStart
    };
  }
}
