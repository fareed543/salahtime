import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as moment from 'moment-hijri';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AppTranslateService } from './translate.service';

export interface HijriCalendarAdjustment {
  id: number;
  title: string;
  hijriYear: number;
  hijriMonth: number;
  originalStartDate: string;
  originalEndDate: string;
  updatedStartDate: string;
  updatedEndDate: string;
  startDate: string;
  endDate: string;
  adjustmentDays: number;
  notes: string;
  isActive: boolean;
}

export interface HijriDateParts {
  day: string;
  month: string;
  monthIndex: number;
  year: number;
}

export interface CalendarSpecialDate {
  id: number;
  title: string;
  eventDate: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

@Injectable({
  providedIn: 'root'
})
export class HijriCalendarService {
  private adjustments: HijriCalendarAdjustment[] = [];
  private specialDates: CalendarSpecialDate[] = [];
  private adjustmentsRequest$?: Observable<HijriCalendarAdjustment[]>;
  private readonly adjustmentsAssetPath = 'assets/calendar-adjustments.json';

  constructor(
    private readonly http: HttpClient,
    private readonly i18n: AppTranslateService
  ) {}

  loadAdjustments(): Observable<HijriCalendarAdjustment[]> {
    if (!this.adjustmentsRequest$) {
      const adjustmentsSource = environment.offline
        ? this.adjustmentsAssetPath
        : `${environment.apiUrl}http-calendar/adjustments`;

      this.adjustmentsRequest$ = this.http.get<{
        items?: HijriCalendarAdjustment[];
        specialDates?: CalendarSpecialDate[];
      }>(adjustmentsSource).pipe(
        map((response) => ({
          adjustments: response.items ?? [],
          specialDates: response.specialDates ?? []
        })),
        catchError(() => of({ adjustments: [], specialDates: [] })),
        tap((response) => {
          this.adjustments = response.adjustments
            .filter((item) => item.isActive)
            .sort((left, right) => left.updatedStartDate.localeCompare(right.updatedStartDate));
          this.specialDates = response.specialDates
            .filter((item) => item.isActive)
            .sort((left, right) => left.eventDate.localeCompare(right.eventDate) || (left.sortOrder - right.sortOrder));
        }),
        map((response) => response.adjustments),
        shareReplay(1)
      );
    }

    return this.adjustmentsRequest$;
  }

  getHijriParts(date: Date): HijriDateParts {
    const key = this.toDateKey(date);
    const override = this.findMonthOverrideByKey(key);
    if (override) {
      const day = this.diffDays(override.updatedStartDate, key) + 1;
      return {
        day: String(day),
        month: this.formatMonthName(override.hijriMonth, override.hijriYear),
        monthIndex: override.hijriMonth,
        year: override.hijriYear
      };
    }

    const shiftedDate = this.applyBoundaryShift(date, key);
    const hijriDate = moment(shiftedDate).locale('en');
    const monthIndex = Number(hijriDate.format('iM'));
    const year = Number(hijriDate.format('iYYYY'));

    return {
      day: hijriDate.format('iD'),
      month: this.formatMonthName(monthIndex, year),
      monthIndex,
      year
    };
  }

  formatHijriDate(date: Date, includeSuffix = true): string {
    const parts = this.getHijriParts(date);
    return this.i18n.formatHijriDate({
      day: Number(parts.day),
      month: parts.monthIndex,
      year: parts.year
    }, includeSuffix);
  }

  getSpecialDatesForMonth(year: number, month: number): CalendarSpecialDate[] {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    return this.specialDates.filter((item) => item.eventDate.startsWith(prefix));
  }

  getSpecialDatesForDate(key: string): CalendarSpecialDate[] {
    return this.specialDates.filter((item) => item.eventDate === key);
  }

  private findMonthOverrideByKey(key: string): HijriCalendarAdjustment | null {
    return this.adjustments.find((item) => item.updatedStartDate <= key && item.updatedEndDate >= key) ?? null;
  }

  private applyBoundaryShift(date: Date, key: string): Date {
    const preStartOverride = this.adjustments.find((item) =>
      item.originalStartDate < item.updatedStartDate &&
      item.originalStartDate <= key &&
      key < item.updatedStartDate
    );

    if (preStartOverride) {
      return this.shiftDateByDays(date, -this.diffDays(preStartOverride.originalStartDate, preStartOverride.updatedStartDate));
    }

    const previousOverride = [...this.adjustments]
      .filter((item) => item.updatedEndDate < key)
      .sort((left, right) => right.updatedEndDate.localeCompare(left.updatedEndDate))[0];

    if (previousOverride) {
      const nextOverride = this.adjustments.find((item) => item.updatedStartDate > previousOverride.updatedEndDate);
      if (!nextOverride || key < nextOverride.updatedStartDate) {
        return this.shiftDateByDays(date, -this.diffDays(previousOverride.originalEndDate, previousOverride.updatedEndDate));
      }
    }

    return date;
  }

  private formatMonthName(monthIndex: number, year: number): string {
    return this.i18n
      .formatHijriDate({ day: 1, month: monthIndex, year }, false)
      .replace(/^1\s+/, '')
      .replace(new RegExp(`\\s+${year}$`), '')
      .trim();
  }

  private diffDays(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  private shiftDateByDays(date: Date, offsetDays: number): Date {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + offsetDays);
    return shifted;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
