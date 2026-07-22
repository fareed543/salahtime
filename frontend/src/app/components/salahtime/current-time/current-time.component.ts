import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { WaqtService } from 'src/app/services/waqt.service';

const SALAH_ORDER: SalahKey[] = [
  'tahajjud',
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
  'isha'
];

@Component({
  selector: 'app-salahtime-current-time',
  templateUrl: './current-time.component.html',
  styleUrls: ['./current-time.component.scss']
})
export class SalahtimeCurrentTimeComponent implements OnInit, OnDestroy {
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

  private settingsSub!: Subscription;
  private timerId!: number;

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private i18n: AppTranslateService
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateDates();

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
    if (!this.settings?.location?.city?.coordinates) return;

    const country = this.settings.location?.city?.country;
    const tzOffset = country === 'India'
      ? 5.5
      : country === 'Saudi Arabia'
        ? 3
        : -new Date().getTimezoneOffset() / 60;
    const date = new Date();

    const times = this.waqtService.getTimes(
      date,
      this.settings.location.city.coordinates.latitude,
      this.settings.location.city.coordinates.longitude,
      tzOffset,
      this.settings.calculationMethod,
      this.settings.madhab,
      {
        sahriOffset: this.settings.sahriOffset,
        fajrOffset: this.settings.fajrOffset,
        dhuhrOffset: this.settings.dhuhrOffset,
        asrOffset: this.settings.asrOffset,
        iftarOffset: this.settings.iftarOffset,
        maghribOffset: this.settings.maghribOffset,
        ishaOffset: this.settings.ishaOffset
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

    this.salahTimes = parsed;
    this.updateCurrentSalah();
  }

  updateCurrentSalah() {
    const current = this.getCurrentSalah(this.salahTimes);

    if (!current.key || !current.start || !current.end) {
      this.currentSalah = null;
      this.currentSalahTime = '';
      return;
    }

    this.currentSalah = current.key;
    this.currentSalahTime = this.i18n.formatPrayerTimeRange(
      current.start,
      current.end,
      (this.settings?.timeFormat ?? '12h') !== '24h'
    );
  }

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

    const start = new Date(next.start);
    const end = new Date(next.end);
    if (end <= start) end.setDate(end.getDate() + 1);

    this.currentSalah = nextKey;
    this.currentSalahTime = this.i18n.formatPrayerTimeRange(
      start,
      end,
      (this.settings?.timeFormat ?? '12h') !== '24h'
    );
  }

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

      const start = new Date(salah.start);
      const end = new Date(salah.end);

      if (end <= start) end.setDate(end.getDate() + 1);

      if (now >= start && now < end) {
        return { key, start, end, index: i };
      }
    }

    return { key: null, start: null, end: null, index: -1 };
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : String(num);
  }

  private formatPrayerTime(date: Date): string {
    return this.i18n.formatPrayerTime(date, (this.settings?.timeFormat ?? '12h') !== '24h');
  }

  get currentSalahDetails(): SalahTime | null {
    if (!this.currentSalah) {
      return null;
    }

    return this.salahTimes[this.currentSalah] ?? null;
  }

  updateDates() {
    const now = new Date();
    this.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    this.day = String(now.getDate());
    this.month = now.toLocaleDateString('en-US', { month: 'long' });
    this.year = String(now.getFullYear());
  }
}
