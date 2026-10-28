import { Pipe, PipeTransform } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';

/** "2026-10-27 18:05:00" (API time) → "27 Oct 2026" in the app's language. */
@Pipe({ name: 'blogDate', pure: false })
export class BlogDatePipe implements PipeTransform {
  private lastKey = '';
  private lastValue = '';

  constructor(private translate: AppTranslateService) {}

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const locale = this.translate.getDateLocale();
    const key = `${locale}|${value}`;
    if (key !== this.lastKey) {
      const date = new Date(value.replace(' ', 'T'));
      this.lastKey = key;
      this.lastValue = isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    }
    return this.lastValue;
  }
}
