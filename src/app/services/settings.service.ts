import { BehaviorSubject } from "rxjs";
import { SalahSettings } from "../models/settings.model";
import { Injectable } from "@angular/core";

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
      this.settingsSubject.next(JSON.parse(stored));
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
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.settingsSubject.next({ ...settings }); // new reference
  }

  getCurrentSettings(): SalahSettings {
    return this.settingsSubject.value!;
  }

  private async loadDefaultsFromJson(): Promise<SalahSettings> {
    const res = await fetch('assets/default-settings.json');
    return await res.json();
  }
}
