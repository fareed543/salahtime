import { Injectable } from '@angular/core';
import {
  BACKOFFICE_LANGUAGE_NAMES,
  BACKOFFICE_TRANSLATIONS,
  BackofficeLanguage,
  DEFAULT_BACKOFFICE_LANGUAGE
} from './backoffice-i18n.data';

@Injectable({ providedIn: 'root' })
export class BackofficeI18nService {
  private readonly storageKey = 'lang';

  constructor() {
    this.applyDirection(this.current());
  }

  current(): BackofficeLanguage {
    const stored = localStorage.getItem(this.storageKey);
    return this.isSupportedLanguage(stored) ? stored : DEFAULT_BACKOFFICE_LANGUAGE;
  }

  use(language: string): void {
    const next = this.isSupportedLanguage(language) ? language : DEFAULT_BACKOFFICE_LANGUAGE;
    localStorage.setItem(this.storageKey, next);
    this.applyDirection(next);
  }

  availableWithNames(): { code: BackofficeLanguage; name: string }[] {
    return (Object.keys(BACKOFFICE_LANGUAGE_NAMES) as BackofficeLanguage[]).map((code) => ({
      code,
      name: BACKOFFICE_LANGUAGE_NAMES[code]
    }));
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const dictionary = BACKOFFICE_TRANSLATIONS[this.current()] ?? BACKOFFICE_TRANSLATIONS.en;
    const template = dictionary[key] ?? BACKOFFICE_TRANSLATIONS.en[key] ?? key;
    return !params
      ? template
      : Object.keys(params).reduce(
          (value, paramKey) => value.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(params[paramKey])),
          template
        );
  }

  private applyDirection(language: BackofficeLanguage): void {
    const rtl = language === 'ar' || language === 'ur';
    document.documentElement.lang = language;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', rtl);
  }

  private isSupportedLanguage(value: string | null): value is BackofficeLanguage {
    return value === 'en' || value === 'ar' || value === 'te' || value === 'ur';
  }
}
