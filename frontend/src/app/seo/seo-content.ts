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
