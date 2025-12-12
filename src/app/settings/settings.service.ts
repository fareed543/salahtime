import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SalahSettings {
  calculationMethod: string;
  showNafilSalah: boolean;
  showMakruhTime: boolean;
  madhab: string;
  locationMode: string;
  enableNotifications: boolean;
  showHijri: boolean;
  hijriOffset: number;
}

export const DEFAULT_SALAH_SETTINGS: SalahSettings = {
  calculationMethod: 'karachi',
  showNafilSalah: false,
  showMakruhTime: false,
  madhab: 'Hanafi',
  locationMode: 'auto',
  enableNotifications: true,
  showHijri: true,
  hijriOffset: 0,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settingsSubject = new BehaviorSubject<SalahSettings>(DEFAULT_SALAH_SETTINGS);
  settings$ = this.settingsSubject.asObservable();

  constructor() { }

  updateSettings(settings: SalahSettings) {
    this.settingsSubject.next(settings);
  }

  getCurrentSettings(): SalahSettings {
    return this.settingsSubject.value;
  }
}
