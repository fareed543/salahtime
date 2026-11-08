import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { SeoCityPageService } from 'src/app/seo/seo-city-page.service';
import {
  FaqItem,
  RAMADAN,
  RAMADAN_LIST_PATH,
  RamadanDayRow,
  RamadanRange,
  cityRoute,
  citySlug,
  longDate,
  nearbyCities,
  ramadanCityFaq,
  ramadanCityHeading,
  ramadanCityIntro,
  ramadanCityMeta,
  ramadanCityPath,
  ramadanCitySchema,
  ramadanDays,
  ramadanRange,
  ramadanToday
} from 'src/app/seo/seo-content';
import { HijriCalendarService } from 'src/app/services/hijri-calendar.service';
import { SeoService } from 'src/app/services/seo.service';

// Same id as the prerendered page's script, so the app replaces it instead of adding a copy.
const SCHEMA_ID = 'ramadan-city-schema';

/**
 * NF-009: /sehri-iftar/<country>/<city> — the Ramadan Sehri and Iftar timetable of one city.
 * Same text and times as the prerendered page (seo-content.ts + default settings); it does not
 * change the visitor's saved city.
 */
@Component({
  selector: 'app-ramadan-city',
  templateUrl: './ramadan-city.component.html'
})
export class RamadanCityComponent implements OnInit, OnDestroy {
  readonly listPath = RAMADAN_LIST_PATH;
  readonly year = RAMADAN.gregorianYear;
  city: SalahLocationCity | null = null;
  heading = '';
  intro: string[] = [];
  rows: RamadanDayRow[] = [];
  today: RamadanDayRow | null = null;
  todayText = '';
  faq: FaqItem[] = [];
  nearby: Array<{ name: string; link: string }> = [];
  cityLink: string[] = [];
  loading = true;
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pages: SeoCityPageService,
    private hijri: HijriCalendarService,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => void this.load(params.get('country'), params.get('city')));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.setSchema(SCHEMA_ID, null);
  }

  trackDay(_: number, row: RamadanDayRow): number {
    return row.day;
  }

  private async load(countrySlug: string | null, slug: string | null): Promise<void> {
    this.loading = true;
    const city = await this.pages.findCity(countrySlug, slug);
    if (!city) {
      void this.router.navigate([RAMADAN_LIST_PATH], { replaceUrl: true });
      return;
    }

    await firstValueFrom(this.hijri.loadAdjustments());
    const country = citySlug(city.country ?? '');
    const range: RamadanRange = ramadanRange(
      this.hijri.ummAlQuraMonth(RAMADAN.hijriYear, 9),
      country,
      this.hijri.monthAdjustment(RAMADAN.hijriYear, 9, country)
    );
    const timesOn = await this.pages.timesFor(city);
    this.rows = ramadanDays(range, date => {
      const times = timesOn(date);
      return { sahri: times.sahri.start, iftar: times.iftar.start };
    });
    this.today = ramadanToday(this.rows, new Date());
    this.todayText = this.today ? longDate(this.today.date) : '';
    this.city = city;
    this.heading = ramadanCityHeading(city);
    this.intro = ramadanCityIntro(city, this.rows, range);
    this.faq = ramadanCityFaq(city, this.rows);
    this.cityLink = cityRoute(city);
    this.nearby = nearbyCities(city, (await this.pages.cities()).filter(other => other.country === city.country), 12)
      .map(other => ({ name: other.city, link: ramadanCityPath(other) }));

    const meta = ramadanCityMeta(city, this.rows, this.today);
    this.seo.apply({ title: meta.title, description: meta.description, canonicalPath: ramadanCityPath(city) });
    this.seo.setSchema(SCHEMA_ID, ramadanCitySchema(city, meta, this.faq));
    this.loading = false;
  }
}
