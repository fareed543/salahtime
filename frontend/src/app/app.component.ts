import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from './services/analytics.service';
import { NotificationService } from './services/notification.service';
import { SeoService } from './services/seo.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private seoService: SeoService,
    private analyticsService: AnalyticsService
  ) {}

  async ngOnInit(): Promise<void> {
    this.seoService.init();
    this.analyticsService.init();
    await this.settingsService.init();
    await this.notificationService.ensureDefaultNotificationChannel();
    await this.notificationService.ensurePermissionOnLaunchIfNeeded();
    await this.notificationService.syncSalahNotifications();
  }
}
