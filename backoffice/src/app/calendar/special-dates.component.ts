import { Component } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { AdminCalendarSpecialDate, CalendarService } from './calendar.service';

@Component({
  selector: 'app-special-dates',
  templateUrl: './special-dates.component.html',
  styleUrls: ['./special-dates.component.scss']
})
export class SpecialDatesComponent {
  specialDateItems: AdminCalendarSpecialDate[] = [];
  selectedSpecialDateId: number | null = null;
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  constructor(
    private readonly calendarService: CalendarService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSpecialDates();
  }

  get selectedSpecialDate(): AdminCalendarSpecialDate | null {
    return this.specialDateItems.find((item) => item.id === this.selectedSpecialDateId) ?? null;
  }

  loadSpecialDates(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.calendarService.getSpecialDates().subscribe({
      next: (response) => {
        this.specialDateItems = (response.items ?? [])
          .map((item) => ({ ...item }))
          .sort((left, right) => left.eventDate.localeCompare(right.eventDate) || (left.sortOrder - right.sortOrder));
        this.selectedSpecialDateId = this.specialDateItems[0]?.id ?? null;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to load special dates right now.';
        this.isLoading = false;
      }
    });
  }

  addSpecialDate(): void {
    const newItem: AdminCalendarSpecialDate = {
      id: Date.now(),
      title: '',
      eventDate: this.toDateKey(new Date()),
      description: '',
      isActive: true,
      sortOrder: this.specialDateItems.length
    };

    this.specialDateItems = [...this.specialDateItems, newItem]
      .sort((left, right) => left.eventDate.localeCompare(right.eventDate) || (left.sortOrder - right.sortOrder));
    this.selectedSpecialDateId = newItem.id;
    this.errorMessage = '';
  }

  selectSpecialDate(item: AdminCalendarSpecialDate): void {
    this.selectedSpecialDateId = item.id;
    this.errorMessage = '';
  }

  removeSelectedSpecialDate(): void {
    if (!this.selectedSpecialDate) {
      return;
    }

    this.specialDateItems = this.specialDateItems.filter((item) => item.id !== this.selectedSpecialDateId);
    this.selectedSpecialDateId = this.specialDateItems[0]?.id ?? null;
    this.errorMessage = '';
    this.toast.success('Special date removed locally. Save changes to publish it.');
  }

  saveSpecialDates(): void {
    if (!this.validateSpecialDates()) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const payload = this.specialDateItems.map((item, index) => ({
      ...item,
      sortOrder: index
    }));

    this.calendarService.saveSpecialDatesCollection(payload).subscribe({
      next: (response) => {
        this.specialDateItems = (response.items ?? [])
          .map((item) => ({ ...item }))
          .sort((left, right) => left.eventDate.localeCompare(right.eventDate) || (left.sortOrder - right.sortOrder));
        this.selectedSpecialDateId = this.specialDateItems[0]?.id ?? null;
        this.isSaving = false;
        this.toast.success('Holiday and special dates saved successfully.');
      },
      error: (error) => {
        this.isSaving = false;
        this.toast.error(error, 'Unable to save special dates.');
      }
    });
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private validateSpecialDates(): boolean {
    for (const item of this.specialDateItems) {
      if (!item.title.trim() || !item.eventDate) {
        this.toast.error('Special date title and event date are required.');
        return false;
      }
    }

    return true;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
