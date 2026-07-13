import { Injectable } from '@angular/core';
import { SALAH_ORDER, SalahKey, SalahTime, SettingsData } from '../models/salah.model';

@Injectable({ providedIn: 'root' })
export class WaqtService {

  private toRad = (d: number) => d * Math.PI / 180;
  private toDeg = (r: number) => r * 180 / Math.PI;

  private hoursToDate(d: Date, h: number) {
    const x = new Date(d);
    x.setHours(Math.floor(h), Math.floor((h % 1) * 60), 0, 0);
    return x;
  }

  private addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
  private subMin = (d: Date, m: number) => new Date(d.getTime() - m * 60000);
  private addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  private getMethod(id: string) {
    return SettingsData.find(m => m.id === id);
  }

  getTimes(
    date: Date, lat: number, lng: number, tz: number,
    methodId: string, madhab: string,
    off?: {
      sahriOffset?: number; fajrOffset?: number; dhuhrOffset?: number;
      asrOffset?: number; iftarOffset?: number; maghribOffset?: number; ishaOffset?: number;
    }
  ): Record<SalahKey, SalahTime> {

    const m = this.getMethod(methodId);
    if (!m?.angles) throw new Error(`Invalid prayer method: ${methodId}`);

    const start = Date.UTC(date.getFullYear(), 0, 0);
    const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (now - start) / 86400000;

    const g = (2 * Math.PI / 365) * (day - 1);
    const decl =
      0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
      - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g);

    const eq =
      229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));

    const noon = 12 + tz - lng / 15 - eq / 60;
    const phi = this.toRad(lat);

    const byAngle = (a: number) =>
      this.toDeg(Math.acos(
        (Math.sin(this.toRad(-a)) - Math.sin(phi) * Math.sin(decl)) /
        (Math.cos(phi) * Math.cos(decl))
      )) / 15;

    const sunrise = noon - byAngle(0.833);
    const sunset  = noon + byAngle(0.833);
    const fajr    = noon - byAngle(m.angles.fajr);
    const dhuhr   = noon;

    const isha = m.fixedIshaMinutes != null
      ? sunset + m.fixedIshaMinutes / 60
      : noon + byAngle(m.angles.isha);

    const asrF = madhab === 'Hanafi' ? 2 : 1;
    const asr = noon + this.toDeg(Math.acos(
      (Math.sin(Math.atan(1 / (asrF + Math.tan(Math.abs(phi - decl))))) -
        Math.sin(phi) * Math.sin(decl)) /
      (Math.cos(phi) * Math.cos(decl))
    )) / 15;

    const c = {
      fajr: this.hoursToDate(date, fajr),
      sunrise: this.hoursToDate(date, sunrise),
      dhuhr: this.hoursToDate(date, dhuhr),
      asr: this.hoursToDate(date, asr),
      maghrib: this.hoursToDate(date, sunset),
      isha: this.hoursToDate(date, isha)
    };

    const fajrStart = this.addMin(c.fajr, off?.fajrOffset ?? 0);
    const maghribStart = this.addMin(c.maghrib, off?.maghribOffset ?? 0);
    const ishaStart = this.addMin(c.isha, off?.ishaOffset ?? 0);
    const sahriStart = this.subMin(c.fajr, 90);
    const nextFajr = this.addDays(fajrStart, 1);

    // Tahajjud begins in the last third of the night, measured from Maghrib to the next Fajr.
    const nightDurationMs = nextFajr.getTime() - maghribStart.getTime();
    const tahajjudStartByNightThird = new Date(nextFajr.getTime() - nightDurationMs / 3);
    const tahajjudStart = tahajjudStartByNightThird > ishaStart ? tahajjudStartByNightThird : ishaStart;
    const tahajjudEnd = this.subMin(sahriStart, 1);

    const raw: Record<SalahKey, SalahTime> = {
      sahri:     { start: sahriStart, end: this.subMin(c.fajr, 3), type: 'nafil', icon: 'bi-moon-stars', color: 'theme-black' },
      fajr:      { start: this.addMin(c.fajr, off?.fajrOffset ?? 0), end: c.sunrise, type: 'farz', icon: 'bi-sunrise', color: 'theme-yellow' },
      tulu:      { start: c.sunrise, end: this.addMin(c.sunrise, 20), type: 'makruh', icon: 'bi-brightness-alt-high', color: 'theme-cyan' },
      ishraq:    { start: this.addMin(c.sunrise, 20), end: this.addMin(c.sunrise, 90), type: 'nafil', icon: 'bi-sun', color: 'theme-orange' },
      chast:     { start: this.addMin(c.sunrise, 90), end: this.subMin(c.dhuhr, 10), type: 'nafil', icon: 'bi-brightness-low', color: 'theme-gray' },
      zawal:     { start: this.subMin(c.dhuhr, 5), end: this.addMin(c.dhuhr, 5), type: 'makruh', icon: 'bi-sun', color: 'theme-yellow' },
      dhuhr:     { start: this.addMin(c.dhuhr, 5 + (off?.dhuhrOffset ?? 0)), end: c.asr, type: 'farz', icon: 'bi-sun', color: 'theme-yellow' },
      asr:       { start: this.addMin(c.asr, off?.asrOffset ?? 0), end: this.subMin(c.maghrib, 3), type: 'farz', icon: 'bi-sunset', color: 'theme-orange' },
      gurub:     { start: this.subMin(c.maghrib, 3), end: c.maghrib, type: 'makruh', icon: 'bi-sunset-fill', color: 'theme-red' },
      maghrib:   { start: this.addMin(c.maghrib, off?.maghribOffset ?? 0), end: this.addMin(c.maghrib, 45), type: 'farz', icon: 'bi-moon-stars-fill', color: 'theme-purple' },
      awabin:    { start: this.addMin(c.maghrib, 20), end: this.addMin(c.maghrib, 45), type: 'nafil', icon: 'bi-stars', color: 'theme-blue' },
      iftar:     { start: this.addMin(c.maghrib, off?.iftarOffset ?? 0), end: this.addMin(c.maghrib, 20), type: 'nafil', icon: 'bi-moon-stars', color: 'theme-black' },
      isha:      { start: this.addMin(c.isha, off?.ishaOffset ?? 0), end: nextFajr, type: 'farz', icon: 'bi-moon-fill', color: 'theme-black' },
      tahajjud:  { start: tahajjudStart, end: tahajjudEnd, type: 'nafil', icon: 'bi-stars-fill', color: 'theme-blue' }
    };

    return SALAH_ORDER.reduce((a, k) => (a[k] = raw[k], a), {} as Record<SalahKey, SalahTime>);
  }
}
