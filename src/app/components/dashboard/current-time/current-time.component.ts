import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment-hijri';
import { Subscription } from 'rxjs';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { LocationService } from 'src/app/services/location.service';

import { SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';

const SALAH_ORDER: SalahKey[] = [
  'sahri',
  'fajr',
  'tulu',
  'ishraq',
  'chast',
  'zawal',
  'dhuhr',
  'asr',
  'gurub',
  'maghrib',
  'awabin',
  'iftar',
  'isha',
  'tahajjud'
];

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

  salahTimes: Record<SalahKey, SalahTime> = {} as any;
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

    this.location = await this.locationService.fetchLocation();

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

    this.salahTimes = parsed;
    this.updateCurrentSalah();
  }

  /* ---------------- CURRENT SALAH ---------------- */

  updateCurrentSalah() {
    const current = this.getCurrentSalah(this.salahTimes);

    if (!current.key || !current.start || !current.end) {
      this.currentSalah = null;
      this.currentSalahTime = '';
      return;
    }

    this.currentSalah = current.key;
    this.currentSalahTime =
      `${current.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ` +
      `${current.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  /* ---------------- COUNTDOWN ---------------- */

  updateCountdown() {
    const current = this.getCurrentSalah(this.salahTimes);

    if (!current.key || !current.end) {
      this.countdown = '';
      return;
    }

    const diff = current.end.getTime() - Date.now();

    if (diff <= 0) {
      this.moveToNextSalah(current.index);
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    this.countdown = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
  }

  moveToNextSalah(currentIndex: number) {
    const nextIndex = (currentIndex + 1) % SALAH_ORDER.length;
    const nextKey = SALAH_ORDER[nextIndex];
    const next = this.salahTimes[nextKey];

    if (!next) return;

    let start = new Date(next.start);
    let end = new Date(next.end);
    if (end <= start) end.setDate(end.getDate() + 1);

    this.currentSalah = nextKey;
    this.currentSalahTime =
      `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ` +
      `${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  /* ---------------- CORE LOGIC ---------------- */

  getCurrentSalah(salahTimes: Record<SalahKey, SalahTime>): {
    key: SalahKey | null;
    start: Date | null;
    end: Date | null;
    index: number;
  } {
    const now = new Date();

    for (let i = 0; i < SALAH_ORDER.length; i++) {
      const key = SALAH_ORDER[i];
      const salah = salahTimes[key];
      if (!salah) continue;

      let start = new Date(salah.start);
      let end = new Date(salah.end);

      if (end <= start) end.setDate(end.getDate() + 1);

      if (now >= start && now < end) {
        return { key, start, end, index: i };
      }
    }

    return { key: null, start: null, end: null, index: -1 };
  }

  /* ---------------- HELPERS ---------------- */

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
}
