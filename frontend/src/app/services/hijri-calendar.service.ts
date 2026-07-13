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

@Injectable({
  providedIn: 'root'
})
export class HijriCalendarService {
  private adjustments: HijriCalendarAdjustment[] = [];
  private adjustmentsRequest$?: Observable<HijriCalendarAdjustment[]>;

  constructor(
    private readonly http: HttpClient,
    private readonly i18n: AppTranslateService
  ) {}

  loadAdjustments(): Observable<HijriCalendarAdjustment[]> {
    if (!this.adjustmentsRequest$) {
      this.adjustmentsRequest$ = this.http.get<{ items?: HijriCalendarAdjustment[] }>(
        `${environment.apiUrl}admin/public-calendar-adjustments`
      ).pipe(
        map((response) => response.items ?? []),
        catchError(() => of([])),
        tap((items) => {
          this.adjustments = items
            .filter((item) => item.isActive)
            .sort((left, right) => left.startDate.localeCompare(right.startDate));
        }),
        shareReplay(1)
      );
    }

    return this.adjustmentsRequest$;
  }

  getHijriParts(date: Date): HijriDateParts {
    const targetDate = this.applyAdjustment(date);
    const hijriDate = moment(targetDate).locale('en');
    const monthIndex = Number(hijriDate.format('iM'));
    const year = Number(hijriDate.format('iYYYY'));
    const month = this.i18n
      .formatHijriDate({ day: 1, month: monthIndex, year }, false)
      .replace(/^1\s+/, '')
      .replace(new RegExp(`\\s+${year}$`), '')
      .trim();

    return {
      day: hijriDate.format('iD'),
      month,
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

  private applyAdjustment(date: Date): Date {
    const key = this.toDateKey(date);
    const matched = this.adjustments.find((item) => item.isActive && item.startDate <= key && item.endDate >= key);

    if (!matched || matched.adjustmentDays === 0) {
      return new Date(date);
    }

    const adjusted = new Date(date);
    adjusted.setDate(adjusted.getDate() + matched.adjustmentDays);
    return adjusted;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
