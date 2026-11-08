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

/**
 * @param times today's start times (CR-006): when given, the description lists them, so the search
 * result itself answers "what time is Asr in <city>". The prerender refreshes them every day.
 */
export function cityPageMeta(city: SeoCity | null, times?: Partial<Record<FarzKey, string>> | null): PageMeta {
  const where = city ? [city.city, city.state, city.country].filter(Boolean).join(', ') : '';
  const timesText = times ? farzTimesText(times) : '';
  return {
    url: city ? `${SITE_URL}${cityRoute(city).join('/')}` : `${SITE_URL}/prayer-times`,
    title: city
      ? `Prayer Times in ${city.city} Today: Fajr, Dhuhr, Asr, Maghrib, Isha | SalahTime`
      : 'Prayer Times Today, Namaz Timing & Azan Time in India | SalahTime',
    description: city
      ? timesText
        ? `Prayer times today in ${where}: ${timesText}. Plus Ishraq, Chasht, Zawal and Tahajjud timings.`
        : `Check today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times in ${where}, plus Ishraq, Chasht, Zawal and Tahajjud timings.`
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
  { route: '/learn', title: 'Learn salah', description: 'Step-by-step lessons on purification and prayer, with references.' },
  { route: '/masjid', title: 'Masjid jamat timings', description: 'Daily jamat and azan times, photos and facilities of masjids near you.' }
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

// ---------------------------------------------------------------- masjid pages
// Public page per masjid at /masjid/<city>/<name> (slugs are made by the API, MasjidSlug.php).

export interface SeoMasjid {
  name: string;
  /** e.g. "/masjid/hyderabad/masjid-e-noor" */
  publicPath: string;
  address?: string | null;
  location?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  madhab?: string | null;
  contact?: string | null;
  timings?: Array<{ salah: string; azan?: string | null; jamat?: string | null }>;
  images?: Array<{ url: string }>;
}

export const MASJID_LIST_PATH = '/masjid';

function masjidPlace(masjid: SeoMasjid): string {
  return [masjid.area, masjid.city].filter((part, index, all) => !!part && all.indexOf(part) === index).join(', ');
}

/** One-line address: street, area, city, state, pincode, country (no repeats). */
export function masjidAddress(masjid: SeoMasjid): string {
  return [masjid.location || masjid.address, masjid.area, masjid.city, masjid.state, masjid.pincode, masjid.country]
    .map(part => String(part ?? '').trim())
    .filter((part, index, all) => !!part && all.indexOf(part) === index)
    .join(', ');
}

export function masjidPageMeta(masjid: SeoMasjid): PageMeta {
  const place = masjidPlace(masjid);
  const jamats = (masjid.timings ?? [])
    .filter(timing => timing.jamat)
    .map(timing => `${timing.salah} ${timing.jamat}`)
    .slice(0, 5)
    .join(', ');
  return {
    url: `${SITE_URL}${masjid.publicPath}`,
    title: `${masjid.name}${masjid.city ? `, ${masjid.city}` : ''} Namaz & Jamat Timings | SalahTime`,
    description: jamats
      ? `Jamat and azan timings at ${masjid.name}${place ? `, ${place}` : ''}: ${jamats}. Address, facilities and photos.`
      : `Salah jamat and azan timings, address, facilities and photos for ${masjid.name}${place ? `, ${place}` : ''}.`
  };
}

/** Visible intro under the masjid name, also used for crawlers. */
export function masjidIntro(masjid: SeoMasjid): string {
  const place = masjidPlace(masjid);
  const madhab = masjid.madhab === 'hanafi' ? 'Hanafi ' : masjid.madhab === 'shafi' ? "Shafi'i " : '';
  return `${masjid.name} is a ${madhab}masjid${place ? ` in ${place}` : ''}. `
    + 'See its daily azan and jamat times for Fajr, Dhuhr, Asr, Maghrib, Isha and Juma, kept up to date by the masjid.';
}

export function masjidPageSchema(masjid: SeoMasjid): object {
  const { title, description, url } = masjidPageMeta(masjid);
  const mosque: Record<string, unknown> = {
    '@type': 'Mosque',
    '@id': `${url}#mosque`,
    name: masjid.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: masjid.location || masjid.address || undefined,
      addressLocality: masjid.city || masjid.area || undefined,
      addressRegion: masjid.state || undefined,
      postalCode: masjid.pincode || undefined,
      addressCountry: masjid.country || undefined
    }
  };
  if (masjid.contact) {
    mosque['telephone'] = masjid.contact;
  }
  if (masjid.images?.length) {
    mosque['image'] = masjid.images.map(image => image.url);
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      mosque,
      {
        '@type': 'WebPage',
        name: title,
        description,
        url,
        about: { '@id': `${url}#mosque` },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Masjids', item: `${SITE_URL}${MASJID_LIST_PATH}` },
            { '@type': 'ListItem', position: 2, name: masjid.name, item: url }
          ]
        }
      }
    ]
  };
}

// ---------------------------------------------------------------- blog (NF-003)
// Community articles at /blog/<slug>, written by users and published after review.

export interface SeoBlogArticle {
  title: string;
  /** e.g. "/blog/how-to-pray-fajr-on-time" */
  path: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  categoryLabel?: string | null;
  tags?: string[];
  language?: string | null;
  wordCount?: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author: { name: string; path?: string | null };
}

export const BLOG_LIST_PATH = '/blog';

export const BLOG_LIST_META: PageMeta = {
  url: `${SITE_URL}${BLOG_LIST_PATH}`,
  title: 'Islamic Articles on Salah, Quran and Ramadan | SalahTime',
  description: 'Read articles by the SalahTime community on salah, Quran, duas, Ramadan and masjid life, each reviewed by our editors before it is published.'
};

export const BLOG_LIST_INTRO = 'Articles written by SalahTime readers about salah, the Quran, duas, Ramadan and life around the masjid. '
  + 'Every article is reviewed by our editors before it is published. Have something beneficial to share? Write an article and it may be published here.';

/** "2026-10-27 18:05:00" (API, India time) → ISO 8601 with offset, for schema dates. */
function blogIsoDate(value?: string | null): string | undefined {
  return value ? `${value.replace(' ', 'T')}+05:30` : undefined;
}

export function blogArticleMeta(article: SeoBlogArticle): PageMeta {
  const title = (article.metaTitle || article.title).trim();
  return {
    url: `${SITE_URL}${article.path}`,
    title: /salahtime/i.test(title) ? title : `${title} | SalahTime`,
    description: (article.metaDescription || article.excerpt || `${article.title} — an article by ${article.author.name} on SalahTime.`).trim()
  };
}

export function blogArticleSchema(article: SeoBlogArticle): object {
  const { description, url } = blogArticleMeta(article);
  const posting: Record<string, unknown> = {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: article.title.slice(0, 110),
    description,
    url,
    mainEntityOfPage: url,
    datePublished: blogIsoDate(article.publishedAt),
    dateModified: blogIsoDate(article.updatedAt || article.publishedAt),
    inLanguage: article.language || undefined,
    articleSection: article.categoryLabel || undefined,
    keywords: article.tags?.length ? article.tags.join(', ') : undefined,
    wordCount: article.wordCount || undefined,
    author: {
      '@type': 'Person',
      name: article.author.name,
      url: article.author.path ? `${SITE_URL}${article.author.path}` : undefined
    },
    publisher: { '@type': 'Organization', name: 'SalahTime', url: SITE_URL }
  };
  if (article.coverImageUrl) {
    posting['image'] = [article.coverImageUrl];
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      posting,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}${BLOG_LIST_PATH}` },
          { '@type': 'ListItem', position: 2, name: article.title, item: url }
        ]
      }
    ]
  };
}

export function blogAuthorMeta(author: { name: string; path: string }, articleCount: number): PageMeta {
  return {
    url: `${SITE_URL}${author.path}`,
    title: `${author.name}: Articles on SalahTime | SalahTime`,
    description: `${articleCount} ${articleCount === 1 ? 'article' : 'articles'} by ${author.name} on salah, Quran and Islamic life, published on the SalahTime community blog.`
  };
}

// ---------------------------------------------------------------- prayer pages (CR-006)
// One page per prayer at /<slug> (e.g. /asr-time) plus a version per popular city at
// /<slug>/<country>/<city>. Website only: nothing in the Android app links here.
// Times are passed in already formatted, so this file stays free of the calculation code.

export type PrayerPageKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'ishraq' | 'chast' | 'zawal' | 'tahajjud';
export type FarzKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerPage {
  key: PrayerPageKey;
  slug: string;
  name: string;
  /** Other spellings people search for. */
  alsoCalled: string;
  kind: 'farz' | 'nafil' | 'makruh';
  /** Title of the page without a city, at most 60 characters with the suffix. */
  genericTitle: string;
  summary: string;
  about: string[];
}

/** A prayer's window today as clock text, e.g. { start: '4:12 PM', end: '5:45 PM' }. */
export interface PrayerWindowText {
  start: string;
  end: string;
}

export const PRAYER_PAGES: PrayerPage[] = [
  {
    key: 'fajr',
    slug: 'fajr-time',
    name: 'Fajr',
    alsoCalled: 'Fajr namaz, Subah Sadiq and Fajar',
    kind: 'farz',
    genericTitle: 'Fajr Time Today: Fajr Namaz Timing in India | SalahTime',
    summary: 'Fajr is the dawn prayer: 2 Sunnah and 2 Fard rakat, prayed between true dawn (Subah Sadiq) and sunrise.',
    about: [
      'Fajr is the first of the five daily farz prayers. Its time begins at true dawn, called Subah Sadiq, when '
        + 'light first spreads across the eastern horizon, and it ends at sunrise. Fajr has 2 Sunnah rakat, which '
        + 'the Prophet (peace be upon him) never left, followed by 2 Fard rakat.',
      'The start of Fajr depends on the angle of the sun below the horizon. SalahTime uses the University of '
        + 'Islamic Sciences, Karachi method (18°) by default, which most masjids in India and Pakistan follow. '
        + 'Sehri should end a few minutes before Fajr begins, so the same time matters when fasting.'
    ]
  },
  {
    key: 'dhuhr',
    slug: 'dhuhr-time',
    name: 'Dhuhr',
    alsoCalled: 'Zuhr, Zohar and Johar namaz',
    kind: 'farz',
    genericTitle: 'Dhuhr Time Today: Zuhr Namaz Timing in India | SalahTime',
    summary: 'Dhuhr (Zuhr) is the midday prayer: 4 Sunnah, 4 Fard and 2 Sunnah rakat, from just after Zawal until Asr.',
    about: [
      'Dhuhr, also written Zuhr or Zohar, is the second farz prayer of the day. It begins just after Zawal, '
        + 'when the sun passes its highest point and starts to decline, and lasts until the time of Asr. '
        + 'It is usually prayed as 4 Sunnah, 4 Fard and 2 Sunnah rakat.',
      'On Friday, Jumu’ah is prayed in congregation at the time of Dhuhr in place of the 4 Fard rakat. '
        + 'Masjids often set their jamat a while after Dhuhr begins, so check your local masjid for the '
        + 'jamat time and use this page for the start of the prayer window.'
    ]
  },
  {
    key: 'asr',
    slug: 'asr-time',
    name: 'Asr',
    alsoCalled: 'Asar and Asr namaz',
    kind: 'farz',
    genericTitle: 'Asr Time Today: Asar Namaz Timing in India | SalahTime',
    summary: 'Asr is the afternoon prayer of 4 Fard rakat, from mid-afternoon until shortly before sunset.',
    about: [
      'Asr is the afternoon farz prayer of 4 rakat. Its start depends on the length of shadows: in the Hanafi '
        + 'school Asr begins when an object’s shadow is twice its length (plus its noon shadow), while the '
        + 'Shafi’i, Maliki and Hanbali schools start it when the shadow equals the object’s length. That is why '
        + 'Hanafi Asr is usually 45 minutes to an hour later.',
      'SalahTime shows Hanafi Asr by default, which most masjids in India follow; switch the madhab in '
        + 'Settings to see the earlier time. Asr should not be delayed until the sun turns yellow just before '
        + 'sunset, which is a disliked (makruh) time.'
    ]
  },
  {
    key: 'maghrib',
    slug: 'maghrib-time',
    name: 'Maghrib',
    alsoCalled: 'Magrib and Maghrib namaz',
    kind: 'farz',
    genericTitle: 'Maghrib Time Today: Magrib Namaz Timing in India | SalahTime',
    summary: 'Maghrib is the sunset prayer: 3 Fard and 2 Sunnah rakat, starting right after sunset.',
    about: [
      'Maghrib begins as soon as the sun has completely set and lasts until the red twilight leaves the sky. '
        + 'It is prayed as 3 Fard rakat followed by 2 Sunnah, and it is best prayed early in its time, which is why '
        + 'the azan for Maghrib is given straight after sunset.',
      'Iftar time during Ramadan is the same moment as the start of Maghrib. Because Maghrib depends only on '
        + 'sunset, it is the same in every calculation method and madhab.'
    ]
  },
  {
    key: 'isha',
    slug: 'isha-time',
    name: 'Isha',
    alsoCalled: 'Esha and Isha namaz',
    kind: 'farz',
    genericTitle: 'Isha Time Today: Isha Namaz Timing in India | SalahTime',
    summary: 'Isha is the night prayer: 4 Fard, 2 Sunnah and 3 Witr rakat, from nightfall until Fajr.',
    about: [
      'Isha is the last farz prayer of the day. It begins when twilight has disappeared from the sky and '
        + 'remains valid until Fajr, though it is preferred before midnight. It is prayed as 4 Fard and 2 Sunnah '
        + 'rakat, followed by Witr (3 rakat in the Hanafi school).',
      'Like Fajr, the start of Isha depends on the sun’s angle below the horizon. SalahTime uses the Karachi '
        + 'method (18°) by default; you can choose another method in Settings to match your masjid.'
    ]
  },
  {
    key: 'ishraq',
    slug: 'ishraq-time',
    name: 'Ishraq',
    alsoCalled: 'Ishraq namaz and Ishraq nafl',
    kind: 'nafil',
    genericTitle: 'Ishraq Time Today: Ishraq Namaz Timing in India | SalahTime',
    summary: 'Ishraq is a voluntary prayer of 2 or 4 rakat, prayed about 20 minutes after sunrise.',
    about: [
      'Ishraq is a nafl (voluntary) prayer offered after the sun has fully risen. Praying at the exact moment '
        + 'of sunrise is not allowed, so Ishraq begins about 15 to 20 minutes after sunrise. It is commonly prayed '
        + 'as 2 or 4 rakat.',
      'Many people stay in their place of prayer after Fajr, making dhikr until sunrise, and then pray Ishraq. '
        + 'SalahTime shows Ishraq from 20 minutes after sunrise, which leaves a safe margin after the disliked time.'
    ]
  },
  {
    key: 'chast',
    slug: 'chasht-time',
    name: 'Chasht',
    alsoCalled: 'Chast, Duha and Zuha namaz',
    kind: 'nafil',
    genericTitle: 'Chasht Time Today: Chasht Namaz Timing in India | SalahTime',
    summary: 'Chasht (Duha) is a voluntary forenoon prayer of 2 to 12 rakat, between Ishraq and Zawal.',
    about: [
      'Chasht, known in Arabic as Salat al-Duha, is a nafl prayer offered in the forenoon, when the sun has '
        + 'risen well above the horizon. It is usually prayed as 2, 4, 8 or up to 12 rakat.',
      'Its time runs from after Ishraq until shortly before Zawal. SalahTime shows the Chasht window from '
        + 'about 90 minutes after sunrise until 10 minutes before Dhuhr.'
    ]
  },
  {
    key: 'zawal',
    slug: 'zawal-time',
    name: 'Zawal',
    alsoCalled: 'Zawaal, Zawal waqt and solar noon',
    kind: 'makruh',
    genericTitle: 'Zawal Time Today: Makruh Time Before Zuhr | SalahTime',
    summary: 'Zawal is the short time at solar noon when no prayer should be offered; Dhuhr starts right after it.',
    about: [
      'Zawal is the moment the sun reaches its highest point in the sky (solar noon). Offering any prayer during '
        + 'this short time is makruh (disliked), so it is one of the three times to avoid, along with sunrise and '
        + 'sunset.',
      'SalahTime shows Zawal as a window of a few minutes around solar noon. Once it has passed, the time of '
        + 'Dhuhr begins.'
    ]
  },
  {
    key: 'tahajjud',
    slug: 'tahajjud-time',
    name: 'Tahajjud',
    alsoCalled: 'Tahajjud namaz and Qiyam al-Layl',
    kind: 'nafil',
    genericTitle: 'Tahajjud Time Today: Tahajjud Namaz Timing | SalahTime',
    summary: 'Tahajjud is the voluntary night prayer, best in the last third of the night before Fajr.',
    about: [
      'Tahajjud is a nafl prayer offered at night after waking from sleep. It can be prayed any time after Isha, '
        + 'but the best time is the last third of the night, before Fajr. It is usually prayed in sets of 2 rakat, '
        + 'commonly 2 to 12 in total, followed by Witr for those who delay it.',
      'SalahTime works out the last third of the night from Maghrib to Fajr, and ends the window a little before '
        + 'Sehri so you have time to eat if you are fasting.'
    ]
  }
];

/** City shown on a prayer page when the visitor has no saved location. */
export const DEFAULT_PRAYER_PAGE_CITY: SeoCity = { city: 'New Delhi', state: 'Delhi', country: 'India' };

/** Cities that get their own version of each prayer page. */
export const PRAYER_PAGE_CITIES: SeoCity[] = HOME_POPULAR_CITIES.map(city => ({ ...city, country: 'India' }));

export function prayerPageBySlug(slug: string): PrayerPage | undefined {
  return PRAYER_PAGES.find(page => page.slug === slug);
}

export function prayerPageCity(country: string, city: string): SeoCity | undefined {
  return PRAYER_PAGE_CITIES.find(item => citySlug(item.country ?? '') === country && citySlug(item.city) === city);
}

export function prayerPageRoute(page: PrayerPage, city?: SeoCity | null): string {
  return city ? `/${page.slug}/${citySlug(city.country ?? '')}/${citySlug(city.city)}` : `/${page.slug}`;
}

/** "4:05 PM" from a Date whose local clock shows the city's time (as WaqtService returns them). */
export function clockTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** Links to every prayer page, in the given city's version when it has one. */
export function prayerPageLinks(city?: SeoCity | null): Array<{ name: string; link: string }> {
  const own = city ? prayerPageCity(citySlug(city.country ?? ''), citySlug(city.city)) : undefined;
  return PRAYER_PAGES.map(page => ({
    name: own ? `${page.name} time in ${own.city}` : `${page.name} time today`,
    link: prayerPageRoute(page, own)
  }));
}

export function prayerPageHeading(page: PrayerPage, city: SeoCity | null): string {
  return city ? `${page.name} Time Today in ${city.city}` : `${page.name} Time Today`;
}

export function prayerPageMeta(
  page: PrayerPage,
  city: SeoCity | null,
  window?: PrayerWindowText | null,
  samples: Array<{ city: string; start: string }> = []
): PageMeta {
  const url = `${SITE_URL}${prayerPageRoute(page, city)}`;
  if (city) {
    const where = cityLocationContext(city);
    return {
      url,
      title: window
        ? `${prayerPageHeading(page, city)} – ${window.start} | SalahTime`
        : `${prayerPageHeading(page, city)} | SalahTime`,
      description: window
        ? `${page.name} time today in ${where}: ${window.start} to ${window.end}. ${page.summary}`
        : `Check today's ${page.name} time in ${where}. ${page.summary}`
    };
  }
  const sampleText = samples.length
    ? `Today's ${page.name} time: ${samples.map(sample => `${sample.city} ${sample.start}`).join(', ')}. `
    : '';
  return {
    url,
    title: page.genericTitle,
    description: `${sampleText}${page.summary} See ${page.name} time for your location.`
  };
}

export function prayerPageIntro(page: PrayerPage, city: SeoCity | null): string {
  return city
    ? `Today's ${page.name} time in ${cityLocationContext(city)}, worked out from the city's location. ${page.summary}`
    : `Today's ${page.name} time for your location, with ${page.name} timings for cities across India. ${page.summary}`;
}

export function prayerPageFaq(page: PrayerPage, city: SeoCity | null): FaqItem[] {
  const items: FaqItem[] = [
    {
      question: `What time is ${page.name} today in ${city ? city.city : 'my location'}?`,
      answer: city
        ? `Today's ${page.name} time in ${cityLocationContext(city)} is shown at the top of this page, with the time it starts and ends.`
        : `Use your current location or pick a city on this page to see today's ${page.name} time where you are.`
    },
    {
      question: `What is ${page.name} also called?`,
      answer: `${page.name} is also written or searched as ${page.alsoCalled}.`
    },
    page.kind === 'makruh'
      ? {
        question: `Can I pray during ${page.name}?`,
        answer: 'No prayer should be offered during Zawal. Wait until it has passed; the time of Dhuhr starts straight after.'
      }
      : {
        question: `How many rakat are in ${page.name}?`,
        answer: page.summary
      },
    {
      question: `Which calculation method does SalahTime use for ${page.name}?`,
      answer: 'By default the Karachi method (Fajr and Isha at 18°) and Hanafi Asr. You can change the method, madhab and minute offsets in Settings.'
    }
  ];
  return items;
}

export function prayerPageSchema(page: PrayerPage, city: SeoCity | null, meta: PageMeta): object {
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: `${page.name} Time`, item: `${SITE_URL}${prayerPageRoute(page)}` },
    ...(city ? [{ '@type': 'ListItem', position: 2, name: city.city, item: meta.url }] : [])
  ];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: meta.title,
        description: meta.description,
        url: meta.url,
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: crumbs }
      },
      faqPageSchema(prayerPageFaq(page, city))
    ]
  };
}

/** "Fajr 5:21 AM, Dhuhr 12:15 PM, …" for a city page's description. */
export function farzTimesText(times: Partial<Record<FarzKey, string>>): string {
  const names: Array<[FarzKey, string]> = [
    ['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']
  ];
  return names.filter(([key]) => times[key]).map(([key, name]) => `${name} ${times[key]}`).join(', ');
}

// ---------------------------------------------------------------- dates (same text in the build and the app)

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Tuesday 9 February 2027" (no locale differences between Node and browsers). */
export function longDate(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Tue 9 Feb" */
export function shortDate(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()].slice(0, 3)} ${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------- Ramadan city pages (NF-009)

export const RAMADAN = { hijriYear: 1448, gregorianYear: 2027 };
export const RAMADAN_LIST_PATH = '/sehri-iftar';

export interface RamadanRange {
  start: Date;
  /** Days shown: the confirmed length, or 30 when the last one depends on the moon. */
  days: number;
  /** True when the last day is only kept if the Shawwal moon is not seen. */
  lastDayDepends: boolean;
  /** 'override' = back-office moon-sighting date; 'india-default' = Umm al-Qura + 1 day. */
  source: 'override' | 'india-default' | 'umm-al-qura';
}

/**
 * Ramadan dates for a country. A back-office adjustment for that country wins; without one India
 * starts a day after the Umm al-Qura calendar (approved in NF-009), other countries follow it.
 */
export function ramadanRange(
  ummAlQura: { start: Date; days: number },
  countrySlug: string,
  override?: { updatedStartDate: string; updatedEndDate: string } | null
): RamadanRange {
  if (override) {
    const start = parseDateKey(override.updatedStartDate);
    const end = parseDateKey(override.updatedEndDate);
    return { start, days: Math.round((end.getTime() - start.getTime()) / 86400000) + 1, lastDayDepends: false, source: 'override' };
  }
  if (countrySlug === 'india') {
    return { start: addDays(ummAlQura.start, 1), days: 30, lastDayDepends: true, source: 'india-default' };
  }
  return { start: ummAlQura.start, days: ummAlQura.days, lastDayDepends: false, source: 'umm-al-qura' };
}

export interface RamadanDayTimes {
  sahri: Date;
  iftar: Date;
}

export interface RamadanDayRow {
  day: number;
  date: Date;
  dateText: string;
  sehri: string;
  iftar: string;
  depends: boolean;
}

/** One row per Ramadan day; timesFor is WaqtService with the default settings (build and app). */
export function ramadanDays(range: RamadanRange, timesFor: (date: Date) => RamadanDayTimes): RamadanDayRow[] {
  return Array.from({ length: range.days }, (_, index) => {
    const date = addDays(range.start, index);
    const times = timesFor(date);
    return {
      day: index + 1,
      date,
      dateText: shortDate(date),
      sehri: clockTime(times.sahri),
      iftar: clockTime(times.iftar),
      depends: range.lastDayDepends && index === range.days - 1
    };
  });
}

export function ramadanCityPath(city: SeoCity): string {
  return `${RAMADAN_LIST_PATH}/${citySlug(city.country ?? '')}/${citySlug(city.city)}`;
}

/** The Ramadan day for "today" (date-only compare), or null outside Ramadan. */
export function ramadanToday(rows: RamadanDayRow[], today: Date): RamadanDayRow | null {
  const key = dateKey(today);
  return rows.find(row => dateKey(row.date) === key) ?? null;
}

export function ramadanCityHeading(city: SeoCity): string {
  return `Sehri and Iftar Time in ${city.city} – Ramadan ${RAMADAN.gregorianYear}`;
}

export function ramadanCityMeta(city: SeoCity, rows: RamadanDayRow[], today: RamadanDayRow | null): PageMeta {
  const where = [city.city, city.state].filter(Boolean).join(', ');
  const first = rows[0];
  const startText = longDate(first.date);
  return {
    url: `${SITE_URL}${ramadanCityPath(city)}`,
    title: today
      ? firstFittingTitle([
        `${city.city} Sehri ${today.sehri}, Iftar ${today.iftar} Today – Ramadan ${RAMADAN.gregorianYear}`,
        `${city.city} Sehri ${today.sehri}, Iftar ${today.iftar} Today`
      ])
      : firstFittingTitle([
        `${city.city} Sehri & Iftar Time: Ramadan ${RAMADAN.gregorianYear} Timetable`,
        `${city.city} Sehri & Iftar Time – Ramadan ${RAMADAN.gregorianYear}`,
        `${city.city} Sehri Iftar – Ramadan ${RAMADAN.gregorianYear}`
      ]),
    description: clampDescription(today
      ? `Ramadan day ${today.day} in ${where}: Sehri ends ${today.sehri}, Iftar ${today.iftar}. Full Ramadan ${RAMADAN.gregorianYear} Sehri and Iftar timetable for ${city.city}.`
      : `Ramadan ${RAMADAN.gregorianYear} in ${where} is expected to begin on ${startText}. Day 1: Sehri ends ${first.sehri}, Iftar ${first.iftar}. Full ${rows.length}-day Sehri and Iftar timetable.`)
  };
}

export function ramadanCityIntro(city: SeoCity, rows: RamadanDayRow[], range: RamadanRange): string[] {
  const first = rows[0];
  const last = rows[range.lastDayDepends ? rows.length - 2 : rows.length - 1];
  const sighting = range.source === 'override'
    ? 'These dates follow the moon-sighting date announced for India.'
    : 'The dates are expected and depend on the sighting of the moon; India usually begins Ramadan one day after Saudi Arabia.';
  return [
    `Ramadan ${RAMADAN.gregorianYear} (${RAMADAN.hijriYear} AH) in ${city.city} is expected to begin on ${longDate(first.date)}, with the first fast after Sehri that morning. ${sighting}`,
    `Sehri (Suhoor) ends at Fajr and Iftar is at Maghrib (sunset). The times below are worked out for ${city.city}'s coordinates with the Karachi method; your local masjid may announce a few minutes' precaution.`,
    range.lastDayDepends
      ? `Ramadan has 29 or 30 days: the last fast is on ${longDate(last.date)} if the Shawwal moon is seen that evening, otherwise on ${longDate(rows[rows.length - 1].date)}.`
      : `The last fast is on ${longDate(last.date)}.`
  ];
}

export function ramadanCityFaq(city: SeoCity, rows: RamadanDayRow[]): FaqItem[] {
  const first = rows[0];
  // The odd nights 21, 23, 25, 27 and 29 begin at Maghrib on the evening of days 20, 22, 24, 26 and 28.
  const qadrNights = rows.filter(row => [20, 22, 24, 26, 28].includes(row.day)).map(row => shortDate(row.date));
  return [
    {
      question: `When does Ramadan ${RAMADAN.gregorianYear} start in ${city.city}?`,
      answer: `Ramadan ${RAMADAN.gregorianYear} is expected to start on ${longDate(first.date)} in ${city.city}, subject to the sighting of the moon the evening before.`
    },
    {
      question: `What is the Sehri and Iftar time in ${city.city} on the first day of Ramadan?`,
      answer: `On the first day of Ramadan ${RAMADAN.gregorianYear} in ${city.city}, Sehri ends at ${first.sehri} and Iftar is at ${first.iftar}.`
    },
    {
      question: 'How are Sehri and Iftar times calculated?',
      answer: 'Sehri ends at the start of Fajr (dawn) and Iftar is at Maghrib (sunset), calculated for the city\'s latitude and longitude with the University of Islamic Sciences, Karachi method.'
    },
    {
      question: `When is Laylat al-Qadr in Ramadan ${RAMADAN.gregorianYear}?`,
      answer: `Laylat al-Qadr is sought in the odd nights of the last ten days. In ${city.city} these nights begin on the evenings of ${qadrNights.join(', ')}.`
    }
  ];
}

export function ramadanCitySchema(city: SeoCity, meta: PageMeta, faq: FaqItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: meta.title,
        description: meta.description,
        url: meta.url,
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Sehri and Iftar', item: `${SITE_URL}${RAMADAN_LIST_PATH}` },
            { '@type': 'ListItem', position: 2, name: city.city, item: meta.url }
          ]
        }
      },
      faqPageSchema(faq)
    ]
  };
}

// ---------------------------------------------------------------- monthly timetables (NF-010)

export interface CityMonth {
  year: number;
  /** 0-11 */
  month: number;
}

/** "november-2026" */
export function monthSlug(month: CityMonth): string {
  return `${MONTH_NAMES[month.month].toLowerCase()}-${month.year}`;
}

export function parseMonthSlug(slug: string): CityMonth | null {
  const match = /^([a-z]+)-(\d{4})$/.exec(slug ?? '');
  const index = match ? MONTH_NAMES.findIndex(name => name.toLowerCase() === match[1]) : -1;
  return match && index >= 0 ? { year: Number(match[2]), month: index } : null;
}

export function monthName(month: CityMonth): string {
  return `${MONTH_NAMES[month.month]} ${month.year}`;
}

/** The months that have a page: the current one and the next (MON-01). */
export function cityPageMonths(today: Date): CityMonth[] {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return [
    { year: today.getFullYear(), month: today.getMonth() },
    { year: next.getFullYear(), month: next.getMonth() }
  ];
}

export function cityMonthPath(city: SeoCity, month: CityMonth): string {
  return `${cityRoute(city).join('/')}/${monthSlug(month)}`;
}

export interface CityMonthTimes {
  fajr: Date;
  tulu: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface CityMonthRow {
  day: number;
  dateText: string;
  friday: boolean;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export function cityMonthRows(month: CityMonth, timesFor: (date: Date) => CityMonthTimes): CityMonthRow[] {
  const days = new Date(month.year, month.month + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(month.year, month.month, index + 1);
    const t = timesFor(date);
    return {
      day: index + 1,
      dateText: shortDate(date),
      friday: date.getDay() === 5,
      fajr: clockTime(t.fajr),
      sunrise: clockTime(t.tulu),
      dhuhr: clockTime(t.dhuhr),
      asr: clockTime(t.asr),
      maghrib: clockTime(t.maghrib),
      isha: clockTime(t.isha)
    };
  });
}

export function cityMonthHeading(city: SeoCity, month: CityMonth): string {
  return `${city.city} Prayer Times ${monthName(month)}`;
}

export function cityMonthMeta(city: SeoCity, month: CityMonth, rows: CityMonthRow[]): PageMeta {
  const where = [city.city, city.state].filter(Boolean).join(', ');
  const first = rows[0];
  const last = rows[rows.length - 1];
  const name = monthName(month);
  return {
    url: `${SITE_URL}${cityMonthPath(city, month)}`,
    title: firstFittingTitle([
      `${city.city} Prayer Times ${name}: Namaz Timetable`,
      `${city.city} Prayer Times ${name}`,
      `${city.city} Namaz ${MONTH_NAMES[month.month].slice(0, 3)} ${month.year}`
    ]),
    description: clampDescription(
      `${name} namaz timetable for ${where}: Fajr ${first.fajr} on the 1st to ${last.fajr} on the ${last.day}${last.day === 31 ? 'st' : 'th'}, `
      + `Maghrib ${first.maghrib} to ${last.maghrib}. Daily Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha.`
    )
  };
}

export function cityMonthIntro(city: SeoCity, month: CityMonth): string {
  return `Daily prayer times in ${cityLocationContext(city)} for ${monthName(month)}: Fajr, Sunrise, Dhuhr, Asr, Maghrib `
    + 'and Isha for every day of the month, calculated with the Karachi method and Hanafi Asr. Fridays are marked for Jumu\'ah.';
}

export function cityMonthSchema(city: SeoCity, month: CityMonth, meta: PageMeta): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Prayer Times', item: `${SITE_URL}/prayer-times` },
        { '@type': 'ListItem', position: 2, name: city.city, item: `${SITE_URL}${cityRoute(city).join('/')}` },
        { '@type': 'ListItem', position: 3, name: monthName(month), item: meta.url }
      ]
    }
  };
}

// ---------------------------------------------------------------- city lists

export interface SeoLocation extends SeoCity {
  coordinates?: { latitude: number; longitude: number };
}

/**
 * City URLs that permanently redirect to another city page ("<country>/<city>" → "<country>/<city>").
 * - States listed in the location data as if they were cities go to the state capital. Kept as an
 *   explicit list: many real cities share their state's name (Puducherry, Dubai, Abu Dhabi,
 *   Istanbul), so the name alone can't tell them apart. Fix them in Back office → Locations too.
 * - Common names with no entry of their own (Delhi) go to the city people mean.
 */
export const CITY_URL_REDIRECTS: Record<string, string> = {
  'india/arunachal-pradesh': 'india/itanagar',
  'india/manipur': 'india/imphal',
  'india/delhi': 'india/new-delhi',
  // CR-008: alternate spellings of cities that have one page
  'india/gurgaon': 'india/gurugram',
  'india/hubli': 'india/hubballi',
  'india/kayalpatnam': 'india/kayalpattinam'
};

/** A location whose URL redirects elsewhere (see CITY_URL_REDIRECTS): it gets no page or link. */
export function isStateNameEntry(location: SeoLocation, _all?: SeoLocation[]): boolean {
  return `${citySlug(location.country ?? '')}/${citySlug(location.city)}` in CITY_URL_REDIRECTS;
}

function distanceKm(a: SeoLocation, b: SeoLocation): number {
  if (!a.coordinates || !b.coordinates) {
    return Number.POSITIVE_INFINITY;
  }
  const rad = (deg: number) => deg * Math.PI / 180;
  const dLat = rad(b.coordinates.latitude - a.coordinates.latitude);
  const dLon = rad(b.coordinates.longitude - a.coordinates.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.coordinates.latitude)) * Math.cos(rad(b.coordinates.latitude)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** The closest other cities in the same country, nearest first (for "Prayer times in cities near X"). */
export function nearbyCities<T extends SeoLocation>(city: SeoLocation, all: T[], limit = 12): T[] {
  const slug = citySlug(city.city);
  const seen = new Set<string>([slug]);
  return all
    .filter(other => other.country === city.country && !isStateNameEntry(other, all))
    .map(other => ({ other, km: distanceKm(city, other) }))
    .filter(entry => Number.isFinite(entry.km))
    .sort((a, b) => a.km - b.km)
    .filter(entry => {
      const key = citySlug(entry.other.city);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(entry => entry.other);
}

export function nearbyCitiesHeading(city: SeoCity): string {
  return `Prayer times in cities near ${city.city}`;
}

// ---------------------------------------------------------------- duas

export interface SeoDua {
  id: number;
  title: string;
  arabic?: string;
  transliteration?: string;
  translation?: string;
  reference?: string;
}

export interface SeoDuaCategory {
  slug: string;
  title: string;
  description?: string;
  duas: SeoDua[];
}

export const DUA_LIST_PATH = '/duas';

/**
 * duas.json categories with their duas resolved: only the "all" category holds the full duas, the
 * others list dua ids into it (same rule as DuaDataService.normalizeCategories).
 */
export function duaCategoriesFromData(data: { categories: any[] }): SeoDuaCategory[] {
  const all = data.categories.find(category => category.slug === 'all');
  const byId = new Map<number, SeoDua>((all?.duas ?? [])
    .filter((entry: unknown) => typeof entry === 'object')
    .map((entry: SeoDua) => [entry.id, entry]));
  return data.categories.map(category => ({
    ...category,
    duas: (category.duas ?? [])
      .map((entry: unknown) => typeof entry === 'number' ? byId.get(entry) : entry as SeoDua)
      .filter((entry: SeoDua | undefined): entry is SeoDua => !!entry)
  }));
}

export function duaCategoryPath(category: SeoDuaCategory): string {
  return `${DUA_LIST_PATH}/${category.slug}`;
}

function clampTitle(main: string, suffix = ' | SalahTime', max = 62): string {
  const room = max - suffix.length;
  if (main.length <= room) {
    return `${main}${suffix}`;
  }
  const cut = main.slice(0, room);
  // Prefer ending at a list item ("…: Before eating, After eating"), never on "and" or a comma.
  const atComma = cut.lastIndexOf(',');
  const shortened = (atComma > room / 2 ? cut.slice(0, atComma) : cut.slice(0, cut.lastIndexOf(' ')))
    .replace(/(\s+(and|or|with|&amp;|&))+$/i, '')
    .replace(/[\s,:;–-]+$/, '');
  return `${shortened}${suffix}`;
}

/** The first title that fits without shortening; otherwise the last one, shortened. */
function firstFittingTitle(options: string[], suffix = ' | SalahTime', max = 62): string {
  const fits = options.find(option => option.length + suffix.length <= max);
  return fits ? `${fits}${suffix}` : clampTitle(options[options.length - 1], suffix, max);
}

function clampDescription(text: string, max = 158): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Duas page for one category, e.g. /duas/eating: every dua in it, with Arabic and meaning. */
export function duaCategoryMeta(category: SeoDuaCategory): PageMeta & { heading: string } {
  const heading = `${category.title} Duas`;
  const names = category.duas.map(dua => dua.title);
  const count = category.duas.length;
  const description = clampDescription(
    `${heading}: ${count} masnoon ${count === 1 ? 'dua' : 'duas'} with Arabic text, transliteration, `
    + `English meaning and hadith reference: ${names.join(', ')}.`
  );
  return {
    heading,
    title: clampTitle(`${heading}: ${names.slice(0, 3).join(', ')}`),
    description,
    url: `${SITE_URL}${duaCategoryPath(category)}`
  };
}

export function duaCategorySchema(category: SeoDuaCategory): object {
  const meta = duaCategoryMeta(category);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Duas', item: `${SITE_URL}${DUA_LIST_PATH}` },
        { '@type': 'ListItem', position: 2, name: meta.heading, item: meta.url }
      ]
    }
  };
}

// ---------------------------------------------------------------- learn

export interface SeoLearnEntry {
  id: string;
  kind: string;
  ruling?: string;
  title: string;
  summary?: string;
  steps: string[];
  note?: string;
  missed?: string;
}

export interface SeoLearnTopic {
  id: string;
  title: string;
  summary?: string;
  school?: string;
  entries: SeoLearnEntry[];
}

export const LEARN_LIST_PATH = '/learn';

export function learnTopicPath(topic: SeoLearnTopic): string {
  return `${LEARN_LIST_PATH}/${topic.id}`;
}

const RULING_NAMES: Record<string, string> = {
  fard: 'Farz', farz: 'Farz', wajib: 'Wajib', sunnah: 'Sunnah', mustahab: 'Mustahab', mustahabb: 'Mustahab',
  nafl: 'Nafl', makruh: 'Makruh'
};

/** English text of a learn.json topic (its fields are { en, te, ar, ur }), for SEO and prerendering. */
export function learnTopicFromData(topic: any): SeoLearnTopic & { quizCount: number } {
  const en = (value: any): string => (value && typeof value === 'object' ? value.en ?? '' : value ?? '');
  return {
    id: topic.id,
    title: en(topic.title),
    summary: en(topic.summary),
    school: topic.school,
    quizCount: (topic.quiz ?? []).length,
    entries: (topic.entries ?? []).map((entry: any) => ({
      id: entry.id,
      kind: entry.kind,
      ruling: entry.ruling,
      title: en(entry.title),
      summary: en(entry.summary),
      steps: (entry.steps ?? []).map(en).filter(Boolean),
      note: en(entry.note),
      missed: en(entry.missed)
    }))
  };
}

export function learnRulingName(ruling?: string): string {
  return ruling ? (RULING_NAMES[ruling.toLowerCase()] ?? ruling) : '';
}

/** One Learn topic, e.g. /learn/wudu: every step with its ruling, in one page. */
export function learnTopicMeta(topic: SeoLearnTopic): PageMeta & { heading: string } {
  const school = topic.school ? `${topic.school.charAt(0).toUpperCase()}${topic.school.slice(1)} ` : '';
  const heading = `How to perform ${topic.title}: step by step`;
  const actions = topic.entries.filter(entry => entry.kind === 'action').map(entry => entry.title);
  return {
    heading,
    title: clampTitle(`How to Perform ${topic.title}: Steps, Farz and Sunnah`),
    description: clampDescription(
      `${topic.summary ? `${topic.summary}. ` : ''}${school}${topic.title} step by step with each action's ruling `
      + `(Farz, Sunnah) and what to do if one is missed: ${actions.join(', ')}.`
    ),
    url: `${SITE_URL}${learnTopicPath(topic)}`
  };
}

export function learnTopicSchema(topic: SeoLearnTopic): object {
  const meta = learnTopicMeta(topic);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Learn', item: `${SITE_URL}${LEARN_LIST_PATH}` },
        { '@type': 'ListItem', position: 2, name: topic.title, item: meta.url }
      ]
    }
  };
}
