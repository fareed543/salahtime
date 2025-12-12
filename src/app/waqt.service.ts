import { Injectable } from '@angular/core';
import { SettingsData } from './settings/salah-methods.config';

@Injectable({
  providedIn: 'root'
})
export class WaqtService {

  // -----------------------------
  // Core Math Functions
  // -----------------------------
  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  private hoursToDate(date: Date, hours: number): Date {
    const d = new Date(date);
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    d.setHours(h, m, 0, 0);
    return d;
  }

  private addMinutes(time: Date, mins: number): Date {
    return new Date(time.getTime() + mins * 60000);
  }

  private subtractMinutes(time: Date, mins: number): Date {
    return new Date(time.getTime() - mins * 60000);
  }

  // -----------------------------
  // Get Config for Selected Method
  // -----------------------------
  private getMethodConfig(methodId: string) {
    return SettingsData.find(m => m.id === methodId);
  }

  // -----------------------------
  // MAIN PRAYER CALC ENGINE
  // -----------------------------
  getTimes(
    date: Date,
    lat: number,
    lng: number,
    tzOffset: number,
    methodId: string
  ) {
    const method = this.getMethodConfig(methodId);
    if (!method || !method.angles) {
      throw new Error(`Invalid prayer method: ${methodId}`);
    }

    const fajrAngle = method.angles.fajr;
    const ishaAngle = method.angles.isha;
    const fixedIshaMinutes = method.fixedIshaMinutes ?? null;

    // -----------------------------
    // Solar calculations
    // -----------------------------
    const dayOfYear = Math.ceil(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );

    const gamma =
      (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getHours() - 12) / 24);

    const decl =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma);

    const eqtime =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));

    const noon = 12 + tzOffset - lng / 15 - eqtime / 60;
    const phi = this.toRad(lat);

    // Calculate hour-angle-based time
    const calcByAngle = (angle: number) => {
      const h = this.toRad(-angle);
      const omega =
        Math.acos(
          (Math.sin(h) - Math.sin(phi) * Math.sin(decl)) /
          (Math.cos(phi) * Math.cos(decl))
        ) *
        (180 / Math.PI);

      return omega / 15; // hours
    };

    // -----------------------------
    // Core times
    // -----------------------------
    const sunrise = noon - calcByAngle(0.833);
    const sunset = noon + calcByAngle(0.833);

    const fajr = noon - calcByAngle(fajrAngle);

    const dhuhr = noon;

    let isha: number;

    if (fixedIshaMinutes) {
      // Isha is fixed after Maghrib — e.g., Makkah 90 minutes
      isha = sunset + fixedIshaMinutes / 60;
    } else {
      // angle-based isha
      isha = noon + calcByAngle(ishaAngle);
    }

    const asr = dhuhr + 3.5; // ʿAsr approximation
    const midnight = (sunset + fajr) / 2;

    // Convert to Date objects
    const core = {
      fajr: this.hoursToDate(date, fajr),
      sunrise: this.hoursToDate(date, sunrise),
      dhuhr: this.hoursToDate(date, dhuhr),
      asr: this.hoursToDate(date, asr),
      maghrib: this.hoursToDate(date, sunset),
      isha: this.hoursToDate(date, isha),
      midnight: this.hoursToDate(date, midnight)
    };

    // -----------------------------
    // DERIVED TIME SLOTS
    // -----------------------------
    const sahriStart = this.subtractMinutes(core.fajr, 90);

    const ishraqStart = this.addMinutes(core.sunrise, 15);
    const ishraqEnd = this.addMinutes(core.sunrise, 45);

    const chastStart = this.addMinutes(core.sunrise, 20);
    const chastEnd = this.subtractMinutes(core.dhuhr, 10);

    const zawalStart = this.subtractMinutes(core.dhuhr, 5);
    const zawalEnd = this.addMinutes(core.dhuhr, 5);

    const asrEnd = this.subtractMinutes(core.maghrib, 10);

    const gurubEnd = this.addMinutes(core.maghrib, 3);

    const maghribEnd = this.addMinutes(core.maghrib, 45);

    const awabinStart = this.addMinutes(core.maghrib, 5);
    const awabinEnd = this.addMinutes(core.maghrib, 40);

    const iftarEnd = this.addMinutes(core.maghrib, 20);

    const tahajjudStart = this.addMinutes(core.isha, 90);
    const tahajjudEnd = this.subtractMinutes(core.fajr, 30);

    // -----------------------------
    // Final Structured Return
    // -----------------------------
    return {
      sahri:     { start: sahriStart,       end: core.fajr,        type: 'nafl' },
      fajr:      { start: core.fajr,        end: core.sunrise,     type: 'farz' },
      tulu:      { start: core.sunrise,     end: chastStart,       type: 'makruh' },
      ishraq:    { start: ishraqStart,      end: ishraqEnd,        type: 'nafl' },
      chast:     { start: chastStart,       end: chastEnd,         type: 'nafl' },
      zawal:     { start: zawalStart,       end: zawalEnd,         type: 'makruh' },
      dhuhr:     { start: zawalEnd,         end: core.asr,         type: 'farz' },
      asr:       { start: core.asr,         end: asrEnd,           type: 'farz' },
      gurub:     { start: core.maghrib,     end: gurubEnd,         type: 'makruh' },
      maghrib:   { start: gurubEnd,         end: maghribEnd,       type: 'farz' },
      awabin:    { start: awabinStart,      end: awabinEnd,        type: 'nafl' },
      iftar:     { start: core.maghrib,     end: iftarEnd,         type: 'nafl' },
      isha:      { start: core.isha,        end: tahajjudStart,    type: 'farz' },
      tahajjud:  { start: tahajjudStart,    end: tahajjudEnd,      type: 'nafl' }
    };
  }
}
