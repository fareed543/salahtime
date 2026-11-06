import {
  cityPageMeta,
  clockTime,
  PRAYER_PAGE_CITIES,
  PRAYER_PAGES,
  prayerPageBySlug,
  prayerPageCity,
  prayerPageLinks,
  prayerPageMeta,
  prayerPageRoute
} from './seo-content';

describe('seo-content prayer pages (CR-006)', () => {
  it('formats clock times in 12-hour form', () => {
    expect(clockTime(new Date(2026, 10, 7, 0, 5))).toBe('12:05 AM');
    expect(clockTime(new Date(2026, 10, 7, 12, 0))).toBe('12:00 PM');
    expect(clockTime(new Date(2026, 10, 7, 16, 9))).toBe('4:09 PM');
  });

  it('keeps every title within 60 characters, including the longest city with a time', () => {
    const longest = PRAYER_PAGE_CITIES.reduce((a, b) => (b.city.length > a.city.length ? b : a));
    for (const page of PRAYER_PAGES) {
      expect(page.genericTitle.length).withContext(page.slug).toBeLessThanOrEqual(60);
      const title = prayerPageMeta(page, longest, { start: '12:45 PM', end: '12:55 PM' }).title;
      expect(title.length).withContext(title).toBeLessThanOrEqual(60);
      expect(title).toContain('12:45 PM');
    }
  });

  it('builds city routes that resolve back to the same page and city', () => {
    const asr = prayerPageBySlug('asr-time')!;
    const indore = PRAYER_PAGE_CITIES.find(city => city.city === 'Indore')!;
    expect(prayerPageRoute(asr, indore)).toBe('/asr-time/india/indore');
    expect(prayerPageCity('india', 'indore')).toEqual(indore);
    expect(prayerPageCity('india', 'nowhere')).toBeUndefined();
  });

  it('links to the city version only for cities that have one', () => {
    expect(prayerPageLinks({ city: 'Pune', state: 'Maharashtra', country: 'India' })[0].link).toBe('/fajr-time/india/pune');
    expect(prayerPageLinks({ city: 'Agra', state: 'Uttar Pradesh', country: 'India' })[0].link).toBe('/fajr-time');
    expect(prayerPageLinks().length).toBe(PRAYER_PAGES.length);
  });

  it('puts today\'s times in a city page description when given', () => {
    const city = { city: 'Indore', state: 'Madhya Pradesh', country: 'India' };
    expect(cityPageMeta(city, { fajr: '5:21 AM', asr: '4:12 PM' }).description).toContain('Fajr 5:21 AM, Asr 4:12 PM');
    expect(cityPageMeta(city).description).toContain('Check today');
  });

  it('puts sample city times in the generic page description', () => {
    const meta = prayerPageMeta(PRAYER_PAGES[0], null, null, [{ city: 'Mumbai', start: '5:30 AM' }]);
    expect(meta.description).toContain('Mumbai 5:30 AM');
    expect(meta.url).toBe('https://salah-times.in/fajr-time');
  });
});
