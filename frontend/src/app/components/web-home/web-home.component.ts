import { DOCUMENT } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { SalahKey, SalahLocationSelection, SalahSettings } from 'src/app/models/salah.model';
import {
  BLOG_LIST_PATH,
  faqPageSchema,
  HOME_FAQ_ITEMS,
  HOME_INTRO_PARAGRAPHS,
  HOME_INTRO_TITLE,
  HOME_POPULAR_CITIES,
  HOME_TOOL_LINKS,
  MASJID_LIST_PATH,
  prayerPageLinks,
  RAMADAN_LIST_PATH,
  ramadanCityPath
} from 'src/app/seo/seo-content';
import { BlogApiService, BlogCard } from 'src/app/services/blog-api.service';
import { HijriCalendarService } from 'src/app/services/hijri-calendar.service';
import { LocationService } from 'src/app/services/location.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { SettingsDialogComponent, SETTINGS_DIALOG_CONFIG } from 'src/app/shared/dialogs/settings-dialog/settings-dialog.component';
import { defaultPrayerLocation } from 'src/app/utils/default-prayer-location';
import { locationNow, locationOffsetHours } from 'src/app/utils/location-timezone';
import { nextPrayer, timeUntil } from 'src/app/utils/next-prayer';
import { playStoreLink } from 'src/app/utils/play-store-link';
import { WEB_HOME_APP_PERKS, WEB_HOME_FEATURES } from './web-home.features';

/** One prayer card in the hero. */
export interface HomePrayer {
  key: SalahKey;
  nameKey: string;
  time: Date;
  /** Sunrise under Fajr; empty for the others. */
  sub: Date | null;
  next: boolean;
}

const FARZ: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAME_KEYS: Partial<Record<SalahKey, string>> = { fajr: 'FAJR', dhuhr: 'DHUHR', asr: 'ASR', maghrib: 'MAGHRIB', isha: 'ISHA' };

// Next farz prayer and countdown; shared with the website prayer-times page (CR-021). After Isha
// nextPrayer returns null (tomorrow's Fajr is not known here) and the hero shows no countdown.
export { nextPrayer, timeUntil } from 'src/app/utils/next-prayer';

/**
 * NF-020: the website's home page. The Android app keeps the Dashboard (the route only matches on
 * the website). Colours and fonts come from web-home-theme.scss, which the owner changes per season.
 */
@Component({
  selector: 'app-web-home',
  templateUrl: './web-home.component.html',
  styleUrls: ['./web-home-theme.scss', './web-home.component.scss', './web-home-sections.scss', './web-home-content.scss']
})
export class WebHomeComponent implements OnInit, OnDestroy {
  readonly features = WEB_HOME_FEATURES;
  readonly appPerks = WEB_HOME_APP_PERKS;
  readonly masjidListPath = MASJID_LIST_PATH;
  readonly blogListPath = BLOG_LIST_PATH;
  // Same SEO content and FAQ schema id as the Dashboard / prerendered page.
  readonly introTitle = HOME_INTRO_TITLE;
  readonly introParagraphs = HOME_INTRO_PARAGRAPHS;
  readonly toolLinks = HOME_TOOL_LINKS;
  readonly prayerLinks = prayerPageLinks();
  readonly popularCities = HOME_POPULAR_CITIES;
  readonly faqItems = HOME_FAQ_ITEMS;
  private readonly faqSchemaId = 'dashboard-faq-schema';

  prayers: HomePrayer[] = [];
  next: HomePrayer | null = null;
  countdown = { hours: 0, minutes: 0 };
  cityName = '';
  usingDefaultCity = false;
  today = new Date();
  hijriDate = '';
  ramadanLink: string = RAMADAN_LIST_PATH;
  masjids: any[] = [];
  articles: BlogCard[] = [];
  loading = true;

  private settings: SalahSettings | null = null;
  private location: SalahLocationSelection | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private readonly subs = new Subscription();

  constructor(
    private readonly settingsService: SettingsService,
    private readonly waqtService: WaqtService,
    private readonly locationService: LocationService,
    private readonly hijriCalendar: HijriCalendarService,
    private readonly ramadanApi: RamadanApiService,
    private readonly blogApi: BlogApiService,
    private readonly matDialog: MatDialog,
    private readonly router: Router,
    private readonly zone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.addFaqSchema();
    this.hijriCalendar.loadAdjustments().subscribe({ next: () => this.updateHijri(), error: () => this.updateHijri() });
    this.subs.add(this.settingsService.settings$.subscribe(settings => void this.applySettings(settings)));
    this.loadArticles();
    // Same as the Dashboard: reuse a recent position fix and save it when the city changed.
    void this.locationService.refreshAutoLocationIntoSettings().catch(() => undefined);
    // Keep the countdown and the "next" card current.
    this.timer = setInterval(() => this.zone.run(() => this.tick()), 30000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.document.getElementById(this.faqSchemaId)?.remove();
  }

  /** Tracked Play Store link (CR-014 referrer), medium "home". */
  get playLink(): string {
    return playStoreLink('home', this.router.url || '/');
  }

  get hasCountdownHours(): boolean {
    return this.countdown.hours > 0;
  }

  openCityPicker(): void {
    this.matDialog.open(SettingsDialogComponent, SETTINGS_DIALOG_CONFIG);
  }

  masjidLink(masjid: any): string {
    return masjid?.publicPath || `/masjid/${masjid?.id}`;
  }

  masjidPlace(masjid: any): string {
    return [masjid?.area, masjid?.city].filter(Boolean).join(', ');
  }

  formatDistance(km: number | null | undefined): string {
    if (km == null) {
      return '';
    }
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  trackByKey(_: number, prayer: HomePrayer): string {
    return prayer.key;
  }

  private async applySettings(settings: SalahSettings | null): Promise<void> {
    this.settings = settings;
    let location = settings?.location ?? null;
    this.usingDefaultCity = !location;
    if (!location) {
      location = defaultPrayerLocation(await firstValueFrom(this.locationService.getOfflineLocationsList()));
    }
    this.zone.run(() => {
      this.location = location;
      this.cityName = location?.city.displayName || location?.city.city || '';
      this.computeTimes();
      this.ramadanLink = location && (location.city.country ?? '') === 'India'
        ? ramadanCityPath({ city: location.city.city, country: 'India' })
        : RAMADAN_LIST_PATH;
      this.loadMasjids(this.usingDefaultCity ? null : location);
      this.loading = false;
    });
  }

  private computeTimes(): void {
    const location = this.location;
    if (!location) {
      this.prayers = [];
      return;
    }
    const date = new Date();
    const settings = this.settings;
    const times = this.waqtService.getTimes(
      date,
      location.city.coordinates.latitude,
      location.city.coordinates.longitude,
      locationOffsetHours(location, date),
      settings?.calculationMethod ?? 'karachi',
      settings?.madhab ?? 'Hanafi',
      {
        sahriOffset: settings?.sahriOffset,
        fajrOffset: settings?.fajrOffset,
        dhuhrOffset: settings?.dhuhrOffset,
        asrOffset: settings?.asrOffset,
        iftarOffset: settings?.iftarOffset,
        maghribOffset: settings?.maghribOffset,
        ishaOffset: settings?.ishaOffset
      }
    );
    this.prayers = FARZ.map(key => ({
      key,
      nameKey: NAME_KEYS[key]!,
      time: new Date(times[key].start),
      sub: key === 'fajr' && times.tulu ? new Date(times.tulu.start) : null,
      next: false
    }));
    this.tick();
  }

  private tick(): void {
    const now = locationNow(this.location ?? undefined, new Date());
    this.today = now;
    this.next = nextPrayer(this.prayers, now);
    this.prayers.forEach(prayer => (prayer.next = prayer === this.next));
    this.countdown = this.next ? timeUntil(this.next.time, now) : { hours: 0, minutes: 0 };
  }

  private updateHijri(): void {
    try {
      this.hijriDate = this.hijriCalendar.formatHijriDate(new Date());
    } catch {
      this.hijriDate = '';
    }
  }

  private loadMasjids(location: SalahLocationSelection | null): void {
    if (!location) {
      this.masjids = [];
      return;
    }
    const near = { lat: location.city.coordinates.latitude, lng: location.city.coordinates.longitude, radiusKm: 10 };
    this.ramadanApi.masjidList({ near, background: true }).subscribe({
      next: response => {
        const list = Array.isArray(response) ? response : response?.list ?? [];
        this.masjids = list.slice(0, 3);
      },
      error: () => (this.masjids = [])
    });
  }

  private loadArticles(): void {
    this.blogApi.articles({ page: 1 }).subscribe({
      next: page => (this.articles = (page?.items ?? []).slice(0, 4)),
      error: () => (this.articles = [])
    });
  }

  private addFaqSchema(): void {
    this.document.getElementById(this.faqSchemaId)?.remove();
    const schema = this.document.createElement('script');
    schema.id = this.faqSchemaId;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({ '@context': 'https://schema.org', ...faqPageSchema(this.faqItems) });
    this.document.head.appendChild(schema);
  }
}
