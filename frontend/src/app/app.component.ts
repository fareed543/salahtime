import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AnalyticsService } from './services/analytics.service';
import { LocalStorageService } from './services/local-storage.service';
import { NotificationService } from './services/notification.service';
import { PrayerNotificationSyncService } from './services/prayer-notification-sync.service';
import { SeoService } from './services/seo.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  readonly onboardingFlagKey = 'mobile_onboarding_completed';
  private lastScrollTop = 0;
  initialized = false;
  showOnboarding = false;
  missedPrayerMessage$ = this.prayerSyncService.missedPrayerMessage$;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private prayerSyncService: PrayerNotificationSyncService,
    private seoService: SeoService,
    private analyticsService: AnalyticsService,
    private localStorageService: LocalStorageService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadTemplateStyles();
    this.seoService.init();
    this.analyticsService.init();
    await this.settingsService.init();
    await this.notificationService.ensureDefaultNotificationChannel();
    this.showOnboarding = this.shouldShowMobileOnboarding();

    if (!this.showOnboarding) {
      await this.notificationService.ensurePermissionOnLaunchIfNeeded();
      await this.prayerSyncService.syncOnLaunch();
      this.prayerSyncService.startDailyRefreshWatcher();
    }

    this.initialized = true;
    this.applyThemeScrollState();
  }

  async onOnboardingCompleted(): Promise<void> {
    this.showOnboarding = false;
    await this.prayerSyncService.syncOnLaunch('onboarding-complete');
    this.prayerSyncService.startDailyRefreshWatcher();
  }

  dismissMissedPrayerMessage(): void {
    this.prayerSyncService.clearMissedPrayerMessage();
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
    return Capacitor.isNativePlatform() && !this.localStorageService.hasNonEmptyItem(this.onboardingFlagKey);
    // return !this.localStorageService.hasNonEmptyItem(this.onboardingFlagKey);
  }
}
