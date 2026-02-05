import { Component, signal, OnInit } from '@angular/core';

interface CalendarDate {
  gregorian: Date;
  hijri: string;
  isCurrentMonth: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-calender',
  templateUrl: './calender.component.html',
  styleUrls: ['./calender.component.scss']
})
export class CalenderComponent implements OnInit {
  selectedYear = 2026;
  selectedMonth = 2;
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Dynamic years: 3 back + current + 3 forward
  years = signal<number[]>([]);

  calendarDates = signal<CalendarDate[]>([]);
  calendarWeeks = signal<any[][]>([]);

  ngOnInit() {
    this.updateYears();
    this.updateCalendar();
  }

  // Dynamic years effect - auto-adjusts range when navigating
  updateYears() {
    const currentYear = new Date().getFullYear();
    const startYear = this.selectedYear - 3;
    const endYear = this.selectedYear + 3;

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
      dates.push({
        gregorian: date,
        hijri: this.toHijri(date),
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    // Current month days (clickable)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      dates.push({
        gregorian: date,
        hijri: this.toHijri(date),
        isCurrentMonth: true,
        isDisabled: false
      });
    }

    // Next month trailing days (disabled) - MAX 35 cells
    const remainingCells = 35 - dates.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      dates.push({
        gregorian: date,
        hijri: this.toHijri(date),
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    this.calendarDates.set(dates);

    // Group into 5 weeks
    const weeks: any[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }
    this.calendarWeeks.set(weeks);
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

  getMonthName(month: number): string {
    return this.months[month - 1];
  }

  getCellClasses(date: CalendarDate): string {
    let classes = 'date-cell ';

    if (date.isDisabled) {
      classes += 'bg-light text-muted';
    } else if (!date.isCurrentMonth) {
      classes += 'text-muted opacity-75';
    } else {
      classes += 'bg-white hover-date';
    }

    if (this.isToday(date.gregorian)) {
      classes += ' border-primary';
    }

    return classes;
  }

  getGregorianClasses(date: CalendarDate): string {
    if (date.isDisabled) return 'text-muted';
    if (this.isToday(date.gregorian)) return 'text-primary fw-bolder';
    return 'text-dark fw-semibold';
  }

  selectDate(date: Date) {
    const localDate = new Date(date);
    localDate.setHours(12, 0, 0, 0); // midday avoids UTC shift

    console.log(
      'Selected:',
      localDate.toISOString().split('T')[0],
      this.toHijri(localDate)
    );
  }


  isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return today.getTime() === compareDate.getTime();
  }

  private toHijri(gregorianDate: Date): string {
    const jd = this.dateToJulian(gregorianDate);
    const hijriYear = Math.floor((jd - 1948440 + 10632) / 354.36667);
    const hijriMonth = Math.floor((jd - 1948440 + 10632 - hijriYear * 354.36667) / 29.53056) + 1;
    const hijriDay = Math.floor(jd - 1948440 + 10632 - hijriYear * 354.36667 - (hijriMonth - 1) * 29.53056) + 1;
    return `${hijriDay.toString().padStart(2, '0')}/${hijriMonth.toString().padStart(2, '0')}`;
  }

  private dateToJulian(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    let a = Math.floor((14 - month) / 12);
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;
    let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y +
      Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return jd + (date.getHours() - 12) / 24 + date.getMinutes() / 1440;
  }


}
