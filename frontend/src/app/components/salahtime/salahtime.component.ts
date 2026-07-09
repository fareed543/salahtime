import { DOCUMENT, KeyValue } from '@angular/common';
import { Component, HostListener, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, filter, firstValueFrom, Subscription } from 'rxjs';
import { getSalahDetail, isFriday, isSalahTimingVisible, SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
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

  shouldShowSalahTiming(key: SalahKey): boolean {
    if (!this.isDesktopView) {
      return true;
    }

    return isSalahTimingVisible(this.settings, key);
  }

  isSalahVisible(key: SalahKey): boolean {
    return isSalahTimingVisible(this.settings, key);
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
      hour12: true
    }).format(date);
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
}
