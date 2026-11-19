// CR-028: Urdu and Arabic versions of the city and Ramadan pages — page text, which cities have them, URLs.
//
// No imports (like seo-content.ts): the app renders it at runtime and tools/prerender-seo.js /
// generate-sitemap.js load it at build time, so Google reads the same text in the static HTML and after
// JavaScript. Times come in as English clock text ("5:31 AM") from the same calculation as the English page.

export type SeoLang = 'ur' | 'ar';
export const SEO_LANGS: SeoLang[] = ['ur', 'ar'];

/** Countries whose every city gets the language version. Urdu also gets India's popular cities (see cityLangs). */
const LANG_COUNTRIES: Record<SeoLang, string[]> = {
  ur: ['pakistan'],
  ar: ['saudi-arabia', 'united-arab-emirates', 'kuwait', 'qatar', 'bahrain', 'oman', 'egypt'],
};

const slugOf = (value: string | null | undefined) => String(value ?? '').toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Languages (besides English) that a city's pages exist in. indiaPopular: slugs of India's popular cities. */
export function cityLangs(city: { city: string; country?: string | null }, indiaPopular: string[]): SeoLang[] {
  const country = slugOf(city.country);
  return SEO_LANGS.filter(lang => LANG_COUNTRIES[lang].includes(country)
    || (lang === 'ur' && country === 'india' && indiaPopular.includes(slugOf(city.city))));
}

/** "/prayer-times/pakistan/karachi" -> "/ur/prayer-times/pakistan/karachi". */
export function langPath(lang: SeoLang | null | undefined, path: string): string {
  return lang ? `/${lang}${path}` : path;
}

/** The language of an address ("/ar/sehri-iftar/…" -> "ar"), or null for English. */
export function langOfPath(path: string): SeoLang | null {
  const first = path.split(/[/?#]/).filter(Boolean)[0];
  return (SEO_LANGS as string[]).includes(first) ? first as SeoLang : null;
}

export const LANG_LABELS: Record<'en' | SeoLang, string> = { en: 'English', ur: 'اردو', ar: 'العربية' };

const COUNTRY_NAMES: Record<SeoLang, Record<string, string>> = {
  ur: { pakistan: 'پاکستان', india: 'ہندوستان' },
  ar: {
    'saudi-arabia': 'السعودية', 'united-arab-emirates': 'الإمارات', kuwait: 'الكويت', qatar: 'قطر',
    bahrain: 'البحرين', oman: 'عُمان', egypt: 'مصر',
  },
};

export function localCountryName(lang: SeoLang, country: string | null | undefined): string {
  return COUNTRY_NAMES[lang][slugOf(country)] ?? String(country ?? '');
}

/** Native-script city name from assets/data/city-names.json, else the Latin name. */
export function localCityName(lang: SeoLang, city: { city: string; country?: string | null },
  names: Record<string, Partial<Record<SeoLang, string>>>): string {
  return names[`${slugOf(city.country)}/${slugOf(city.city)}`]?.[lang] ?? city.city;
}

/** "5:31 AM" -> Urdu "5:31 صبح" (by time of day) / Arabic "5:31 ص". Western digits, as in both regions online. */
export function localClock(lang: SeoLang, clock: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(clock).trim());
  if (!match) return clock;
  const hour12 = Number(match[1]);
  const pm = match[3].toUpperCase() === 'PM';
  const hour24 = (hour12 % 12) + (pm ? 12 : 0);
  const time = `${hour12}:${match[2]}`;
  if (lang === 'ar') return `${time} ${pm ? 'م' : 'ص'}`;
  const period = hour24 < 4 ? 'رات' : hour24 < 12 ? 'صبح' : hour24 < 16 ? 'دوپہر' : hour24 < 19 ? 'شام' : 'رات';
  return `${time} ${period}`;
}

const PRAYERS: Record<SeoLang, Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string>> = {
  ur: { fajr: 'فجر', sunrise: 'طلوعِ آفتاب', dhuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء' },
  ar: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
};

const METHODS: Record<SeoLang, Record<string, string>> = {
  ur: {
    karachi: 'جامعۃ العلوم الاسلامیہ کراچی کے طریقے', mwl: 'مسلم ورلڈ لیگ کے طریقے', isna: 'اسنا کے طریقے',
    makkah: 'ام القریٰ (مکہ) کے طریقے', gulf: 'خلیجی طریقے', kuwait: 'کویت کے طریقے', qatar: 'قطر کے طریقے',
    egypt: 'مصری طریقے', diyanet: 'دیانت (ترکی) کے طریقے', jakim: 'جاکم (ملائیشیا) کے طریقے', muis: 'موئس (سنگاپور) کے طریقے',
  },
  ar: {
    karachi: 'طريقة جامعة العلوم الإسلامية بكراتشي', mwl: 'طريقة رابطة العالم الإسلامي', isna: 'طريقة الجمعية الإسلامية لأمريكا الشمالية',
    makkah: 'تقويم أم القرى', gulf: 'طريقة منطقة الخليج', kuwait: 'طريقة الكويت', qatar: 'طريقة قطر',
    egypt: 'طريقة الهيئة المصرية العامة للمساحة', diyanet: 'طريقة رئاسة الشؤون الدينية التركية',
    jakim: 'طريقة جاكيم (ماليزيا)', muis: 'طريقة موئيس (سنغافورة)',
  },
};

/** "جامعۃ العلوم الاسلامیہ کراچی کے طریقے اور حنفی عصر" / "تقويم أم القرى، والعصر على المذهب الشافعي". */
export function localMethodText(lang: SeoLang, method: string, madhab: string): string {
  const name = METHODS[lang][method] ?? METHODS[lang]['karachi'];
  const hanafi = madhab === 'Hanafi';
  return lang === 'ur'
    ? `${name} اور ${hanafi ? 'حنفی' : 'شافعی'} عصر`
    : `${name}، والعصر على المذهب ${hanafi ? 'الحنفي' : 'الشافعي'}`;
}

export interface LocalCityContext {
  city: string;     // already localised (localCityName)
  country: string;  // already localised (localCountryName)
}

export interface FarzClock { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string }

const SITE = ' | SalahTime';

// ---------------------------------------------------------------- city page

export function localCityMeta(lang: SeoLang, ctx: LocalCityContext, times: FarzClock | null): { title: string; description: string } {
  const t = (key: keyof FarzClock) => times ? localClock(lang, times[key]) : '';
  const p = PRAYERS[lang];
  if (lang === 'ur') {
    return {
      title: `${ctx.city} میں آج نماز کے اوقات: فجر، ظہر، عصر، مغرب، عشاء${SITE}`,
      description: times
        ? `آج ${ctx.city}، ${ctx.country} میں نماز کے اوقات: ${p.fajr} ${t('fajr')}، ${p.dhuhr} ${t('dhuhr')}، ${p.asr} ${t('asr')}، ${p.maghrib} ${t('maghrib')}، ${p.isha} ${t('isha')}۔ ساتھ میں طلوعِ آفتاب اور پورے مہینے کا ٹائم ٹیبل۔`
        : `${ctx.city}، ${ctx.country} میں آج فجر، ظہر، عصر، مغرب اور عشاء کی نماز کے اوقات۔`,
    };
  }
  return {
    title: `مواقيت الصلاة في ${ctx.city} اليوم: الفجر والظهر والعصر والمغرب والعشاء${SITE}`,
    description: times
      ? `مواقيت الصلاة اليوم في ${ctx.city}، ${ctx.country}: ${p.fajr} ${t('fajr')}، ${p.dhuhr} ${t('dhuhr')}، ${p.asr} ${t('asr')}، ${p.maghrib} ${t('maghrib')}، ${p.isha} ${t('isha')}. مع وقت الشروق وجدول الشهر كاملاً.`
      : `مواقيت صلاة الفجر والظهر والعصر والمغرب والعشاء اليوم في ${ctx.city}، ${ctx.country}.`,
  };
}

export interface LocalCityPage {
  heading: string;
  intro: string;
  tableTitle: string;
  rows: Array<{ name: string; time: string }>;
  faqTitle: string;
  faq: Array<{ question: string; answer: string }>;
  ramadanLink: string;
  englishLink: string;
  nearbyTitle: string;
}

export function localCityPage(lang: SeoLang, ctx: LocalCityContext, times: FarzClock, dateText: string,
  method: string, madhab: string, ramadanYear: number): LocalCityPage {
  const p = PRAYERS[lang];
  const t = (key: keyof FarzClock) => localClock(lang, times[key]);
  const rows = (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as Array<keyof FarzClock>).map(key => ({ name: p[key], time: t(key) }));
  const methodText = localMethodText(lang, method, madhab);
  if (lang === 'ur') {
    return {
      heading: `${ctx.city} میں آج نماز کے اوقات`,
      intro: `${dateText} کو ${ctx.city} (${ctx.country}) میں پانچوں نمازوں کے اوقات، شہر کے مقام کے حساب سے ${methodText} کے ساتھ۔ آپ کی مسجد کی جماعت کا وقت مختلف ہو سکتا ہے۔`,
      tableTitle: `${ctx.city} میں آج کے اوقات`,
      rows,
      faqTitle: 'عام سوالات',
      faq: [
        { question: `آج ${ctx.city} میں فجر کا وقت کیا ہے؟`, answer: `آج ${ctx.city} میں فجر ${t('fajr')} پر شروع ہوتی ہے اور طلوعِ آفتاب ${t('sunrise')} پر ہے۔` },
        { question: `آج ${ctx.city} میں مغرب کب ہے؟`, answer: `آج ${ctx.city} میں مغرب ${t('maghrib')} پر اور عشاء ${t('isha')} پر ہے۔` },
        { question: 'یہ اوقات کس طریقے سے نکالے گئے ہیں؟', answer: `${methodText} سے۔ طریقہ، مسلک اور منٹوں کی تبدیلی ایپ کی سیٹنگز میں کی جا سکتی ہے۔` },
      ],
      ramadanLink: `${ctx.city} میں رمضان ${ramadanYear} سحری و افطار ٹائم ٹیبل`,
      englishLink: 'Prayer times in English',
      nearbyTitle: `${ctx.city} کے قریب شہروں میں نماز کے اوقات`,
    };
  }
  return {
    heading: `مواقيت الصلاة في ${ctx.city} اليوم`,
    intro: `أوقات الصلوات الخمس في ${ctx.city} (${ctx.country}) ليوم ${dateText}، محسوبة لموقع المدينة حسب ${methodText}. قد يختلف وقت الإقامة في مسجدك.`,
    tableTitle: `مواقيت اليوم في ${ctx.city}`,
    rows,
    faqTitle: 'أسئلة شائعة',
    faq: [
      { question: `متى يؤذن الفجر في ${ctx.city} اليوم؟`, answer: `يبدأ وقت الفجر في ${ctx.city} اليوم الساعة ${t('fajr')}، وتشرق الشمس الساعة ${t('sunrise')}.` },
      { question: `متى أذان المغرب في ${ctx.city} اليوم؟`, answer: `يؤذن المغرب في ${ctx.city} اليوم الساعة ${t('maghrib')}، والعشاء الساعة ${t('isha')}.` },
      { question: 'ما طريقة الحساب المستخدمة؟', answer: `${methodText}. يمكن تغيير الطريقة والمذهب وتعديل الدقائق من إعدادات التطبيق.` },
    ],
    ramadanLink: `إمساكية رمضان ${ramadanYear} في ${ctx.city}`,
    englishLink: 'Prayer times in English',
    nearbyTitle: `مواقيت الصلاة في مدن قريبة من ${ctx.city}`,
  };
}

// ---------------------------------------------------------------- Ramadan page

export interface LocalRamadanDay { day: number; dateText: string; sehri: string; iftar: string; depends: boolean }

export function localRamadanMeta(lang: SeoLang, ctx: LocalCityContext, year: number, startText: string,
  first: LocalRamadanDay, today: LocalRamadanDay | null, days: number): { title: string; description: string } {
  const s = (row: LocalRamadanDay) => localClock(lang, row.sehri);
  const i = (row: LocalRamadanDay) => localClock(lang, row.iftar);
  if (lang === 'ur') {
    return {
      title: `${ctx.city} میں رمضان ${year}: سحری و افطار کے اوقات${SITE}`,
      description: today
        ? `${ctx.city} میں آج ${today.day} رمضان: سحری ${s(today)} تک، افطار ${i(today)}۔ رمضان ${year} کا مکمل سحری و افطار ٹائم ٹیبل۔`
        : `${ctx.city}، ${ctx.country} میں رمضان ${year} متوقع طور پر ${startText} سے شروع ہوگا۔ پہلا روزہ: سحری ${s(first)} تک، افطار ${i(first)}۔ مکمل ${days} دن کا ٹائم ٹیبل۔`,
    };
  }
  return {
    title: `إمساكية رمضان ${year} في ${ctx.city}: مواعيد السحور والإفطار${SITE}`,
    description: today
      ? `اليوم ${today.day} من رمضان في ${ctx.city}: الإمساك ${s(today)}، الإفطار ${i(today)}. إمساكية رمضان ${year} كاملة.`
      : `إمساكية رمضان ${year} في ${ctx.city}، ${ctx.country}: يبدأ رمضان متوقعاً يوم ${startText}. اليوم الأول: الإمساك ${s(first)}، الإفطار ${i(first)}. جدول ${days} يوماً.`,
  };
}

export interface LocalRamadanPage {
  heading: string;
  intro: string[];
  todayTitle: (day: number) => string;
  todayLine: (row: LocalRamadanDay) => string;
  tableTitle: string;
  heads: [string, string, string, string];
  footnote: string;
  faqTitle: string;
  faq: Array<{ question: string; answer: string }>;
  prayerLink: string;
  nearbyTitle: string;
}

export function localRamadanPage(lang: SeoLang, ctx: LocalCityContext, year: number, hijriYear: number,
  startText: string, first: LocalRamadanDay, lastText: string, method: string, madhab: string): LocalRamadanPage {
  const s = (row: LocalRamadanDay) => localClock(lang, row.sehri);
  const i = (row: LocalRamadanDay) => localClock(lang, row.iftar);
  const methodName = localMethodText(lang, method, madhab).replace(/ اور .*$|، والعصر.*$/, '');
  if (lang === 'ur') {
    return {
      heading: `${ctx.city} میں رمضان ${year} سحری و افطار ٹائم ٹیبل`,
      intro: [
        `رمضان ${year} (${hijriYear} ہجری) ${ctx.city} میں متوقع طور پر ${startText} سے شروع ہوگا۔ تاریخیں چاند نظر آنے پر منحصر ہیں۔`,
        `سحری فجر شروع ہونے پر ختم ہوتی ہے اور افطار مغرب (غروبِ آفتاب) پر ہے۔ اوقات ${ctx.city} کے مقام کے لیے ${methodName} سے نکالے گئے ہیں؛ آپ کی مسجد احتیاطاً چند منٹ کا فرق رکھ سکتی ہے۔`,
        `آخری روزہ ${lastText} کو ہوگا (چاند کے مطابق)۔`,
      ],
      todayTitle: day => `آج ${ctx.city} میں ${day} رمضان`,
      todayLine: row => `سحری ${s(row)} تک · افطار ${i(row)}`,
      tableTitle: `${ctx.city} کے لیے رمضان ${year} سحری و افطار ٹائم ٹیبل`,
      heads: ['روزہ', 'تاریخ', 'سحری ختم', 'افطار'],
      footnote: '* صرف اس صورت میں جب 29ویں روزے کی شام شوال کا چاند نظر نہ آئے۔',
      faqTitle: 'عام سوالات',
      faq: [
        { question: `${ctx.city} میں رمضان ${year} کب شروع ہوگا؟`, answer: `${ctx.city} میں رمضان ${year} متوقع طور پر ${startText} کو شروع ہوگا، چاند نظر آنے کی شرط کے ساتھ۔` },
        { question: `${ctx.city} میں پہلے روزے کی سحری اور افطار کب ہے؟`, answer: `پہلے روزے کو ${ctx.city} میں سحری ${s(first)} پر ختم ہوگی اور افطار ${i(first)} پر ہے۔` },
      ],
      prayerLink: `${ctx.city} میں آج نماز کے اوقات`,
      nearbyTitle: `${ctx.city} کے قریب شہروں میں سحری و افطار`,
    };
  }
  return {
    heading: `إمساكية رمضان ${year} في ${ctx.city}`,
    intro: [
      `من المتوقع أن يبدأ رمضان ${year} (${hijriYear} هـ) في ${ctx.city} يوم ${startText}، والتواريخ تعتمد على رؤية الهلال.`,
      `ينتهي السحور (الإمساك) مع أذان الفجر، والإفطار عند أذان المغرب. الأوقات محسوبة لموقع ${ctx.city} حسب ${methodName}، وقد يحتاط مسجدك ببضع دقائق.`,
      `آخر يوم صيام ${lastText} حسب رؤية الهلال.`,
    ],
    todayTitle: day => `اليوم ${day} من رمضان في ${ctx.city}`,
    todayLine: row => `الإمساك ${s(row)} · الإفطار ${i(row)}`,
    tableTitle: `إمساكية رمضان ${year} في ${ctx.city}`,
    heads: ['اليوم', 'التاريخ', 'الإمساك', 'الإفطار'],
    footnote: '* فقط إذا لم يُرَ هلال شوال مساء اليوم التاسع والعشرين.',
    faqTitle: 'أسئلة شائعة',
    faq: [
      { question: `متى يبدأ رمضان ${year} في ${ctx.city}؟`, answer: `من المتوقع أن يبدأ رمضان ${year} في ${ctx.city} يوم ${startText}، حسب رؤية الهلال.` },
      { question: `ما موعد السحور والإفطار في أول يوم من رمضان في ${ctx.city}؟`, answer: `في اليوم الأول ينتهي السحور في ${ctx.city} الساعة ${s(first)}، والإفطار الساعة ${i(first)}.` },
    ],
    prayerLink: `مواقيت الصلاة في ${ctx.city} اليوم`,
    nearbyTitle: `إمساكية رمضان في مدن قريبة من ${ctx.city}`,
  };
}

/** Dates in the page's language with Western digits and the Gregorian calendar (ar-SA would default to Hijri). */
export function localDate(lang: SeoLang, date: Date, withWeekday = true): string {
  const locale = lang === 'ur' ? 'ur-PK-u-nu-latn' : 'ar-EG-u-nu-latn-ca-gregory';
  return date.toLocaleDateString(locale, { ...(withWeekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', year: 'numeric' });
}
