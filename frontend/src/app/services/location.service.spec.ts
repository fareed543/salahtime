import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { SalahLocationCity } from '../models/salah.model';
import { LocationService } from './location.service';
import { SettingsService } from './settings.service';

describe('LocationService city search', () => {
  let service: LocationService;
  let http: HttpTestingController;
  let originalOffline: boolean;
  const cities: SalahLocationCity[] = [
    { city: 'Chennai', state: 'Tamil Nadu', country: 'India', coordinates: { latitude: 13.08, longitude: 80.27 } },
    { city: 'Chandigarh', state: 'Chandigarh', country: 'India', coordinates: { latitude: 30.73, longitude: 76.78 } },
    { city: 'Mumbai', state: 'Maharashtra', country: 'India', coordinates: { latitude: 19.08, longitude: 72.88 } }
  ];

  beforeEach(() => {
    originalOffline = environment.offline;
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LocationService, { provide: SettingsService, useValue: {} }]
    });
    service = TestBed.inject(LocationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.offline = originalOffline;
    http.verify();
  });

  it('searches and caches local JSON when configured offline despite internet access', () => {
    environment.offline = true;
    spyOn(service, 'hasInternetConnection').and.returnValue(true);
    service.searchPublicCities(' CH ', 1).subscribe(results => expect(results).toEqual([cities[0]]));
    http.expectOne('assets/locations.json').flush(cities);
    service.searchPublicCities('tamil').subscribe(results => expect(results).toEqual([cities[0]]));
    service.searchPublicCities('india', 20).subscribe(results => expect(results).toEqual(cities));
    service.searchPublicCities('no match').subscribe(results => expect(results).toEqual([]));
  });

  it('uses local JSON without internet even when configured online', () => {
    environment.offline = false;
    spyOn(service, 'hasInternetConnection').and.returnValue(false);
    service.searchPublicCities('ch', 20).subscribe(results => expect(results).toEqual(cities.slice(0, 2)));
    http.expectOne('assets/locations.json').flush(cities);
  });

  it('uses the API when configured online with internet access', () => {
    environment.offline = false;
    spyOn(service, 'hasInternetConnection').and.returnValue(true);
    service.searchPublicCities('ch', 20).subscribe(results => expect(results).toEqual(cities.slice(0, 2)));
    const request = http.expectOne(`${environment.apiUrl}http-location/search?q=ch&limit=20`);
    request.flush({ items: cities.slice(0, 2) });
  });
});
