import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, shareReplay } from 'rxjs';
import { SalahKey, SalahLocationCity, SalahTime } from '../models/salah.model';
import { LocationService } from '../services/location.service';
import { WaqtService } from '../services/waqt.service';
import { locationOffsetHours } from '../utils/location-timezone';
import { citySlug, isStateNameEntry } from './seo-content';

interface DefaultSettings {
  calculationMethod: string;
  madhab: string;
  sahriOffset?: number;
  fajrOffset?: number;
  dhuhrOffset?: number;
  asrOffset?: number;
  iftarOffset?: number;
  maghribOffset?: number;
  ishaOffset?: number;
}

/**
 * City lookup and prayer times for the city landing pages (Ramadan NF-009, monthly NF-010).
 * Times use the app's default settings, not the visitor's, so the page shows exactly what
 * tools/prerender-seo.js wrote into its static HTML; the visitor's saved city is never changed.
 */
@Injectable({ providedIn: 'root' })
export class SeoCityPageService {
  private defaults$?: Observable<DefaultSettings>;

  constructor(
    private http: HttpClient,
    private locationService: LocationService,
    private waqt: WaqtService
  ) {}

  /** Every city that has its own page (state names listed as cities are left out). */
  async cities(): Promise<SalahLocationCity[]> {
    const all = await firstValueFrom(this.locationService.getOfflineLocationsList());
    return all.filter(location => !isStateNameEntry(location, all));
  }

  async findCity(countrySlug: string | null, slug: string | null): Promise<SalahLocationCity | null> {
    if (!countrySlug || !slug) {
      return null;
    }
    return (await this.cities()).find(city =>
      citySlug(city.city) === slug && citySlug(city.country ?? '') === countrySlug) ?? null;
  }

  /** Prayer times on a date for the city, with the default settings and the city's own time zone. */
  async timesFor(city: SalahLocationCity): Promise<(date: Date) => Record<SalahKey, SalahTime>> {
    this.defaults$ ??= this.http.get<DefaultSettings>('assets/default-settings.json').pipe(shareReplay(1));
    const defaults = await firstValueFrom(this.defaults$);
    const location = { source: 'manual' as const, city };
    return (date: Date) => this.waqt.getTimes(
      date,
      city.coordinates.latitude,
      city.coordinates.longitude,
      locationOffsetHours(location, date),
      defaults.calculationMethod,
      defaults.madhab,
      defaults
    );
  }
}
