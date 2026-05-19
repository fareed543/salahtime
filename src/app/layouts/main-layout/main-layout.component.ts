import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  appVersion = environment.appVersion;
  showLocationDialog = false;
  selectedCity: any;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private settingsService: SettingsService
  ) {
    this.settingsService.init();
  }

  async ngOnInit() {
    this.document.body.classList.remove('auth-route');
    this.document.body.style.paddingBottom = '';

    const current = this.settingsService.getCurrentSettings();

    if (current?.city) {
      this.selectedCity = current.city;
      this.showLocationDialog = false;
      return;
    }

    await this.createNotificationChannel();
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
