import { Component } from '@angular/core';
import * as moment from 'moment-hijri';

@Component({
  selector: 'app-current-time',
  templateUrl: './current-time.component.html',
  styleUrls: ['./current-time.component.scss']
})
export class CurrentTimeComponent {

  currentTime = '';
  dayOfWeek = '';
  day = '';
  month = '';
  year = '';
  islamicDay = '';
  islamicDateNumber = '';
  islamicMonthName = '';
  islamicYear = '';


  ngOnInit(): void {
    this.updateDates();
    this.updateIslamicDate();
    this.updateTime();

    setInterval(() => this.updateTime(), 1000);
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
}
