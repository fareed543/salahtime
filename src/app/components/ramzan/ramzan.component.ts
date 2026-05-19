import { Component, NgZone, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { Subscription, filter, delay } from 'rxjs';
import { WaqtService } from 'src/app/services/waqt.service';
import { SettingsService } from 'src/app/services/settings.service';
import * as moment from 'moment-hijri';
import 'moment-timezone';

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
  @ViewChildren('ramzanRow') ramzanRows!: QueryList<ElementRef>;
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
  ) { }

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

  scrollToToday() {
    const index = this.ramzanDays.findIndex(day => this.isToday(day.date));

    if (index !== -1 && this.ramzanRows) {
      const element = this.ramzanRows.toArray()[index];

      element.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
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
      const today = moment().tz('Asia/Kolkata'); // today in India
      let hijriYear = today.iYear();

      // Start of Ramadan in Hijri, then force IST
      let ramzanStart = moment(`${hijriYear}/09/01`, 'iYYYY/iMM/iDD').tz('Asia/Kolkata');
      ramzanStart = ramzanStart.add(1, 'day');

      // End of Ramadan (start of Shawwal)
      let ramzanEnd = ramzanStart.clone().add(1, 'iMonth');

      // If Ramadan has fully passed, increment Hijri year
      if (ramzanEnd.isBefore(today, 'day')) {
        hijriYear += 1;
        ramzanStart = moment(`${hijriYear}/09/01`, 'iYYYY/iMM/iDD').tz('Asia/Kolkata');
        ramzanEnd = ramzanStart.clone().add(1, 'iMonth');
      }

      const ramzanDaysCount = ramzanEnd.diff(ramzanStart, 'days');

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
            sahriOffset: this.settings.sahriOffset,
            fajrOffset: this.settings.fajrOffset,
            dhuhrOffset: this.settings.dhuhrOffset,
            asrOffset: this.settings.asrOffset,
            iftarOffset: this.settings.iftarOffset,
            maghribOffset: this.settings.maghribOffset,
            ishaOffset: this.settings.ishaOffset
          }
        );

        days.push({
          day: i + 1,
          date,
          sehriEnd: new Date(times.sahri.end),
          iftarStart: new Date(times.maghrib.start)
        });
      }

      this.ngZone.run(() => {
        this.ramzanDays = days;
        this.loading = false;
          setTimeout(() => {
            this.scrollToToday();
          }, 100);
      });

    } catch {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = 'Failed to calculate Ramzan timings.';
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

}
