import { KeyValue } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { WaqtService } from '../waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import * as moment from 'moment-hijri';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
originalOrder = (
  a: KeyValue<string, { start: Date; end: Date, type:String }>,
  b: KeyValue<string, { start: Date; end: Date, type:String }>
): number => {
  const order = [
    'sahri',
    'fajr',
    'tulu',
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
  
  prayerTimes: any = {};
  currentTime = '';
  dayOfWeek = '';
  day = '';
  month = '';
  year = '';
  islamicDay = '';
  islamicDateNumber = '';
  islamicMonthName = '';
  islamicYear = '';

  loading = false;
  errorMessage: string | null = null;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.getLocationAndTimes();
    this.updateDates();
    this.updateIslamicDate();
    this.updateTime();

    setInterval(() => this.updateTime(), 1000);
  }

  async getLocationAndTimes() {
    this.loading = true;
    try {
      let lat: number, lng: number;

      if (Capacitor.getPlatform() === 'web') {
        // Browser fallback
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
        // Capacitor plugin for APK (Android/iOS)
        const permission = await Geolocation.requestPermissions();

        if (permission.location === 'granted') {
          const position = await Geolocation.getCurrentPosition();
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          this.computePrayerTimes(lat, lng);
        } else {
          this.errorMessage = 'Oops! Looks like your location is off. Please enable it for a better experience.';
          this.loading = false;
        }
      }
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Oops! Looks like your location is off. Please enable it for a better experience.';
      this.loading = false;
    }
  }

  // Separate function to handle browser geolocation errors
  handleLocationError(error: any) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.errorMessage = 'Oops! Looks like your location is off. Please enable it for a better experience.';
        break;
      case error.POSITION_UNAVAILABLE:
        this.errorMessage = 'Oops! Looks like your location is off. Please enable it for a better experience.';
        break;
      case error.TIMEOUT:
        this.errorMessage = 'Oops! Looks like your location is off. Please enable it for a better experience.';
        break;
      default:
        this.errorMessage = 'An unknown error occurred while fetching location.';
    }
  }

  // Separate function for computing prayer times
  computePrayerTimes(lat: number, lng: number) {
    const tzOffset = -new Date().getTimezoneOffset() / 60;
    const date = new Date();
    const times = this.waqtService.getTimes(date, lat, lng, tzOffset);
    console.log(times);
    this.prayerTimes = times;
    this.loading = false;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  updateTime() {
    this.currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  updateDates() {
    const now = new Date();
    this.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    this.day = now.getDate().toString();
    this.month = now.toLocaleDateString('en-US', { month: 'long' });
    this.year = now.getFullYear().toString();
  }

  updateIslamicDate() {
  const now = moment();
  this.islamicDay = now.format('dddd'); 
  this.islamicDateNumber = now.format('iD'); 
  this.islamicMonthName = now.format('iMMMM'); 
  this.islamicYear = now.format('iYYYY'); 
  }

  async requestPermission() {
    const perm = await Geolocation.requestPermissions();
    console.log(perm);
  }
}
