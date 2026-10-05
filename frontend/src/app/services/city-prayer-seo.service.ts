import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export function citySlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function cityRoute(city: any): string[] {
  const country = citySlug(city.country ?? '');
  return country
    ? ['/prayer-times', country, citySlug(city.city)]
    : ['/prayer-times', citySlug(city.city)];
}

/**
 * Title, description, canonical, schema and on-page SEO text for the prayer-times pages.
 * Shared by the web and mobile layouts so both serve the same metadata at the same URL.
 */
@Injectable({
  providedIn: 'root'
})
export class CityPrayerSeoService {
  private readonly siteUrl = 'https://salah-times.in';
  private readonly schemaId = 'city-prayer-times-schema';

  /** City the page is about, or null for the generic /prayer-times page. */
  city: any = null;

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  get locationName(): string {
    return this.city ? this.city.city : 'your city';
  }

  get locationContext(): string {
    if (!this.city) {
      return 'supported cities across India';
    }

    const parts = [this.city.state, this.city.country].filter(Boolean);
    return parts.length ? `${this.city.city}, ${parts.join(', ')}` : this.city.city;
  }

  get introTitle(): string {
    return this.city
      ? `Prayer Times in ${this.city.city} Today`
      : 'Prayer Times Today, Namaz Timing and Azan Time in India';
  }

  get introDescription(): string {
    return this.city
      ? `Check today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times in ${this.locationContext}, plus Ishraq, Chasht, Zawal and Tahajjud timings.`
      : 'Check today\'s Islamic prayer times, namaz timing and azan time across Indian cities, including Fajr, Dhuhr, Asr, Maghrib and Isha.';
  }

  get focusHeading(): string {
    return this.city
      ? `Namaz timing details for ${this.city.city}`
      : 'Popular prayer time searches we support';
  }

  get focusItems(): Array<{ title: string; body: string }> {
    const city = this.locationName;
    const location = this.locationContext;

    return [
      {
        title: `Fajr time today in ${city}`,
        body: `Find today's Fajr time in ${location}. Fajr is the first farz prayer of the day, so this page keeps it easy to check before dawn.`
      },
      {
        title: `Maghrib time today in ${city}`,
        body: `Check today's Maghrib time in ${location}. Maghrib starts just after sunset and is one of the highest-volume prayer time searches.`
      },
      {
        title: `Asr prayer time today in ${city}`,
        body: `View today's Asr prayer time in ${location}. You can also confirm the selected calculation method and Asr juristic setting used for the timing.`
      },
      {
        title: `Zawal time today in ${city}`,
        body: `View today's Zawal time in ${location}. Zawal is the short period around solar noon before Dhuhr starts, and many people search it to avoid makruh prayer time.`
      },
      {
        title: `Chasht namaz time today in ${city}`,
        body: `Find Chasht namaz time today in ${location}. Chasht, also called Duha prayer, is prayed after Ishraq and before Dhuhr, so this page helps you check that window quickly.`
      },
      {
        title: `Ishraq time today in ${city}`,
        body: `Check Ishraq time today in ${location}. Ishraq starts shortly after sunrise, and many users search for it separately from the regular Fajr and sunrise timings.`
      },
      {
        title: `Tahajjud time today in ${city}`,
        body: `See Tahajjud time today in ${location}. Tahajjud is the late-night prayer before Fajr, and this page helps you track the best prayer window before dawn.`
      }
    ];
  }

  get faqItems(): Array<{ question: string; answer: string }> {
    const city = this.locationName;
    const location = this.locationContext;

    return [
      {
        question: `What are the prayer times today in ${city}?`,
        answer: `This page shows today's prayer times in ${location}, including Fajr, Dhuhr, Asr, Maghrib and Isha with the current daily schedule.`
      },
      {
        question: `What time is Fajr today in ${city}?`,
        answer: `The Fajr time for ${location} is shown in the farz prayer times section near the top of this page.`
      },
      {
        question: `What time is Maghrib today in ${city}?`,
        answer: `The Maghrib time for ${location} is listed with the five daily farz prayer times and updates when the selected date or city changes.`
      },
      {
        question: `How are prayer times calculated for ${city}?`,
        answer: `Prayer times are calculated from the selected city location, calculation method, madhab setting and any prayer-time offsets saved in SalahTime.`
      },
      {
        question: `What is Zawal time today in ${city}?`,
        answer: `Zawal time is the short period around midday before Dhuhr. Use this page to check today's Zawal timing in ${location}.`
      },
      {
        question: `What is Ishraq time today in ${city}?`,
        answer: `Ishraq time starts shortly after sunrise. This page lists today's Ishraq time in ${location} along with the other salah timings.`
      },
      {
        question: `What is Tahajjud time today in ${city}?`,
        answer: `Tahajjud is offered in the night before Fajr, especially in the last third of the night. This page helps you check today's Tahajjud window in ${location}.`
      }
    ];
  }

  update(city?: any): void {
    this.city = city ?? null;
    const pageUrl = city
      ? `${this.siteUrl}${cityRoute(city).join('/')}`
      : `${this.siteUrl}/prayer-times`;
    const pageTitle = city
      ? `Prayer Times in ${city.city} Today: Fajr, Dhuhr, Asr, Maghrib, Isha | SalahTime`
      : 'Prayer Times Today, Namaz Timing & Azan Time in India | SalahTime';
    const description = city
      ? `Check today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times in ${[city.city, city.state, city.country].filter(Boolean).join(', ')}, plus Ishraq, Chasht, Zawal and Tahajjud timings.`
      : 'Find today\'s prayer times, namaz timing and azan time across Indian cities including Fajr, Dhuhr, Asr, Maghrib and Isha.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

    this.document.getElementById(this.schemaId)?.remove();

    const faqEntities = this.faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }));
    const schema = this.document.createElement('script');
    schema.id = this.schemaId;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: pageTitle,
          description,
          url: pageUrl,
          about: city
            ? {
              '@type': 'City',
              name: city.city,
              containedInPlace: {
                '@type': 'Country',
                name: city.country
              }
            }
            : {
              '@type': 'Thing',
              name: 'Islamic prayer times in India'
            },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: city
              ? [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Prayer Times',
                  item: `${this.siteUrl}/prayer-times`
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: city.city,
                  item: pageUrl
                }
              ]
              : [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Prayer Times',
                  item: pageUrl
                }
              ]
          }
        },
        {
          '@type': 'FAQPage',
          mainEntity: faqEntities
        }
      ]
    });
    this.document.head.appendChild(schema);
  }

  clear(): void {
    this.city = null;
    this.document.getElementById(this.schemaId)?.remove();
  }
}
