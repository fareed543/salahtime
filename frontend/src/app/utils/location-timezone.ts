import { SalahLocationCity, SalahLocationSelection } from '../models/salah.model';

/**
 * Prayer times are worked out in the selected city's own clock, not the phone's: an India user who
 * picks Riyadh must see Riyadh's times. The app's location list and the back-office location release
 * carry an IANA timezone per city (US, Canada and Indonesia span several zones); this map is the
 * fallback for single-zone countries when a saved city predates that field.
 */
const COUNTRY_TIMEZONES: Record<string, string> = {
  'india': 'Asia/Kolkata',
  'saudi-arabia': 'Asia/Riyadh',
  'pakistan': 'Asia/Karachi',
  'france': 'Europe/Paris',
  'singapore': 'Asia/Singapore',
  'kuwait': 'Asia/Kuwait',
  'oman': 'Asia/Muscat',
  'bahrain': 'Asia/Bahrain',
  'egypt': 'Africa/Cairo',
  'qatar': 'Asia/Qatar',
  'united-kingdom': 'Europe/London',
  'turkiye': 'Europe/Istanbul',
  'united-arab-emirates': 'Asia/Dubai'
};

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** Same rule as the back office's country slugs ("Türkiye" -> "turkiye"). */
export function countrySlugOf(city?: Pick<SalahLocationCity, 'country' | 'countrySlug'> | null): string {
  const value = (city?.countrySlug || city?.country || '').toLowerCase().trim();
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The timezone a location's prayer times are shown in. An auto-detected location is where the phone
 * is, so the phone's zone is right; a manually picked city uses its own zone, then its country's.
 */
export function resolveLocationTimezone(location?: SalahLocationSelection | null): string {
  if (location && location.source !== 'manual') {
    return deviceTimezone();
  }

  const city = location?.city;
  if (city?.timezone && isValidTimezone(city.timezone)) {
    return city.timezone;
  }

  return COUNTRY_TIMEZONES[countrySlugOf(city)] ?? deviceTimezone();
}

/** UTC offset in hours of `timeZone` on the calendar day of `date` (daylight saving included). */
export function timezoneOffsetHours(timeZone: string, date: Date): number {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  if (!timeZone) {
    return -noon.getTimezoneOffset() / 60;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(noon);
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    const wallClockAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
    const instant = Math.floor(noon.getTime() / 60000) * 60000;
    return Math.round((wallClockAsUtc - instant) / 60000) / 60;
  } catch {
    return -noon.getTimezoneOffset() / 60;
  }
}

/** Prayer-time UTC offset for the selected location on `date`. */
export function locationOffsetHours(location: SalahLocationSelection | null | undefined, date: Date): number {
  return timezoneOffsetHours(resolveLocationTimezone(location), date);
}

/**
 * "Now" as the selected city's wall clock, in a phone-local Date. WaqtService returns a city's prayer
 * times as wall-clock values in phone-local Dates, so this is what they must be compared against to
 * find the current prayer and the countdown.
 */
export function locationNow(location: SalahLocationSelection | null | undefined, now = new Date()): Date {
  const shiftHours = locationOffsetHours(location, now) - (-now.getTimezoneOffset() / 60);
  return shiftHours ? new Date(now.getTime() + shiftHours * 3600000) : now;
}

function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
