import { Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WaqtService } from 'src/app/services/waqt.service';
import { SettingsService } from 'src/app/services/settings.service';
import { LocationService } from 'src/app/services/location.service';

interface RamzanDay {
  day: number;
  date: Date;
  sehriEnd: Date;
  iftarStart: Date;
}

@Component({
  selector: 'app-ramzan',
  templateUrl: './ramzan.component.html',
  styleUrls: ['./ramzan.component.scss']
})
export class RamzanComponent implements OnInit, OnDestroy {

  ramzanDays: RamzanDay[] = [];
  selectedCity: any = null;
  loading = true;
  errorMessage: string | null = null;
  settings: any = null; // needed for template *ngIf checks

  private lastLocation: { lat: number, lng: number } | null = null;
  private subs = new Subscription();

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.listenToSettings();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private listenToSettings() {
    const sub = this.settingsService.settings$.subscribe(settings => {
      if (!settings) return;
      this.settings = settings; // store settings
      this.selectedCity = settings.city;
      this.fetchLocationAndRamzan(settings.city);
    });
    this.subs.add(sub);
  }

  async fetchLocationAndRamzan(city: any) {
    this.loading = true;
    this.errorMessage = null;

    try {
      let lat: number, lng: number;

      if (city) {
        lat = city.coordinates.latitude;
        lng = city.coordinates.longitude;
      } else {
        const pos = await this.locationService.getLocation();
        lat = pos.lat;
        lng = pos.lng;
      }

      this.lastLocation = { lat, lng };
      this.generateRamzanCalendar(lat, lng);
    } catch (err) {
      this.ngZone.run(() => {
        this.errorMessage = 'Failed to fetch location.';
        this.loading = false;
      });
    }
  }

  onCitySelected(city: any) {
    if (!city) return;
    this.selectedCity = city;
    this.lastLocation = {
      lat: city.coordinates.latitude,
      lng: city.coordinates.longitude
    };

    // Update global settings
    const current = this.settingsService.getCurrentSettings();
    if (current) {
      this.settingsService.updateSettings({
        ...current,
        city: this.selectedCity,
        locationMode: 'manual'
      });
    }

    this.generateRamzanCalendar(city.coordinates.latitude, city.coordinates.longitude);
  }

  private generateRamzanCalendar(lat: number, lng: number) {
    const tzOffset = -new Date().getTimezoneOffset() / 60;

    // Ramadan 2026 starts 17 Feb 2026
    const ramzanStart = new Date(2026, 1, 17); // month is 0-indexed
    const ramzanDaysCount = 30;

    const methodId = this.settings?.calculationMethod ?? 'karachi';
    const madhab = this.settings?.madhab ?? 'Hanafi';

    const days: RamzanDay[] = [];

    for (let i = 0; i < ramzanDaysCount; i++) {
      const date = new Date(ramzanStart);
      date.setDate(ramzanStart.getDate() + i);

      const times = this.waqtService.getTimes(date, lat, lng, tzOffset, methodId, madhab);

      days.push({
        day: i + 1,
        date,
        sehriEnd: times.fajr.start,
        iftarStart: times.maghrib.start
      });
    }

    this.ngZone.run(() => {
      this.ramzanDays = days;
      this.loading = false;
    });
  }

}
