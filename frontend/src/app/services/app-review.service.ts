import { Injectable } from '@angular/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import { DeviceInfoService } from './device-info.service';
import { LocalStorageService } from './local-storage.service';

interface ActiveDays {
  count: number;
  lastDay: string;
}

/**
 * Asks for a Google Play rating with the official in-app review sheet.
 *
 * The app can't tell whether someone has already rated it or what they chose; Google Play skips
 * the sheet on its own for people who already reviewed or were asked recently. On top of that we
 * only ask in the Android app, after the app was used on a few different days, right after the
 * person marks all of today's prayers (a deliberate tap, never on launch), and at most every 60 days.
 * Google Play policy: no "do you like the app?" pre-question and no rewards for rating.
 */
@Injectable({
  providedIn: 'root'
})
export class AppReviewService {
  private readonly activeDaysKey = 'app_review_active_days';
  private readonly lastRequestKey = 'app_review_last_requested_at';
  private readonly minActiveDays = 3;
  private readonly minDaysBetweenRequests = 60;

  constructor(
    private deviceInfo: DeviceInfoService,
    private localStorage: LocalStorageService,
  ) {}

  private get isAndroidApp(): boolean {
    return this.deviceInfo.isNativeApp() && this.deviceInfo.isAndroid();
  }

  /** Call on app start; counts each calendar day the app is used once. */
  recordActiveDay(): void {
    if (!this.isAndroidApp) {
      return;
    }

    const today = this.dayKey(new Date());
    const days = this.localStorage.getItem<ActiveDays>(this.activeDaysKey) ?? { count: 0, lastDay: '' };
    if (days.lastDay !== today) {
      this.localStorage.setItem(this.activeDaysKey, { count: days.count + 1, lastDay: today });
    }
  }

  /** Call after the person marks prayers; asks only once all of today's prayers are marked. */
  onPrayersMarked(allTodayPrayed: boolean): void {
    if (!allTodayPrayed || !this.isAndroidApp || !this.isDue()) {
      return;
    }

    this.localStorage.setItem(this.lastRequestKey, new Date().toISOString());
    // Let the tick animation finish before Google Play's sheet slides up.
    setTimeout(() => {
      InAppReview.requestReview().catch(error => console.warn('In-app review unavailable', error));
    }, 1200);
  }

  private isDue(): boolean {
    const days = this.localStorage.getItem<ActiveDays>(this.activeDaysKey);
    if (!days || days.count < this.minActiveDays) {
      return false;
    }

    const lastRequest = this.localStorage.getItem<string>(this.lastRequestKey);
    if (!lastRequest) {
      return true;
    }

    const daysSince = (Date.now() - new Date(lastRequest).getTime()) / 86_400_000;
    return !(daysSince < this.minDaysBetweenRequests);
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
