import { Component } from '@angular/core';
import { DeviceInfoService } from 'src/app/services/device-info.service';

/** Shows the web or mobile prayer layout at the same /prayer-times URL, switching on resize. */
@Component({
  selector: 'app-prayer-times-page',
  template: `
    <app-salahtime *ngIf="deviceInfo.isWeb$ | async; else mobileLayout"></app-salahtime>
    <ng-template #mobileLayout><app-all-prayer-times></app-all-prayer-times></ng-template>
  `
})
export class PrayerTimesPageComponent {
  constructor(readonly deviceInfo: DeviceInfoService) {}
}
