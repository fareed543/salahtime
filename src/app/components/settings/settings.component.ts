import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsData } from '../../models/salah-methods.config';
import { SettingsService } from '../../services/settings.service';
import { SalahSettings } from '../../models/settings.model';
import { NotificationService } from 'src/app/services/notification.service';
import { LocationService } from 'src/app/services/location.service'; // optional

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  allNotifications : any;
  calculationMethods = SettingsData;
  salahSettingsForm!: FormGroup;

  private settingsSub!: Subscription;
  private formInitialized = false;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private locationService: LocationService // optional, for coordinates
  ) { }

  ngOnInit(): void {
    this.settingsSub = this.settingsService.settings$
      .subscribe(async settings => {
        if (!settings) return;

        if (!this.formInitialized) {
          this.buildForm(settings);
          this.formInitialized = true;

          // Schedule notifications initially if enabled
          if (settings.enableNotifications) {
            await this.scheduleSalahNotifications();
          }
        } else {
          this.salahSettingsForm.patchValue(settings, { emitEvent: false });
        }
      });
      this.checkScheduledNotifications();
  }

  private buildForm(settings: SalahSettings) {
    this.salahSettingsForm = this.fb.group({
      calculationMethod: [settings.calculationMethod],
      showNafilSalah: [settings.showNafilSalah],
      showMakruhTime: [settings.showMakruhTime],
      madhab: [settings.madhab],
      locationMode: [settings.locationMode],
      enableNotifications: [settings.enableNotifications],
      showHijri: [settings.showHijri],
      hijriOffset: [settings.hijriOffset]
    });

    // Listen to enableNotifications toggle
    this.salahSettingsForm
      .get('enableNotifications')
      ?.valueChanges.subscribe(async (enabled: boolean) => {
        if (!this.formInitialized) return;

        if (enabled) {
          await this.scheduleSalahNotifications();
        } else {
          await this.notificationService.cancelAllSalahNotifications();
        }
      });

    // Save settings on any change
    this.salahSettingsForm.valueChanges.subscribe(value => {
      this.settingsService.updateSettings(value);
    });
  }

  /** Schedule Salah notifications using NotificationService */
  private async scheduleSalahNotifications() {
    try {
      // Get user coordinates from LocationService
      const pos = await this.locationService.getLocation(); // must return { lat: number, lng: number }

      const lat = pos.lat;
      const lng = pos.lng;

      // Schedule notifications
      await this.notificationService.scheduleSalahNotifications(lat, lng);

    } catch (err) {
      console.error('Failed to schedule Salah notifications:', err);
    }
  }


  /** Reset handler */
  async onReset() {
    await this.settingsService.resetToDefaults();
    await this.notificationService.cancelAllSalahNotifications();
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
  }

  async checkScheduledNotifications() {
    this.allNotifications = await this.notificationService.listScheduledNotifications();
    const enableNotifications = this.allNotifications.length > 1;
    this.salahSettingsForm.patchValue(
      { enableNotifications },
      { emitEvent: false }    
    );
  }
}
