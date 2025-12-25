import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  private readonly CACHE_KEY = 'cached_location';
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /** Public method used everywhere */
  async getLocation(): Promise<{ lat: number; lng: number }> {

    // 1️⃣ Try cache first
    const cached = this.getCachedLocation();
    if (cached) return cached;

    // 2️⃣ Fetch fresh GPS
    const location = await this.fetchLocation();

    // 3️⃣ Save to cache
    this.saveLocation(location.lat, location.lng);

    return location;
  }

  /** ---------------- PRIVATE METHODS ---------------- */

  private getCachedLocation(): { lat: number; lng: number } | null {
    const raw = localStorage.getItem(this.CACHE_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      const expired = Date.now() - data.timestamp > this.CACHE_TTL;
      if (expired) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }
      return { lat: data.lat, lng: data.lng };
    } catch {
      return null;
    }
  }

  private saveLocation(lat: number, lng: number) {
    localStorage.setItem(
      this.CACHE_KEY,
      JSON.stringify({
        lat,
        lng,
        timestamp: Date.now()
      })
    );
  }

  private async fetchLocation(): Promise<{ lat: number; lng: number }> {

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

    // 📱 Mobile (Capacitor)
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== 'granted') {
      throw new Error('Location permission denied');
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
  }

  /** Optional: force refresh */
  clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
  }
}
