import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  private readonly HIJRI_MONTH_KEYS = [
    'MUHARRAM',
    'SAFAR',
    'RABI_AL_AWWAL',
    'RABI_AL_THANI',
    'JUMADA_AL_AWWAL',
    'JUMADA_AL_THANI',
    'RAJAB',
    'SHABAN',
    'RAMADAN',
    'SHAWWAL',
    'DHU_AL_QADAH',
    'DHU_AL_HIJJAH'
  ] as const;

  private readonly LANG_META: Record<string, { name: string }> = {
    en: { name: 'English' },
    te: { name: 'Telugu' },
    ar: { name: 'العربية' },
    ur: { name: 'اردو' }
  };

  private readonly FALLBACK = 'en';
  private readonly RTL_LANGS = ['ar', 'ur'];
  private initialized = false;

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'te', 'ar', 'ur']);
    this.translate.setDefaultLang(this.FALLBACK);
  }

  init(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    const lang = localStorage.getItem('lang') || this.FALLBACK;
    this.initialized = true;
    this.applyDirection(lang);
    return new Promise((resolve) => {
      this.translate.use(lang).subscribe({
        next: () => resolve(),
        error: () => {
          this.translate.use(this.FALLBACK).subscribe({
            next: () => resolve(),
            error: () => resolve()
          });
        }
      });
    });
  }

  use(lang: string): void {
    if (!this.translate.getLangs().includes(lang)) {
      lang = this.FALLBACK;
    }

    localStorage.setItem('lang', lang);
    this.applyDirection(lang);
    this.translate.use(lang);
  }

  private applyDirection(lang: string): void {
    const isRtl = this.RTL_LANGS.includes(lang);
    const html = document.documentElement;

    setTimeout(() => {
      html.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      html.setAttribute('lang', lang);
      document.body.classList.toggle('rtl', isRtl);
    });
  }

  available(): string[] {
    return [...this.translate.getLangs()];
  }

  availableWithNames(): { code: string; name: string }[] {
    return this.available().map(code => ({
      code,
      name: this.LANG_META[code]?.name || code
    }));
  }

  getLangName(code: string): string {
    return this.LANG_META[code]?.name || code;
  }

  current(): string {
    return this.translate.currentLang || this.FALLBACK;
  }

  isRtlLanguage(lang: string = this.current()): boolean {
    return this.RTL_LANGS.includes(lang);
  }

  translateWithParams(key: string, params: Record<string, any>): string {
    return this.translate.instant(key, params);
  }

  formatPrayerTime(date: Date, hour12 = true): string {
    const formatted = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12
    }).format(date);

    if (!this.isRtlLanguage() || !hour12) {
      return formatted;
    }

    const ltrIsolate = '\u2066';
    const popDirectionalIsolate = '\u2069';
    return `${ltrIsolate}${formatted}${popDirectionalIsolate}`;
  }

  formatPrayerTimeRange(start: Date, end: Date, hour12 = true): string {
    return `${this.formatPrayerTime(start, hour12)} - ${this.formatPrayerTime(end, hour12)}`;
  }

  formatHijriDate(parts: { day: number; month: number; year: number }, includeSuffix = true): string {
    const monthKey = this.HIJRI_MONTH_KEYS[parts.month - 1] ?? this.HIJRI_MONTH_KEYS[0];
    const monthName = this.translate.instant(`HIJRI_MONTHS.${monthKey}`);
    const formatter = new Intl.NumberFormat(this.getNumberLocale(this.current()));
    const text = `${formatter.format(parts.day)} ${monthName} ${formatter.format(parts.year)}`;

    return includeSuffix ? `${text} AH` : text;
  }

  private getNumberLocale(lang: string): string {
    switch (lang) {
      case 'ar':
        return 'ar';
      case 'ur':
        return 'ur';
      case 'te':
        return 'te';
      default:
        return 'en';
    }
  }
}
