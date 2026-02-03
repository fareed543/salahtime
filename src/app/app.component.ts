import { Component, OnInit, NgZone, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SettingsService } from './services/settings.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  appVersion = environment.appVersion;

  menuOpen = false;
  protected readonly title = signal('SalahTime');
  showLocationDialog = false;

  selectedCity: any;

  constructor(
    private settingsService: SettingsService,
    private ngZone: NgZone,
    private router: Router
  ) {
    this.settingsService.init();
  }

  async ngOnInit() {
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
    } catch { }
  }
}
