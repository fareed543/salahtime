import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HijriCalendarAdjustment, HijriCalendarService } from './hijri-calendar.service';
import { SettingsService } from './settings.service';
import { AppTranslateService } from './translate.service';

describe('HijriCalendarService per-country adjustments (ST-00019)', () => {
  let service: HijriCalendarService;
  let http: HttpTestingController;
  let settings: any;

  const muharramIndia: HijriCalendarAdjustment = {
    id: 1,
    title: 'Muharram 1448',
    hijriYear: 1448,
    hijriMonth: 1,
    originalStartDate: '2026-06-16',
    originalEndDate: '2026-07-14',
    updatedStartDate: '2026-06-17',
    updatedEndDate: '2026-07-15',
    startDate: '2026-06-17',
    endDate: '2026-07-15',
    adjustmentDays: 0,
    notes: '',
    isActive: true,
    countrySlug: 'india',
    countryName: 'India'
  };

  const cityIn = (country: string, countrySlug?: string) => ({
    source: 'manual',
    city: { city: 'Test', country, countrySlug, coordinates: { latitude: 0, longitude: 0 } }
  });
  const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
  const load = (items: HijriCalendarAdjustment[]) => {
    service.loadAdjustments().subscribe();
    http.expectOne((request) => request.url.endsWith('adjustments') || request.url.endsWith('calendar-adjustments.json'))
      .flush({ items, specialDates: [] });
  };

  beforeEach(() => {
    settings = { hijriOffset: 0, location: cityIn('India') };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HijriCalendarService,
        { provide: SettingsService, useValue: { getCurrentSettings: () => settings } },
        {
          provide: AppTranslateService,
          useValue: {
            formatHijriDate: (parts: { day: number; month: number; year: number }) =>
              `${parts.day} M${parts.month} ${parts.year}`
          }
        }
      ]
    });
    service = TestBed.inject(HijriCalendarService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('positive', () => {
    it('applies India\'s adjustment to an India location', () => {
      load([muharramIndia]);
      const parts = service.getHijriParts(day(2026, 6, 17));
      expect(parts.day).toBe('1');
      expect(parts.monthIndex).toBe(1);
      expect(parts.year).toBe(1448);
    });

    it('does not apply India\'s adjustment to a Saudi Arabia location', () => {
      load([muharramIndia]);
      settings.location = cityIn('Saudi Arabia');
      const parts = service.getHijriParts(day(2026, 6, 17));
      expect(parts.day).toBe('2');
      expect(parts.monthIndex).toBe(1);
    });

    it('shows India one day behind Saudi Arabia on the same Gregorian date', () => {
      load([muharramIndia]);
      const india = service.getHijriParts(day(2026, 10, 19));
      settings.location = cityIn('Saudi Arabia');
      const saudi = service.getHijriParts(day(2026, 10, 19));
      expect(Number(saudi.day) - Number(india.day)).toBe(1);
      expect(india.monthIndex).toBe(saudi.monthIndex);
    });

    it('matches the country by slug when the city carries one', () => {
      load([muharramIndia]);
      settings.location = cityIn('Bharat', 'india');
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('1');
    });

    it('applies an adjustment without a country to every country', () => {
      load([{ ...muharramIndia, countrySlug: '', countryName: '' }]);
      settings.location = cityIn('Saudi Arabia');
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('1');
    });

    it('applies the user\'s +1 day offset', () => {
      load([muharramIndia]);
      settings.hijriOffset = 1;
      const parts = service.getHijriParts(day(2026, 6, 16));
      expect(parts.day).toBe('1');
      expect(parts.monthIndex).toBe(1);
    });

    it('applies the user\'s -1 day offset', () => {
      load([]);
      settings.location = cityIn('Saudi Arabia');
      settings.hijriOffset = -1;
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('1');
    });

    it('formats the adjusted date through the translation service', () => {
      load([muharramIndia]);
      expect(service.formatHijriDate(day(2026, 6, 17))).toBe('1 M1 1448');
    });
  });

  describe('negative', () => {
    it('ignores another country\'s adjustment', () => {
      load([{ ...muharramIndia, countrySlug: 'pakistan', countryName: 'Pakistan' }]);
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });

    it('ignores inactive adjustments', () => {
      load([{ ...muharramIndia, isActive: false }]);
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });

    it('uses the calculated date when no location is selected', () => {
      load([muharramIndia]);
      settings.location = null;
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });

    it('uses the calculated date when there are no settings yet', () => {
      load([muharramIndia]);
      settings = null;
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });

    it('treats a missing or invalid offset as no offset', () => {
      load([]);
      settings.location = cityIn('Saudi Arabia');
      settings.hijriOffset = undefined;
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
      settings.hijriOffset = 'abc';
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });

    it('falls back to the calculated date when adjustments fail to load', () => {
      service.loadAdjustments().subscribe((items) => expect(items).toEqual([]));
      http.expectOne((request) => request.url.endsWith('adjustments') || request.url.endsWith('calendar-adjustments.json'))
        .flush('error', { status: 500, statusText: 'Server Error' });
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });

    it('uses the calculated date before adjustments have loaded', () => {
      expect(service.getHijriParts(day(2026, 6, 17)).day).toBe('2');
    });
  });
});
