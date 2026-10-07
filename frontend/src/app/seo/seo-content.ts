// SEO text, metadata and schema for the indexable pages.
//
// Plain TypeScript with no imports: the Angular app renders it at runtime, and
// tools/prerender-seo.js loads the same file at build time to write each page's static HTML,
// so crawlers that don't run JavaScript see exactly what the app shows.

export const SITE_URL = 'https://salah-times.in';

export interface SeoCity {
  city: string;
  state?: string;
  country?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
}

export function citySlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function cityRoute(city: SeoCity): string[] {
  const country = citySlug(city.country ?? '');
  return country
    ? ['/prayer-times', country, citySlug(city.city)]
    : ['/prayer-times', citySlug(city.city)];
}

// ---------------------------------------------------------------- /prayer-times and city pages

export function cityLocationName(city: SeoCity | null): string {
  return city ? city.city : 'your city';
}

export function cityLocationContext(city: SeoCity | null): string {
  if (!city) {
    return 'supported cities across India';
  }

  const parts = [city.state, city.country].filter(Boolean);
  return parts.length ? `${city.city}, ${parts.join(', ')}` : city.city;
}

export function cityIntroTitle(city: SeoCity | null): string {
  return city
    ? `Prayer Times in ${city.city} Today`
    : 'Prayer Times Today, Namaz Timing and Azan Time in India';
}

export function cityIntroDescription(city: SeoCity | null): string {
  return city
    ? `Check today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times in ${cityLocationContext(city)}, plus Ishraq, Chasht, Zawal and Tahajjud timings.`
    : 'Check today\'s Islamic prayer times, namaz timing and azan time across Indian cities, including Fajr, Dhuhr, Asr, Maghrib and Isha.';
}

export function cityFocusHeading(city: SeoCity | null): string {
  return city
    ? `Namaz timing details for ${city.city}`
    : 'Popular prayer time searches we support';
}

export function cityFocusItems(seoCity: SeoCity | null): Array<{ title: string; body: string }> {
  const city = cityLocationName(seoCity);
  const location = cityLocationContext(seoCity);

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

export function cityFaqItems(seoCity: SeoCity | null): FaqItem[] {
  const city = cityLocationName(seoCity);
  const location = cityLocationContext(seoCity);

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

export function cityPageMeta(city: SeoCity | null): PageMeta {
  return {
    url: city ? `${SITE_URL}${cityRoute(city).join('/')}` : `${SITE_URL}/prayer-times`,
    title: city
      ? `Prayer Times in ${city.city} Today: Fajr, Dhuhr, Asr, Maghrib, Isha | SalahTime`
      : 'Prayer Times Today, Namaz Timing & Azan Time in India | SalahTime',
    description: city
      ? `Check today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times in ${[city.city, city.state, city.country].filter(Boolean).join(', ')}, plus Ishraq, Chasht, Zawal and Tahajjud timings.`
      : 'Find today\'s prayer times, namaz timing and azan time across Indian cities including Fajr, Dhuhr, Asr, Maghrib and Isha.'
  };
}

export function cityPageSchema(city: SeoCity | null): object {
  const { title, description, url } = cityPageMeta(city);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: title,
        description,
        url,
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
                item: `${SITE_URL}/prayer-times`
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: city.city,
                item: url
              }
            ]
            : [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Prayer Times',
                item: url
              }
            ]
        }
      },
      faqPageSchema(cityFaqItems(city))
    ]
  };
}

export function faqPageSchema(items: FaqItem[]): object {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

// ---------------------------------------------------------------- country pages

export function countryPageMeta(country: string): PageMeta & { heading: string } {
  const heading = `Prayer times in cities of ${country}`;
  return {
    heading,
    title: `${heading} | SalahTime`,
    description: `Browse cities in ${country} for today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times.`,
    url: `${SITE_URL}/prayer-times/${citySlug(country)}`
  };
}

// ---------------------------------------------------------------- homepage

export const HOME_INTRO_TITLE = 'Daily namaz timing for your city';

export const HOME_INTRO_PARAGRAPHS = [
  'SalahTime shows today\'s five daily prayer times (Fajr, Dhuhr, Asr, Maghrib and Isha) along with sunrise, '
    + 'Ishraq, Chasht, Zawal and Tahajjud. Times are calculated from your location, your chosen calculation method '
    + 'and madhab, and any offsets you set, so you can line them up with the masjid timetable you follow.',
  'Search for a city above or allow location access to see the current and next prayer, with the Hijri date '
    + 'and azan reminders.'
];

export const HOME_TOOL_LINKS: Array<{ route: string; title: string; description: string }> = [
  { route: '/prayer-times', title: 'Prayer times today', description: 'Fajr, Dhuhr, Asr, Maghrib and Isha for your city, plus Ishraq, Chasht, Zawal and Tahajjud.' },
  { route: '/salah-calendar', title: 'Salah calendar', description: 'Monthly namaz timetable with Gregorian and Hijri dates.' },
  { route: '/sehri-iftar', title: 'Sehri and Iftar times', description: 'Daily Sehri end and Iftar times for Ramadan and voluntary fasts.' },
  { route: '/qibla-direction', title: 'Qibla direction', description: 'Find the direction of the Kaaba from where you are.' },
  { route: '/duas', title: 'Duas', description: 'Everyday duas with Arabic text, transliteration and meaning.' },
  { route: '/zikar', title: 'Zikar and tasbih', description: 'A digital tasbih counter for your daily adhkar.' },
  { route: '/learn', title: 'Learn salah', description: 'Step-by-step lessons on purification and prayer, with references.' }
];

// Static so the homepage always links to city pages, even before a location is chosen.
export const HOME_POPULAR_CITIES: Array<{ city: string; state: string }> = [
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'New Delhi', state: 'Delhi' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Kanpur', state: 'Uttar Pradesh' },
  { city: 'Bhopal', state: 'Madhya Pradesh' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Patna', state: 'Bihar' },
  { city: 'Srinagar', state: 'Jammu & Kashmir' },
  { city: 'Aligarh', state: 'Uttar Pradesh' },
  { city: 'Moradabad', state: 'Uttar Pradesh' },
  { city: 'Malappuram', state: 'Kerala' },
  { city: 'Kozhikode', state: 'Kerala' },
  { city: 'Aurangabad', state: 'Maharashtra' },
  { city: 'Nagpur', state: 'Maharashtra' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Indore', state: 'Madhya Pradesh' },
  { city: 'Varanasi', state: 'Uttar Pradesh' },
  { city: 'Bareilly', state: 'Uttar Pradesh' },
  { city: 'Meerut', state: 'Uttar Pradesh' },
  { city: 'Rampur', state: 'Uttar Pradesh' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Kurnool', state: 'Andhra Pradesh' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { city: 'Guntur', state: 'Andhra Pradesh' }
];

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How many rakat are in Fajr prayer?',
    answer: 'Fajr prayer has 2 Sunnah rakat followed by 2 Fard rakat.'
  },
  {
    question: 'How many rakat are in Zuhr namaz?',
    answer: 'Zuhr namaz commonly includes 4 Sunnah, 4 Fard, 2 Sunnah and optional nafl prayers.'
  },
  {
    question: 'How many rakats are in Maghrib salah?',
    answer: 'Maghrib salah includes 3 Fard rakat, followed by 2 Sunnah and optional nafl prayers according to personal practice.'
  }
];
