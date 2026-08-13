import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  SalahLocationCity,
  SalahLocationSelection,
  SalahLocationSnapshot
} from '../models/salah.model';
import { environment } from 'src/environments/environment';
import { SettingsService } from './settings.service';

export interface AppLocation {
  lat: number;
  lng: number;
}

export interface ResolvedLocation {
  selection: SalahLocationSelection;
  snapshot: SalahLocationSnapshot;
}

export interface PublicLocationCountry {
  id: number;
  name: string;
  slug: string;
  iso2Code: string;
  iso3Code: string;
  defaultTimezone: string;
  defaultLanguage: string;
}

export interface PublicLocationState {
  id: number;
  countryId: number;
  name: string;
  slug: string;
  code: string;
  type: string;
  timezone: string;
}

export interface PublicLocationListResponse<T> {
  items: T[];
}

export interface PublicCountryDirectoryResponse {
  country: PublicLocationCountry;
  states: PublicLocationState[];
  items: SalahLocationCity[];
}

export interface PublicStateDirectoryResponse {
  country: PublicLocationCountry;
  state: PublicLocationState;
  items: SalahLocationCity[];
}

export interface PublicCountryStatesResponse {
  country: PublicLocationCountry;
  items: PublicLocationState[];
}

interface ReverseGeocodeResponse {
  success: boolean;
  location?: SalahLocationCity;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly CACHE_KEY = 'cached_location';
  private readonly CACHE_TTL = 30 * 60 * 1000;
  private readonly SIGNIFICANT_DISTANCE_KM = 50;

  private lastLocation: AppLocation | null = null;
  private locationsCache: SalahLocationCity[] | null = null;

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {}

  hasInternetConnection(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  }

  async getLocation(): Promise<AppLocation> {
    const resolved = await this.resolveEffectiveLocation();
    const location = {
      lat: resolved.snapshot.currentLat,
      lng: resolved.snapshot.currentLon
    };
    this.lastLocation = location;
    return location;
  }

  async resolveEffectiveLocation(forceRefresh = false): Promise<ResolvedLocation> {
    const settings = this.settingsService.getCurrentSettings();
    const selection = settings?.location ?? null;

    if (selection?.source === 'manual' && selection.city?.coordinates) {
      return this.buildResolvedLocation(
        selection,
        selection.city.coordinates.latitude,
        selection.city.coordinates.longitude
      );
    }

    if (!forceRefresh) {
      if (this.lastLocation) {
        return this.buildResolvedLocation(selection, this.lastLocation.lat, this.lastLocation.lng);
      }

      const cached = this.getCachedLocation();
      if (cached) {
        this.lastLocation = cached;
        return this.buildResolvedLocation(selection, cached.lat, cached.lng);
      }
    }

    const fetched = await this.fetchLocation();
    this.saveLocation(fetched.lat, fetched.lng);
    this.lastLocation = fetched;
    return this.buildResolvedLocation(selection, fetched.lat, fetched.lng);
  }

  getCurrentLocation(): AppLocation | null {
    return this.lastLocation ?? this.getCachedLocation();
  }

  clearCache(): void {
    this.lastLocation = null;
    sessionStorage.removeItem(this.CACHE_KEY);
  }

  getLocationsList() {
    return this.http.get<SalahLocationCity[]>('assets/locations.json');
  }

  getCountries(): Observable<PublicLocationCountry[]> {
    return this.http.get<PublicLocationListResponse<PublicLocationCountry>>(
      `${environment.apiUrl}http-location/countries`
    ).pipe(
      map((response) => response.items ?? [])
    );
  }

  getStatesByCountrySlug(countrySlug: string): Observable<PublicCountryStatesResponse> {
    return this.http.get<PublicCountryStatesResponse>(
      `${environment.apiUrl}http-location/states`,
      {
        params: { countrySlug }
      }
    );
  }

  getCountryDirectory(countrySlug: string): Observable<PublicCountryDirectoryResponse> {
    return this.http.get<PublicCountryDirectoryResponse>(
      `${environment.apiUrl}http-location/country-directory`,
      {
        params: { countrySlug }
      }
    );
  }

  getStateDirectory(countrySlug: string, stateSlug: string): Observable<PublicStateDirectoryResponse> {
    return this.http.get<PublicStateDirectoryResponse>(
      `${environment.apiUrl}http-location/state-directory`,
      {
        params: { countrySlug, stateSlug }
      }
    );
  }

  resolveCityBySlugs(countrySlug: string, stateSlug: string, citySlug: string): Observable<SalahLocationCity> {
    return this.http.get<{ item: SalahLocationCity }>(
      `${environment.apiUrl}http-location/resolve-city`,
      {
        params: { countrySlug, stateSlug, citySlug }
      }
    ).pipe(
      map((response) => response.item)
    );
  }

  searchPublicCities(query: string, limit = 10): Observable<SalahLocationCity[]> {
    return this.http.get<PublicLocationListResponse<SalahLocationCity>>(
      `${environment.apiUrl}http-location/search`,
      {
        params: {
          q: query,
          limit
        }
      }
    ).pipe(
      map((response) => response.items ?? [])
    );
  }

  async getLocationsListCached(): Promise<SalahLocationCity[]> {
    if (this.locationsCache) {
      return this.locationsCache;
    }

    this.locationsCache = await firstValueFrom(this.getLocationsList());

    return this.locationsCache;
  }

  formatLocationLabel(city: SalahLocationCity | null | undefined): string {
    if (!city) {
      return '';
    }

    if (city.displayName?.trim()) {
      return city.displayName.trim();
    }

    return [city.city, city.state, city.country]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(', ');
  }

  isSignificantMove(previous: SalahLocationSnapshot | null | undefined, next: SalahLocationSnapshot): boolean {
    if (!previous) {
      return true;
    }

    if (previous.currentCityId !== next.currentCityId) {
      return true;
    }

    return this.distanceKm(previous.currentLat, previous.currentLon, next.currentLat, next.currentLon) > this.SIGNIFICANT_DISTANCE_KM;
  }

  private getCachedLocation(): AppLocation | null {
    const raw = sessionStorage.getItem(this.CACHE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > this.CACHE_TTL) {
        sessionStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return { lat: data.lat, lng: data.lng };
    } catch {
      return null;
    }
  }

  private saveLocation(lat: number, lng: number): void {
    sessionStorage.setItem(this.CACHE_KEY, JSON.stringify({
      lat,
      lng,
      timestamp: Date.now()
    }));
  }

  private async fetchLocation(): Promise<AppLocation> {
    if (Capacitor.getPlatform() === 'web') {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }),
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
    }

    let permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') {
      await Geolocation.requestPermissions();
      permission = await Geolocation.checkPermissions();
    }

    if (permission.location !== 'granted') {
      throw new Error('Location permission denied');
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  }

  private async buildResolvedLocation(
    selection: SalahLocationSelection | null,
    latitude: number,
    longitude: number
  ): Promise<ResolvedLocation> {
    const city = selection?.source === 'manual'
      ? selection.city
      : await this.resolveAutoLocationName(latitude, longitude);

    const resolvedSelection: SalahLocationSelection = {
      source: selection?.source === 'manual' ? 'manual' : 'auto',
      city: {
        ...(city ?? {
          city: 'Current Location',
          displayName: 'Current Location'
        }),
        coordinates: {
          latitude,
          longitude
        }
      }
    };

    return {
      selection: resolvedSelection,
      snapshot: {
        currentCityId: this.buildCityId(resolvedSelection.city),
        currentLat: latitude,
        currentLon: longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  private async resolveAutoLocationName(latitude: number, longitude: number): Promise<SalahLocationCity | null> {
    if (this.hasInternetConnection()) {
      try {
        const response = await firstValueFrom(
          this.http.get<ReverseGeocodeResponse>(
            `${environment.apiUrl}http-location/reverse-geocode`,
            {
              params: {
                lat: String(latitude),
                lng: String(longitude)
              }
            }
          )
        );

        if (response?.success && response.location) {
          return {
            ...response.location,
            coordinates: {
              latitude,
              longitude
            }
          };
        }
      } catch {
        // Fall back to bundled locations when reverse geocoding is unavailable.
      }
    }

    return this.findNearestCity(latitude, longitude);
  }

  private async findNearestCity(latitude: number, longitude: number): Promise<SalahLocationCity | null> {
    const locations = await this.getLocationsListCached();
    if (!locations.length) {
      return null;
    }

    let nearest = locations[0];
    let nearestDistance = this.distanceKm(
      latitude,
      longitude,
      nearest.coordinates.latitude,
      nearest.coordinates.longitude
    );

    for (const candidate of locations.slice(1)) {
      const distance = this.distanceKm(
        latitude,
        longitude,
        candidate.coordinates.latitude,
        candidate.coordinates.longitude
      );

      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private buildCityId(city: SalahLocationCity): string {
    return [city.city, city.state, city.country, city.pincode]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
