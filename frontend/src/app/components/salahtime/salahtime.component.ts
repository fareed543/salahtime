import { DOCUMENT, KeyValue } from '@angular/common';
import { Component, HostListener, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import * as moment from 'moment-hijri';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, filter, firstValueFrom, Subscription } from 'rxjs';
import { getSalahDetail, isFriday, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { DialogService } from 'src/app/services/dialog.service';
import { LocationService } from 'src/app/services/location.service';
import { NotificationService, SalahReminderPreference } from 'src/app/services/notification.service';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';
import { MatDialog } from '@angular/material/dialog';
import { AzanReminderDialogComponent } from 'src/app/shared/azan-reminder-dialog/azan-reminder-dialog.component';

@Component({
  selector: 'app-salahtime',
  templateUrl: './salahtime.component.html',
  styleUrls: ['./salahtime.component.scss']
})
export class SalahtimeComponent implements OnInit, OnDestroy {
  readonly siteUrl = 'https://salah-times.in';
  readonly seoTargetCities = new Set(['bengaluru', 'pune', 'hyderabad', 'thrissur', 'mangaluru', 'bhopal']);
  readonly salahNameKeys: Partial<Record<SalahKey, string>> = {
    sahri: 'SAHRI',
    fajr: 'FAJR',
    tulu: 'DASHBOARD.SALAH_NAMES.TULU',
    ishraq: 'ISHRAQ',
    chast: 'CHAST',
    zawal: 'ZAWAL',
    dhuhr: 'DHUHR',
    asr: 'ASR',
    gurub: 'DASHBOARD.SALAH_NAMES.GURUB',
    iftar: 'IFTAR',
    maghrib: 'MAGHRIB',
    awabin: 'AWABIN',
    isha: 'ISHA',
    tahajjud: 'TAHAJJUD'
  };
  currentSalah: SalahKey | null = null;
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;
  activeDate = new Date();

  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;
  showSettingsDialog = false;
  reminderPreferences: Partial<Record<SalahKey, SalahReminderPreference>> = {};
  selectedSeoCity: any = null;
  supportedCities: any[] = [];
  isDesktopView = false;

  private lastLocation: { lat: number; lng: number } | null = null;
  private isCalculated = false;

  private subs = new Subscription();
  private highlightTimer?: any;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone,
    private dialogService: DialogService,
    private matDialog: MatDialog,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private notificationService: NotificationService,
    private i18n: AppTranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  originalOrder = (
    a: KeyValue<SalahKey, SalahTime>,
    b: KeyValue<SalahKey, SalahTime>
  ): number => {
    const order: SalahKey[] = [
      'tahajjud', 'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
      'dhuhr', 'asr', 'gurub', 'iftar', 'maghrib',
      'awabin', 'isha'
    ];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  async ngOnInit() {
    this.updateViewportState();
    this.loadReminderPreferences();
    const locations = await firstValueFrom(this.locationService.getLocationsList());
    this.supportedCities = locations.filter((location, index, all) =>
      all.findIndex(candidate => this.citySlug(candidate.city) === this.citySlug(location.city)) === index
    );

    const citySlug = this.route.snapshot.paramMap.get('city');
    if (citySlug) {
      const city = this.supportedCities.find(location => this.citySlug(location.city) === citySlug);
      if (city) {
        this.applyCity(city);
        this.listenToSettings();
        this.listenToCityRouteChanges();
        return;
      }

      await this.router.navigate(['/prayer-times'], { replaceUrl: true });
    }

    const current = this.settingsService.getCurrentSettings();
    if (current?.location?.source === 'manual' && current.location.city) {
      this.updateSeo(current.location.city);
      this.listenToSettings();
      this.listenToCityRouteChanges();
      this.syncCityUrl(current.location.city);
      return;
    }

    this.updateSeo();
    this.listenToCityRouteChanges();
    await this.requestLocationFirst();
  }

  @HostListener('window:resize')
  updateViewportState(): void {
    this.isDesktopView = (this.document.defaultView?.innerWidth ?? 0) >= 992;
  }

  private listenToCityRouteChanges(): void {
    const routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('city');
      if (!slug) {
        return;
      }

      const currentSlug = this.settingsService.getCurrentSettings()?.location?.source === 'manual'
        ? this.citySlug(this.settingsService.getCurrentSettings()?.location?.city?.city ?? '')
        : null;
      if (currentSlug === slug) {
        return;
      }

      const city = this.supportedCities.find(location => this.citySlug(location.city) === slug);
      if (city) {
        this.applyCity(city);
      }
    });
    this.subs.add(routeSub);
  }

  private applyCity(city: any): void {
    const current = this.settingsService.getCurrentSettings();
    this.settingsService.updateSettings({
      ...current,
      locationMode: 'manual',
      location: { source: 'manual', city },
      city
    });
    this.updateSeo(city);
  }

  private async requestLocationFirst() {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        this.ngZone.run(() => {
          this.listenToSettings();
        });
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      }

      this.ngZone.run(() => { this.useCurrentLocation(); });
    } catch (error) {
      this.ngZone.run(() => {
        this.listenToSettings();
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.highlightTimer) {
      clearInterval(this.highlightTimer);
    }
  }

  async useCurrentLocation(): Promise<void> {
    try {
      const resolved = await this.locationService.resolveEffectiveLocation(true);
      const selection: LocationSelection = resolved.selection;
      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          locationMode: 'auto',
          location: selection,
          city: selection.city
        });
      }
    } catch (err) {
      console.warn(this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_ACCESS_FAILED', {}), err);
    } finally {
      this.listenToSettings();
      this.loading = false;
    }
  }

  private listenToSettings() {
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0)
      )
      .subscribe(settings => {
        if (!settings) {
          return;
        }
        this.settings = settings;
        if (settings.location?.source === 'manual' && settings.location.city) {
          this.updateSeo(settings.location.city);
          this.syncCityUrl(settings.location.city);
        }
        this.getLocationAndTimes();
      });

    this.subs.add(sub);
  }

  async getLocationAndTimes(showLoader = true) {
    if (showLoader) {
      this.loading = true;
    }
    this.errorMessage = null;
    this.isCalculated = false;

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error(this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_NOT_SET', {}));
      }

      const lat = location.city.coordinates.latitude;
      const lng = location.city.coordinates.longitude;

      this.ngZone.run(() => {
        this.lastLocation = { lat, lng };
        this.recalculateIfReady(showLoader);
      });
    } catch (error) {
      this.ngZone.run(() => {
        if (showLoader) {
          this.loading = false;
        }
        this.handleLocationError();
      });
    }
  }

  private recalculateIfReady(showLoader = true) {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    setTimeout(() => {
      this.computeSalahTimes(
        this.lastLocation!.lat,
        this.lastLocation!.lng,
        showLoader
      );
    });
  }

  private computeSalahTimes(lat: number, lng: number, showLoader = true) {
    try {
      const country = this.settings?.location?.city?.country;
      const tzOffset = country === 'India'
        ? 5.5
        : country === 'Saudi Arabia'
          ? 3
          : -new Date().getTimezoneOffset() / 60;
      const date = new Date(this.activeDate);

      const methodId = this.settings!.calculationMethod ?? 'karachi';
      const madhab = this.settings!.madhab ?? 'Hanafi';

      const times = this.waqtService.getTimes(
        date,
        lat,
        lng,
        tzOffset,
        methodId,
        madhab,
        {
          sahriOffset: this.settings!.sahriOffset,
          fajrOffset: this.settings!.fajrOffset,
          dhuhrOffset: this.settings!.dhuhrOffset,
          asrOffset: this.settings!.asrOffset,
          iftarOffset: this.settings!.iftarOffset,
          maghribOffset: this.settings!.maghribOffset,
          ishaOffset: this.settings!.ishaOffset
        }
      );

      const parsed: Record<SalahKey, SalahTime> = {} as any;

      (Object.keys(times) as SalahKey[]).forEach(key => {
        parsed[key] = {
          start: new Date(times[key].start),
          end: new Date(times[key].end),
          type: times[key].type,
          icon: times[key].icon,
          color: times[key].color
        };
      });

      this.ngZone.run(() => {
        this.salahTimeList = parsed;
        if (showLoader) {
          this.loading = false;
        }
      });
    } catch (error) {
      this.ngZone.run(() => {
        if (showLoader) {
          this.loading = false;
        }
        this.errorMessage = this.i18n.translateWithParams('DASHBOARD.ERRORS.FAILED_TO_CALCULATE', {});
      });
    }
  }

  get formattedGregorianDate(): string {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }).format(this.activeDate);
  }

  get formattedHijriDate(): string {
    const hijriParts = this.getHijriDateParts(this.activeDate);

    return this.i18n.formatHijriDate(hijriParts);
  }

  shiftActiveDate(days: number): void {
    const next = new Date(this.activeDate);
    next.setDate(next.getDate() + days);
    this.activeDate = next;
    this.getLocationAndTimes(false);
  }

  citySlug(city: string): string {
    return city
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  get seoLocationName(): string {
    if (!this.selectedSeoCity) {
      return 'your city';
    }

    return this.selectedSeoCity.city;
  }

  get seoLocationContext(): string {
    if (!this.selectedSeoCity) {
      return 'supported cities across India';
    }

    const parts = [this.selectedSeoCity.state, this.selectedSeoCity.country].filter(Boolean);
    return parts.length ? `${this.selectedSeoCity.city}, ${parts.join(', ')}` : this.selectedSeoCity.city;
  }

  get seoIntroTitle(): string {
    return this.selectedSeoCity
      ? `${this.selectedSeoCity.city} Prayer Times Today`
      : 'Prayer Times Today by City';
  }

  get seoIntroDescription(): string {
    return this.selectedSeoCity
      ? `Check today's prayer times in ${this.seoLocationContext} including Fajr, Dhuhr, Asr, Maghrib, Isha, Ishraq, Chasht, Zawal and Tahajjud timings.`
      : 'Check today\'s prayer times, current namaz timing, azan time, Ishraq, Chasht, Zawal and Tahajjud timings by city.';
  }

  get seoFocusHeading(): string {
    return this.selectedSeoCity
      ? `More prayer timing details for ${this.selectedSeoCity.city}`
      : 'Popular prayer timing searches we support';
  }

  get currentMethodLabel(): string {
    const method = this.settings?.calculationMethod ?? 'karachi';
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  get currentMadhabLabel(): string {
    return this.settings?.madhab ?? 'Hanafi';
  }

  get indianSupportedCities(): any[] {
    return this.supportedCities.filter(city => city.country === 'India');
  }

  get prayerTableRows(): Array<{
    date: Date;
    dateLabel: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    tahajjud: string;
  }> {
    if (!this.settings?.location?.city?.coordinates) {
      return [];
    }

    const baseDate = new Date(this.activeDate);
    const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    const rows = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
      const times = this.getTimesForDate(date);
      rows.push({
        date,
        dateLabel: this.formatTableDate(date),
        fajr: this.formatPrayerTime(times.fajr.start),
        sunrise: this.formatPrayerTime(times.tulu.start),
        dhuhr: this.formatPrayerTime(times.dhuhr.start),
        asr: this.formatPrayerTime(times.asr.start),
        maghrib: this.formatPrayerTime(times.maghrib.start),
        isha: this.formatPrayerTime(times.isha.start),
        tahajjud: this.formatPrayerTime(times.tahajjud.start)
      });
    }

    return rows;
  }

  printPrayerTable(): void {
    const printWindow = this.document.defaultView?.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      return;
    }

    const locationCity = this.selectedSeoCity?.city || this.settings?.location?.city?.city || 'Selected city';
    const locationState = this.selectedSeoCity?.state || this.settings?.location?.city?.state || '';
    const locationCountry = this.selectedSeoCity?.country || this.settings?.location?.city?.country || 'India';
    const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(this.activeDate);
    const title = `Prayer times in ${locationCity}, ${locationState}, ${locationCountry} - ${monthLabel}`;
    const subtitleParts = [locationCity, locationState, locationCountry].filter(Boolean);
    const timeFormatLabel = (this.settings?.timeFormat ?? '12h') === '24h' ? '24-Hour Format' : '12-Hour Format';
    const logoUrl = `${this.document.defaultView?.location.origin ?? this.siteUrl}/assets/images/logo.png`;
    const printDocumentTitle = `SalahTime - Your Salah companion - ${locationCity} - ${monthLabel}`;
    const rowsHtml = this.prayerTableRows
      .map((row, index) => `
        <tr class="${this.isCurrentDateRow(row.date) ? 'is-current' : ''} ${index % 2 === 0 ? 'is-striped' : ''}">
          <td>${this.escapeHtml(this.formatPrintDate(row.date))}</td>
          <td>${this.escapeHtml(row.fajr)}</td>
          <td>${this.escapeHtml(row.sunrise)}</td>
          <td>${this.escapeHtml(row.dhuhr)}</td>
          <td>${this.escapeHtml(row.asr)}</td>
          <td>${this.escapeHtml(row.maghrib)}</td>
          <td>${this.escapeHtml(row.isha)}</td>
          <td>${this.escapeHtml(row.tahajjud)}</td>
        </tr>
      `)
      .join('');

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${this.escapeHtml(printDocumentTitle)}</title>
    <style>
      @page { size: A4; margin: 10mm 10mm 9mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        background: #ffffff;
      }
      .sheet {
        width: 100%;
      }
      .topbar {
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand img {
        width: 38px;
        height: 38px;
        object-fit: contain;
        border-radius: 10px;
      }
      .brand-title {
        font-size: 16px;
        font-weight: 700;
        margin: 0 0 2px;
      }
      .brand-copy {
        margin: 0;
        font-size: 10px;
        line-height: 1.35;
        color: #6b7280;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 19px;
        line-height: 1.2;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #d1d5db;
      }
      .meta-label {
        display: block;
        margin-bottom: 3px;
        font-size: 10px;
        color: #6b7280;
      }
      .meta-value {
        font-size: 11px;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 10.5px;
      }
      thead th {
        padding: 5px 5px;
        text-align: left;
        font-size: 10.5px;
        font-weight: 700;
        color: #111827;
      }
      tbody td {
        padding: 4px 5px;
        vertical-align: middle;
        line-height: 1.15;
      }
      tbody tr.is-striped td {
        background: #ececec;
      }
      tbody td:nth-child(even) {
        background-color: rgba(0, 0, 0, 0.028);
      }
      tbody tr.is-striped td:nth-child(even) {
        background-color: #e3e3e3;
      }
      tbody tr.is-current td {
        background: #16a571;
        color: #ffffff;
        font-weight: 700;
      }
      tbody tr.is-current td:nth-child(even) {
        background: #149566;
      }
      td:first-child, th:first-child {
        width: 18%;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #d1d5db;
        font-size: 10px;
        color: #6b7280;
      }
      .footer strong {
        color: #0f5f4d;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="topbar">
        <div class="brand">
          <img src="${this.escapeHtml(logoUrl)}" alt="SalahTime logo">
          <div>
            <p class="brand-title">SalahTime</p>
            <p class="brand-copy">Prayer times. Quran. Adhan.<br>Qibla. Dhikr. Academy.</p>
          </div>
        </div>
      </section>

      <h1>${this.escapeHtml(title)}</h1>

      <section class="meta">
        <div><span class="meta-label">Month</span><span class="meta-value">${this.escapeHtml(monthLabel)}</span></div>
        <div><span class="meta-label">Calculation method</span><span class="meta-value">${this.escapeHtml(this.currentMethodLabel)}</span></div>
        <div><span class="meta-label">Asr juristic</span><span class="meta-value">${this.escapeHtml(this.currentMadhabLabel)}</span></div>
        <div><span class="meta-label">Time format</span><span class="meta-value">${this.escapeHtml(timeFormatLabel)}</span></div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Fajr</th>
            <th>Sunrise</th>
            <th>Dhuhr</th>
            <th>Asr</th>
            <th>Maghrib</th>
            <th>Isha</th>
            <th>Tahajjud</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <footer class="footer">
        <span>${this.escapeHtml(subtitleParts.join(', '))}</span>
        <strong>salah-times.in</strong>
      </footer>
    </main>
    <script>
      window.addEventListener('load', () => {
        window.print();
        window.addEventListener('afterprint', () => window.close());
      });
    </script>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  isCurrentDateRow(date: Date): boolean {
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  get seoFocusItems(): Array<{ title: string; body: string }> {
    const city = this.seoLocationName;
    const location = this.seoLocationContext;

    return [
      {
        title: `Zawal time today in ${city}`,
        body: `View today's Zawal time in ${location}. Zawal is the short period around solar noon before Dhuhr starts, and many people search it to avoid makruh prayer time.`
      },
      {
        title: `Chasht namaz time today in ${city}`,
        body: `Find Chasht namaz time today in ${location}. Chasht, also called Duha prayer, is prayed after Ishraq and before Dhuhr, so this page helps you check that window quickly.`
      },
      {
        title: `Ishraq time today in ${city}`,
        body: `Check Ishraq time today in ${location}. Ishraq starts shortly after sunrise, and many users search for it separately from the regular Fajr and sunrise timings.`
      },
      {
        title: `Tahajjud time today in ${city}`,
        body: `See Tahajjud time today in ${location}. Tahajjud is the late-night prayer before Fajr, and this page helps you track the best prayer window before dawn.`
      }
    ];
  }

  get seoFaqItems(): Array<{ question: string; answer: string }> {
    const city = this.seoLocationName;
    const location = this.seoLocationContext;

    return [
      {
        question: `What is the prayer time today in ${city}?`,
        answer: `This page shows today's prayer times in ${location}, including Fajr, Dhuhr, Asr, Maghrib and Isha with the current daily schedule.`
      },
      {
        question: `What is Zawal time today in ${city}?`,
        answer: `Zawal time is the short period around midday before Dhuhr. Use this page to check today's Zawal timing in ${location}.`
      },
      {
        question: `What is Ishraq time today in ${city}?`,
        answer: `Ishraq time starts shortly after sunrise. This page lists today's Ishraq time in ${location} along with the other salah timings.`
      },
      {
        question: `What is Tahajjud time today in ${city}?`,
        answer: `Tahajjud is offered in the night before Fajr, especially in the last third of the night. This page helps you check today's Tahajjud window in ${location}.`
      }
    ];
  }

  private syncCityUrl(city: any): void {
    const slug = this.citySlug(city.city);
    if (this.route.snapshot.paramMap.get('city') !== slug) {
      this.router.navigate(['/prayer-times', slug], { replaceUrl: true });
    }
  }

  private updateSeo(city?: any): void {
    this.selectedSeoCity = city ?? null;
    const pageUrl = city
      ? `${this.siteUrl}/prayer-times/${this.citySlug(city.city)}`
      : `${this.siteUrl}/prayer-times`;
    const pageTitle = city
      ? `${city.city} Prayer Times Today: Fajr, Zuhr, Asr, Maghrib & Isha | SalahTime`
      : 'Prayer Times Today by City, Namaz Timing & Azan Time | SalahTime';
    const description = city
      ? `Check today's prayer times in ${city.city}, ${city.state}, ${city.country} including Fajr, Dhuhr (Zuhr), Asr, Maghrib, Isha, Ishraq, Chasht, Zawal and Tahajjud timings.`
      : 'Find today\'s prayer times across Indian cities including Fajr, Dhuhr, Asr, Maghrib, Isha, Ishraq, Chasht, Zawal and Tahajjud timings.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: city
      ? `${city.city} prayer times today, ${city.city} namaz time, ${city.city} azan time, zawal time today, chast namaz time, ishraq time today, tahajjud time today`
      : 'prayer times today, namaz time today, azan time today, zawal time today, chast namaz time, ishraq time today, tahajjud time today'
    });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

    const oldSchema = this.document.getElementById('city-prayer-times-schema');
    oldSchema?.remove();
    if (city) {
      const faqEntities = this.seoFaqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }));
      const schema = this.document.createElement('script');
      schema.id = 'city-prayer-times-schema';
      schema.type = 'application/ld+json';
      schema.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            name: pageTitle,
            description,
            url: pageUrl,
            about: {
              '@type': 'City',
              name: city.city,
              containedInPlace: {
                '@type': 'Country',
                name: city.country
              }
            },
            keywords: [
              `${city.city} prayer times today`,
              `${city.city} namaz time`,
              `${city.city} azan time`,
              'zawal time today',
              'chast namaz time',
              'ishraq time today',
              'tahajjud time today'
            ],
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Prayer Times',
                  item: `${this.siteUrl}/prayer-times`
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: city.city,
                  item: pageUrl
                }
              ]
            }
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqEntities
          }
        ]
      });
      this.document.head.appendChild(schema);
    }
  }

  private handleLocationError() {
    this.errorMessage =
      this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_REQUIRED', {});
  }

  canShowSalahDetail(key: SalahKey): boolean {
    return !!getSalahDetail(key, this.activeDate);
  }

  openSalahDetail(key: SalahKey): void {
    const salahTime = this.salahTimeList[key];

    if (!salahTime || !this.canShowSalahDetail(key)) {
      return;
    }

    this.dialogService.openSalahDetail(key, salahTime);
  }

  getSalahDisplayName(key: SalahKey): string {
    if (key === 'dhuhr' && isFriday(this.activeDate)) {
      return this.i18n.translateWithParams('JUMUAH', {});
    }

    const translationKey = this.salahNameKeys[key];
    return translationKey ? this.i18n.translateWithParams(translationKey, {}) : key;
  }

  canShowReminder(key: SalahKey): boolean {
    return this.salahTimeList[key]?.type !== 'makruh';
  }

  getReminderSoundLabel(key: SalahKey): string {
    const preference = this.reminderPreferences[key];
    if (preference?.sound === 'default') {
      return this.i18n.translateWithParams('DASHBOARD.REMINDER.SOUNDS.DEFAULT', {});
    }

    if (preference?.azanId) {
      return preference.azanId
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    return this.i18n.translateWithParams('DASHBOARD.REMINDER.SOUNDS.AZAN', {});
  }

  formatPrayerTime(date: Date): string {
    return this.i18n.formatPrayerTime(date, (this.settings?.timeFormat ?? '12h') !== '24h');
  }

  isReminderEnabled(key: SalahKey): boolean {
    return !!this.reminderPreferences[key]?.enabled;
  }

  async onReminderIconClick(key: SalahKey): Promise<void> {
    if (this.isReminderEnabled(key)) {
      await this.disableReminder(key);
      return;
    }

    const preference = this.notificationService.getReminderPreference(key);
    const dialogRef = this.matDialog.open(AzanReminderDialogComponent, {
      autoFocus: false,
      panelClass: 'azan-reminder-dialog-panel',
      data: {
        selectedAzanId: preference.sound === 'azan' ? (preference.azanId ?? 'default') : 'default',
        salahName: this.getSalahDisplayName(key)
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result?.azanId) {
        return;
      }

      const enabled = await this.notificationService.enableReminderAndSync(key, {
        enabled: true,
        sound: result.azanId === 'default' ? 'default' : 'azan',
        azanId: result.azanId
      });

      if (enabled) {
        this.loadReminderPreferences();
      }
    });
  }

  openSettingsDialog(): void {
    this.showSettingsDialog = true;
  }

  openRoute(route: string): void {
    void this.router.navigate([route]);
  }

  closeSettingsDialog(): void {
    this.showSettingsDialog = false;
  }

  private loadReminderPreferences(): void {
    this.reminderPreferences = this.notificationService.getReminderPreferences();
  }

  private async disableReminder(key: SalahKey): Promise<void> {
    const current = this.notificationService.getReminderPreference(key);
    this.notificationService.setReminderPreference(key, {
      ...current,
      enabled: false
    });
    this.loadReminderPreferences();

    await this.notificationService.syncSalahNotifications();
  }

  private getHijriDateParts(date: Date): { day: number; month: number; year: number } {
    const hijriDate = moment(date).locale('en');
    const day = Number(hijriDate.format('iD'));
    const month = Number(hijriDate.format('iM'));
    const year = Number(hijriDate.format('iYYYY'));

    if (
      Number.isFinite(day) && day > 0 &&
      Number.isFinite(month) && month >= 1 && month <= 12 &&
      Number.isFinite(year) && year > 0
    ) {
      return { day, month, year };
    }

    const fallback = new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);

    const fallbackDay = Number(fallback.find((part) => part.type === 'day')?.value ?? 1);
    const fallbackMonth = Number(fallback.find((part) => part.type === 'month')?.value ?? 1);
    const fallbackYear = Number(fallback.find((part) => part.type === 'year')?.value ?? 1447);

    return {
      day: Number.isFinite(fallbackDay) ? fallbackDay : 1,
      month: Number.isFinite(fallbackMonth) ? fallbackMonth : 1,
      year: Number.isFinite(fallbackYear) ? fallbackYear : 1447
    };
  }

  private getTimesForDate(date: Date): Record<SalahKey, SalahTime> {
    const city = this.settings?.location?.city;
    if (!city || !this.settings) {
      return {} as Record<SalahKey, SalahTime>;
    }

    const tzOffset = city.country === 'India'
      ? 5.5
      : city.country === 'Saudi Arabia'
        ? 3
        : -date.getTimezoneOffset() / 60;

    const times = this.waqtService.getTimes(
      date,
      city.coordinates.latitude,
      city.coordinates.longitude,
      tzOffset,
      this.settings.calculationMethod ?? 'karachi',
      this.settings.madhab ?? 'Hanafi',
      {
        sahriOffset: this.settings.sahriOffset,
        fajrOffset: this.settings.fajrOffset,
        dhuhrOffset: this.settings.dhuhrOffset,
        asrOffset: this.settings.asrOffset,
        iftarOffset: this.settings.iftarOffset,
        maghribOffset: this.settings.maghribOffset,
        ishaOffset: this.settings.ishaOffset
      }
    );

    const parsed: Record<SalahKey, SalahTime> = {} as any;
    (Object.keys(times) as SalahKey[]).forEach(key => {
      parsed[key] = {
        start: new Date(times[key].start),
        end: new Date(times[key].end),
        type: times[key].type,
        icon: times[key].icon,
        color: times[key].color
      };
    });

    return parsed;
  }

  private formatTableDate(date: Date): string {
    const monthDay = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      day: 'numeric'
    }).format(date);
    const weekday = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short'
    }).format(date);

    return `${monthDay} | ${weekday}`;
  }

  private formatPrintDate(date: Date): string {
    const monthDay = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric'
    }).format(date);
    const weekday = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short'
    }).format(date);

    return `${monthDay} ${weekday}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
