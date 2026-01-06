import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  private readonly FALLBACK = 'en';

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'te']);
    this.translate.setDefaultLang(this.FALLBACK);
  }

  init(): void {
    const saved = localStorage.getItem('lang') || this.FALLBACK;
    this.use(saved);
  }

  use(lang: string): void {
    if (!this.translate.getLangs().includes(lang)) {
      lang = this.FALLBACK;
    }
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  current(): string {
    return this.translate.currentLang || this.FALLBACK;
  }

  available(): string[] {
    // Convert readonly string[] to mutable string[]
    return [...this.translate.getLangs()];
    // OR: return this.translate.getLangs().slice();
  }
}
