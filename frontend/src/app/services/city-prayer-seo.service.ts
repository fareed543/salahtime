import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  cityFaqItems,
  cityFocusHeading,
  cityFocusItems,
  cityIntroDescription,
  cityIntroTitle,
  cityPageMeta,
  cityPageSchema,
  FaqItem
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

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
  ) {}

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

  update(city?: any): void {
    this.city = city ?? null;
    const { title, description, url } = cityPageMeta(this.city);
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

  clear(): void {
    this.city = null;
    this.document.getElementById(this.schemaId)?.remove();
  }
}
