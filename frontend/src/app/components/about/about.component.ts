import { Component } from '@angular/core';
import { SettingsData } from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';

interface MethodRow {
  id: string;
  translationKey: string;
  fajrAngle: number;
  ishaAngle: number | null;
  ishaMinutes: number | null;
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  /** Built from the same table WaqtService calculates with, so the page cannot drift from the app. */
  readonly methods: MethodRow[] = SettingsData
    .filter((method) => method.enabled && method.angles)
    .map((method) => ({
      id: method.id,
      translationKey: method.translationKey,
      fajrAngle: method.angles!.fajr,
      ishaAngle: method.fixedIshaMinutes != null ? null : method.angles!.isha,
      ishaMinutes: method.fixedIshaMinutes ?? null
    }));

  constructor(private readonly settingsService: SettingsService) {}

  get selectedMethodId(): string {
    return this.settingsService.getCurrentSettings()?.calculationMethod ?? 'karachi';
  }

  get isHanafi(): boolean {
    return (this.settingsService.getCurrentSettings()?.madhab ?? 'Hanafi') === 'Hanafi';
  }
}
