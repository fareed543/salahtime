import { Component, OnInit, NgZone, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SettingsService } from './services/settings.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
// import { StatusBar, Style } from '@capacitor/status-bar';
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

    // If city already exists, skip location dialog
    if (current?.city) {
      this.selectedCity = current.city;
      this.showLocationDialog = false;
      return; // go straight to app (dashboard will render)
    }

    // StatusBar.setOverlaysWebView({ overlay: false });
    // StatusBar.setBackgroundColor({ color: '#000000' });
    // StatusBar.setStyle({ style: Style.Light });

    // 1️⃣ Location first
    await this.requestLocationFirst();

    // 2️⃣ Notifications next
    await this.requestNotificationNext();

    // 3️⃣ Create channel
    await this.createNotificationChannel();
  }

  private async requestLocationFirst() {
    try {
      const perm = await Geolocation.checkPermissions();

      if (perm.location !== 'granted') {
        // ❌ Not granted → show dialog
        this.ngZone.run(() => {
          this.showLocationDialog = true;
        });

        // This triggers Android permission popup
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      }

      // ✅ Granted
      this.ngZone.run(() => {
        this.showLocationDialog = false;
      });

    } catch (error) {
      // ❌ Denied or error
      this.ngZone.run(() => {
        this.showLocationDialog = true;
      });
    }
  }

  // Called when user clicks "Allow location" in your custom dialog
  async requestLocationAgain() {
    try {
      await Geolocation.getCurrentPosition({ enableHighAccuracy: true });

      // ✅ Granted
      this.ngZone.run(() => {
        this.showLocationDialog = false;
      });
    } catch (error) {
      // ❌ Still denied
      this.ngZone.run(() => {
        this.showLocationDialog = true;
      });
    }
  }

  private async requestNotificationNext() {
    try {
      const perm = await LocalNotifications.checkPermissions();

      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch { }
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
  onCitySelected(city: any) {
    this.selectedCity = city;

    if (!this.selectedCity) return;

    const current = this.settingsService.getCurrentSettings();
    if (current) {
      this.settingsService.updateSettings({
        ...current,
        city: this.selectedCity,
        locationMode: 'manual'
      });
    }

    // Hide the dialog
    this.showLocationDialog = false;

    // Navigate to dashboard
    this.ngZone.run(() => {
      this.router.navigate(['/']);
    });
  }

}
