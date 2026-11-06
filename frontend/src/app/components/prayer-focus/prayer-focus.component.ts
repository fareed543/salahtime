import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, filter, firstValueFrom, Subscription } from 'rxjs';
import { SalahKey, SalahLocationCity, SalahLocationSelection, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import {
  citySlug,
  cityRoute,
  clockTime,
  DEFAULT_PRAYER_PAGE_CITY,
  FaqItem,
  PRAYER_PAGE_CITIES,
  PRAYER_PAGES,
  PrayerPage,
  prayerPageBySlug,
  prayerPageCity,
  prayerPageFaq,
  prayerPageHeading,
  prayerPageIntro,
  prayerPageMeta,
  prayerPageRoute,
  prayerPageSchema,
  SeoCity
} from 'src/app/seo/seo-content';
import { LocationService } from 'src/app/services/location.service';
import { SeoService } from 'src/app/services/seo.service';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { locationNow, locationOffsetHours } from 'src/app/utils/location-timezone';

interface CityRow {
  name: string;
  start: string;
  link: string;
}

/**
 * CR-006: one prayer's time today (e.g. /asr-time, /asr-time/india/indore). Website only: the
 * Android app never links here. Reads settings but never changes the saved location, except when
 * the visitor presses "Use current location".
 */
@Component({
  selector: 'app-prayer-focus',
  templateUrl: './prayer-focus.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrayerFocusComponent implements OnInit, OnDestroy {
  // Same id as the prerendered page's schema, so the app replaces it instead of adding a duplicate.
  private readonly schemaId = 'prayer-page-schema';
  private readonly farzOrder: Array<[SalahKey, string]> = [
    ['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']
  ];

  page!: PrayerPage;
  /** City from the URL (/asr-time/india/indore), or null on /asr-time. */
  routeCity: SeoCity | null = null;
  /** Where the times shown are for. */
  shownCityName = '';
  usingDefaultCity = false;
  locating = false;
  locationError = false;
  loading = true;

  heading = '';
  intro = '';
  dateText = '';
  start = '';
  end = '';
  methodNote = '';
  farzTimes: Array<{ name: string; start: string }> = [];
  fullCityLink: string[] | null = null;
  cityRows: CityRow[] = [];
  otherPages: Array<{ name: string; link: string }> = [];
  faq: FaqItem[] = [];

  private locations: SalahLocationCity[] = [];
  private settings: SalahSettings | null = null;
  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private waqtService: WaqtService,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
    this.subs.add(combineLatest([this.route.data, this.route.paramMap]).subscribe(([data, params]) => {
      void this.load(data['prayerSlug'], params.get('country'), params.get('city'));
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.document.getElementById(this.schemaId)?.remove();
  }

  async useCurrentLocation(): Promise<void> {
    this.locating = true;
    this.locationError = false;
    this.cdr.markForCheck();
    try {
      await this.locationService.refreshAutoLocationIntoSettings();
      this.settings = this.settingsService.getCurrentSettings();
      if (!this.settings?.location) {
        throw new Error('No location');
      }
      this.showTimes(this.settings.location, false);
    } catch {
      this.locationError = true;
    } finally {
      this.locating = false;
      this.cdr.markForCheck();
    }
  }

  private async load(slug: string, country: string | null, city: string | null): Promise<void> {
    const page = prayerPageBySlug(slug);
    if (!page) {
      return;
    }
    this.page = page;
    this.routeCity = country && city ? prayerPageCity(country, city) ?? null : null;
    const unknownCity = !!(country && city) && !this.routeCity;

    [this.locations, this.settings] = await Promise.all([
      firstValueFrom(this.locationService.getOfflineLocationsList()),
      firstValueFrom(this.settingsService.settings$.pipe(filter((settings): settings is SalahSettings => !!settings)))
    ]);

    this.heading = prayerPageHeading(page, this.routeCity);
    this.intro = prayerPageIntro(page, this.routeCity);
    this.faq = prayerPageFaq(page, this.routeCity);
    this.otherPages = PRAYER_PAGES
      .filter(other => other !== page)
      .map(other => ({ name: `${other.name} time`, link: prayerPageRoute(other, this.routeCity) }));

    const saved = this.settings?.location ?? null;
    if (this.routeCity) {
      this.showTimes(this.selectionFor(this.routeCity), false);
    } else if (saved) {
      this.showTimes(saved, false);
    } else {
      this.showTimes(this.selectionFor(DEFAULT_PRAYER_PAGE_CITY), true);
    }

    this.cityRows = PRAYER_PAGE_CITIES
      .map(seoCity => {
        const selection = this.selectionFor(seoCity);
        const window = selection ? this.windowFor(selection) : null;
        return window ? { name: seoCity.city, start: clockTime(window.start), link: prayerPageRoute(page, seoCity) } : null;
      })
      .filter((row): row is CityRow => !!row);

    this.applySeo(unknownCity);
    this.loading = false;
    this.cdr.markForCheck();
  }

  private showTimes(selection: SalahLocationSelection | null, usingDefault: boolean): void {
    const times = selection ? this.timesFor(selection) : null;
    if (!selection || !times) {
      return;
    }
    const window = times[this.page.key as SalahKey];
    this.usingDefaultCity = usingDefault;
    this.shownCityName = selection.city.displayName || selection.city.city;
    this.start = clockTime(window.start);
    this.end = clockTime(window.end);
    this.farzTimes = this.farzOrder.map(([key, name]) => ({ name, start: clockTime(times[key].start) }));
    this.dateText = locationNow(selection).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const method = this.settings?.calculationMethod ?? 'karachi';
    this.methodNote = `${method.charAt(0).toUpperCase()}${method.slice(1)} method, ${this.settings?.madhab ?? 'Hanafi'} Asr`;
    const listed = this.locations.find(location => citySlug(location.city) === citySlug(selection.city.city)
      && citySlug(location.country ?? '') === citySlug(selection.city.country ?? ''));
    this.fullCityLink = listed ? cityRoute(listed) : null;
  }

  private applySeo(unknownCity: boolean): void {
    const window = this.routeCity ? { start: this.start, end: this.end } : null;
    const samples = this.routeCity ? [] : this.cityRows.filter(row => ['New Delhi', 'Mumbai', 'Hyderabad'].includes(row.name))
      .map(row => ({ city: row.name, start: row.start }));
    const meta = prayerPageMeta(this.page, this.routeCity, window, samples);
    this.seoService.apply({
      title: meta.title,
      description: meta.description,
      canonicalPath: unknownCity ? prayerPageRoute(this.page) : prayerPageRoute(this.page, this.routeCity),
      robots: unknownCity ? 'noindex, follow' : 'index, follow'
    });

    this.document.getElementById(this.schemaId)?.remove();
    const schema = this.document.createElement('script');
    schema.id = this.schemaId;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify(prayerPageSchema(this.page, this.routeCity, meta));
    this.document.head.appendChild(schema);
  }

  private selectionFor(seoCity: SeoCity): SalahLocationSelection | null {
    const city = this.locations.find(location => citySlug(location.city) === citySlug(seoCity.city)
      && citySlug(location.country ?? '') === citySlug(seoCity.country ?? ''));
    return city ? { source: 'manual', city } : null;
  }

  private windowFor(selection: SalahLocationSelection): SalahTime | null {
    return this.timesFor(selection)?.[this.page.key as SalahKey] ?? null;
  }

  private timesFor(selection: SalahLocationSelection): Record<SalahKey, SalahTime> | null {
    try {
      const now = locationNow(selection);
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const s = this.settings;
      return this.waqtService.getTimes(
        date,
        selection.city.coordinates.latitude,
        selection.city.coordinates.longitude,
        locationOffsetHours(selection, date),
        s?.calculationMethod ?? 'karachi',
        s?.madhab ?? 'Hanafi',
        {
          sahriOffset: s?.sahriOffset,
          fajrOffset: s?.fajrOffset,
          dhuhrOffset: s?.dhuhrOffset,
          asrOffset: s?.asrOffset,
          iftarOffset: s?.iftarOffset,
          maghribOffset: s?.maghribOffset,
          ishaOffset: s?.ishaOffset
        }
      );
    } catch {
      return null;
    }
  }
}
