/**
 * CR-027: prayer-time defaults per country — the one place that says how a country's times are worked out.
 * Used by the app (a new location in another country takes that country's method + madhab unless the user
 * picked their own in Settings), the website city pages, and the build (tools/prerender-seo.js,
 * tools/generate-sitemap.js), so what Google reads matches what visitors see.
 *
 * NO IMPORTS: the build loads this file on its own.
 *
 * method: an id from SettingsData (src/app/models/salah.model.ts).
 * madhab: 'Hanafi' (Asr when the shadow is twice the length) or 'Shafii' (once).
 * timezone: the country's main IANA zone; a city's own `timezone` in locations.json wins (every city has one now).
 * ramadanDelayDays: days after the Umm al-Qura start that Ramadan usually begins in the country (local moon
 *   sighting). A back-office calendar adjustment for the country always wins.
 */
export interface CountryDefaults {
  method: string;
  madhab: 'Hanafi' | 'Shafii';
  timezone: string;
  ramadanDelayDays: number;
  /** Several time zones (US, Canada, Indonesia): a city without its own zone must not guess the country's. */
  multiZone?: boolean;
}

export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  // South Asia — University of Islamic Sciences, Karachi; Hanafi; Ramadan usually a day after Saudi Arabia.
  'india': { method: 'karachi', madhab: 'Hanafi', timezone: 'Asia/Kolkata', ramadanDelayDays: 1 },
  'pakistan': { method: 'karachi', madhab: 'Hanafi', timezone: 'Asia/Karachi', ramadanDelayDays: 1 },
  'bangladesh': { method: 'karachi', madhab: 'Hanafi', timezone: 'Asia/Dhaka', ramadanDelayDays: 1 },
  // Gulf.
  'saudi-arabia': { method: 'makkah', madhab: 'Shafii', timezone: 'Asia/Riyadh', ramadanDelayDays: 0 },
  'united-arab-emirates': { method: 'gulf', madhab: 'Shafii', timezone: 'Asia/Dubai', ramadanDelayDays: 0 },
  'kuwait': { method: 'kuwait', madhab: 'Shafii', timezone: 'Asia/Kuwait', ramadanDelayDays: 0 },
  'qatar': { method: 'qatar', madhab: 'Shafii', timezone: 'Asia/Qatar', ramadanDelayDays: 0 },
  'bahrain': { method: 'gulf', madhab: 'Shafii', timezone: 'Asia/Bahrain', ramadanDelayDays: 0 },
  'oman': { method: 'gulf', madhab: 'Shafii', timezone: 'Asia/Muscat', ramadanDelayDays: 0 },
  // Middle East / Europe.
  'egypt': { method: 'egypt', madhab: 'Shafii', timezone: 'Africa/Cairo', ramadanDelayDays: 0 },
  'turkiye': { method: 'diyanet', madhab: 'Hanafi', timezone: 'Europe/Istanbul', ramadanDelayDays: 0 },
  // UK mosques are mostly South Asian (Hanafi Asr); Muslim World League angles.
  'united-kingdom': { method: 'mwl', madhab: 'Hanafi', timezone: 'Europe/London', ramadanDelayDays: 0 },
  'france': { method: 'mwl', madhab: 'Shafii', timezone: 'Europe/Paris', ramadanDelayDays: 0 },
  // North America — ISNA.
  'united-states': { method: 'isna', madhab: 'Shafii', timezone: 'America/New_York', ramadanDelayDays: 0, multiZone: true },
  'canada': { method: 'isna', madhab: 'Shafii', timezone: 'America/Toronto', ramadanDelayDays: 0, multiZone: true },
  // South-East Asia — JAKIM / MUIS / Kemenag use Fajr 20°, Isha 18°.
  'malaysia': { method: 'jakim', madhab: 'Shafii', timezone: 'Asia/Kuala_Lumpur', ramadanDelayDays: 0 },
  'singapore': { method: 'muis', madhab: 'Shafii', timezone: 'Asia/Singapore', ramadanDelayDays: 0 },
  'indonesia': { method: 'muis', madhab: 'Shafii', timezone: 'Asia/Jakarta', ramadanDelayDays: 0, multiZone: true },
  // West Africa.
  'nigeria': { method: 'mwl', madhab: 'Shafii', timezone: 'Africa/Lagos', ramadanDelayDays: 0 },
};

/** "Türkiye" -> "turkiye", "United Arab Emirates" -> "united-arab-emirates". */
export function countryKey(country: string | null | undefined): string {
  return String(country ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** The defaults of a country (by name or slug), or null when the country has none. */
export function countryDefaults(country: string | null | undefined): CountryDefaults | null {
  return COUNTRY_DEFAULTS[countryKey(country)] ?? null;
}
