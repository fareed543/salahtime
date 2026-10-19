import { SalahLocationCity, SalahLocationSelection } from '../models/salah.model';
import {
  countrySlugOf,
  deviceTimezone,
  locationNow,
  locationOffsetHours,
  resolveLocationTimezone,
  timezoneOffsetHours
} from './location-timezone';

describe('location-timezone (ST-00019)', () => {
  const manual = (city: Partial<SalahLocationCity>): SalahLocationSelection => ({
    source: 'manual',
    city: { city: 'Test', coordinates: { latitude: 0, longitude: 0 }, ...city }
  });
  const auto = (city: Partial<SalahLocationCity>): SalahLocationSelection => ({
    source: 'auto',
    city: { city: 'Test', coordinates: { latitude: 0, longitude: 0 }, ...city }
  });
  const deviceOffsetOn = (date: Date) =>
    -new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTimezoneOffset() / 60;

  const winter = new Date(2026, 0, 15);
  const summer = new Date(2026, 6, 15);
  const today = new Date(2026, 9, 19);

  describe('positive: timezone resolution for a manually picked city', () => {
    it('uses the city timezone when it has one', () => {
      expect(resolveLocationTimezone(manual({ country: 'United States', timezone: 'America/Chicago' }))).toBe('America/Chicago');
    });

    it('falls back to the country timezone for a single-zone country', () => {
      expect(resolveLocationTimezone(manual({ country: 'Saudi Arabia' }))).toBe('Asia/Riyadh');
      expect(resolveLocationTimezone(manual({ country: 'India' }))).toBe('Asia/Kolkata');
      expect(resolveLocationTimezone(manual({ country: 'United Arab Emirates' }))).toBe('Asia/Dubai');
    });

    it('matches the country by slug as well as by name', () => {
      expect(resolveLocationTimezone(manual({ countrySlug: 'turkiye' }))).toBe('Europe/Istanbul');
      expect(resolveLocationTimezone(manual({ country: 'Türkiye' }))).toBe('Europe/Istanbul');
      expect(resolveLocationTimezone(manual({ country: '  UNITED KINGDOM ' }))).toBe('Europe/London');
    });

    it('prefers the city timezone over the country default', () => {
      expect(resolveLocationTimezone(manual({ country: 'India', timezone: 'Asia/Riyadh' }))).toBe('Asia/Riyadh');
    });
  });

  describe('positive: UTC offsets', () => {
    it('gives fixed offsets for zones without daylight saving', () => {
      expect(locationOffsetHours(manual({ country: 'Saudi Arabia' }), today)).toBe(3);
      expect(locationOffsetHours(manual({ country: 'India' }), today)).toBe(5.5);
      expect(locationOffsetHours(manual({ country: 'Pakistan' }), today)).toBe(5);
      expect(locationOffsetHours(manual({ country: 'Singapore' }), today)).toBe(8);
    });

    it('follows daylight saving for the date shown (US, Canada, UK, France, Egypt)', () => {
      const newYork = manual({ timezone: 'America/New_York' });
      expect(locationOffsetHours(newYork, winter)).toBe(-5);
      expect(locationOffsetHours(newYork, summer)).toBe(-4);
      expect(locationOffsetHours(manual({ timezone: 'America/Vancouver' }), winter)).toBe(-8);
      expect(locationOffsetHours(manual({ timezone: 'America/Vancouver' }), summer)).toBe(-7);
      expect(locationOffsetHours(manual({ country: 'United Kingdom' }), winter)).toBe(0);
      expect(locationOffsetHours(manual({ country: 'United Kingdom' }), summer)).toBe(1);
      expect(locationOffsetHours(manual({ country: 'France' }), summer)).toBe(2);
      expect(locationOffsetHours(manual({ country: 'Egypt' }), summer)).toBe(3);
    });

    it('keeps a no-DST zone fixed inside a DST country (Phoenix)', () => {
      const phoenix = manual({ country: 'United States', timezone: 'America/Phoenix' });
      expect(locationOffsetHours(phoenix, winter)).toBe(-7);
      expect(locationOffsetHours(phoenix, summer)).toBe(-7);
    });

    it('handles the several zones of one country (Indonesia)', () => {
      expect(locationOffsetHours(manual({ timezone: 'Asia/Jakarta' }), today)).toBe(7);
      expect(locationOffsetHours(manual({ timezone: 'Asia/Makassar' }), today)).toBe(8);
      expect(locationOffsetHours(manual({ timezone: 'Asia/Jayapura' }), today)).toBe(9);
    });

    it('handles half-hour offsets', () => {
      expect(timezoneOffsetHours('Asia/Kolkata', today)).toBe(5.5);
    });
  });

  describe('positive: auto-detected location keeps the phone clock', () => {
    it('uses the device timezone even when the detected city names another country', () => {
      expect(resolveLocationTimezone(auto({ country: 'Saudi Arabia', timezone: 'Asia/Riyadh' }))).toBe(deviceTimezone());
      expect(locationOffsetHours(auto({ country: 'Saudi Arabia' }), today)).toBe(deviceOffsetOn(today));
    });
  });

  describe('positive: "now" in the selected city', () => {
    it('returns the city wall clock as a phone-local Date', () => {
      const now = new Date();
      const shown = locationNow(manual({ country: 'Saudi Arabia' }), now);
      const riyadh = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).format(now);
      const pad = (value: number) => String(value).padStart(2, '0');
      expect(`${pad(shown.getHours())}:${pad(shown.getMinutes())}`).toBe(riyadh);
    });

    it('returns the same instant for an auto-detected location', () => {
      const now = new Date();
      expect(locationNow(auto({ country: 'Saudi Arabia' }), now)).toBe(now);
    });
  });

  describe('positive: country slug', () => {
    it('normalises names the same way as the back office', () => {
      expect(countrySlugOf({ country: 'Saudi Arabia' })).toBe('saudi-arabia');
      expect(countrySlugOf({ country: 'Türkiye' })).toBe('turkiye');
      expect(countrySlugOf({ countrySlug: 'india', country: 'Something else' })).toBe('india');
    });
  });

  describe('negative: missing or bad data falls back safely', () => {
    it('ignores an invalid city timezone and uses the country one', () => {
      expect(resolveLocationTimezone(manual({ country: 'Qatar', timezone: 'Not/AZone' }))).toBe('Asia/Qatar');
    });

    it('uses the device timezone for an unknown country without a city timezone', () => {
      expect(resolveLocationTimezone(manual({ country: 'Atlantis' }))).toBe(deviceTimezone());
    });

    it('uses the device timezone for a multi-zone country without a city timezone', () => {
      expect(resolveLocationTimezone(manual({ country: 'United States' }))).toBe(deviceTimezone());
      expect(resolveLocationTimezone(manual({ country: 'Canada' }))).toBe(deviceTimezone());
      expect(resolveLocationTimezone(manual({ country: 'Indonesia' }))).toBe(deviceTimezone());
    });

    it('uses the device timezone when there is no location at all', () => {
      expect(resolveLocationTimezone(null)).toBe(deviceTimezone());
      expect(resolveLocationTimezone(undefined)).toBe(deviceTimezone());
      expect(locationOffsetHours(null, today)).toBe(deviceOffsetOn(today));
    });

    it('uses the device timezone for a manual city with no country', () => {
      expect(resolveLocationTimezone(manual({}))).toBe(deviceTimezone());
    });

    it('returns the device offset for an empty or invalid timezone name', () => {
      expect(timezoneOffsetHours('', today)).toBe(deviceOffsetOn(today));
      expect(timezoneOffsetHours('Not/AZone', today)).toBe(deviceOffsetOn(today));
    });

    it('returns an empty slug when the city has no country', () => {
      expect(countrySlugOf(null)).toBe('');
      expect(countrySlugOf({})).toBe('');
      expect(countrySlugOf({ country: '  ' })).toBe('');
    });
  });
});
