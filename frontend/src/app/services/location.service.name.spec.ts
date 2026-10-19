import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { SalahLocationCity } from '../models/salah.model';
import { LocationService } from './location.service';
import { SettingsService } from './settings.service';

describe('LocationService auto location name (ST-00016)', () => {
  let service: LocationService;
  let http: HttpTestingController;
  let settings: jasmine.SpyObj<SettingsService>;
  let originalOffline: boolean;

  const salem: SalahLocationCity = { city: 'Salem', country: 'India', coordinates: { latitude: 11.65376, longitude: 78.15538 } };
  const chennai: SalahLocationCity = { city: 'Chennai', country: 'India', coordinates: { latitude: 13.08, longitude: 80.27 } };
  const yercaud = { lat: 11.7748, lng: 78.209 };
  const yercaudName = { city: 'Yercaud', displayName: 'Yercaud, Tamil Nadu, India', state: 'Tamil Nadu', country: 'India' };
  const reverseGeocodeUrl = `${environment.apiUrl}http-location/reverse-geocode`;

  const expectLookup = () => http.expectOne((request) => request.url === reverseGeocodeUrl);
  const expectNoLookup = () => http.expectNone((request) => request.url === reverseGeocodeUrl);
  const resolveName = (): Promise<SalahLocationCity | null> =>
    (service as any).resolveAutoLocationName(yercaud.lat, yercaud.lng);
  const buildResolved = (selection: any) =>
    (service as any).buildResolvedLocation(selection, yercaud.lat, yercaud.lng);
  const savedAuto = (city: Partial<SalahLocationCity>) => {
    const full = { ...city, coordinates: { latitude: yercaud.lat, longitude: yercaud.lng } } as SalahLocationCity;
    return { location: { source: 'auto', city: full }, city: full } as any;
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    originalOffline = environment.offline;
    environment.offline = true; // Production builds ship with offline: true.
    settings = jasmine.createSpyObj<SettingsService>('SettingsService', ['getCurrentSettings', 'updateSettings']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LocationService, { provide: SettingsService, useValue: settings }]
    });
    service = TestBed.inject(LocationService);
    http = TestBed.inject(HttpTestingController);
    spyOn<any>(service, 'getLocationsListCached').and.resolveTo([chennai, salem]);
  });

  afterEach(() => {
    environment.offline = originalOffline;
    http.verify();
  });

  describe('positive', () => {
    it('uses the exact place name when online, even in an offline build', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const name = resolveName();
      expectLookup().flush({ success: true, location: yercaudName });
      expect(await name).toEqual(jasmine.objectContaining(yercaudName));
    });

    it('also uses the exact place name when the build is configured online', async () => {
      environment.offline = false;
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const name = resolveName();
      expectLookup().flush({ success: true, location: yercaudName });
      expect((await name)?.city).toBe('Yercaud');
    });

    it('sends the GPS coordinates without asking for street detail', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const name = resolveName();
      const request = expectLookup();
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('lat')).toBe('11.7748');
      expect(request.request.params.get('lng')).toBe('78.209');
      expect(request.request.params.has('detail')).toBeFalse();
      request.flush({ success: true, location: yercaudName });
      await name;
    });

    it('keeps the real GPS coordinates on the named location', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const resolved = buildResolved(null);
      expectLookup().flush({ success: true, location: { ...yercaudName, coordinates: { latitude: 0, longitude: 0 } } });
      const { selection, snapshot } = await resolved;
      expect(selection.source).toBe('auto');
      expect(selection.city.city).toBe('Yercaud');
      expect(selection.city.coordinates).toEqual({ latitude: yercaud.lat, longitude: yercaud.lng });
      expect(snapshot.currentLat).toBe(yercaud.lat);
      expect(snapshot.currentLon).toBe(yercaud.lng);
    });

    it('replaces a saved nearest-city name (Salem) with the exact one at the same spot', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      spyOn<any>(service, 'fetchCurrentDeviceLocation').and.resolveTo(yercaud);
      settings.getCurrentSettings.and.returnValue(savedAuto(salem));

      const refresh = service.refreshAutoLocationIntoSettings();
      await settle();
      expectLookup().flush({ success: true, location: yercaudName });
      await refresh;

      expect(settings.updateSettings).toHaveBeenCalledTimes(1);
      const saved = settings.updateSettings.calls.mostRecent().args[0];
      expect(saved.location?.city.city).toBe('Yercaud');
      expect(saved.city?.displayName).toBe('Yercaud, Tamil Nadu, India');
    });

    it('keeps a manually picked city and makes no lookup', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const { selection } = await buildResolved({ source: 'manual', city: salem });
      expect(selection.source).toBe('manual');
      expect(selection.city.city).toBe('Salem');
      expectNoLookup();
    });
  });

  describe('negative', () => {
    it('falls back to the nearest listed city without internet and makes no request', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(false);
      expect((await resolveName())?.city).toBe('Salem');
      expectNoLookup();
    });

    it('falls back to the nearest listed city when the API is down (503)', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const name = resolveName();
      expectLookup().flush({ success: false }, { status: 503, statusText: 'Service Unavailable' });
      expect((await name)?.city).toBe('Salem');
    });

    it('falls back to the nearest listed city on a network error', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const name = resolveName();
      expectLookup().error(new ProgressEvent('error'));
      expect((await name)?.city).toBe('Salem');
    });

    it('falls back to the nearest listed city when the lookup takes 6 seconds', fakeAsync(() => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      let result: SalahLocationCity | null | undefined;
      resolveName().then((city) => (result = city));
      const request = expectLookup();

      tick(5999);
      flushMicrotasks();
      expect(result).toBeUndefined();

      tick(1);
      flushMicrotasks();
      expect(request.cancelled).toBeTrue();
      expect(result?.city).toBe('Salem');
    }));

    it("falls back when the API finds no place name ('Current Location')", async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      const name = resolveName();
      expectLookup().flush({ success: true, location: { city: 'Current Location', displayName: 'Current Location' } });
      expect((await name)?.city).toBe('Salem');
    });

    it('falls back when the response has no location or an empty city', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);

      const missing = resolveName();
      expectLookup().flush({ success: true });
      expect((await missing)?.city).toBe('Salem');

      const empty = resolveName();
      expectLookup().flush({ success: true, location: { city: '', country: 'India' } });
      expect((await empty)?.city).toBe('Salem');
    });

    it("shows 'Current Location' with the GPS coordinates when offline and the city list is empty", async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(false);
      (service as any).getLocationsListCached.and.resolveTo([]);
      const { selection } = await buildResolved(null);
      expect(selection.city.city).toBe('Current Location');
      expect(selection.city.coordinates).toEqual({ latitude: yercaud.lat, longitude: yercaud.lng });
    });

    it('does not rewrite settings when the name and spot are unchanged', async () => {
      spyOn(service, 'hasInternetConnection').and.returnValue(true);
      spyOn<any>(service, 'fetchCurrentDeviceLocation').and.resolveTo(yercaud);
      settings.getCurrentSettings.and.returnValue(savedAuto(yercaudName));

      const refresh = service.refreshAutoLocationIntoSettings();
      await settle();
      expectLookup().flush({ success: true, location: yercaudName });
      await refresh;

      expect(settings.updateSettings).not.toHaveBeenCalled();
    });
  });
});
