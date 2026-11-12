// NF-015 Sunnah Shorts: SEO text and helpers, used by the app (grid / player) and by the build
// (tools/shorts-pages.js: sitemap + prerendered pages). Self-contained on purpose — no imports — so
// the build can load it on its own and the whole Shorts module can be removed without touching
// src/app/seo/seo-content.ts.

export const SHORTS_SITE_URL = 'https://salah-times.in';
export const SHORTS_PATH = '/shorts';

export const SHORTS_INTRO = 'One Sunnah of the Prophet ﷺ per card, with its hadith reference. Tap a card and swipe up for the next one.';

/** Website-only text for the prerendered /shorts page (SEO-12: landing pages need real content). */
export const SHORTS_ABOUT: string[] = [
  'Sunnah Shorts collects the everyday Sunnahs of the Prophet Muhammad ﷺ as short cards you can read in a few seconds. '
    + 'Each card explains one Sunnah in simple words and names the hadith book and number it comes from, such as Tirmizi, '
    + 'Mishkaat, Ibne Maaja, Bukhari or Muslim, so you can look it up yourself.',
  'The cards are grouped the way the Sunnahs are taught: the Sunnah prayers before and after each salah, Salatul Awwabeen '
    + 'and Chasht, and the Sunnahs of waking up, eating and drinking, dressing, travelling and going to sleep. Some cards '
    + 'also carry a zikr or dua with its Arabic text, transliteration and meaning.',
  'Open a card to read it full screen, then swipe up for the next Sunnah and down for the previous one. Mark a Sunnah as '
    + 'done today, save the ones you want to practise, like the cards that help you, and share them with family and friends '
    + 'on WhatsApp. Reviving a Sunnah, even a small one, is a way of following the Prophet ﷺ in daily life.',
  'New Sunnahs are added regularly. The cards are written in English first and shown in your language when a translation '
    + 'is available. SalahTime also gives you accurate prayer times, a Qibla direction finder, duas and a tasbih counter.'
];

export interface SeoSunnahText {
  en: string;
  [language: string]: string;
}

export interface SeoSunnahCard {
  slug: string;
  categoryId: number;
  headline: SeoSunnahText;
  body: SeoSunnahText;
  zikr?: { arabic: string; transliteration?: string; meaning?: Partial<SeoSunnahText> } | null;
  references: Array<{ book: string; number: string }>;
}

export interface SeoSunnahCategory {
  id: number;
  name: SeoSunnahText;
}

export interface ShortsPageMeta {
  title: string;
  description: string;
  url: string;
  heading: string;
  path: string;
}

/** Headline without the *accent* marks. */
export function sunnahPlain(text: string): string {
  return (text ?? '').replace(/\*/g, '').trim();
}

export function sunnahCardPath(card: Pick<SeoSunnahCard, 'slug'>): string {
  return `${SHORTS_PATH}/${card.slug}`;
}

export function sunnahReferences(card: SeoSunnahCard): string {
  return (card.references ?? []).map(reference => `${reference.book} ${reference.number}`.trim()).join(', ');
}

/** One card page, e.g. /shorts/4-before-zuhr-2-after (English, like every prerendered page). */
export function sunnahCardMeta(card: SeoSunnahCard, category?: SeoSunnahCategory): ShortsPageMeta {
  const heading = sunnahPlain(card.headline.en);
  const references = sunnahReferences(card);
  const first = card.references?.[0];
  const path = sunnahCardPath(card);
  return {
    heading,
    path,
    title: shortsTitle(first ? `${heading}: Sunnah (${first.book} ${first.number})` : `${heading}: Sunnah`),
    description: shortsDescription(
      `${card.body.en}${references ? ` Reference: ${references}.` : ''}${category ? ` ${category.name.en} Sunnahs on SalahTime.` : ''}`
    ),
    url: `${SHORTS_SITE_URL}${path}`
  };
}

export function sunnahCardSchema(card: SeoSunnahCard, category?: SeoSunnahCategory): object {
  const meta = sunnahCardMeta(card, category);
  const crumbs: Array<{ name: string; item?: string }> = [{ name: 'Sunnah Shorts', item: `${SHORTS_SITE_URL}${SHORTS_PATH}` }];
  if (category) crumbs.push({ name: category.name.en });
  crumbs.push({ name: meta.heading, item: meta.url });
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, ...(crumb.item ? { item: crumb.item } : {}) }))
    }
  };
}

// Same rules as seo-content.ts (titles ≤ 62 characters ending "| SalahTime", descriptions ≤ 158).
function shortsTitle(main: string, suffix = ' | SalahTime', max = 62): string {
  const room = max - suffix.length;
  if (main.length <= room) return `${main}${suffix}`;
  const cut = main.slice(0, room);
  const shortened = cut.slice(0, cut.lastIndexOf(' ')).replace(/(\s+(and|or|with|&))+$/i, '').replace(/[\s,:;(–-]+$/, '');
  return `${shortened}${suffix}`;
}

function shortsDescription(text: string, max = 158): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
