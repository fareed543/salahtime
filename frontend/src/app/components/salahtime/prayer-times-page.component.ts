import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { DeviceInfoService } from 'src/app/services/device-info.service';

/**
 * /prayer-times pages.
 * - Website (CR-021): the new website prayer-times page at every screen width.
 * - Android app: unchanged — the wide layout or the mobile layout, switching on resize.
 */
@Component({
  selector: 'app-prayer-times-page',
  template: `
    <app-web-prayer-times *ngIf="isWebsite; else appLayouts"></app-web-prayer-times>
    <ng-template #appLayouts>
      <app-salahtime *ngIf="deviceInfo.isWeb$ | async; else mobileLayout"></app-salahtime>
      <ng-template #mobileLayout><app-all-prayer-times></app-all-prayer-times></ng-template>
    </ng-template>
  `
})
export class PrayerTimesPageComponent {
  readonly isWebsite = !Capacitor.isNativePlatform();

  constructor(readonly deviceInfo: DeviceInfoService) {}
}
