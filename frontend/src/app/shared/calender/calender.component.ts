import { Component, OnInit, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as moment from 'moment-hijri';
import { SALAH_ORDER, SalahKey } from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { WaqtService } from 'src/app/services/waqt.service';

interface CalendarDate {
  gregorian: Date;
  hijriDay: string;
  hijriMonth: string;
  hijriMonthIndex: number;
  hijriYear: number;
  isCurrentMonth: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-calender',
  templateUrl: './calender.component.html',
  styleUrls: ['./calender.component.scss']
})
export class CalenderComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  selectedDate = new Date();
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  shareStatus = '';

  // Dynamic years: 3 back + current + 3 forward
  years = signal<number[]>([]);

  calendarDates = signal<CalendarDate[]>([]);

  private readonly exportKeys: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  constructor(
    private readonly settingsService: SettingsService,
    private readonly waqtService: WaqtService,
    private readonly i18n: AppTranslateService
  ) {}

  ngOnInit() {
    this.selectedDate = new Date(this.selectedYear, this.selectedMonth - 1, new Date().getDate());
    this.updateYears();
    this.updateCalendar();
  }

  // Dynamic years effect - auto-adjusts range when navigating
  updateYears() {
    const startYear = this.selectedYear - 3;

    this.years.set(
      Array.from({ length: 7 }, (_, i) => startYear + i)
    );
  }

  updateCalendar() {
    const year = this.selectedYear;
    const month = this.selectedMonth - 1;
    const currentDate = new Date(year, month, 1);

    const firstDay = currentDate.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dates: CalendarDate[] = [];

    // Previous month trailing days (disabled)
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const hijriParts = this.getHijriParts(date);
      dates.push({
        gregorian: date,
        ...hijriParts,
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    // Current month days (clickable)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const hijriParts = this.getHijriParts(date);
      dates.push({
        gregorian: date,
        ...hijriParts,
        isCurrentMonth: true,
        isDisabled: false
      });
    }

    // Next month trailing days (disabled) - MAX 35 cells
    const remainingCells = 35 - dates.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      const hijriParts = this.getHijriParts(date);
      dates.push({
        gregorian: date,
        ...hijriParts,
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    this.calendarDates.set(dates);
    this.syncSelectedDateWithVisibleMonth();
  }

  previousMonth() {
    if (this.selectedMonth === 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.updateYears(); // Update years range dynamically
    this.updateCalendar();
  }

  nextMonth() {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.updateYears(); // Update years range dynamically
    this.updateCalendar();
  }

  // Call this when year dropdown changes
  onYearChange() {
    this.updateYears();
    this.updateCalendar();
  }

  selectDate(date: Date) {
    const localDate = new Date(date);
    localDate.setHours(12, 0, 0, 0); // midday avoids UTC shift
    this.selectedDate = localDate;
    this.selectedYear = localDate.getFullYear();
    this.selectedMonth = localDate.getMonth() + 1;

    console.log(
      'Selected:',
      localDate.toISOString().split('T')[0],
      this.getHijriShortLabel(localDate)
    );
  }


  isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return today.getTime() === compareDate.getTime();
  }

  isSelected(date: Date): boolean {
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return selected.getTime() === compareDate.getTime();
  }

  get headerGregorianDate(): string {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(this.selectedDate);
  }

  get headerMonthLabel(): string {
    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(this.selectedYear, this.selectedMonth - 1, 1));
  }

  get headerHijriMonthLabel(): string {
    const selectedHijri = this.getHijriParts(this.selectedDate);
    return `${selectedHijri.hijriMonth} ${selectedHijri.hijriYear} AH`;
  }

  get headerHijriDate(): string {
    const hijriDate = moment(this.selectedDate).locale('en');
    return this.i18n.formatHijriDate({
      day: Number(hijriDate.format('iD')),
      month: Number(hijriDate.format('iM')),
      year: Number(hijriDate.format('iYYYY'))
    });
  }

  downloadCalendar(): void {
    const lines = this.buildShareLines();
    const fileName = `salah-calendar-month-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}.txt`;
    void this.saveExportFile(fileName, lines.join('\n'));
  }

  async shareCalendar(): Promise<void> {
    const shareText = this.buildShareLines().join('\n');
    const fileName = `salah-calendar-month-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}.txt`;

    try {
      if (Capacitor.isNativePlatform()) {
        const saved = await this.saveExportFile(fileName, shareText, false);
        if (saved?.uri) {
          await Share.share({
            title: 'Calendar Month',
            url: saved.uri,
            text: shareText
          });
          return;
        }
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Calendar Month',
          text: shareText
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        this.shareStatus = 'Calendar copied to clipboard.';
        setTimeout(() => this.shareStatus = '', 2500);
      }
    } catch {
      this.shareStatus = 'Unable to share right now.';
      setTimeout(() => this.shareStatus = '', 2500);
    }
  }

  private syncSelectedDateWithVisibleMonth(): void {
    if (
      this.selectedDate.getFullYear() === this.selectedYear &&
      this.selectedDate.getMonth() + 1 === this.selectedMonth
    ) {
      return;
    }

    const safeDay = Math.min(
      this.selectedDate.getDate(),
      new Date(this.selectedYear, this.selectedMonth, 0).getDate()
    );

    this.selectedDate = new Date(this.selectedYear, this.selectedMonth - 1, safeDay);
  }

  private getPrayerSummaries(date: Date): Array<{ key: SalahKey; time: Date }> {
    const settings = this.settingsService.getCurrentSettings();
    const coordinates = settings?.location?.city?.coordinates;

    if (!coordinates) {
      return [];
    }

    const tzOffset = -new Date().getTimezoneOffset() / 60;
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

    return SALAH_ORDER
      .filter(key => this.exportKeys.includes(key))
      .map(key => ({ key, time: new Date(times[key].start) }));
  }

  private buildShareLines(): string[] {
    const settings = this.settingsService.getCurrentSettings();
    const locationName = settings?.location?.city?.city || settings?.city?.city || 'Selected location';
    const source = this.calendarDates().filter(date => date.isCurrentMonth).map(date => ({
      date: date.gregorian,
      hijri: `${date.hijriDay} ${date.hijriMonth}`,
      prayers: this.getPrayerSummaries(date.gregorian)
    }));

    return [
      'Calendar - Month',
      `Location: ${locationName}`,
      '',
      ...source.map(day => {
        const prayers = day.prayers
          .map(prayer => `${this.toTitleCase(prayer.key)} ${this.formatTime(prayer.time)}`)
          .join(' | ');
        return `${this.formatDate(day.date)} (${day.hijri})${prayers ? ` - ${prayers}` : ''}`;
      })
    ];
  }

  private async saveExportFile(fileName: string, content: string, updateStatus = true): Promise<{ uri?: string } | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.requestPermissions();
      } catch {}

      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        if (updateStatus) {
          this.shareStatus = 'Calendar saved on your device.';
          setTimeout(() => this.shareStatus = '', 2500);
        }

        return result;
      } catch {
        if (updateStatus) {
          this.shareStatus = 'Unable to save calendar right now.';
          setTimeout(() => this.shareStatus = '', 2500);
        }
        return null;
      }
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return null;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  private toTitleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private getHijriParts(gregorianDate: Date): Pick<CalendarDate, 'hijriDay' | 'hijriMonth' | 'hijriMonthIndex' | 'hijriYear'> {
    const hijriDate = moment(gregorianDate).locale('en');
    const hijriDay = hijriDate.format('iD');
    const hijriMonthIndex = Number(hijriDate.format('iM'));
    const hijriYear = Number(hijriDate.format('iYYYY'));
    const hijriMonth = this.i18n
      .formatHijriDate({ day: 1, month: hijriMonthIndex, year: hijriYear }, false)
      .replace(/^1\s+/, '')
      .replace(new RegExp(`\\s+${hijriYear}$`), '')
      .trim();

    return {
      hijriDay,
      hijriMonth,
      hijriMonthIndex,
      hijriYear
    };
  }

  private getHijriShortLabel(gregorianDate: Date): string {
    const hijriParts = this.getHijriParts(gregorianDate);
    return `${hijriParts.hijriDay} ${hijriParts.hijriMonth}`;
  }

}
