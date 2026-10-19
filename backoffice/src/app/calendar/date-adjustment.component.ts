import { Component } from '@angular/core';
import { AdminCalendarAdjustment, CalendarService } from './calendar.service';
import { LocationsService, OptionItem } from '../locations/locations.service';

declare const require: any;
const momentHijri = require('../../../../frontend/node_modules/moment-hijri');

interface HijriMonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-date-adjustment',
  templateUrl: './date-adjustment.component.html',
  styleUrls: ['./date-adjustment.component.scss']
})
export class DateAdjustmentComponent {
  adjustmentItems: AdminCalendarAdjustment[] = [];
  selectedAdjustmentId: number | null = null;
  isLoading = true;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  countries: OptionItem[] = [];
  /** Narrows the list to one country; new adjustments default to it. */
  countryFilter: number | null = null;

  readonly hijriMonths: HijriMonthOption[] = [
    { value: 1, label: 'Muharram' },
    { value: 2, label: 'Safar' },
    { value: 3, label: 'Rabi al-Awwal' },
    { value: 4, label: 'Rabi al-Thani' },
    { value: 5, label: 'Jumada al-Awwal' },
    { value: 6, label: 'Jumada al-Thani' },
    { value: 7, label: 'Rajab' },
    { value: 8, label: "Sha'ban" },
    { value: 9, label: 'Ramadan' },
    { value: 10, label: 'Shawwal' },
    { value: 11, label: 'Dhu al-Qadah' },
    { value: 12, label: 'Dhu al-Hijjah' }
  ];

  readonly hijriYears = this.buildHijriYears();
  private readonly currentHijriYear = this.getHijriParts(new Date()).year;

  constructor(
    private readonly calendarService: CalendarService,
    private readonly locationsService: LocationsService
  ) {}

  ngOnInit(): void {
    this.loadAdjustments();
    this.locationsService.countryOptions().subscribe({
      next: (countries) => this.countries = [...countries].sort((left, right) => left.name.localeCompare(right.name)),
      error: () => this.errorMessage = 'Unable to load countries right now.'
    });
  }

  get selectedAdjustment(): AdminCalendarAdjustment | null {
    return this.visibleItems.find((item) => item.id === this.selectedAdjustmentId) ?? null;
  }

  get visibleItems(): AdminCalendarAdjustment[] {
    return this.countryFilter === null
      ? this.adjustmentItems
      : this.adjustmentItems.filter((item) => item.countryId === this.countryFilter);
  }

  onCountryFilterChange(): void {
    if (!this.visibleItems.some((item) => item.id === this.selectedAdjustmentId)) {
      this.selectedAdjustmentId = this.visibleItems[0]?.id ?? null;
    }
  }

  getCountryName(countryId: number | null): string {
    return this.countries.find((country) => country.id === countryId)?.name ?? '';
  }

  loadAdjustments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.calendarService.getAdjustments().subscribe({
      next: (response) => {
        this.adjustmentItems = (response.items ?? [])
          .map((item) => this.hydrateAdjustment({ ...item }))
          .sort((left, right) => this.sortByHijriPeriod(right, left));
        this.selectedAdjustmentId = this.getPreferredSelectedAdjustmentId();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to load calendar adjustments right now.';
        this.isLoading = false;
      }
    });
  }

  addAdjustment(): void {
    const newItem = this.hydrateAdjustment({
      id: Date.now(),
      title: '',
      hijriYear: this.currentHijriYear,
      hijriMonth: 1,
      originalStartDate: '',
      originalEndDate: '',
      updatedStartDate: '',
      updatedEndDate: '',
      startDate: '',
      endDate: '',
      adjustmentDays: 0,
      notes: '',
      isActive: true,
      countryId: this.countryFilter
    });

    this.adjustmentItems = [...this.adjustmentItems, newItem].sort((left, right) => this.sortByHijriPeriod(right, left));
    this.selectedAdjustmentId = newItem.id;
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  selectAdjustment(item: AdminCalendarAdjustment): void {
    this.selectedAdjustmentId = item.id;
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  removeSelectedAdjustment(): void {
    if (!this.selectedAdjustment) {
      return;
    }

    this.adjustmentItems = this.adjustmentItems.filter((item) => item.id !== this.selectedAdjustmentId);
    this.selectedAdjustmentId = this.visibleItems[0]?.id ?? null;
    this.feedbackMessage = 'Date adjustment removed locally. Save changes to publish it.';
    this.errorMessage = '';
  }

  onHijriMonthChange(item: AdminCalendarAdjustment): void {
    this.hydrateAdjustment(item, true);
    this.adjustmentItems = [...this.adjustmentItems].sort((left, right) => this.sortByHijriPeriod(right, left));
  }

  saveAdjustments(): void {
    if (!this.validateAdjustments()) {
      return;
    }

    this.isSaving = true;
    this.feedbackMessage = '';
    this.errorMessage = '';

    const payload = this.adjustmentItems.map((item) => ({
      ...item,
      title: this.buildAdjustmentTitle(item),
      startDate: item.updatedStartDate,
      endDate: item.updatedEndDate,
      adjustmentDays: 0
    }));

    this.calendarService.saveAdjustments(payload).subscribe({
      next: (response) => {
        this.adjustmentItems = (response.items ?? [])
          .map((item) => this.hydrateAdjustment({ ...item }))
          .sort((left, right) => this.sortByHijriPeriod(right, left));
        this.selectedAdjustmentId = this.getPreferredSelectedAdjustmentId();
        this.isSaving = false;
        this.feedbackMessage = 'Calendar month overrides saved successfully.';
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.error || 'Unable to save calendar adjustments.';
      }
    });
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  getMonthLabel(month: number): string {
    return this.hijriMonths.find((item) => item.value === month)?.label ?? 'Hijri Month';
  }

  private hydrateAdjustment(item: AdminCalendarAdjustment, resetUpdatedDates = false): AdminCalendarAdjustment {
    const range = this.findGregorianRangeForHijriMonth(item.hijriYear || this.hijriYears[0], item.hijriMonth || 1);
    item.hijriYear = item.hijriYear || this.hijriYears[0];
    item.hijriMonth = item.hijriMonth || 1;
    item.title = item.title || this.buildAdjustmentTitle(item);
    item.originalStartDate = range.startDate;
    item.originalEndDate = range.endDate;

    if (resetUpdatedDates || !item.updatedStartDate) {
      item.updatedStartDate = range.startDate;
    }

    if (resetUpdatedDates || !item.updatedEndDate) {
      item.updatedEndDate = range.endDate;
    }

    item.startDate = item.updatedStartDate;
    item.endDate = item.updatedEndDate;
    item.adjustmentDays = 0;
    item.isActive = item.isActive !== false;
    item.countryId = item.countryId ? Number(item.countryId) : null;

    return item;
  }

  private validateAdjustments(): boolean {
    const keys = new Set<string>();

    for (const item of this.adjustmentItems) {
      if (!item.countryId) {
        this.selectedAdjustmentId = item.id;
        this.countryFilter = null;
        this.errorMessage = `Select the country for ${this.buildAdjustmentTitle(item)}.`;
        return false;
      }

      const monthKey = `${item.countryId}-${item.hijriYear}-${item.hijriMonth}`;
      if (keys.has(monthKey)) {
        this.errorMessage = `${this.buildAdjustmentTitle(item)} is added more than once for ${this.getCountryName(item.countryId)}.`;
        return false;
      }
      keys.add(monthKey);

      if (!item.hijriYear || !item.hijriMonth || !item.originalStartDate || !item.originalEndDate || !item.updatedStartDate || !item.updatedEndDate) {
        this.errorMessage = 'Hijri month, year, original dates, and updated dates are required.';
        return false;
      }

      if (item.updatedEndDate < item.updatedStartDate) {
        this.errorMessage = 'Updated end date cannot be before updated start date.';
        return false;
      }
    }

    return true;
  }

  private buildHijriYears(): number[] {
    const currentYear = this.getHijriParts(new Date()).year;
    return Array.from({ length: 6 }, (_, index) => currentYear - 1 + index);
  }

  private getPreferredSelectedAdjustmentId(): number | null {
    const currentYearItem = this.visibleItems.find((item) => item.hijriYear === this.currentHijriYear);
    return currentYearItem?.id ?? this.visibleItems[0]?.id ?? null;
  }

  private sortByHijriPeriod(left: Pick<AdminCalendarAdjustment, 'hijriYear' | 'hijriMonth'>, right: Pick<AdminCalendarAdjustment, 'hijriYear' | 'hijriMonth'>): number {
    return (left.hijriYear - right.hijriYear) || (left.hijriMonth - right.hijriMonth);
  }

  private buildAdjustmentTitle(item: Pick<AdminCalendarAdjustment, 'hijriMonth' | 'hijriYear'>): string {
    return `${this.getMonthLabel(item.hijriMonth)} ${item.hijriYear}`;
  }

  private findGregorianRangeForHijriMonth(hijriYear: number, hijriMonth: number): { startDate: string; endDate: string } {
    const start = this.findGregorianDateForHijri(hijriYear, hijriMonth, 1);
    const end = new Date(start);

    for (let step = 0; step < 35; step++) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + step);
      const parts = this.getHijriParts(nextDate);

      if (parts.year !== hijriYear || parts.month !== hijriMonth) {
        end.setDate(nextDate.getDate() - 1);
        break;
      }

      end.setTime(nextDate.getTime());
    }

    return {
      startDate: this.toDateKey(start),
      endDate: this.toDateKey(end)
    };
  }

  private findGregorianDateForHijri(targetYear: number, targetMonth: number, targetDay: number): Date {
    const approximateYear = Math.floor(targetYear * 0.97 + 622);
    const start = new Date(approximateYear - 1, 0, 1);

    for (let offset = 0; offset < 1100; offset++) {
      const candidate = new Date(start);
      candidate.setDate(start.getDate() + offset);
      const parts = this.getHijriParts(candidate);

      if (parts.year === targetYear && parts.month === targetMonth && parts.day === targetDay) {
        return candidate;
      }
    }

    return new Date();
  }

  private getHijriParts(date: Date): { day: number; month: number; year: number } {
    const parts = momentHijri(date).locale('en');
    return {
      day: Number(parts.format('iD')),
      month: Number(parts.format('iM')),
      year: Number(parts.format('iYYYY'))
    };
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
