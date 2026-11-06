import { SalahLocationCity, SalahLocationSelection } from '../models/salah.model';
import { citySlug, DEFAULT_PRAYER_PAGE_CITY } from '../seo/seo-content';

/**
 * CR-006: the city whose times the website shows while a visitor has no saved location, so the
 * prayer-times page answers straight away instead of showing an error. Never saved to settings.
 */
export function defaultPrayerLocation(cities: SalahLocationCity[]): SalahLocationSelection | null {
  const city = cities.find(item => citySlug(item.city) === citySlug(DEFAULT_PRAYER_PAGE_CITY.city)
    && citySlug(item.country ?? '') === citySlug(DEFAULT_PRAYER_PAGE_CITY.country ?? ''));
  return city ? { source: 'manual', city } : null;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
