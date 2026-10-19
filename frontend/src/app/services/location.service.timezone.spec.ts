import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SalahLocationCity } from '../models/salah.model';
import { deviceTimezone } from '../utils/location-timezone';
import { LocationService } from './location.service';
import { SettingsService } from './settings.service';

describe('LocationService city timezone (ST-00019)', () => {
  let service: LocationService;
  let settings: any;
  let updateSettings: jasmine.Spy;

  const list: SalahLocationCity[] = [
    { city: 'Chicago', slug: 'chicago', country: 'United States', countrySlug: 'united-states', timezone: 'America/Chicago', coordinates: { latitude: 41.88, longitude: -87.63 } },
    { city: 'Phoenix', slug: 'phoenix', country: 'United States', countrySlug: 'united-states', timezone: 'America/Phoenix', coordinates: { latitude: 33.45, longitude: -112.07 } },
    { city: 'Hyderabad', slug: 'hyderabad', country: 'Pakistan', countrySlug: 'pakistan', timezone: 'Asia/Karachi', coordinates: { latitude: 25.39, longitude: 68.37 } },
    { city: 'Jayapura', slug: 'jayapura', country: 'Indonesia', countrySlug: 'indonesia', timezone: 'Asia/Jayapura', coordinates: { latitude: -2.53, longitude: 140.72 } }
  ];

  const manual = (city: Partial<SalahLocationCity>) => {
    const full = { city: 'Test', coordinates: { latitude: 1, longitude: 2 }, ...city } as SalahLocationCity;
    return { location: { source: 'manual', city: full }, city: full };
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    settings = {};
    updateSettings = jasmine.createSpy('updateSettings').and.callFake((next: any) => settings = next);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LocationService,
        { provide: SettingsService, useValue: { getCurrentSettings: () => settings, updateSettings } }
      ]
    });
    service = TestBed.inject(LocationService);
    spyOn(service, 'getLocationsListCached').and.resolveTo(list);
  });

  describe('positive', () => {
    it('fills in the timezone of an old saved city, matched by slug', async () => {
      settings = manual({ city: 'Chicago', slug: 'chicago', country: 'United States' });
      await service.resolveEffectiveLocation();
      await settle();
      expect(updateSettings).toHaveBeenCalledTimes(1);
      expect(settings.location.city.timezone).toBe('America/Chicago');
      expect(settings.city.timezone).toBe('America/Chicago');
      expect(settings.location.city.countrySlug).toBe('united-states');
    });

    it('matches by city name and country when the saved city has no slug', async () => {
      settings = manual({ city: 'jayapura', country: 'Indonesia' });
      await service.resolveEffectiveLocation();
      await settle();
      expect(settings.location.city.timezone).toBe('Asia/Jayapura');
    });

    it('reports the city timezone in the snapshot for a manual city', async () => {
      settings = manual({ city: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' });
      const resolved = await service.resolveEffectiveLocation();
      expect(resolved.snapshot.timezone).toBe('Asia/Riyadh');
    });

    it('falls back to the country timezone in the snapshot when the city has none', async () => {
      settings = manual({ city: 'Doha', country: 'Qatar' });
      const resolved = await service.resolveEffectiveLocation();
      expect(resolved.snapshot.timezone).toBe('Asia/Qatar');
    });
  });

  describe('negative', () => {
    it('does not look anything up when the city already has a timezone', async () => {
      settings = manual({ city: 'Chicago', country: 'United States', timezone: 'America/Chicago' });
      await service.resolveEffectiveLocation();
      await settle();
      expect(service.getLocationsListCached).not.toHaveBeenCalled();
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('does not match a city with the same name in another country', async () => {
      settings = manual({ city: 'Hyderabad', country: 'India' });
      await service.resolveEffectiveLocation();
      await settle();
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('leaves the city alone when it is not in the list', async () => {
      settings = manual({ city: 'Nowhere', country: 'United States' });
      await service.resolveEffectiveLocation();
      await settle();
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('does not overwrite a city the user changed while the lookup ran', async () => {
      settings = manual({ city: 'Chicago', slug: 'chicago', country: 'United States' });
      const pending = service.resolveEffectiveLocation();
      settings = manual({ city: 'Phoenix', slug: 'phoenix', country: 'United States', timezone: 'America/Phoenix' });
      await pending;
      await settle();
      expect(updateSettings).not.toHaveBeenCalled();
      expect(settings.location.city.city).toBe('Phoenix');
    });

    it('tries the lookup only once per app session', async () => {
      settings = manual({ city: 'Nowhere', country: 'United States' });
      await service.resolveEffectiveLocation();
      await service.resolveEffectiveLocation();
      await settle();
      expect(service.getLocationsListCached).toHaveBeenCalledTimes(1);
    });

    it('uses the device timezone in the snapshot for a manual city of a multi-zone country with no timezone', async () => {
      settings = manual({ city: 'Nowhere', country: 'United States' });
      const resolved = await service.resolveEffectiveLocation();
      expect(resolved.snapshot.timezone).toBe(deviceTimezone());
    });
  });
});
