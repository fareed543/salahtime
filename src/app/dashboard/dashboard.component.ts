import { KeyValue } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { WaqtService } from '../waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import { PrayerTime } from './salah.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentSalah: string | null = null;

  originalOrder = (
    a: KeyValue<string, PrayerTime>,
    b: KeyValue<string, PrayerTime>
  ): number => {
    const order = [
      'sahri',
      'fajr',
      'tulu',
      'ishraq',
      'chast',
      'zawal',
      'dhuhr',
      'asr',
      'gurub',
      'iftar',
      'maghrib',
      'awabin',
      'isha',
      'tahajjud'
    ];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  prayerTimes: Record<string, PrayerTime> = {};
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.getLocationAndTimes();

    // Highlight every minute
    setInterval(() => {
      this.highlightCurrentSalah();
    }, 1000 * 60);
  }

  highlightCurrentSalah() {
    if (!this.prayerTimes || Object.keys(this.prayerTimes).length === 0) {
      this.currentSalah = null;
      return;
    }

    const now = new Date();

    for (const [key, value] of Object.entries(this.prayerTimes)) {
      const start = new Date(value.start);
      const end = new Date(value.end);

      if (now >= start && now <= end) {
        this.currentSalah = key;
        return;
      }
    }

    this.currentSalah = null;
  }

  async getLocationAndTimes() {
    this.loading = true;
    try {
      let lat: number, lng: number;

      if (Capacitor.getPlatform() === 'web') {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.ngZone.run(() => {
              lat = position.coords.latitude;
              lng = position.coords.longitude;
              this.computePrayerTimes(lat, lng);
            });
          },
          (error) => {
            this.ngZone.run(() => {
              this.loading = false;
              this.handleLocationError(error);
            });
          }
        );
      } else {
        const permission = await Geolocation.requestPermissions();

        if (permission.location === 'granted') {
          const position = await Geolocation.getCurrentPosition();
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          this.computePrayerTimes(lat, lng);
        } else {
          this.errorMessage =
            'Oops! Looks like your location is off. Please enable it for a better experience.';
          this.loading = false;
        }
      }
    } catch (err) {
      console.error(err);
      this.errorMessage =
        'Oops! Looks like your location is off. Please enable it for a better experience.';
      this.loading = false;
    }
  }

  handleLocationError(error: any) {
    this.errorMessage =
      'Oops! Looks like your location is off. Please enable it for a better experience.';
  }

 computePrayerTimes(lat: number, lng: number) {
  const tzOffset = -new Date().getTimezoneOffset() / 60;
  const date = new Date();
  const times = this.waqtService.getTimes(date, lat, lng, tzOffset);

  // Define all valid prayer keys
  type PrayerKeys =
    | 'sahri' | 'fajr' | 'tulu' | 'ishraq' | 'chast'
    | 'zawal' | 'dhuhr' | 'asr' | 'gurub' | 'iftar'
    | 'maghrib' | 'awabin' | 'isha' | 'tahajjud';

  // Ensure all times are Date objects
  const parsedTimes: Record<PrayerKeys, PrayerTime> = {} as Record<PrayerKeys, PrayerTime>;
  (Object.keys(times) as PrayerKeys[]).forEach((key) => {
    parsedTimes[key] = {
      start: new Date(times[key].start),
      end: new Date(times[key].end),
      type: times[key].type
    };
  });

  this.prayerTimes = parsedTimes;
  this.loading = false;

  // Immediately highlight the current salah
  this.highlightCurrentSalah();
}


  async requestPermission() {
    const perm = await Geolocation.requestPermissions();
    console.log(perm);
  }
}
