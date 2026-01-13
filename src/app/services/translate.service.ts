import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  private readonly LANG_META: Record<string, { name: string }> = {
    en: { name: 'English' },
    te: { name: 'తెలుగు' },
    ar: { name: 'العربية' },
    ur: { name: 'اردو' }
  };

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

    const html = document.documentElement;

    // 🔥 HARD FORCE (cannot be overridden)
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

  translateWithParams(key: string, params: Record<string, any>): string {
    let translation = this.translate.instant(key, params);
    return translation;
  }

}
