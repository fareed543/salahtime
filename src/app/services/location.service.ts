import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface AppLocation {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  constructor(private http: HttpClient) {}


  private readonly CACHE_KEY = 'cached_location';
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  private lastLocation: AppLocation | null = null;

  /** 🔹 Used by Dashboard & Settings (preferred) */
  async getLocation(): Promise<AppLocation> {
    // Memory cache (fastest)
    if (this.lastLocation) {
      return this.lastLocation;
    }

    // sessionStorage cache
    const cached = this.getCachedLocation();
    if (cached) {
      this.lastLocation = cached;
      return cached;
    }

    // GPS fetch
    const location = await this.fetchLocation();
    this.saveLocation(location.lat, location.lng);
    this.lastLocation = location;

    return location;
  }

  /** 🔹 Synchronous access (Settings toggle) */
  getCurrentLocation(): AppLocation | null {
    return this.lastLocation ?? this.getCachedLocation();
  }

  /* ---------------- PRIVATE ---------------- */

  private getCachedLocation(): AppLocation | null {
    const raw = sessionStorage.getItem(this.CACHE_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      const expired = Date.now() - data.timestamp > this.CACHE_TTL;
      if (expired) {
        sessionStorage.removeItem(this.CACHE_KEY);
        return null;
      }
      return { lat: data.lat, lng: data.lng };
    } catch {
      return null;
    }
  }

  private saveLocation(lat: number, lng: number) {
    sessionStorage.setItem(this.CACHE_KEY, JSON.stringify({
      lat,
      lng,
      timestamp: Date.now()
    }));
  }

  async fetchLocation(): Promise<AppLocation> {

    // 🌐 Web
    if (Capacitor.getPlatform() === 'web') {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }),
          err => reject(err),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
    }

    // 📱 Mobile (FIXED)
    let perm = await Geolocation.checkPermissions();

    if (perm.location !== 'granted') {
      await Geolocation.requestPermissions();
      perm = await Geolocation.checkPermissions(); // 🔥 REQUIRED
    }

    if (perm.location !== 'granted') {
      throw new Error('Location permission denied');
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
  }


  /** 🔹 Optional manual refresh */
  clearCache() {
    this.lastLocation = null;
    sessionStorage.removeItem(this.CACHE_KEY);
  }


  getLocationsList() {
    return this.http.get<any[]>('assets/locations.json');
  }
}
