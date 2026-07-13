import { DOCUMENT, KeyValue } from '@angular/common';
import { Component, HostListener, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, filter, firstValueFrom, Subscription } from 'rxjs';
import { getSalahDetail, isFriday, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { DialogService } from 'src/app/services/dialog.service';
import { AppLocation, LocationService } from 'src/app/services/location.service';
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

      await this.router.navigate(['/salahtime'], { replaceUrl: true });
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
      location: { source: 'manual', city }
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
      const loc: AppLocation = await this.locationService.getLocation();
      const selection: LocationSelection = {
        source: 'auto',
        city: {
          city: this.i18n.translateWithParams('DASHBOARD.CURRENT_LOCATION', {}),
          coordinates: {
            latitude: loc.lat,
            longitude: loc.lng
          }
        }
      };
      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          location: selection
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

  async getLocationAndTimes() {
    this.loading = true;
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
        this.recalculateIfReady();
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  private recalculateIfReady() {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    setTimeout(() => {
      this.computeSalahTimes(
        this.lastLocation!.lat,
        this.lastLocation!.lng
      );
    });
  }

  private computeSalahTimes(lat: number, lng: number) {
    try {
      const country = this.settings?.location?.city?.country;
      const tzOffset = country === 'India'
        ? 5.5
        : country === 'Saudi Arabia'
          ? 3
          : -new Date().getTimezoneOffset() / 60;
      const date = new Date();

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
        this.loading = false;
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = this.i18n.translateWithParams('DASHBOARD.ERRORS.FAILED_TO_CALCULATE', {});
      });
    }
  }

  citySlug(city: string): string {
    return city
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private syncCityUrl(city: any): void {
    const slug = this.citySlug(city.city);
    if (this.route.snapshot.paramMap.get('city') !== slug) {
      this.router.navigate(['/salahtime', slug], { replaceUrl: true });
    }
  }

  private updateSeo(city?: any): void {
    this.selectedSeoCity = city ?? null;
    const pageUrl = city
      ? `${this.siteUrl}/salahtime/${this.citySlug(city.city)}`
      : `${this.siteUrl}/salahtime`;
    const pageTitle = city
      ? `Prayer Times in ${city.city}, ${city.country} Today | SalahTime`
      : 'Prayer Times by City | SalahTime';
    const description = city
      ? `Accurate prayer times in ${city.city}, ${city.state}, ${city.country} today. View Fajr, Dhuhr, Asr, Maghrib and Isha salah times.`
      : 'Find today\'s Fajr, Dhuhr, Asr, Maghrib and Isha prayer times for cities across India and Saudi Arabia.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });

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
      const schema = this.document.createElement('script');
      schema.id = 'city-prayer-times-schema';
      schema.type = 'application/ld+json';
      schema.text = JSON.stringify({
        '@context': 'https://schema.org',
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
        }
      });
      this.document.head.appendChild(schema);
    }
  }

  private handleLocationError() {
    this.errorMessage =
      this.i18n.translateWithParams('DASHBOARD.ERRORS.LOCATION_REQUIRED', {});
  }

  canShowSalahDetail(key: SalahKey): boolean {
    return !!getSalahDetail(key, new Date());
  }

  openSalahDetail(key: SalahKey): void {
    const salahTime = this.salahTimeList[key];

    if (!salahTime || !this.canShowSalahDetail(key)) {
      return;
    }

    this.dialogService.openSalahDetail(key, salahTime);
  }

  getSalahDisplayName(key: SalahKey): string {
    if (key === 'dhuhr' && isFriday(new Date())) {
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
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: (this.settings?.timeFormat ?? '12h') !== '24h'
    }).format(date);
  }

  printPrayerTimes(): void {
    if (!this.settings?.location?.city?.coordinates) {
      return;
    }

    const printWindow = this.document.defaultView?.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildPrayerTimesPrintDocument());
    printWindow.document.close();
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

  private buildPrayerTimesPrintDocument(): string {
    const city = this.settings?.location?.city;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(today);
    const locationLabel = [city?.city, city?.state, city?.country].filter(Boolean).join(', ');
    const methodLabel = this.getCalculationMethodLabel(this.settings?.calculationMethod ?? 'karachi');
    const madhabLabel = this.settings?.madhab ?? 'Hanafi';
    const rows = Array.from({ length: daysInMonth }, (_, index) => this.buildPrintRow(new Date(year, month, index + 1))).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prayer times in ${this.escapeHtml(locationLabel)} - ${this.escapeHtml(monthLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, Helvetica, sans-serif;
      color: #153a33;
      background: #f3faf7;
    }
    .sheet {
      max-width: 980px;
      margin: 0 auto;
      background: #fff;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 18px 48px rgba(10, 54, 43, 0.12);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .brand-mark {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #0f5f4d, #17b08d);
      color: #fff;
      font-size: 22px;
      font-weight: 700;
    }
    .brand-copy h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
    }
    .brand-copy p {
      margin: 4px 0 0;
      color: #5d746d;
      font-size: 14px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .meta-card {
      padding: 14px 16px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(23,176,141,0.08), rgba(23,176,141,0.03));
      border: 1px solid rgba(15,95,77,0.08);
    }
    .meta-card strong {
      display: block;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6a7f79;
      margin-bottom: 6px;
    }
    .meta-card span {
      font-size: 15px;
      font-weight: 700;
      color: #143930;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      padding: 12px 10px;
      background: #e5f5ef;
      color: #365850;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-align: left;
      white-space: nowrap;
    }
    tbody td {
      padding: 11px 10px;
      border-bottom: 1px solid rgba(20, 57, 48, 0.08);
      font-size: 13px;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) {
      background: rgba(15, 95, 77, 0.025);
    }
    .footer {
      margin-top: 16px;
      color: #6a7f79;
      font-size: 12px;
      text-align: right;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .sheet {
        max-width: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div class="brand-mark">S</div>
      <div class="brand-copy">
        <h1>Salah Time</h1>
        <p>Prayer times in ${this.escapeHtml(locationLabel)}</p>
      </div>
    </div>
    <div class="meta">
      <div class="meta-card"><strong>Month</strong><span>${this.escapeHtml(monthLabel)}</span></div>
      <div class="meta-card"><strong>Calculation method</strong><span>${this.escapeHtml(methodLabel)}</span></div>
      <div class="meta-card"><strong>Asr juristic</strong><span>${this.escapeHtml(madhabLabel)}</span></div>
    </div>
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
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Generated from Salah Time</div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 150);
    };
  </script>
</body>
</html>`;
  }

  private buildPrintRow(date: Date): string {
    const city = this.settings!.location!.city;
    const country = city.country;
    const tzOffset = country === 'India'
      ? 5.5
      : country === 'Saudi Arabia'
        ? 3
        : -date.getTimezoneOffset() / 60;

    const times = this.waqtService.getTimes(
      date,
      city.coordinates.latitude,
      city.coordinates.longitude,
      tzOffset,
      this.settings!.calculationMethod ?? 'karachi',
      this.settings!.madhab ?? 'Hanafi',
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

    const dateLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(date);

    return `<tr>
      <td>${this.escapeHtml(dateLabel)}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.fajr.start))}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.tulu.start))}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.dhuhr.start))}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.asr.start))}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.maghrib.start))}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.isha.start))}</td>
      <td>${this.escapeHtml(this.formatPrayerTime(times.tahajjud.start))}</td>
    </tr>`;
  }

  private getCalculationMethodLabel(methodId: string): string {
    const labels: Record<string, string> = {
      mwl: 'Muslim World League',
      isna: 'Islamic Society of North America',
      egypt: 'Egyptian General Authority of Survey',
      karachi: 'Islamic University, Karachi',
      makkah: 'Umm Al-Qura, Makkah',
      gulf: 'Gulf Region',
      mcc: 'Muslim World League / Moonsighting',
      fcna: 'Fiqh Council of North America',
      jakim: 'JAKIM, Malaysia',
      diyanet: 'Diyanet, Turkey',
      muis: 'MUIS, Singapore',
      tehran: 'Institute of Geophysics, Tehran',
      kuwait: 'Kuwait',
      qatar: 'Qatar'
    };

    return labels[methodId] ?? methodId;
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
