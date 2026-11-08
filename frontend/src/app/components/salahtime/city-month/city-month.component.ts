import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { SeoCityPageService } from 'src/app/seo/seo-city-page.service';
import {
  CityMonth,
  CityMonthRow,
  cityMonthHeading,
  cityMonthIntro,
  cityMonthMeta,
  cityMonthPath,
  cityMonthRows,
  cityMonthSchema,
  cityPageMonths,
  cityRoute,
  monthName,
  nearbyCities,
  parseMonthSlug
} from 'src/app/seo/seo-content';
import { SeoService } from 'src/app/services/seo.service';

// Same id as the prerendered page's script, so the app replaces it instead of adding a copy.
const SCHEMA_ID = 'city-month-schema';

/**
 * NF-010: /prayer-times/<country>/<city>/<month>-<year> — one city's prayer timetable for a month.
 * Same table and text as the prerendered page (seo-content.ts + default settings), the same on every
 * screen size, and it does not change the visitor's saved city.
 */
@Component({
  selector: 'app-city-month',
  templateUrl: './city-month.component.html'
})
export class CityMonthComponent implements OnInit, OnDestroy {
  city: SalahLocationCity | null = null;
  month: CityMonth | null = null;
  heading = '';
  intro = '';
  rows: CityMonthRow[] = [];
  todayDay = 0;
  otherMonths: Array<{ name: string; link: string }> = [];
  nearby: Array<{ name: string; link: string }> = [];
  monthLabel = '';
  cityLink: string[] = [];
  loading = true;
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pages: SeoCityPageService,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params =>
      void this.load(params.get('country'), params.get('city'), params.get('month')));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.setSchema(SCHEMA_ID, null);
  }

  trackDay(_: number, row: CityMonthRow): number {
    return row.day;
  }

  private async load(countrySlug: string | null, slug: string | null, monthParam: string | null): Promise<void> {
    this.loading = true;
    const city = await this.pages.findCity(countrySlug, slug);
    const month = parseMonthSlug(monthParam ?? '');
    if (!city || !month) {
      void this.router.navigate(city ? cityRoute(city) : ['/prayer-times'], { replaceUrl: true });
      return;
    }

    const timesOn = await this.pages.timesFor(city);
    this.rows = cityMonthRows(month, date => {
      const t = timesOn(date);
      return { fajr: t.fajr.start, tulu: t.tulu.start, dhuhr: t.dhuhr.start, asr: t.asr.start, maghrib: t.maghrib.start, isha: t.isha.start };
    });
    const now = new Date();
    this.todayDay = now.getFullYear() === month.year && now.getMonth() === month.month ? now.getDate() : 0;
    this.city = city;
    this.month = month;
    this.monthLabel = monthName(month);
    this.heading = cityMonthHeading(city, month);
    this.intro = cityMonthIntro(city, month);
    this.cityLink = cityRoute(city);
    this.otherMonths = cityPageMonths(now)
      .filter(other => other.year !== month.year || other.month !== month.month)
      .map(other => ({ name: monthName(other), link: cityMonthPath(city, other) }));
    this.nearby = nearbyCities(city, (await this.pages.cities()).filter(other => other.country === city.country), 12)
      .map(other => ({ name: other.city, link: cityMonthPath(other, month) }));

    const meta = cityMonthMeta(city, month, this.rows);
    this.seo.apply({ title: meta.title, description: meta.description, canonicalPath: cityMonthPath(city, month) });
    this.seo.setSchema(SCHEMA_ID, cityMonthSchema(city, month, meta));
    this.loading = false;
  }
}
