import { KeyValue } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { WaqtService } from '../waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import { PrayerTime } from './salah.model';
import { DEFAULT_SALAH_SETTINGS } from '../settings/default-settings';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentSalah: string | null = null;
  settings: any = DEFAULT_SALAH_SETTINGS;

  originalOrder = (
    a: KeyValue<string, PrayerTime>,
    b: KeyValue<string, PrayerTime>
  ): number => {
    const order = [
      'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
      'dhuhr', 'asr', 'gurub', 'iftar', 'maghrib',
      'awabin', 'isha', 'tahajjud'
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

    this.loadSettings();


    this.getLocationAndTimes();

    // Check frequently to ensure accurate current salah highlight
    setTimeout(() => {
      setInterval(() => {
      this.highlightCurrentSalah();
      }, 60 * 1000); 
    }, 1000);
    
  }

  loadSettings() {
  const saved = localStorage.getItem('salahSettings');
  if (saved) {
    try {
      this.settings = { ...DEFAULT_SALAH_SETTINGS, ...JSON.parse(saved) };
    } catch {
      this.settings = DEFAULT_SALAH_SETTINGS;
    }
  } else {
    this.settings = DEFAULT_SALAH_SETTINGS;
  }
}

  highlightCurrentSalah() {
  if (!this.prayerTimes || Object.keys(this.prayerTimes).length === 0) {
    this.currentSalah = null;
    return;
  }

  const now = new Date();
  let lastValid: string | null = null;

  for (const [key, value] of Object.entries(this.prayerTimes)) {
    const start = new Date(value.start);
    const end = new Date(value.end);

    if (now >= start && now <= end) {
      this.currentSalah = key;
      return;
    }

    if (now >= start) {
      lastValid = key;
    }
  }

  // Fallback: if in between ranges → current salah is last one passed ✔️
  this.currentSalah = lastValid;
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
          () => {
            this.ngZone.run(() => {
              this.loading = false;
              this.handleLocationError();
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
        'Oops! Something went wrong while retrieving your location.';
      this.loading = false;
    }
  }

  handleLocationError() {
    this.errorMessage =
      'Oops! Looks like your location is off. Please enable it for a better experience.';
  }

  computePrayerTimes(lat: number, lng: number) {
    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const date = new Date();
    const times = this.waqtService.getTimes(date, lat, lng, tzOffset);

    const parsedTimes: Record<string, PrayerTime> = {};

    (Object.keys(times) as Array<keyof typeof times>).forEach(key => {
    parsedTimes[key] = {
      start: new Date(times[key].start),
      end: new Date(times[key].end),
      type: times[key].type
    };
    });


    this.prayerTimes = parsedTimes;
    this.loading = false;

    // Highlight salah once times are ready
    this.highlightCurrentSalah();
  }

  async requestPermission() {
    const perm = await Geolocation.requestPermissions();
    console.log(perm);
  }
}
