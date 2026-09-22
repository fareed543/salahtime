import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NavigationEnd, Router } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';
import { LocalStorageService } from './services/local-storage.service';
import { LocationService } from './services/location.service';
import { NotificationService } from './services/notification.service';
import { PrayerNotificationSyncService } from './services/prayer-notification-sync.service';
import { SeoService } from './services/seo.service';
import { SettingsService } from './services/settings.service';
import { SpinnerService } from './services/spinner.service';
import { AppTranslateService } from './services/translate.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  readonly onboardingFlagKey = 'mobile_onboarding_completed';
  private readonly startupStepTimeoutMs = 7000;
  readonly isNativeApp = Capacitor.isNativePlatform();
  private lastScrollTop = 0;
  initialized = !this.isNativeApp;
  showOnboarding = false;
  startupMessage = 'Preparing SalahTime...';
  startupProgress = 8;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private notificationService: NotificationService,
    private prayerSyncService: PrayerNotificationSyncService,
    private seoService: SeoService,
    private analyticsService: AnalyticsService,
    private localStorageService: LocalStorageService,
    private spinnerService: SpinnerService,
    private i18n: AppTranslateService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.isNativeApp) {
      this.loadTemplateStyles();
    }

    this.seoService.init();
    this.analyticsService.init();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && (this.isNativeApp || this.router.url.split(/[?#]/, 1)[0] !== '/')) {
        this.loadTemplateStyles();
      }
    });

    await this.runStartupStep('Loading language...', 20, () => this.i18n.init());
    await this.runStartupStep('Loading settings...', 36, () => this.settingsService.init());
    this.showOnboarding = this.shouldShowMobileOnboarding();

    if (this.isNativeApp && !this.showOnboarding) {
      await this.runStartupStep('Preparing notifications...', 52, () => this.notificationService.ensureDefaultNotificationChannel());
      await this.runStartupStep(
        'Preparing location...',
        68,
        () => this.locationService.primeWebLocationOnAppLoad(),
        'Unable to prepare location on app launch'
      );
      await this.runStartupStep(
        'Checking notification permission...',
        82,
        () => this.notificationService.ensurePermissionOnLaunchIfNeeded()
      );
      await this.runStartupStep('Syncing prayer reminders...', 94, () => this.prayerSyncService.syncOnLaunch());
      this.prayerSyncService.startDailyRefreshWatcher();
    }

    this.setStartupProgress('Opening dashboard...', 100);
    this.initialized = true;
    this.applyThemeScrollState();
    this.spinnerService.reset();
  }

  async onOnboardingCompleted(): Promise<void> {
    this.showOnboarding = false;
    this.prayerSyncService.startDailyRefreshWatcher();
    void this.prayerSyncService.syncOnLaunch('onboarding-complete');
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.applyThemeScrollState();
  }

  @HostListener('document:visibilitychange')
  async onVisibilityChange(): Promise<void> {
    if (!this.document.hidden && this.initialized && !this.showOnboarding) {
      await this.prayerSyncService.syncOnResume();
    }
  }

  private loadTemplateStyles(): void {
    if (this.document.getElementById('adminuiux-template-css')) {
      return;
    }

    const link = this.document.createElement('link');
    link.id = 'adminuiux-template-css';
    link.rel = 'stylesheet';
    link.href = 'assets/css/app.css';
    this.document.head.appendChild(link);
  }

  private applyThemeScrollState(): void {
    const body = this.document.body;
    const scrollTop = this.document.defaultView?.scrollY
      ?? this.document.documentElement.scrollTop
      ?? body.scrollTop
      ?? 0;
    const maxScrollableTop = this.document.documentElement.scrollHeight - 50;
    const header = this.document.querySelector('.adminuiux-header');

    if (scrollTop > 30) {
      header?.classList.add('active');
    } else {
      header?.classList.remove('active');
    }

    if (scrollTop + this.document.documentElement.clientHeight > maxScrollableTop || scrollTop < 50) {
      body.classList.add('scrollup');
      body.classList.remove('scrolldown');
      this.lastScrollTop = scrollTop;
      return;
    }

    if (scrollTop > this.lastScrollTop) {
      body.classList.add('scrolldown');
      body.classList.remove('scrollup');
    } else {
      body.classList.add('scrollup');
      body.classList.remove('scrolldown');
    }

    this.lastScrollTop = scrollTop;
  }

  private shouldShowMobileOnboarding(): boolean {
    return this.isNativeApp && !this.localStorageService.hasNonEmptyItem(this.onboardingFlagKey);
    // return !this.localStorageService.hasNonEmptyItem(this.onboardingFlagKey);
  }

  private async runStartupStep(
    message: string,
    progress: number,
    task: () => Promise<unknown>,
    warningMessage = `Startup step failed: ${message}`
  ): Promise<void> {
    this.setStartupProgress(message, progress);

    try {
      await this.withStartupTimeout(task(), message);
    } catch (error) {
      console.warn(warningMessage, error);
    }
  }

  private setStartupProgress(message: string, progress: number): void {
    this.startupMessage = message;
    this.startupProgress = progress;
  }

  private async withStartupTimeout<T>(task: Promise<T>, label: string): Promise<T | void> {
    let timeoutId: number | undefined;
    const timeout = new Promise<void>((resolve) => {
      timeoutId = window.setTimeout(() => {
        console.warn(`Startup step timed out: ${label}`);
        resolve();
      }, this.startupStepTimeoutMs);
    });

    const result = await Promise.race([task, timeout]);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    return result;
  }
}
