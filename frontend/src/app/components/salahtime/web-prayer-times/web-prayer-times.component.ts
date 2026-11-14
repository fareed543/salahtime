import { KeyValue } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SalahKey, SalahLocationCity, SalahTime } from 'src/app/models/salah.model';
import { CityPrayerSeoService, citySlug } from 'src/app/services/city-prayer-seo.service';
import { LocationService } from 'src/app/services/location.service';
import { locationNow } from 'src/app/utils/location-timezone';
import { nextPrayer, timeUntil } from 'src/app/utils/next-prayer';
import { playStoreLink } from 'src/app/utils/play-store-link';
import { SalahtimeComponent } from '../salahtime.component';

/** A letter group of the India city directory. */
interface CityLetter {
  letter: string;
  cities: SalahLocationCity[];
}

/**
 * CR-021: the website's prayer-times page (/prayer-times, /prayer-times/<country>/<city>, /prayer-times/<city>).
 * Same logic as SalahtimeComponent (location, SEO, month table, print); new layout in the NF-020 home style.
 * The Android app keeps its own screens (see PrayerTimesPageComponent). Colours come from the shared
 * seasonal theme file web-home-theme.scss.
 */
@Component({
  selector: 'app-web-prayer-times',
  templateUrl: './web-prayer-times.component.html',
  styleUrls: [
    '../../web-home/web-home-theme.scss',
    './web-prayer-times.component.scss',
    './web-prayer-times-timings.scss',
    './web-prayer-times-sections.scss'
  ]
})
export class WebPrayerTimesComponent extends SalahtimeComponent implements OnInit, OnDestroy {
  /** Rows shown around today while the table is collapsed (all rows stay in the page for search engines). */
  static readonly COLLAPSED_DAYS_EACH_SIDE = 3;

  private readonly locations = inject(LocationService);
  private readonly nav = inject(Router);
  readonly seo = inject(CityPrayerSeoService);

  now = new Date();
  tableExpanded = false;
  cityLetters: CityLetter[] = [];
  activeLetter = 'A';
  cityFilter = '';
  private rowsCache: { key: string; rows: SalahtimeComponent['prayerTableRows'] } | null = null;
  private clock?: ReturnType<typeof setInterval>;

  override async ngOnInit(): Promise<void> {
    this.clock = setInterval(() => (this.now = new Date()), 1000);
    void this.loadCityDirectory();
    await super.ngOnInit();
  }

  override ngOnDestroy(): void {
    if (this.clock) {
      clearInterval(this.clock);
    }
    super.ngOnDestroy();
  }

  /** City shown: the route's city, else the saved one, else the website default (New Delhi). */
  get shownCity(): { city: string; country: string } | null {
    const seoCity = this.seo.city;
    if (seoCity) {
      return { city: seoCity.city, country: seoCity.country ?? '' };
    }
    const location = this.settings?.location ?? this.fallbackLocation;
    return location ? { city: location.city.city, country: location.city.country ?? '' } : null;
  }

  get countryLink(): string | null {
    const country = this.shownCity?.country;
    return country ? `/prayer-times/${citySlug(country)}` : null;
  }

  get isToday(): boolean {
    const shown = this.localNow;
    return this.activeDate.getFullYear() === shown.getFullYear()
      && this.activeDate.getMonth() === shown.getMonth()
      && this.activeDate.getDate() === shown.getDate();
  }

  /** "Now" in the shown city's time zone, the same frame as the prayer times. */
  get localNow(): Date {
    return locationNow(this.settings?.location ?? this.fallbackLocation ?? undefined, this.now);
  }

  get nextFarz(): KeyValue<SalahKey, SalahTime> | null {
    if (!this.isToday) {
      return null;
    }
    const cards = this.farzPrayerCards.map(card => ({ card, time: new Date(card.value.start) }));
    return nextPrayer(cards, this.localNow)?.card ?? null;
  }

  /** hh:mm:ss until the next farz prayer. */
  get countdown(): string {
    const next = this.nextFarz;
    if (!next) {
      return '';
    }
    const seconds = Math.max(0, Math.floor((new Date(next.value.start).getTime() - this.localNow.getTime()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  }

  get countdownParts(): { hours: number; minutes: number } {
    const next = this.nextFarz;
    return next ? timeUntil(new Date(next.value.start), this.localNow) : { hours: 0, minutes: 0 };
  }

  /** The time window the user is in right now (any prayer, Nafl or Makruh window), today only. */
  get currentWindow(): KeyValue<SalahKey, SalahTime> | null {
    if (!this.isToday) {
      return null;
    }
    const now = this.localNow.getTime();
    const all = [...this.otherPrayerCards, ...this.farzPrayerCards];
    return all.find(card => new Date(card.value.start).getTime() <= now && now < new Date(card.value.end).getTime()) ?? null;
  }

  isNextFarz(key: SalahKey): boolean {
    return this.nextFarz?.key === key;
  }

  isNow(key: SalahKey): boolean {
    return this.currentWindow?.key === key;
  }

  /** Month table rows, worked out once per month / settings instead of on every change check. */
  get tableRows(): SalahtimeComponent['prayerTableRows'] {
    const key = `${this.activeDate.getFullYear()}-${this.activeDate.getMonth()}|${JSON.stringify(this.settings ?? {})}`;
    if (!this.rowsCache || this.rowsCache.key !== key) {
      this.rowsCache = { key, rows: this.prayerTableRows };
    }
    return this.rowsCache.rows;
  }

  /** Collapsed: rows more than 3 days from the highlighted day are hidden (still in the page). */
  isRowHidden(date: Date): boolean {
    if (this.tableExpanded) {
      return false;
    }
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const distance = Math.abs(day(date) - day(this.activeDate)) / 86400000;
    return distance > WebPrayerTimesComponent.COLLAPSED_DAYS_EACH_SIDE;
  }

  get playLink(): string {
    return playStoreLink('card', this.nav.url || '/prayer-times');
  }

  /** Letters shown in the A–Z bar; with a filter, every letter that still has a match. */
  get visibleLetters(): CityLetter[] {
    return this.cityLetters;
  }

  isLetterShown(group: CityLetter): boolean {
    const filter = this.cityFilter.trim().toLowerCase();
    return filter ? group.cities.some(city => city.city.toLowerCase().includes(filter)) : group.letter === this.activeLetter;
  }

  isCityShown(city: SalahLocationCity): boolean {
    const filter = this.cityFilter.trim().toLowerCase();
    return !filter || city.city.toLowerCase().includes(filter);
  }

  cityLink(city: SalahLocationCity): string[] {
    return this.cityRoute(city);
  }

  trackByLetter(_: number, group: CityLetter): string {
    return group.letter;
  }

  trackByCity(_: number, city: SalahLocationCity): string {
    return city.city;
  }

  trackByKey(_: number, card: KeyValue<SalahKey, SalahTime>): string {
    return card.key;
  }

  private async loadCityDirectory(): Promise<void> {
    const all = await firstValueFrom(this.locations.getOfflineLocationsList());
    const india = all.filter(city => city.country === 'India').sort((a, b) => a.city.localeCompare(b.city));
    const groups = new Map<string, SalahLocationCity[]>();
    india.forEach(city => {
      const letter = city.city.charAt(0).toUpperCase();
      groups.set(letter, [...(groups.get(letter) ?? []), city]);
    });
    this.cityLetters = [...groups.entries()].map(([letter, cities]) => ({ letter, cities }));
    this.activeLetter = this.cityLetters[0]?.letter ?? 'A';
  }
}
