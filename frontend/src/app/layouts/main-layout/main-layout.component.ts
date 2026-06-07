import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';
import { SettingsService } from 'src/app/services/settings.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { AppUpdateInfo } from 'src/app/models/app-update.model';
import { MenuConfigItem } from 'src/app/models/menu-config.model';
import { AppUpdateService } from 'src/app/services/app-update.service';
import { MenuConfigService } from 'src/app/services/menu-config.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly menuLabelFallbacks: Record<string, string> = {
    'MENU.TASBIH': 'Tasbih',
    'MENU.TASBIH_SHORTCUT': 'Tasbih shortcut'
  };

  appVersion = environment.appVersion;
  showLocationDialog = false;
  showLanguageDialog = false;
  selectedCity: any;
  updateInfo: AppUpdateInfo | null = null;
  showUpdateDialog = false;
  isUpdateInProgress = false;
  updateError = '';
  sidebarMenuItems: MenuConfigItem[] = [];
  shortcutMenuItems: MenuConfigItem[] = [];
  isSuperAdmin = false;
  isLoggedIn = false;
  loggedInUserName = '';
  loggedInUserLocation = '';
  loggedInUserImage = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private settingsService: SettingsService,
    private router: Router,
    private appUpdateService: AppUpdateService,
    private menuConfigService: MenuConfigService,
    public i18n: AppTranslateService,
    private localStorageService: LocalStorageService
  ) {
    this.settingsService.init();
  }

  async ngOnInit() {
    this.document.body.classList.remove('auth-route');
    this.document.body.style.paddingBottom = '';

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.hydrateAuthState();
        this.hydrateRoleState();
        this.closeMenu();
        this.scrollToTop();
      });

    const current = this.settingsService.getCurrentSettings();

    if (current?.city) {
      this.selectedCity = current.city;
      this.showLocationDialog = false;
    } else {
      await this.createNotificationChannel();
    }

    this.checkForUpdates();
    this.hydrateAuthState();
    this.hydrateRoleState();
    this.loadMenuConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeMenu(): void {
    this.document.body.classList.remove('sidebar-open');
  }

  dismissUpdate(): void {
    if (!this.updateInfo?.mandatory) {
      this.showUpdateDialog = false;
    }
  }

  ignoreUpdate(): void {
    if (!this.updateInfo || this.updateInfo.mandatory) {
      return;
    }

    this.appUpdateService.ignoreUpdate(this.updateInfo.version);
    this.showUpdateDialog = false;
  }

  async installUpdate(): Promise<void> {
    if (!this.updateInfo || this.isUpdateInProgress) {
      return;
    }

    this.updateError = '';
    this.isUpdateInProgress = true;

    try {
      await this.appUpdateService.startUpdate(this.updateInfo);
    } catch (error) {
      this.updateError = error instanceof Error
        ? error.message
        : this.i18n.translateWithParams('UPDATE.ERROR_START', {});
    } finally {
      this.isUpdateInProgress = false;
    }
  }

  openUpdateDialog(): void {
    if (this.updateInfo) {
      this.showUpdateDialog = true;
      this.updateError = '';
    }
  }

  openLanguageDialog(): void {
    this.showLanguageDialog = true;
  }

  logout(): void {
    this.localStorageService.removeItem('accessToken');
    this.localStorageService.removeItem('userInfo');
    this.isLoggedIn = false;
    this.isSuperAdmin = false;
    this.loggedInUserName = '';
    this.loggedInUserLocation = '';
    this.loggedInUserImage = '';
    this.closeMenu();
    void this.router.navigate(['/login']);
  }

  closeLanguageDialog(): void {
    this.showLanguageDialog = false;
  }

  resolveMenuLabel(labelKey: string): string {
    const translated = this.i18n.translateWithParams(labelKey, {});
    if (translated && translated !== labelKey) {
      return translated;
    }

    return this.menuLabelFallbacks[labelKey] ?? labelKey;
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.document.documentElement.scrollTop = 0;
    this.document.body.scrollTop = 0;

    const content = this.document.querySelector('.adminuiux-content');
    if (content instanceof HTMLElement) {
      content.scrollTop = 0;
    }

    const mainContent = this.document.getElementById('main-content');
    if (mainContent instanceof HTMLElement) {
      mainContent.scrollTop = 0;
    }
  }

  private checkForUpdates(): void {
    this.appUpdateService.checkForUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => {
        this.updateInfo = update;
        this.showUpdateDialog = !!update && this.appUpdateService.shouldShowUpdate(update);
      });
  }

  private loadMenuConfig(): void {
    this.menuConfigService.getMenuConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        const sidebarItems = (config.sidebar ?? []).filter((item) => item.enabled);
        this.sidebarMenuItems = this.isSuperAdmin
          ? [
              ...sidebarItems,
              {
                code: 'manage-menu',
                labelKey: 'MENU.MANAGE_MENU',
                icon: 'bi-sliders2',
                route: '/manage-menu',
                enabled: true
              }
            ]
          : sidebarItems;
        this.shortcutMenuItems = (config.shortcuts ?? []).filter((item) => item.enabled);
      });
  }

  private hydrateAuthState(): void {
    this.isLoggedIn = this.localStorageService.hasNonEmptyItem('accessToken');

    const userInfo = this.localStorageService.getItem<{
      firstname?: string;
      lastname?: string;
      image?: string;
      imagePath?: string;
      pincode?: string;
    }>('userInfo');

    const firstName = (userInfo?.firstname ?? '').trim();
    const lastName = (userInfo?.lastname ?? '').trim();
    this.loggedInUserName = `${firstName} ${lastName}`.trim() || 'User';
    this.loggedInUserLocation = (userInfo?.pincode ?? '').trim();

    const image = (userInfo?.image ?? '').trim();
    const imagePath = (userInfo?.imagePath ?? '').trim();
    this.loggedInUserImage = image && imagePath ? `${imagePath}${image}` : '';
  }

  private hydrateRoleState(): void {
    const userInfo = this.localStorageService.getItem<{ customerTypeId?: number; id_customer_type?: number }>('userInfo');
    const customerTypeId = Number(userInfo?.customerTypeId ?? userInfo?.id_customer_type ?? 0);
    this.isSuperAdmin = customerTypeId === 1;
  }

  private async createNotificationChannel() {
    try {
      await LocalNotifications.createChannel({
        id: environment.notificationChannelId,
        name: this.i18n.translateWithParams('NOTIFICATION_CHANNEL.NAME', {}),
        description: this.i18n.translateWithParams('NOTIFICATION_CHANNEL.DESCRIPTION', {}),
        importance: 5,
        vibration: true
      });
    } catch {}
  }
}
