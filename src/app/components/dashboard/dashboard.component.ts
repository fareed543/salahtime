import { KeyValue } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { delay, filter, Subscription } from 'rxjs';
import { SalahKey, SalahSettings, SalahTime } from 'src/app/models/salah.model';
import { LocationService } from 'src/app/services/location.service';
import { SettingsService } from 'src/app/services/settings.service';
import { WaqtService } from 'src/app/services/waqt.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  currentSalah: SalahKey | null = null;
  salahTimeList: Record<SalahKey, SalahTime> = {} as any;
  loading = false;
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
    private locationService: LocationService
  ) {}

  /** View sorting order */
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

  ngOnInit(): void {
    this.listenToSettings();
    this.getLocationAndTimes();
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

  private listenToSettings() {
    const sub = this.settingsService.settings$
      .pipe(
        filter(settings => !!settings),
        delay(0) // 🔥 critical for mobile first load
      )
      .subscribe(settings => {
        this.settings = settings;
        this.getLocationAndTimes();
      });

    this.subs.add(sub);
  }


  // ------------------------------------------------------
  // Location
  // ------------------------------------------------------

  async getLocationAndTimes() {
    this.loading = true;
    this.errorMessage = null;
    this.isCalculated = false;

    try {
      const pos = await this.locationService.getLocation();

      this.ngZone.run(() => {
        this.lastLocation = { lat: pos.lat, lng: pos.lng };
        this.recalculateIfReady();
      });

    } catch (error) {
      this.ngZone.run(() => {
        this.loading = false;
        this.handleLocationError();
      });
    }
  }

  async refreshLocation() {
    this.isCalculated = false;
    this.locationService.clearCache();
    await this.getLocationAndTimes();
  }

  // ------------------------------------------------------
  // Core logic
  // ------------------------------------------------------

  /** Calculate only when BOTH location & settings are available */
  private recalculateIfReady() {
    if (!this.lastLocation || !this.settings || this.isCalculated) {
      return;
    }

    this.isCalculated = true;

    this.ngZone.run(() => {
      this.computeSalahTimes(
        this.lastLocation!.lat,
        this.lastLocation!.lng
      );
    });
  }

  private computeSalahTimes(lat: number, lng: number) {
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
      madhab
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
  }

  // ------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------

  private handleLocationError() {
    this.errorMessage =
      'Oops! Unable to access your location. Please enable permissions.';
  }
}
