import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocationService } from './location.service';

export interface AddressSuggestion {
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  /** Post office names under a pincode, offered as area choices. */
  areas: string[];
  /** 'online' = full lookup; 'offline' = best guess from bundled data (fewer fields). */
  source: 'online' | 'offline';
}

/**
 * First two digits of an Indian pincode -> state, for an offline best guess.
 * Prefixes shared by more than one state (e.g. 40 Maharashtra/Goa) are left out.
 */
const PINCODE_STATE_PREFIXES: Record<string, string> = {
  '11': 'Delhi',
  '12': 'Haryana', '13': 'Haryana',
  '14': 'Punjab', '15': 'Punjab',
  '17': 'Himachal Pradesh',
  '18': 'Jammu and Kashmir',
  '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Uttar Pradesh', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
  '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan', '33': 'Rajasthan', '34': 'Rajasthan',
  '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat',
  '41': 'Maharashtra', '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra',
  '45': 'Madhya Pradesh', '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',
  '50': 'Telangana',
  '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
  '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
  '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
  '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
  '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal',
  '75': 'Odisha', '76': 'Odisha', '77': 'Odisha',
  '78': 'Assam',
  '80': 'Bihar', '84': 'Bihar', '85': 'Bihar',
  '82': 'Jharkhand', '83': 'Jharkhand'
};

export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

/**
 * Fills a masjid address from a pincode (India Post) or the device location, with offline fallbacks.
 * Gated on connectivity only, not environment.offline: masjid editing already needs the API.
 */
@Injectable({ providedIn: 'root' })
export class AddressLookupService {
  constructor(private http: HttpClient, private locationService: LocationService) {}

  /** Resolves a 6-digit Indian pincode; null when it is unknown. */
  async lookupPincode(code: string): Promise<AddressSuggestion | null> {
    const pincode = code.trim();
    if (!PINCODE_PATTERN.test(pincode)) {
      return null;
    }

    if (this.locationService.hasInternetConnection()) {
      try {
        const response = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}http-location/pincode`, { params: { code: pincode } }));
        if (response?.success) {
          return {
            city: response.city ?? undefined,
            state: response.state ?? undefined,
            country: response.country ?? 'India',
            pincode,
            areas: Array.isArray(response.areas) ? response.areas : [],
            source: 'online'
          };
        }
      } catch (error: any) {
        // 404 = the pincode does not exist; anything else falls back to offline data.
        if (error?.status === 404) {
          return null;
        }
      }
    }

    const state = PINCODE_STATE_PREFIXES[pincode.slice(0, 2)];
    return state ? { state, country: 'India', pincode, areas: [], source: 'offline' } : null;
  }

  /** Address at the device's current position; throws when location is unavailable or denied. */
  async lookupCurrentPosition(): Promise<AddressSuggestion | null> {
    const { lat, lng } = await this.locationService.getDevicePosition();

    if (this.locationService.hasInternetConnection()) {
      try {
        const response = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}http-location/reverse-geocode`, {
          params: { lat: String(lat), lng: String(lng), detail: '1' }
        }));
        const location = response?.location;
        if (location) {
          return {
            street: location.street ?? undefined,
            area: location.area ?? undefined,
            city: location.city && location.city !== 'Current Location' ? location.city : undefined,
            state: location.state ?? undefined,
            country: location.country ?? undefined,
            pincode: location.pincode ? String(location.pincode).replace(/\s+/g, '') : undefined,
            areas: [],
            source: 'online'
          };
        }
      } catch {
        // Fall through to the bundled city list.
      }
    }

    const nearest = await this.locationService.nearestOfflineCity(lat, lng);
    return nearest
      ? { city: nearest.city, state: nearest.state, country: nearest.country, areas: [], source: 'offline' }
      : null;
  }
}
