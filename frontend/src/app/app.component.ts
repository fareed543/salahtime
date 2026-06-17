import { Component, OnInit } from '@angular/core';
import { NotificationService } from './services/notification.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    private settingsService: SettingsService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.settingsService.init();
    await this.notificationService.ensureDefaultNotificationChannel();
    await this.notificationService.ensurePermissionOnLaunchIfNeeded();
    await this.notificationService.syncSalahNotifications();
  }
}
