import { Injectable } from '@angular/core';
import { SALAH_ORDER, SalahKey, SalahTime, SettingsData } from '../models/salah.model';


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
    madhab: string,
    farzOffsets?: {
      fajrOffset?: number;
      dhuhrOffset?: number;
      asrOffset?: number;
      maghribOffset?: number;
      ishaOffset?: number;
    }
  ): Record<SalahKey, SalahTime> {

    const method = this.getMethodConfig(methodId);
    if (!method || !method.angles) {
      throw new Error(`Invalid prayer method: ${methodId}`);
    }

    const fajrAngle = method.angles.fajr;
    const ishaAngle = method.angles.isha;
    const fixedIshaMinutes = method.fixedIshaMinutes ?? null;

    const dayOfYear = Math.ceil(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );

    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getHours() - 12) / 24);

    const decl =
      0.006918 - 0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma);

    const eqtime =
      229.18 * (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
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
    const dhuhr = noon; // ✅ FIXED

    let isha: number;
    if (fixedIshaMinutes) {
      isha = sunset + fixedIshaMinutes / 60;
    } else {
      isha = noon + calcByAngle(ishaAngle);
    }

    const asrFactor = madhab === 'Hanafi' ? 2 : 1;
    const calcAsr = (factor: number) => {
      const angle = -this.toDeg(
        Math.atan(1 / (factor + Math.tan(Math.abs(phi - decl))))
      );
      const omega = Math.acos(
        (Math.sin(this.toRad(-angle)) - Math.sin(phi) * Math.sin(decl)) /
        (Math.cos(phi) * Math.cos(decl))
      );
      return noon + this.toDeg(omega) / 15;
    };

    const asr = calcAsr(asrFactor);

    // 🔧 Convert minute offsets to hours (true adjustments)
    const off = {
      fajr: (farzOffsets?.fajrOffset ?? 0) / 60,
      dhuhr: (farzOffsets?.dhuhrOffset ?? 0) / 60,
      asr: (farzOffsets?.asrOffset ?? 0) / 60,
      maghrib: (farzOffsets?.maghribOffset ?? 0) / 60,
      isha: (farzOffsets?.ishaOffset ?? 0) / 60,
    };

    const core = {
      fajr: this.hoursToDate(date, fajr + off.fajr),
      sunrise: this.hoursToDate(date, sunrise),
      dhuhr: this.hoursToDate(date, dhuhr + off.dhuhr),
      asr: this.hoursToDate(date, asr + off.asr),
      maghrib: this.hoursToDate(date, sunset + off.maghrib),
      isha: this.hoursToDate(date, isha + off.isha)
    };

    const gurubEnd = this.addMinutes(core.maghrib, 3);

    const raw: Record<SalahKey, SalahTime> = {
      sahri: { start: this.subtractMinutes(core.fajr, 90), end: core.fajr, type: 'nafil', icon: 'bi-moon-stars', color: 'theme-black' },
      fajr: { start: core.fajr, end: core.sunrise, type: 'farz', icon: 'bi-sunrise', color: 'theme-yellow' },
      tulu: { start: core.sunrise, end: this.addMinutes(core.sunrise, 20), type: 'makruh', icon: 'bi-brightness-alt-high', color: 'theme-cyan' },
      ishraq: { start: this.addMinutes(core.sunrise, 20), end: this.addMinutes(core.sunrise, 90), type: 'nafil', icon: 'bi-sun', color: 'theme-orange' },
      chast: { start: this.addMinutes(core.sunrise, 90), end: this.subtractMinutes(core.dhuhr, 10), type: 'nafil', icon: 'bi-brightness-low', color: 'theme-gray' },
      zawal: { start: this.subtractMinutes(core.dhuhr, 5), end: this.addMinutes(core.dhuhr, 5), type: 'makruh', icon: 'bi-sun', color: 'theme-yellow' },
      dhuhr: { start: this.addMinutes(core.dhuhr, 5), end: core.asr, type: 'farz', icon: 'bi-sun', color: 'theme-yellow' },
      asr: { start: core.asr, end: core.maghrib, type: 'farz', icon: 'bi-sunset', color: 'theme-orange' },
      gurub: { start: core.maghrib, end: gurubEnd, type: 'makruh', icon: 'bi-sunset-fill', color: 'theme-red' },
      maghrib: { start: gurubEnd, end: this.addMinutes(core.maghrib, 45), type: 'farz', icon: 'bi-moon-stars-fill', color: 'theme-purple' },
      awabin: { start: this.addMinutes(core.maghrib, 5), end: this.addMinutes(core.maghrib, 40), type: 'nafil', icon: 'bi-stars', color: 'theme-blue' },
      iftar: { start: core.maghrib, end: this.addMinutes(core.maghrib, 20), type: 'nafil', icon: 'bi-moon-stars', color: 'theme-black' },
      isha: { start: core.isha, end: this.addMinutes(core.fajr, 0), type: 'farz', icon: 'bi-moon-fill', color: 'theme-black' },
      tahajjud: { start: this.hoursToDate(date, 0), end: this.subtractMinutes(core.fajr, 1), type: 'nafil', icon: 'bi-stars-fill', color: 'theme-blue' }
    };

    return SALAH_ORDER.reduce((acc, key) => {
      acc[key] = raw[key];
      return acc;
    }, {} as Record<SalahKey, SalahTime>);
  }


  getCurrentSalah(salahTimes: Record<SalahKey, SalahTime>) {
    const now = new Date();

    for (let i = 0; i < SALAH_ORDER.length; i++) {
      const key = SALAH_ORDER[i];
      const salah = salahTimes[key];
      if (!salah) continue;

      let start = new Date(salah.start);
      let end = new Date(salah.end);
      if (end <= start) end.setDate(end.getDate() + 1);

      if (now >= start && now < end) {
        return { key, start, end, index: i };
      }
    }

    return { key: null, start: null, end: null, index: -1 };
  }
}
