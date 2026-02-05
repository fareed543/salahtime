import { KeyValue } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { delay, filter, Subscription } from 'rxjs';
import { SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';
import { Geolocation } from '@capacitor/geolocation';
import { AppLocation, LocationService } from 'src/app/services/location.service';
import { LocationSelection } from 'src/app/shared/autocomplete-control/autocomplete-control.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  currentSalah: SalahKey | null = null;
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;

  loading = true;
  errorMessage: string | null = null;
  settings: SalahSettings | null = null;

  private lastLocation: { lat: number; lng: number } | null = null;
  private isCalculated = false;

  private subs = new Subscription();
  private highlightTimer?: any;

  constructor(
    private waqtService: WaqtService,
    private ngZone: NgZone,
    private settingsService: SettingsService,
    private locationService: LocationService,
  ) {}

  // ------------------------------------------------------
  // View sorting order
  // ------------------------------------------------------

  originalOrder = (
    a: KeyValue<SalahKey, SalahTime>,
    b: KeyValue<SalahKey, SalahTime>
  ): number => {
    const order: SalahKey[] = [
      'sahri', 'fajr', 'tulu', 'ishraq', 'chast', 'zawal',
      'dhuhr', 'asr', 'gurub', 'iftar', 'maghrib',
      'awabin', 'isha', 'tahajjud'
    ];
    return order.indexOf(a.key) - order.indexOf(b.key);
  };

  // ------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------

  async ngOnInit() {

    await this.requestLocationFirst();

  }

   private async requestLocationFirst() {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') { 
        this.ngZone.run(() => {
          this.listenToSettings();
        });
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      }

      // ✅ Granted
        this.ngZone.run(() => {   this.useCurrentLocation();  });

    } catch (error) {
      // ❌ Denied or error
      this.ngZone.run(() => {
          this.listenToSettings();
      });
    }
  }


  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.highlightTimer) {
      clearInterval(this.highlightTimer);
    }
  }

  // ------------------------------------------------------
  // Settings
  // ------------------------------------------------------

  async useCurrentLocation(): Promise<void> {
      try {
        const loc: AppLocation = await this.locationService.getLocation();
        const selection: LocationSelection = {
          source: 'auto',
          city : {
            city : "Current Location",
            coordinates : {
              latitude: loc.lat,
              longitude: loc.lng
            }
          }
        };
        const current = this.settingsService.getCurrentSettings();
        if (current) {
          this.settingsService.updateSettings({
            ...current,
            location: selection
          });
        }
  
      } catch (err) {
        console.warn('Location access failed', err);
      } finally {
        this.listenToSettings();
        this.loading = false;
      }
    }

  private listenToSettings() {
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0)
      )
      .subscribe(settings => {
        this.settings = settings;
        this.getLocationAndTimes();
      });

    this.subs.add(sub);
  }

  // ------------------------------------------------------
  // Location (FROM SETTINGS ONLY)
  // ------------------------------------------------------

  async getLocationAndTimes() {
    this.loading = true;
    this.errorMessage = null;
    this.isCalculated = false;

    try {
      const location = this.settings?.location;

      if (!location) {
        throw new Error('Location not set');
      }

      let lat: number;
      let lng: number;

      if (location.source === 'manual') {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      } else {
        lat = location.city.coordinates.latitude;
        lng = location.city.coordinates.longitude;
      }

      this.ngZone.run(() => {
        this.lastLocation = { lat, lng };
        this.recalculateIfReady();
      });

    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  // ------------------------------------------------------
  // Core logic
  // ------------------------------------------------------

  private recalculateIfReady() {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    // allow spinner to render before heavy calculation
    setTimeout(() => {
      this.computeSalahTimes(
        this.lastLocation!.lat,
        this.lastLocation!.lng
      );
    });
  }

  private computeSalahTimes(lat: number, lng: number) {
    try {
      const tzOffset = -new Date().getTimezoneOffset() / 60;
      const date = new Date();

      const methodId = this.settings!.calculationMethod ?? 'karachi';
      const madhab = this.settings!.madhab ?? 'Hanafi';

      const times = this.waqtService.getTimes(
        date,
        lat,
        lng,
        tzOffset,
        methodId,
        madhab,
        {
          sahriOffset: this.settings!.sahriOffset,
          fajrOffset: this.settings!.fajrOffset,
          dhuhrOffset: this.settings!.dhuhrOffset,
          asrOffset: this.settings!.asrOffset,
          iftarOffset: this.settings!.iftarOffset,
          maghribOffset: this.settings!.maghribOffset,
          ishaOffset: this.settings!.ishaOffset
        }
      );

      const parsed: Record<SalahKey, SalahTime> = {} as any;

      (Object.keys(times) as SalahKey[]).forEach(key => {
        parsed[key] = {
          start: new Date(times[key].start),
          end: new Date(times[key].end),
          type: times[key].type,
          icon: times[key].icon,
          color: times[key].color
        };
      });

      this.ngZone.run(() => {
        this.salahTimeList = parsed;
        this.loading = false;
      });

    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.errorMessage = 'Failed to calculate prayer times.';
      });
    }
  }

  // ------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------

  private handleLocationError() {
    this.errorMessage =
      'Please select a city or enable auto location from settings.';
  }
}
