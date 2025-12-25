import { Injectable } from '@angular/core';
import { SettingsData } from '../models/salah-methods.config';
import { SalahKey, SalahTime } from '../models/salah.model';

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

  private getMethodConfig(methodId: string) {
    return SettingsData.find(m => m.id === methodId);
  }

  getTimes(
    date: Date,
    lat: number,
    lng: number,
    tzOffset: number,
    methodId: string,
    madhab: string
  ) {
    const method = this.getMethodConfig(methodId);
    if (!method || !method.angles) throw new Error(`Invalid prayer method: ${methodId}`);

    const fajrAngle = method.angles.fajr;
    const ishaAngle = method.angles.isha;
    const fixedIshaMinutes = method.fixedIshaMinutes ?? null;

    const dayOfYear = Math.ceil(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );

    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getHours() - 12) / 24);

    const decl =
      0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma);

    const eqtime =
      229.18 * (0.000075 + 0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

    const noon = 12 + tzOffset - lng / 15 - eqtime / 60;
    const phi = this.toRad(lat);

    const calcByAngle = (angle: number) => {
      const h = this.toRad(-angle);
      const omega = Math.acos(
        (Math.sin(h) - Math.sin(phi) * Math.sin(decl)) /
        (Math.cos(phi) * Math.cos(decl))
      );
      return this.toDeg(omega) / 15;
    };

    const sunrise = noon - calcByAngle(0.833);
    const sunset = noon + calcByAngle(0.833);

    const fajr = noon - calcByAngle(fajrAngle);
    const dhuhr = noon;

    let isha: number;
    if (fixedIshaMinutes) isha = sunset + fixedIshaMinutes / 60;
    else isha = noon + calcByAngle(ishaAngle);

    // Correct Asr calculation
    const asrFactor = madhab === 'Hanafi' ? 2 : 1;
    const calcAsr = (factor: number) => {
      const shadow = factor;
      const declination = decl;
      const phiRad = phi;
      const angle = -this.toDeg(Math.atan(1 / (shadow + Math.tan(Math.abs(phiRad - declination)))));
      const omega = Math.acos(
        (Math.sin(this.toRad(-angle)) - Math.sin(phiRad) * Math.sin(declination)) /
        (Math.cos(phiRad) * Math.cos(declination))
      );
      return noon + this.toDeg(omega) / 15;
    };
    const asr = calcAsr(asrFactor);

    // Core times
    const core = {
      fajr: this.hoursToDate(date, fajr),
      sunrise: this.hoursToDate(date, sunrise),
      dhuhr: this.hoursToDate(date, dhuhr),
      asr: this.hoursToDate(date, asr),
      maghrib: this.hoursToDate(date, sunset),
      isha: this.hoursToDate(date, isha)
    };

    // Salah windows
    const sahriStart = this.subtractMinutes(core.fajr, 90);
    const ishraqStart = this.addMinutes(core.sunrise, 15);
    const ishraqEnd = this.addMinutes(core.sunrise, 45);
    const chastStart = this.addMinutes(core.sunrise, 20);
    const chastEnd = this.subtractMinutes(core.dhuhr, 10);
    const zawalStart = this.subtractMinutes(core.dhuhr, 5);
    const zawalEnd = this.addMinutes(core.dhuhr, 5);
    const asrEnd = core.maghrib;       // Asr ends at Maghrib start
    const gurubStart = core.maghrib;   // Gurub starts at Maghrib
    const gurubEnd = this.addMinutes(core.maghrib, 3);
    const maghribEnd = this.addMinutes(core.maghrib, 45);
    const awabinStart = this.addMinutes(core.maghrib, 5);
    const awabinEnd = this.addMinutes(core.maghrib, 40);
    const iftarEnd = this.addMinutes(core.maghrib, 20);
    const ishaEnd = this.addMinutes(core.fajr, 0); // next day
    const tahajjudStart = this.hoursToDate(date, 0);
    const tahajjudEnd = this.subtractMinutes(core.fajr, 1);

    return {
      sahri:     { start: sahriStart,   end: core.fajr,     type: 'nafil',   icon: 'bi-moon-stars',        color: 'theme-black' },
      fajr:      { start: core.fajr,    end: core.sunrise,  type: 'farz',   icon: 'bi-sunrise',           color: 'theme-yellow' },
      tulu:      { start: core.sunrise, end: chastStart,    type: 'makruh', icon: 'bi-brightness-alt-high', color: 'theme-cyan' },
      ishraq:    { start: ishraqStart,  end: ishraqEnd,     type: 'nafil',   icon: 'bi-sun',               color: 'theme-orange' },
      chast:     { start: chastStart,   end: chastEnd,      type: 'nafil',   icon: 'bi-brightness-low',    color: 'theme-gray' },
      zawal:     { start: zawalStart,   end: zawalEnd,      type: 'makruh', icon: 'bi-sun',               color: 'theme-yellow' },
      dhuhr:     { start: zawalEnd,     end: core.asr,      type: 'farz',   icon: 'bi-sun',               color: 'theme-yellow' },
      asr:       { start: core.asr,     end: asrEnd,        type: 'farz',   icon: 'bi-sunset',            color: 'theme-orange' },
      gurub:     { start: gurubStart,   end: gurubEnd,      type: 'makruh', icon: 'bi-sunset-fill',       color: 'theme-red' },
      maghrib:   { start: gurubEnd,     end: maghribEnd,   type: 'farz',   icon: 'bi-moon-stars-fill',   color: 'theme-purple' },
      awabin:    { start: awabinStart,  end: awabinEnd,     type: 'nafil',   icon: 'bi-stars',             color: 'theme-blue' },
      iftar:     { start: core.maghrib, end: iftarEnd,      type: 'nafil',   icon: 'bi-moon-stars',        color: 'theme-black' },
      isha:      { start: core.isha,    end: ishaEnd,       type: 'farz',   icon: 'bi-moon-fill',         color: 'theme-black' },
      tahajjud:  { start: tahajjudStart,end: tahajjudEnd,   type: 'nafil',   icon: 'bi-stars-fill',       color: 'theme-blue' }
    };
  }

getCurrentSalah(prayerTimes: Record<SalahKey, SalahTime>): { key: SalahKey | null; timeRange: string; nextKey: SalahKey | null; timeRemaining: number } {
  const now = new Date();
  const keys = Object.keys(prayerTimes) as SalahKey[];

  for (const key of keys) {
    const value = prayerTimes[key];
    const start = new Date(value.start);
    let end = new Date(value.end);
    if (end <= start) end.setDate(end.getDate() + 1); // cross-midnight

    if (now >= start && now <= end) {
      const nextIndex = (keys.indexOf(key) + 1) % keys.length;
      const nextKey = keys[nextIndex];
      const nextStart = new Date(prayerTimes[nextKey].start);
      return { 
        key,
        timeRange: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        nextKey,
        timeRemaining: nextStart.getTime() - now.getTime()
      };
    }
  }

  // If before first prayer, show first as next
  const firstKey = keys[0];
  const firstStart = new Date(prayerTimes[firstKey].start);
  return { key: null, timeRange: '', nextKey: firstKey, timeRemaining: firstStart.getTime() - now.getTime() };
}


}
