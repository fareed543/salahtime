import { BehaviorSubject } from "rxjs";
import { Injectable } from "@angular/core";
import { SalahSettings } from "../models/salah.model";

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
    const normalized = this.normalizeSettingsSync(settings);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    this.settingsSubject.next({ ...normalized }); // new reference
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
    return {
      calculationMethod: settings.calculationMethod ?? 'karachi',
      madhab: settings.madhab ?? 'Hanafi',
      locationMode: settings.locationMode ?? settings.location?.source ?? 'auto',
      location: settings.location ?? null,
      city: settings.city ?? null,
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
}
