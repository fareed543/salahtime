import { Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { Subscription, filter, delay } from 'rxjs';
import { WaqtService } from 'src/app/services/waqt.service';
import { SettingsService } from 'src/app/services/settings.service';
import * as moment from 'moment-hijri';


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
  loading = true;
  errorMessage: string | null = null;

  settings: any = null;

  private subs = new Subscription();
  private isCalculated = false;

  constructor(
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private ngZone: NgZone
  ) {}

  // ------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------

  ngOnInit(): void {
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0) // allow UI to settle
      )
      .subscribe(settings => {
        this.settings = settings;
        this.isCalculated = false;
        this.getLocationAndRamzan();
      });

    this.subs.add(sub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ------------------------------------------------------
  // Location (FROM SETTINGS ONLY)
  // ------------------------------------------------------

  private async getLocationAndRamzan() {
    this.loading = true;
    this.errorMessage = null;

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error('Location not set');
      }

      let lat: number;
      let lng: number;

      if (location.source === 'manual') {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      } else {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      }

      this.ngZone.run(() => {
        this.generateRamzanCalendar(lat, lng);
      });

    } catch {
      this.ngZone.run(() => {
        this.errorMessage =
          'Please select a city or enable auto location from settings.';
        this.loading = false;
      });
    }
  }

  // ------------------------------------------------------
  // Core logic
  // ------------------------------------------------------



private generateRamzanCalendar(lat: number, lng: number) {
  if (this.isCalculated) return;
  this.isCalculated = true;

  try {
    const tzOffset = -new Date().getTimezoneOffset() / 60;

    const today = moment();
    let hijriYear = today.iYear(); // Current Hijri year

    // Start of Ramadan (9th month)
    let ramzanStart = moment(`${hijriYear}/09/01`, 'iYYYY/iMM/iDD');

    // If Ramadan already passed, move to next Hijri year
    if (ramzanStart.isBefore(today, 'day')) {
      hijriYear += 1;
      ramzanStart = moment(`${hijriYear}/09/01`, 'iYYYY/iMM/iDD');
    }

    // Dynamically calculate number of days in Ramadan
    const nextMonthStart = moment(ramzanStart).add(1, 'iMonth'); // Start of Shawwal
    const ramzanDaysCount = nextMonthStart.diff(ramzanStart, 'days');

    const methodId = this.settings.calculationMethod ?? 'karachi';
    const madhab = this.settings.madhab ?? 'Hanafi';

    const days: RamzanDay[] = [];

    for (let i = 0; i < ramzanDaysCount; i++) {
      const date = ramzanStart.clone().add(i, 'days').toDate();

      const times = this.waqtService.getTimes(
        date,
        lat,
        lng,
        tzOffset,
        methodId,
        madhab,
        {
          fajrOffset: this.settings.fajrOffset,
          maghribOffset: this.settings.maghribOffset
        }
      );

      days.push({
        day: i + 1,
        date,
        sehriEnd: new Date(times.fajr.start),
        iftarStart: new Date(times.maghrib.start)
      });
    }

    this.ngZone.run(() => {
      this.ramzanDays = days;
      this.loading = false;
    });

  } catch {
    this.ngZone.run(() => {
      this.loading = false;
      this.errorMessage = 'Failed to calculate Ramzan timings.';
    });
  }
}


}
