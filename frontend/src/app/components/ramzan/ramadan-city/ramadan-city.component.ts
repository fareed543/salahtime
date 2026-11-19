import { Component, OnDestroy, OnInit } from '@angular/core';
import { countryDefaults } from 'src/app/config/country-defaults';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { SeoCityPageService } from 'src/app/seo/seo-city-page.service';
import {
  FaqItem,
  HOME_POPULAR_CITIES,
  RAMADAN,
  faqPageSchema,
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
import {
  LANG_LABELS, SeoLang, cityLangs, langOfPath, langPath, localCityName, localClock, localCountryName, localDate,
  localRamadanMeta, localRamadanPage
} from 'src/app/seo/seo-content-i18n';

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
  /** City name as shown (native script on Urdu / Arabic pages). */
  cityName = '';
  /** CR-028: links to this page in the other languages. */
  languageLinks: Array<{ lang: string; label: string; link: string }> = [];
  /** Page labels; English here, Urdu / Arabic on /ur/ and /ar/ addresses. */
  labels = {
    home: 'Home', list: 'Sehri and Iftar', todayTitle: '', todayLine: '', tableTitle: '',
    heads: ['Day', 'Date', 'Sehri ends', 'Iftar'], footnote: '* Only if the Shawwal moon is not seen on the evening of day 29.',
    faqTitle: '', nearbyTitle: '', prayerLink: '', otherCities: 'Sehri and Iftar in other cities',
  };
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
      this.hijri.monthAdjustment(RAMADAN.hijriYear, 9, country),
      countryDefaults(country)?.ramadanDelayDays
    );
    const timesOn = await this.pages.timesFor(city);
    this.rows = ramadanDays(range, date => {
      const times = timesOn(date);
      // "Sehri ends" = end of the Sehri window (3 min before Fajr), not its start (90 min before Fajr).
      return { sahri: times.sahri.end, iftar: times.iftar.start };
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

    this.cityName = city.city;
    this.labels = {
      ...this.labels,
      todayTitle: this.today ? `Today in ${city.city} – Ramadan day ${this.today.day}` : '',
      todayLine: this.today ? `Sehri ends ${this.today.sehri} · Iftar ${this.today.iftar}` : '',
      tableTitle: `Ramadan ${this.year} Sehri and Iftar timetable for ${city.city}`,
      faqTitle: `Ramadan ${this.year} FAQ for ${city.city}`,
      nearbyTitle: `Sehri and Iftar in cities near ${city.city}`,
      prayerLink: `Prayer times in ${city.city} today`,
    };

    // CR-028: which languages this city's page exists in, and which one this address is.
    const langs = cityLangs(city, HOME_POPULAR_CITIES.map(item => citySlug(item.city)));
    const pageLang = langOfPath(this.router.url);
    const lang: SeoLang | null = pageLang && langs.includes(pageLang) ? pageLang : null;
    const enPath = ramadanCityPath(city);
    this.languageLinks = langs.length
      ? (['en', ...langs] as Array<'en' | SeoLang>).filter(code => code !== (lang ?? 'en'))
        .map(code => ({ lang: code, label: LANG_LABELS[code], link: code === 'en' ? enPath : langPath(code, enPath) }))
      : [];
    const site = 'https://salah-times.in';
    const alternates: Array<[string, string]> = langs.length
      ? [['en', site + enPath], ...langs.map(code => [code, site + langPath(code, enPath)] as [string, string]), ['x-default', site + enPath]]
      : [];

    if (lang) {
      await this.localise(lang, city, range, alternates);
    } else {
      const meta = ramadanCityMeta(city, this.rows, this.today);
      this.seo.apply({ title: meta.title, description: meta.description, canonicalPath: enPath });
      this.seo.setSchema(SCHEMA_ID, ramadanCitySchema(city, meta, this.faq));
      this.seo.setAlternates(alternates);
    }
    this.loading = false;
  }

  /** CR-028: the Urdu / Arabic page — same rows and times as the English page, text from seo-content-i18n. */
  private async localise(lang: SeoLang, city: SalahLocationCity, range: RamadanRange, alternates: Array<[string, string]>): Promise<void> {
    const names = await this.pages.localNames();
    const ctx = { city: localCityName(lang, city, names), country: localCountryName(lang, city.country) };
    const local = this.rows.map(row => ({ day: row.day, dateText: localDate(lang, row.date, false), sehri: row.sehri, iftar: row.iftar, depends: row.depends }));
    const todayLocal = this.today ? local[this.today.day - 1] : null;
    const startText = localDate(lang, this.rows[0].date);
    const last = this.rows[range.lastDayDepends ? this.rows.length - 2 : this.rows.length - 1];
    const { method, madhab } = this.pages.methodOf(city);
    const page = localRamadanPage(lang, ctx, this.year, RAMADAN.hijriYear, startText, local[0], localDate(lang, last.date), method, madhab);
    const meta = localRamadanMeta(lang, ctx, this.year, startText, local[0], todayLocal, this.rows.length);

    this.cityName = ctx.city;
    this.heading = page.heading;
    this.intro = page.intro;
    this.faq = page.faq;
    this.todayText = this.today ? localDate(lang, this.today.date) : '';
    // The table shows the page language's clock text ("5:29 صبح" / "5:29 ص").
    this.rows = this.rows.map((row, index) => ({ ...row, dateText: local[index].dateText, sehri: localClock(lang, row.sehri), iftar: localClock(lang, row.iftar) }));
    this.today = this.today ? this.rows[this.today.day - 1] : null;
    const allCities = await this.pages.cities();
    this.nearby = nearbyCities(city, allCities.filter(other => other.country === city.country
      && cityLangs(other, HOME_POPULAR_CITIES.map(item => citySlug(item.city))).includes(lang)), 12)
      .map(other => ({ name: localCityName(lang, other, names), link: langPath(lang, ramadanCityPath(other)) }));
    this.cityLink = [langPath(lang, cityRoute(city).join('/'))];
    this.labels = {
      home: 'SalahTime', list: lang === 'ur' ? 'سحری و افطار' : 'إمساكية رمضان',
      todayTitle: todayLocal ? page.todayTitle(todayLocal.day) : '', todayLine: todayLocal ? page.todayLine(todayLocal) : '',
      tableTitle: page.tableTitle, heads: [...page.heads], footnote: page.footnote, faqTitle: page.faqTitle,
      nearbyTitle: page.nearbyTitle, prayerLink: page.prayerLink,
      otherCities: lang === 'ur' ? 'دوسرے شہروں میں سحری و افطار' : 'إمساكية رمضان في مدن أخرى',
    };

    this.seo.apply({ title: meta.title, description: meta.description, canonicalPath: langPath(lang, ramadanCityPath(city)) });
    this.seo.setSchema(SCHEMA_ID, { '@context': 'https://schema.org', ...faqPageSchema(page.faq) });
    this.seo.setAlternates(alternates);
  }
}
