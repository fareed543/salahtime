import { BehaviorSubject } from "rxjs";
import { Injectable } from "@angular/core";
import { SalahLocationCity, SalahSettings } from "../models/salah.model";
import { countryDefaults, countryKey } from "../config/country-defaults";

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private readonly STORAGE_KEY = 'salahSettings';
  private settingsSubject = new BehaviorSubject<SalahSettings | null>(null);
  settings$ = this.settingsSubject.asObservable();

  constructor() {}

  /** App startup */
  async init(): Promise<void> {
    const stored = localStorage.getItem(this.STORAGE_KEY);

    if (stored) {
      this.settingsSubject.next(await this.normalizeSettings(JSON.parse(stored)));
      return;
    }

    await this.resetToDefaults();
  }

  /** RESET action */
  async resetToDefaults(): Promise<SalahSettings> {
    const defaults = await this.loadDefaultsFromJson();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaults));
    this.settingsSubject.next({ ...defaults }); // new reference
    return defaults;
  }

  updateSettings(settings: SalahSettings) {
    const normalized = this.applyCountryDefaults(this.settingsSubject.value, this.normalizeSettingsSync(settings));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    this.settingsSubject.next({ ...normalized }); // new reference
  }

  /**
   * CR-027: when the location moves to another country, the method and madhab follow that country's
   * defaults (config/country-defaults.ts) — unless the user picked their own in Settings (methodChosen).
   */
  private applyCountryDefaults(previous: SalahSettings | null, next: SalahSettings): SalahSettings {
    if (next.methodChosen) {
      return next;
    }
    const nextCountry = countryKey(next.location?.city?.country);
    const previousCountry = countryKey(previous?.location?.city?.country);
    if (!nextCountry || nextCountry === previousCountry) {
      return next;
    }
    const defaults = countryDefaults(nextCountry);
    return defaults ? { ...next, calculationMethod: defaults.method, madhab: defaults.madhab } : next;
  }

  getCurrentSettings(): SalahSettings {
    return this.settingsSubject.value!;
  }

  private async loadDefaultsFromJson(): Promise<SalahSettings> {
    const res = await fetch('assets/default-settings.json');
    return this.normalizeSettingsSync(await res.json());
  }

  private async normalizeSettings(settings: Partial<SalahSettings>): Promise<SalahSettings> {
    return this.normalizeSettingsSync(settings);
  }

  private normalizeSettingsSync(settings: Partial<SalahSettings>): SalahSettings {
    const normalizedLocation = this.normalizeLocationSelection(settings);
    const normalizedLocationMode = this.normalizeLocationMode(settings, normalizedLocation);
    const normalizedCity = settings.city ?? normalizedLocation?.city ?? null;

    return {
      calculationMethod: settings.calculationMethod ?? 'karachi',
      madhab: settings.madhab ?? 'Hanafi',
      methodChosen: settings.methodChosen === true,
      timeFormat: settings.timeFormat === '24h' ? '24h' : '12h',
      locationMode: normalizedLocationMode,
      location: normalizedLocation,
      city: normalizedCity,
      locationSnapshot: settings.locationSnapshot ?? null,
      enableNotifications: settings.enableNotifications ?? false,
      showHijri: settings.showHijri ?? true,
      hijriOffset: settings.hijriOffset ?? 0,
      sahriOffset: settings.sahriOffset ?? 0,
      fajrOffset: settings.fajrOffset ?? 0,
      dhuhrOffset: settings.dhuhrOffset ?? 0,
      asrOffset: settings.asrOffset ?? 0,
      iftarOffset: settings.iftarOffset ?? 0,
      maghribOffset: settings.maghribOffset ?? 0,
      ishaOffset: settings.ishaOffset ?? 0
    };
  }

  private normalizeLocationSelection(settings: Partial<SalahSettings>): SalahSettings['location'] {
    const location = settings.location ?? null;

    if (
      settings.locationMode === 'auto' &&
      location?.source === 'manual'
    ) {
      if (!settings.locationSnapshot || this.isLegacyBundledBengaluru(location.city)) {
        return null;
      }
    }

    return location;
  }

  private normalizeLocationMode(
    settings: Partial<SalahSettings>,
    location: SalahSettings['location']
  ): SalahSettings['locationMode'] {
    if (location?.source === 'manual') {
      return 'manual';
    }

    if (location?.source === 'auto') {
      return 'auto';
    }

    return settings.locationMode === 'manual' ? 'auto' : (settings.locationMode ?? 'auto');
  }

  private isLegacyBundledBengaluru(city: SalahLocationCity | null | undefined): boolean {
    return !!city
      && city.city === 'Bengaluru'
      // Old saved settings still carry the state field the bundled list used to have.
      && (city as SalahLocationCity & { state?: string }).state === 'Karnataka'
      && city.country === 'India'
      && city.pincode === '560002'
      && city.coordinates?.latitude === 12.971599
      && city.coordinates?.longitude === 77.594566;
  }
}
