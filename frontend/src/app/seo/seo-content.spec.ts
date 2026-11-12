import {
  CITY_URL_REDIRECTS,
  cityMonthMeta,
  cityMonthRows,
  cityPageMeta,
  cityPageMonths,
  monthSlug,
  parseMonthSlug,
  ramadanCityMeta,
  ramadanCityPath,
  ramadanDays,
  ramadanRange,
  ramadanToday,
  clockTime,
  duaCategoriesFromData,
  duaCategoryMeta,
  isStateNameEntry,
  nearbyCities,
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

describe('seo-content Ramadan city pages (NF-009) and monthly timetables (NF-010)', () => {
  const longCity = { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India' };
  const fixedTimes = (date: Date) => ({
    sahri: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 4, 58),
    iftar: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 21)
  });

  it('starts Ramadan in India one day after Umm al-Qura unless the back office set the date', () => {
    const ummAlQura = { start: new Date(2027, 1, 8), days: 29 };
    const india = ramadanRange(ummAlQura, 'india');
    expect(india.start).toEqual(new Date(2027, 1, 9));
    expect(india.days).toBe(30);
    expect(india.lastDayDepends).toBeTrue();

    const sighted = ramadanRange(ummAlQura, 'india', { updatedStartDate: '2027-02-10', updatedEndDate: '2027-03-11' });
    expect(sighted.start).toEqual(new Date(2027, 1, 10));
    expect(sighted.days).toBe(30);
    expect(sighted.lastDayDepends).toBeFalse();

    expect(ramadanRange(ummAlQura, 'saudi-arabia').start).toEqual(new Date(2027, 1, 8));
  });

  it('builds day rows, finds today, and keeps titles within 62 characters before and during Ramadan', () => {
    const rows = ramadanDays(ramadanRange({ start: new Date(2027, 1, 8), days: 29 }, 'india'), fixedTimes);
    expect(rows.length).toBe(30);
    expect(rows[0].dateText).toBe('Tue 9 Feb');
    expect(rows[0].sehri).toBe('4:58 AM');
    expect(rows[29].depends).toBeTrue();
    const today = ramadanToday(rows, new Date(2027, 1, 20, 15, 0));
    expect(today?.day).toBe(12);
    expect(ramadanToday(rows, new Date(2026, 11, 1))).toBeNull();

    for (const row of [null, today]) {
      const title = ramadanCityMeta(longCity, rows, row).title;
      expect(title.length).withContext(title).toBeLessThanOrEqual(62);
    }
    expect(ramadanCityMeta({ city: 'Chennai', state: 'Tamil Nadu', country: 'India' }, rows, null).title)
      .toBe('Chennai Sehri & Iftar Time: Ramadan 2027 Timetable | SalahTime');
    expect(ramadanCityPath(longCity)).toBe('/sehri-iftar/india/thiruvananthapuram');
  });

  it('round-trips month slugs, rolls the page months over the year end, and builds month titles', () => {
    expect(monthSlug({ year: 2026, month: 10 })).toBe('november-2026');
    expect(parseMonthSlug('november-2026')).toEqual({ year: 2026, month: 10 });
    expect(parseMonthSlug('smarch-2026')).toBeNull();
    expect(cityPageMonths(new Date(2026, 11, 31)).map(monthSlug)).toEqual(['december-2026', 'january-2027']);

    const month = { year: 2026, month: 11 };
    const rows = cityMonthRows(month, date => ({
      fajr: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 10),
      tulu: date, dhuhr: date, asr: date, maghrib: date, isha: date
    }));
    expect(rows.length).toBe(31);
    expect(rows.filter(row => row.friday).length).toBe(4);
    const meta = cityMonthMeta(longCity, month, rows);
    expect(meta.title.length).withContext(meta.title).toBeLessThanOrEqual(62);
    expect(meta.description).toContain('on the 31st');
    expect(meta.url).toBe('https://salah-times.in/prayer-times/india/thiruvananthapuram/december-2026');
  });
});

describe('seo-content city lists and duas (SEO audit 2026-11-08)', () => {
  const at = (city: string, state: string, latitude: number, longitude: number, country = 'India') =>
    ({ city, state, country, coordinates: { latitude, longitude } });

  it('redirects only the listed state entries, not cities named like their state', () => {
    expect(isStateNameEntry(at('Manipur', 'Manipur', 24.66, 93.9))).toBeTrue();
    expect(isStateNameEntry(at('Arunachal Pradesh', 'Arunachal Pradesh', 27.08, 93.6))).toBeTrue();
    expect(isStateNameEntry(at('Puducherry', 'Puducherry', 11.93, 79.83))).toBeFalse();
    expect(isStateNameEntry(at('Dubai', 'Dubai', 25.2, 55.27, 'United Arab Emirates'))).toBeFalse();
    expect(CITY_URL_REDIRECTS['india/delhi']).toBe('india/new-delhi');
  });

  it('lists the nearest cities in the same country first, without the city itself or state entries', () => {
    const chennai = at('Chennai', 'Tamil Nadu', 13.08, 80.27);
    const all = [
      chennai,
      at('Madurai', 'Tamil Nadu', 9.93, 78.12),
      at('Vellore', 'Tamil Nadu', 12.92, 79.13),
      at('Delhi Cantt', 'Delhi', 28.6, 77.13),
      at('Manipur', 'Manipur', 24.66, 93.9),
      at('Colombo', 'Western', 6.93, 79.85, 'Sri Lanka')
    ];
    expect(nearbyCities(chennai, all, 3).map(city => city.city)).toEqual(['Vellore', 'Madurai', 'Delhi Cantt']);
  });

  it('resolves dua ids in categories against the "all" category', () => {
    const categories = duaCategoriesFromData({
      categories: [
        { slug: 'all', title: 'All', duas: [{ id: 1, title: 'Before eating' }, { id: 2, title: 'After eating' }] },
        { slug: 'food-drink', title: 'Food & Drink', duas: [1, 2, 99] }
      ]
    });
    expect(categories[1].duas.map(dua => dua.title)).toEqual(['Before eating', 'After eating']);
  });

  it('keeps dua titles within 62 characters and never ends them on "and" or a comma', () => {
    const long = duaCategoryMeta({
      slug: 'difficulties-happiness', title: 'Difficulties & Happiness',
      duas: [{ id: 1, title: 'When in distress and grief' }, { id: 2, title: 'When something pleases you' }]
    });
    expect(long.title.length).withContext(long.title).toBeLessThanOrEqual(62);
    expect(long.title).withContext(long.title).not.toMatch(/(\band|,)\s*\| SalahTime$/);
    expect(long.title).toMatch(/\| SalahTime$/);
  });
});
