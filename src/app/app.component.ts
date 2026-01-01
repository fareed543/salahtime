import { Component, OnInit, NgZone, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SettingsService } from './services/settings.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  menuOpen = false;
  protected readonly title = signal('SalahTime');
  showLocationDialog = false;

  constructor(
    private settingsService: SettingsService,
    private ngZone: NgZone
  ) {
    this.settingsService.init();
  }

  ngOnInit() {
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: '#000000' });
    StatusBar.setStyle({ style: Style.Light });

    this.ensureLocationPermission();
    this.ensureNotificationPermission();
    this.createNotificationChannel();
  }

private async ensureLocationPermission() {
  try {
    const permission = await Geolocation.checkPermissions();

    if (permission.location !== 'granted') {
      await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    }

    this.ngZone.run(() => {
      this.showLocationDialog = false;
    });
  } catch (err) {
    localStorage.removeItem('cached_location');
    this.ngZone.run(() => {
      this.showLocationDialog = true;
    });
  }
}


  async requestLocationAgain() {
    try {
      await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.ngZone.run(() => {
        this.showLocationDialog = false;
      });
    } catch (err) {
      this.ngZone.run(() => {
        this.showLocationDialog = true;
      });
    }
  }

  private async ensureNotificationPermission() {
    try {
      const permission = await LocalNotifications.checkPermissions();

      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch {}
  }

  private async createNotificationChannel() {
    try {
      await LocalNotifications.createChannel({
        id: environment.notificationChannelId,
        name: 'Salah Notifications',
        description: 'Salah notifications',
        importance: 5
      });
    } catch {}
  }
}
