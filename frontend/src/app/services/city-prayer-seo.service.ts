import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from './seo.service';
import {
  SeoLang, cityLangs, langOfPath, langPath, localCityMeta, localCityName, localCountryName
} from '../seo/seo-content-i18n';
import {
  cityFaqItems,
  cityFocusHeading,
  cityFocusItems,
  cityIntroDescription,
  cityIntroTitle,
  cityPageMeta,
  cityPageSchema,
  clockTime,
  FaqItem,
  FarzKey,
  HOME_POPULAR_CITIES,
  SITE_URL,
  citySlug as slugOfCity,
  cityRoute as routeOfCity,
  prayerPageLinks
} from '../seo/seo-content';

export { citySlug, cityRoute } from '../seo/seo-content';

/**
 * Title, description, canonical, schema and on-page SEO text for the prayer-times pages.
 * Shared by the web and mobile layouts so both serve the same metadata at the same URL.
 * The text itself lives in seo/seo-content.ts, which the build also uses to prerender these pages.
 */
@Injectable({
  providedIn: 'root'
})
export class CityPrayerSeoService {
  // Same id as the prerendered page's schema, so the app replaces it instead of adding a duplicate.
  private readonly schemaId = 'city-prayer-times-schema';

  /** City the page is about, or null for the generic /prayer-times page. */
  city: any = null;

  /** CR-028: the language of the current address when this city has that version ("ur" / "ar"), else null. */
  lang: SeoLang | null = null;
  /** CR-028: native-script city / country names on Urdu / Arabic addresses (null on English pages). */
  localCity: string | null = null;
  localCountry: string | null = null;
  private names?: Promise<Record<string, Partial<Record<SeoLang, string>>>>;

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private http: HttpClient,
    private seo: SeoService,
  ) {}

  /** Languages this city's page exists in besides English. */
  private langsOf(city: any): SeoLang[] {
    return city ? cityLangs(city, HOME_POPULAR_CITIES.map(item => slugOfCity(item.city))) : [];
  }

  get introTitle(): string {
    return cityIntroTitle(this.city);
  }

  get introDescription(): string {
    return cityIntroDescription(this.city);
  }

  get focusHeading(): string {
    return cityFocusHeading(this.city);
  }

  get focusItems(): Array<{ title: string; body: string }> {
    return cityFocusItems(this.city);
  }

  get faqItems(): FaqItem[] {
    return cityFaqItems(this.city);
  }

  /** CR-006: links to the per-prayer pages, using the city version when the city has one. */
  get prayerLinks(): Array<{ name: string; link: string }> {
    return prayerPageLinks(this.city);
  }

  /**
   * CR-006: after the page has worked out today's times, put them in the description, matching the
   * prerendered page. Only for a city page; the generic /prayer-times page has no single city.
   */
  setTimes(times: Partial<Record<FarzKey, { start: Date }>>): void {
    if (!this.city) {
      return;
    }
    const text: Partial<Record<FarzKey, string>> = {};
    (Object.keys(times) as FarzKey[]).forEach(key => {
      const start = times[key]?.start;
      if (start) {
        text[key] = clockTime(start);
      }
    });
    this.update(this.city, text);
  }

  update(city?: any, times?: Partial<Record<FarzKey, string>>): void {
    this.city = city ?? null;
    const langs = this.langsOf(this.city);
    const pageLang = langOfPath(this.router.url);
    this.lang = pageLang && langs.includes(pageLang) ? pageLang : null;
    if (!this.lang) {
      this.localCity = null;
      this.localCountry = null;
    }
    const english = cityPageMeta(this.city, times);
    const enPath = this.city ? routeOfCity(this.city).join('/') : '/prayer-times';
    // CR-028: every language version lists the others; English is x-default.
    this.seo.setAlternates(langs.length
      ? [['en', SITE_URL + enPath], ...langs.map(code => [code, SITE_URL + langPath(code, enPath)] as [string, string]), ['x-default', SITE_URL + enPath]]
      : []);
    if (this.lang) {
      void this.applyLocal(this.lang, this.city, times, enPath);
    }
    const { title, description, url } = this.lang
      ? { ...english, url: SITE_URL + langPath(this.lang, enPath) }
      : english;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;

    this.document.getElementById(this.schemaId)?.remove();
    const schema = this.document.createElement('script');
    schema.id = this.schemaId;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify(cityPageSchema(this.city));
    this.document.head.appendChild(schema);
  }

  /** CR-028: Urdu / Arabic title and description (native city name once the names file has loaded). */
  private async applyLocal(lang: SeoLang, city: any, times: Partial<Record<FarzKey, string>> | undefined, enPath: string): Promise<void> {
    this.names ??= firstValueFrom(this.http.get<Record<string, Partial<Record<SeoLang, string>>>>('assets/data/city-names.json')).catch(() => ({}));
    const names = await this.names;
    if (this.city !== city || this.lang !== lang) {
      return; // another page took over meanwhile
    }
    const clocks = times?.fajr && times.dhuhr && times.asr && times.maghrib && times.isha
      ? { fajr: times.fajr, sunrise: '', dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha }
      : null;
    this.localCity = localCityName(lang, city, names);
    this.localCountry = localCountryName(lang, city.country);
    const { title, description } = localCityMeta(lang, { city: this.localCity, country: this.localCountry }, clocks);
    const url = SITE_URL + langPath(lang, enPath);
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
  }

  clear(): void {
    this.city = null;
    this.document.getElementById(this.schemaId)?.remove();
  }
}
