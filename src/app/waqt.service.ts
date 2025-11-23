import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WaqtService {

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  private hoursToDate(date: Date, hours: number): Date {
    const localDate = new Date(date);
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    localDate.setHours(h, m, 0, 0);
    return localDate;
  }

  private subtractMinutes(time: Date, mins: number): Date {
    return new Date(time.getTime() - mins * 60000);
  }

  private addMinutes(time: Date, mins: number): Date {
    return new Date(time.getTime() + mins * 60000);
  }

  getTimes(date: Date, lat: number, lng: number, tzOffset: number) {
    const n = Math.ceil(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );

    const gamma = (2 * Math.PI / 365) * (n - 1 + (date.getHours() - 12) / 24);

    // Solar declination
    const decl =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma);

    // Equation of time (minutes)
    const eqtime =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));

    const noon = 12 + tzOffset - lng / 15 - eqtime / 60;
    const phi = this.toRad(lat);

    const calcTime = (angle: number) => {
      const h = this.toRad(-angle);
      const omega = Math.acos(
        (Math.sin(h) - Math.sin(phi) * Math.sin(decl)) /
        (Math.cos(phi) * Math.cos(decl))
      );
      return this.toDeg(omega) / 15;
    };

    // Main prayer times in hours
    const sunrise = noon - calcTime(0.833);
    const sunset = noon + calcTime(0.833);
    const fajr = noon - calcTime(18);
    const isha = noon + calcTime(17);
    const dhuhr = noon;
    const asr = dhuhr + 3.5; // approximate offset for Asr
    const midnight = (sunset + fajr) / 2;

    // Convert hours to Date objects
    const times = {
      fajr: this.hoursToDate(date, fajr),
      sunrise: this.hoursToDate(date, sunrise),
      dhuhr: this.hoursToDate(date, dhuhr),
      asr: this.hoursToDate(date, asr),
      maghrib: this.hoursToDate(date, sunset),
      isha: this.hoursToDate(date, isha),
      midnight: this.hoursToDate(date, midnight)
    };

    // --- Derived periods ---
    const sahriEnd = times.fajr;
    const sahriStart = this.subtractMinutes(times.fajr, 90); // 1.5 hrs before Fajr

    const tulu = times.sunrise;
    const chastStart = this.addMinutes(tulu, 20); // 20 mins after sunrise
    const chastEnd = this.subtractMinutes(times.dhuhr, 10); // till ~10 mins before Dhuhr

    const zawalStart = this.subtractMinutes(times.dhuhr, 5);
    const zawalEnd = this.addMinutes(times.dhuhr, 5);

    const asrEnd = this.subtractMinutes(times.maghrib, 10);

    const maghribEnd = this.addMinutes(times.maghrib, 45);
    const awabinStart = this.addMinutes(times.maghrib, 5);
    const awabinEnd = this.addMinutes(times.maghrib, 40);

    const iftar = times.maghrib;

    const tahajjudStart = this.addMinutes(times.isha, 90);
    const tahajjudEnd = this.subtractMinutes(times.fajr, 30);

    // Return structured time slots
    return {
      sahri: {
        start: sahriStart,
        end: sahriEnd,
        type: 'nafl'
      },
      fajr: {
        start: sahriEnd,
        end: tulu,
        type: 'farz'
      },
      tulu: {
        start: tulu,
        end: chastStart,
        type: 'makruh'
      },
      chast: {
        start: chastStart,
        end: chastEnd,
        type: 'nafl'
      },
      zawal: {
        start: zawalStart,
        end: zawalEnd,
        type: 'makruh'
      },
      dhuhr: {
        start: zawalEnd,
        end: times.asr,
        type: 'farz'
      },
      asr: {
        start: times.asr,
        end: asrEnd,
        type: 'farz'
      },
      gurub: {
        start: times.maghrib,
        end: maghribEnd,
        type: 'makruh'
      },
      maghrib: {
        start: times.maghrib,
        end: maghribEnd,
        type: 'farz'
      },
      awabin: {
        start: awabinStart,
        end: awabinEnd,
        type: 'nafl'
      },
      iftar: {
        start: iftar,
        end: this.addMinutes(iftar, 20),
        type: 'nafl'
      },
      isha: {
        start: times.isha,
        end: tahajjudStart,
        type: 'farz'
      },
      tahajjud: {
        start: tahajjudStart,
        end: tahajjudEnd,
        type: 'nafl'
      }
    };

  }
}
