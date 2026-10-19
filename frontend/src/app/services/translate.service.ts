import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { BehaviorSubject } from "rxjs";
import { environment } from "src/environments/environment";
import { SKIP_LOGIN_REDIRECT } from "./auth.interceptor";

export interface AppLanguage {
  code: string;
  /** English name, e.g. "Tamil". */
  name: string;
  /** Name in the language itself, e.g. "தமிழ்". */
  nativeName: string;
  rtl: boolean;
}

/**
 * Translations shipped in assets/i18n. The back office (Languages) decides which of these are
 * offered, their order and names; this list is used until its list has loaded, or when offline.
 */
const BUNDLED_LANGUAGES: AppLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'hi-latn', name: 'Hindi (Roman)', nativeName: 'Hinglish', rtl: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  { code: 'te-latn', name: 'Telugu (Roman)', nativeName: 'Tinglish', rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false }
];

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

  private readonly FALLBACK = 'en';
  private readonly LANGUAGES_CACHE_KEY = 'app_languages';
  private initialized = false;
  private readonly currentLangSubject = new BehaviorSubject<string>(this.FALLBACK);
  readonly currentLang$ = this.currentLangSubject.asObservable();
  /** Languages offered in the pickers: the back office list (cached), else the bundled one. */
  private languages: AppLanguage[] = this.readCachedLanguages() ?? BUNDLED_LANGUAGES;
  private namedLanguagesFor: AppLanguage[] | null = null;
  private namedLanguages: { code: string; name: string; englishName: string }[] = [];

  constructor(private translate: TranslateService, private http: HttpClient) {
    // Every bundled translation stays usable, so someone on a language the back office later
    // disables keeps it; it just isn't offered in the pickers any more.
    this.translate.addLangs(BUNDLED_LANGUAGES.map(language => language.code));
    this.translate.setDefaultLang(this.FALLBACK);
  }

  init(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    // Not awaited: startup uses the cached/bundled list, the pickers update when this arrives.
    this.refreshLanguages();

    const lang = localStorage.getItem('lang') || this.FALLBACK;
    this.initialized = true;
    this.currentLangSubject.next(lang);
    this.applyDirection(lang);
    return new Promise((resolve) => {
    this.translate.use(lang).subscribe({
        next: () => {
          this.currentLangSubject.next(lang);
          resolve();
        },
        error: () => {
          this.translate.use(this.FALLBACK).subscribe({
            next: () => {
              this.currentLangSubject.next(this.FALLBACK);
              resolve();
            },
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
    this.currentLangSubject.next(lang);
    this.applyDirection(lang);
    this.translate.use(lang);
  }

  private applyDirection(lang: string): void {
    const isRtl = this.isRtlLanguage(lang);
    const html = document.documentElement;
    const body = document.body;
    const langClasses = BUNDLED_LANGUAGES.map(language => `lang-${language.code}`);
    const nextLangClass = `lang-${lang}`;

    setTimeout(() => {
      html.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      html.setAttribute('lang', lang);
      html.classList.remove(...langClasses);
      html.classList.add(nextLangClass);
      body.classList.remove(...langClasses);
      body.classList.add(nextLangClass);
      body.classList.toggle('rtl', isRtl);
    });
  }

  /** Codes offered in the language pickers, in back-office order. */
  available(): string[] {
    return this.languages.map(language => language.code);
  }

  /** Offered languages: `name` in the language itself, `englishName` as the back office names it. */
  availableWithNames(): { code: string; name: string; englishName: string }[] {
    // Same array until the list changes, so templates binding to it don't re-render every check.
    if (this.namedLanguagesFor !== this.languages) {
      this.namedLanguagesFor = this.languages;
      this.namedLanguages = this.languages.map(language => ({
        code: language.code,
        name: language.nativeName,
        englishName: language.name
      }));
    }
    return this.namedLanguages;
  }

  getLangName(code: string): string {
    return this.findLanguage(code)?.nativeName || code;
  }

  /**
   * Loads the enabled languages from the back office (http-language/list) and caches them. Only codes
   * the app has a translation for are kept; on any failure the current list stays.
   */
  refreshLanguages(): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    this.http.get<{ items?: AppLanguage[] }>(`${environment.apiUrl}http-language/list`, {
      context: new HttpContext().set(SKIP_LOGIN_REDIRECT, true)
    }).subscribe({
      next: response => {
        const languages = this.sanitizeLanguages(response?.items);
        if (languages) {
          this.languages = languages;
          try {
            localStorage.setItem(this.LANGUAGES_CACHE_KEY, JSON.stringify(languages));
          } catch {
            // Storage full or blocked: the list still applies for this session.
          }
        }
      },
      error: () => undefined
    });
  }

  private readCachedLanguages(): AppLanguage[] | null {
    try {
      return this.sanitizeLanguages(JSON.parse(localStorage.getItem(this.LANGUAGES_CACHE_KEY) || 'null'));
    } catch {
      return null;
    }
  }

  /** Keeps well-formed entries with a bundled translation; null when nothing usable is left. */
  private sanitizeLanguages(items: unknown): AppLanguage[] | null {
    if (!Array.isArray(items)) {
      return null;
    }

    const seen = new Set<string>();
    const languages = items
      .filter((item): item is AppLanguage => !!item && typeof item.code === 'string')
      .filter(item => BUNDLED_LANGUAGES.some(bundled => bundled.code === item.code) && !seen.has(item.code) && !!seen.add(item.code))
      .map(item => {
        const bundled = BUNDLED_LANGUAGES.find(language => language.code === item.code)!;
        return {
          code: item.code,
          name: String(item.name || bundled.name),
          nativeName: String(item.nativeName || bundled.nativeName),
          rtl: typeof item.rtl === 'boolean' ? item.rtl : bundled.rtl
        };
      });

    return languages.length ? languages : null;
  }

  private findLanguage(code: string): AppLanguage | undefined {
    return this.languages.find(language => language.code === code)
      ?? BUNDLED_LANGUAGES.find(language => language.code === code);
  }

  current(): string {
    return this.currentLangSubject.value || this.translate.currentLang || this.FALLBACK;
  }

  getDateLocale(lang: string = this.current()): string {
    switch (lang) {
      case 'hi':
      case 'hi-latn':
        return 'hi-IN';
      case 'te':
      case 'te-latn':
        return 'te-IN';
      case 'ta':
        return 'ta-IN';
      case 'ar':
        return 'ar';
      case 'ur':
        return 'ur-PK';
      case 'fr':
        return 'fr-FR';
      case 'tr':
        return 'tr-TR';
      case 'id':
        return 'id-ID';
      case 'ms':
        return 'ms-MY';
      case 'es':
        return 'es-ES';
      default:
        return 'en-IN';
    }
  }

  formatDate(date: Date, options: Intl.DateTimeFormatOptions, lang: string = this.current()): string {
    return new Intl.DateTimeFormat(this.getDateLocale(lang), options).format(date);
  }

  isRtlLanguage(lang: string = this.current()): boolean {
    return !!this.findLanguage(lang)?.rtl;
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
      case 'hi':
      case 'hi-latn':
        return 'hi';
      case 'te':
      case 'te-latn':
        return 'te';
      case 'ta':
        return 'ta';
      case 'fr':
        return 'fr-FR';
      case 'tr':
        return 'tr-TR';
      case 'id':
        return 'id-ID';
      case 'ms':
        return 'ms-MY';
      case 'es':
        return 'es-ES';
      default:
        return 'en';
    }
  }
}
