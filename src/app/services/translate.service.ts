import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  private readonly FALLBACK = 'en';
  private readonly RTL_LANGS = ['ar', 'ur'];

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'te', 'ar', 'ur']);
    this.translate.setDefaultLang(this.FALLBACK);
  }

  init(): Promise<void> {
    const lang = localStorage.getItem('lang') || this.FALLBACK;
    this.applyDirection(lang);
    this.translate.use(lang);
    return Promise.resolve();
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

    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    document.body.classList.toggle('rtl', isRtl);
  }

  available(): string[] {
    return [...this.translate.getLangs()];
  }

  current(): string {
    return this.translate.currentLang || this.FALLBACK;
  }
}
