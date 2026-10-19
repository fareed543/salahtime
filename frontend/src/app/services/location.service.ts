import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom, map, Observable, of, shareReplay } from 'rxjs';
import {
  SalahLocationCity,
  SalahLocationSelection,
  SalahLocationSnapshot
} from '../models/salah.model';
import { environment } from 'src/environments/environment';
import { SettingsService } from './settings.service';
import { countrySlugOf, resolveLocationTimezone } from '../utils/location-timezone';

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

export interface PublicLocationListResponse<T> {
  items: T[];
}

export interface PublicCountryDirectoryResponse {
  country: PublicLocationCountry;
  items: SalahLocationCity[];
}

export interface ReverseGeocodeResponse {
  success?: boolean;
  location?: SalahLocationCity;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly CACHE_KEY = 'cached_location';
  private readonly CACHE_TTL = 30 * 60 * 1000;
  private readonly SIGNIFICANT_DISTANCE_KM = 50;
  // A GPS fix this recent is reused instead of asking the device (and reverse geocoding) again.
  private readonly FRESH_LOCATION_MS = 10 * 60 * 1000;
  // Moves smaller than this don't change prayer times meaningfully, so settings stay untouched.
  private readonly SETTINGS_UPDATE_DISTANCE_KM = 1;
  // City list released from the back office (downloaded, cached); the bundled assets/locations.json is the fallback.
  private readonly RELEASE_KEY = 'location_release';
  private readonly RELEASE_CHECKED_KEY = 'location_release_checked_at';
  private readonly RELEASE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
  private releaseCheckInFlight = false;

  private lastLocation: AppLocation | null = null;
  private locationsCache: SalahLocationCity[] | null = null;
  private offlineLocations$?: Observable<SalahLocationCity[]>;
  private lastAutoResolved: { resolved: ResolvedLocation; at: number } | null = null;
  private autoResolveInFlight: Promise<ResolvedLocation> | null = null;
  private timezoneBackfillDone = false;

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

  async primeWebLocationOnAppLoad(): Promise<void> {
    if (Capacitor.getPlatform() !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const permissionState = await this.getWebGeolocationPermissionState();
    if (permissionState === 'denied') {
      return;
    }

    const fetched = await this.fetchCurrentDeviceLocation();
    this.saveLocation(fetched.lat, fetched.lng);
    this.lastLocation = fetched;

    const settings = this.settingsService.getCurrentSettings();
    if (settings?.location?.source === 'manual') {
      return;
    }

    const resolved = await this.buildResolvedLocation(settings?.location ?? null, fetched.lat, fetched.lng);
    this.settingsService.updateSettings({
      ...settings,
      locationMode: 'auto',
      location: resolved.selection,
      city: resolved.selection.city,
      locationSnapshot: resolved.snapshot
    });
  }

  async resolveEffectiveLocation(forceRefresh = false): Promise<ResolvedLocation> {
    const settings = this.settingsService.getCurrentSettings();
    const selection = settings?.location ?? null;

    if (selection?.source === 'manual' && selection.city?.coordinates) {
      if (!selection.city.timezone) {
        void this.backfillManualCityTimezone();
      }
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

    // Launch sync and the first screen often ask at the same moment; share one GPS fix.
    if (!this.autoResolveInFlight) {
      this.autoResolveInFlight = this.fetchAndResolve(selection)
        .finally(() => {
          this.autoResolveInFlight = null;
        });
    }

    return this.autoResolveInFlight;
  }

  /**
   * Current location for screens and background sync: reuses a fix from the last
   * FRESH_LOCATION_MS instead of hitting GPS + reverse geocoding on every screen open.
   * Use resolveEffectiveLocation(true) only for an explicit "use my location" action.
   */
  async getFreshLocation(): Promise<ResolvedLocation> {
    const selection = this.settingsService.getCurrentSettings()?.location ?? null;
    const cached = this.lastAutoResolved;
    if (selection?.source !== 'manual' && cached && Date.now() - cached.at < this.FRESH_LOCATION_MS) {
      return cached.resolved;
    }

    return this.resolveEffectiveLocation(true);
  }

  /**
   * Refreshes the auto-detected location into settings, writing only when it actually
   * changed. Every settings write makes open screens recalculate and show their loader.
   */
  async refreshAutoLocationIntoSettings(): Promise<void> {
    const resolved = await this.getFreshLocation();
    const current = this.settingsService.getCurrentSettings();
    if (!current || !this.hasLocationChanged(current.location ?? null, resolved.selection)) {
      return;
    }

    this.settingsService.updateSettings({
      ...current,
      locationMode: resolved.selection.source,
      location: resolved.selection,
      city: resolved.selection.city
    });
  }

  /**
   * Cities picked before the location list carried timezones were saved without one. Prayer times
   * use the city's own zone (several in the US, Canada and Indonesia), so fill it in from the list.
   */
  private async backfillManualCityTimezone(): Promise<void> {
    if (this.timezoneBackfillDone) {
      return;
    }
    this.timezoneBackfillDone = true;

    const city = this.settingsService.getCurrentSettings()?.location?.city;
    if (!city || city.timezone) {
      return;
    }

    const name = (city.city || '').toLowerCase();
    const country = countrySlugOf(city);
    const match = (await this.getLocationsListCached()).find((item) =>
      !!item.timezone
      && countrySlugOf(item) === country
      && (city.slug ? item.slug === city.slug : (item.city || '').toLowerCase() === name)
    );
    if (!match?.timezone) {
      return;
    }

    const current = this.settingsService.getCurrentSettings();
    if (current?.location?.source !== 'manual' || current.location.city !== city) {
      return;
    }
    const updatedCity = { ...city, timezone: match.timezone, countrySlug: city.countrySlug || match.countrySlug };
    this.settingsService.updateSettings({
      ...current,
      location: { ...current.location, city: updatedCity },
      city: updatedCity
    });
  }

  private hasLocationChanged(previous: SalahLocationSelection | null, next: SalahLocationSelection): boolean {
    const previousCoordinates = previous?.city?.coordinates;
    if (!previous || !previousCoordinates || previous.source !== next.source) {
      return true;
    }

    if (this.buildCityId(previous.city) !== this.buildCityId(next.city)) {
      return true;
    }

    return this.distanceKm(
      previousCoordinates.latitude,
      previousCoordinates.longitude,
      next.city.coordinates.latitude,
      next.city.coordinates.longitude
    ) > this.SETTINGS_UPDATE_DISTANCE_KM;
  }

  private async fetchAndResolve(selection: SalahLocationSelection | null): Promise<ResolvedLocation> {
    const fetched = await this.fetchCurrentDeviceLocation();
    this.saveLocation(fetched.lat, fetched.lng);
    this.lastLocation = fetched;
    const resolved = await this.buildResolvedLocation(selection, fetched.lat, fetched.lng);
    this.lastAutoResolved = { resolved, at: Date.now() };
    return resolved;
  }

  /** A fresh GPS fix from the device, ignoring any manually chosen city (e.g. to place a masjid). */
  getDevicePosition(): Promise<AppLocation> {
    return this.fetchCurrentDeviceLocation();
  }

  /** Nearest city from the bundled offline list, for when reverse geocoding is unavailable. */
  nearestOfflineCity(latitude: number, longitude: number): Promise<SalahLocationCity | null> {
    return this.findNearestCity(latitude, longitude);
  }

  getCurrentLocation(): AppLocation | null {
    return this.lastLocation ?? this.getCachedLocation();
  }

  clearCache(): void {
    this.lastLocation = null;
    this.lastAutoResolved = null;
    sessionStorage.removeItem(this.CACHE_KEY);
  }

  getOfflineLocationsList(): Observable<SalahLocationCity[]> {
    if (!this.offlineLocations$) {
      const released = this.readCachedRelease();
      this.offlineLocations$ = (released
        ? of(released.items)
        : this.http.get<SalahLocationCity[]>('assets/locations.json')
      ).pipe(shareReplay(1));
      void this.refreshLocationRelease();
    }

    return this.offlineLocations$;
  }

  /**
   * Downloads a newer back-office location release (checked at most every few hours) and swaps it in.
   * Any failure keeps the current list: the app must work offline.
   */
  private async refreshLocationRelease(): Promise<void> {
    if (this.releaseCheckInFlight || !this.hasInternetConnection()) {
      return;
    }
    const lastCheck = Number(this.safeStorageGet(this.RELEASE_CHECKED_KEY) || 0);
    if (Date.now() - lastCheck < this.RELEASE_CHECK_INTERVAL) {
      return;
    }

    this.releaseCheckInFlight = true;
    try {
      const latest = await firstValueFrom(this.http.get<{ version: number; url?: string; checksum?: string }>(
        `${environment.apiUrl}http-location/latest-release`
      ));
      this.safeStorageSet(this.RELEASE_CHECKED_KEY, String(Date.now()));
      const current = this.readCachedRelease();
      if (!latest?.version || !latest.url || (current && current.version >= latest.version)) {
        return;
      }

      const text = await firstValueFrom(this.http.get(latest.url, { responseType: 'text' }));
      if (latest.checksum && !(await this.matchesChecksum(text, latest.checksum))) {
        return;
      }
      const items = JSON.parse(text) as SalahLocationCity[];
      const valid = Array.isArray(items) && items.length > 0 && items.every((item) =>
        !!item?.city && Number.isFinite(item.coordinates?.latitude) && Number.isFinite(item.coordinates?.longitude));
      if (!valid) {
        return;
      }

      this.safeStorageSet(this.RELEASE_KEY, JSON.stringify({ version: latest.version, items }));
      this.offlineLocations$ = of(items).pipe(shareReplay(1));
      this.locationsCache = items;
    } catch {
      // Keep the current list.
    } finally {
      this.releaseCheckInFlight = false;
    }
  }

  private readCachedRelease(): { version: number; items: SalahLocationCity[] } | null {
    try {
      const parsed = JSON.parse(this.safeStorageGet(this.RELEASE_KEY) || 'null');
      return parsed && Array.isArray(parsed.items) && parsed.items.length ? parsed : null;
    } catch {
      return null;
    }
  }

  private async matchesChecksum(text: string, expected: string): Promise<boolean> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      return true; // No WebCrypto (very old WebView): fall back to the shape check.
    }
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return hex === expected;
  }

  private safeStorageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeStorageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or blocked: the release is used for this session only.
    }
  }

  getCountries(): Observable<PublicLocationCountry[]> {
    return this.http.get<PublicLocationListResponse<PublicLocationCountry>>(
      `${environment.apiUrl}http-location/countries`
    ).pipe(
      map((response) => response.items ?? [])
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

  searchPublicCities(query: string, limit = 10): Observable<SalahLocationCity[]> {
    if (environment.offline || !this.hasInternetConnection()) {
      const normalized = query.trim().toLowerCase();
      return this.getOfflineLocationsList().pipe(
        map((locations) => locations.filter((location) =>
          [location.city, location.country]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalized)
        ).slice(0, limit))
      );
    }

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

    this.locationsCache = await firstValueFrom(this.getOfflineLocationsList());

    return this.locationsCache;
  }

  formatLocationLabel(city: SalahLocationCity | null | undefined): string {
    if (!city) {
      return '';
    }

    if (city.displayName?.trim()) {
      return city.displayName.trim();
    }

    return [city.city, city.country]
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

  private async fetchCurrentDeviceLocation(): Promise<AppLocation> {
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

  private async getWebGeolocationPermissionState(): Promise<PermissionState | null> {
    if (typeof navigator === 'undefined' || !('permissions' in navigator) || !navigator.permissions?.query) {
      return null;
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state;
    } catch {
      return null;
    }
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
        timezone: resolveLocationTimezone(resolvedSelection),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  private async resolveAutoLocationName(latitude: number, longitude: number): Promise<SalahLocationCity | null> {
    if (!environment.offline && this.hasInternetConnection()) {
      const liveLocation = await this.reverseGeocodeLocationName(latitude, longitude);
      if (liveLocation) {
        return liveLocation;
      }
    }

    return this.findNearestCity(latitude, longitude);
  }

  private async reverseGeocodeLocationName(latitude: number, longitude: number): Promise<SalahLocationCity | null> {
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

      return response?.location ?? null;
    } catch {
      return null;
    }
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
    return [city.city, city.country, city.pincode]
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
