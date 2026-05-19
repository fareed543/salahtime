import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';
import { SettingsService } from 'src/app/services/settings.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  appVersion = environment.appVersion;
  showLocationDialog = false;
  selectedCity: any;
  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private settingsService: SettingsService,
    private router: Router
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
        this.closeMenu();
        this.scrollToTop();
      });

    const current = this.settingsService.getCurrentSettings();

    if (current?.city) {
      this.selectedCity = current.city;
      this.showLocationDialog = false;
      return;
    }

    await this.createNotificationChannel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeMenu(): void {
    this.document.body.classList.remove('sidebar-open');
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

  private async createNotificationChannel() {
    try {
      await LocalNotifications.createChannel({
        id: environment.notificationChannelId,
        name: 'Salah Notifications',
        description: 'Salah notifications',
        importance: 5,
        vibration: true
      });
    } catch {}
  }
}
