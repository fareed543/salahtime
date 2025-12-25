import { Component, OnInit, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SettingsService } from './services/settings.service';

import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  menuOpen = false;
  protected readonly title = signal('SalahTime');

  constructor(private settingsService: SettingsService) {
    this.settingsService.init();
  }

  async ngOnInit() {
    await this.handleGeolocationPermission();
    await this.handleNotificationPermission();
    await this.createNotificationChannel();
  }

  private async handleGeolocationPermission() {
    const permission = await Geolocation.checkPermissions();

    if (permission.location !== 'granted') {
      await Geolocation.requestPermissions();
    }
  }

  private async handleNotificationPermission() {
    const permission = await LocalNotifications.checkPermissions();

    if (permission.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  }

  private async createNotificationChannel() {
    await LocalNotifications.createChannel({
      id: environment.notificationChannelId,
      name: 'Salah Notifications',
      description: 'Salah notifications',
      importance: 5
    });

    console.log('Notification channel ensured');
  }
}
