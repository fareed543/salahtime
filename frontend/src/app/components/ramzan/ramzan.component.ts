import { Component, OnInit } from '@angular/core';
import { SalahKey } from 'src/app/models/salah.model';
import { HijriCalendarService } from 'src/app/services/hijri-calendar.service';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';

interface PrayerSummary {
  key: SalahKey;
  time: Date;
}

interface RamzanMonthRow {
  date: Date;
  hijriLabel: string;
  hijriCompactLabel: string;
  sehri: Date | null;
  iftar: Date | null;
}

@Component({
  selector: 'app-ramzan',
  templateUrl: './ramzan.component.html',
  styleUrls: ['./ramzan.component.scss']
})
export class RamzanComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  selectedDate = new Date();

  constructor(
    private readonly settingsService: SettingsService,
    private readonly waqtService: WaqtService,
    private readonly hijriCalendarService: HijriCalendarService
  ) {}

  ngOnInit(): void {
    this.selectedDate = new Date(this.selectedYear, this.selectedMonth - 1, new Date().getDate());
    this.hijriCalendarService.loadAdjustments().subscribe();
  }

  get locationName(): string {
    const settings = this.settingsService.getCurrentSettings();
    return settings?.location?.city?.city || settings?.city?.city || 'selected location';
  }

  get ramzanMonthRows(): RamzanMonthRow[] {
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(this.selectedYear, this.selectedMonth - 1, index + 1);
      const prayers = this.getPrayerSummaries(date);
      const hijriParts = this.getHijriParts(date);

      return {
        date,
        hijriLabel: `${hijriParts.hijriDay} ${hijriParts.hijriMonth}`,
        hijriCompactLabel: `${hijriParts.hijriDay} ${this.getCompactHijriMonth(hijriParts.hijriMonth)}`,
        sehri: prayers.find(prayer => prayer.key === 'sahri')?.time ?? null,
        iftar: prayers.find(prayer => prayer.key === 'iftar')?.time ?? null
      };
    });
  }

  onSelectedDateChange(date: Date): void {
    this.selectedDate = new Date(date);
  }

  onSelectedMonthChange(month: number): void {
    this.selectedMonth = month;
  }

  onSelectedYearChange(year: number): void {
    this.selectedYear = year;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return today.getTime() === compareDate.getTime();
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  private getPrayerSummaries(date: Date): PrayerSummary[] {
    const settings = this.settingsService.getCurrentSettings();
    const coordinates = settings?.location?.city?.coordinates;

    if (!coordinates) {
      return [];
    }

    const country = settings?.location?.city?.country;
    const tzOffset = country === 'India'
      ? 5.5
      : country === 'Saudi Arabia'
        ? 3
        : -date.getTimezoneOffset() / 60;

    const times = this.waqtService.getTimes(
      date,
      coordinates.latitude,
      coordinates.longitude,
      tzOffset,
      settings.calculationMethod ?? 'karachi',
      settings.madhab ?? 'Hanafi',
      {
        sahriOffset: settings.sahriOffset,
        fajrOffset: settings.fajrOffset,
        dhuhrOffset: settings.dhuhrOffset,
        asrOffset: settings.asrOffset,
        iftarOffset: settings.iftarOffset,
        maghribOffset: settings.maghribOffset,
        ishaOffset: settings.ishaOffset
      }
    );

    return (['sahri', 'iftar'] as SalahKey[]).map(key => ({
      key,
      time: new Date(times[key].start)
    }));
  }

  private getHijriParts(gregorianDate: Date): { hijriDay: string; hijriMonth: string } {
    const parts = this.hijriCalendarService.getHijriParts(gregorianDate);

    return {
      hijriDay: parts.day,
      hijriMonth: parts.month
    };
  }

  private getCompactHijriMonth(month: string): string {
    const normalized = month.trim().toLowerCase();
    const compactLabels: Record<string, string> = {
      muharram: 'Muh',
      safar: 'Saf',
      "rabi' al-awwal": 'Rab-I',
      "rabi' al-thani": 'Rab-II',
      'jumada al-awwal': 'Jum-I',
      'jumada al-thani': 'Jum-II',
      rajab: 'Raj',
      shaaban: 'Sha',
      "sha'ban": 'Sha',
      ramadan: 'Ram',
      shawwal: 'Shw',
      'dhu al-qadah': 'Dhu-Q',
      'dhu al-hijjah': 'Dhu-H'
    };

    return compactLabels[normalized] ?? month.slice(0, 3);
  }
}
