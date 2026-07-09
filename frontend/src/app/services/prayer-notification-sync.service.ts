import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SALAH_ORDER, SalahKey, SalahLocationSnapshot, SalahSettings } from '../models/salah.model';
import { LocationService } from './location.service';
import { NotificationService } from './notification.service';
import { SettingsService } from './settings.service';
import { WaqtService } from './waqt.service';

export interface MissedPrayerMessage {
  city: string;
  salah: string;
}

@Injectable({ providedIn: 'root' })
export class PrayerNotificationSyncService {
  private readonly LAST_SYNC_REASON_KEY = 'prayer-notification-last-sync-reason';
  private readonly LAST_MISSED_PRAYER_KEY = 'prayer-notification-last-missed-prayer';

  readonly missedPrayerMessage$ = new BehaviorSubject<MissedPrayerMessage | null>(null);

  private midnightTimerId: number | null = null;
  private syncInFlight: Promise<void> | null = null;

  constructor(
    private settingsService: SettingsService,
    private locationService: LocationService,
    private notificationService: NotificationService,
    private waqtService: WaqtService
  ) {}

  async syncOnLaunch(reason = 'launch'): Promise<void> {
    return this.runSync(reason, true);
  }

  async syncOnResume(): Promise<void> {
    return this.runSync('resume', true);
  }

  async syncForLocationSelectionChange(): Promise<void> {
    return this.runSync('location-change', true);
  }

  startDailyRefreshWatcher(): void {
    this.stopDailyRefreshWatcher();

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      1,
      0,
      0
    );
    const delay = Math.max(nextMidnight.getTime() - now.getTime(), 1000);

    this.midnightTimerId = window.setTimeout(async () => {
      await this.runSync('midnight', true);
      this.startDailyRefreshWatcher();
    }, delay);
  }

  stopDailyRefreshWatcher(): void {
    if (this.midnightTimerId !== null) {
      clearTimeout(this.midnightTimerId);
      this.midnightTimerId = null;
    }
  }

  clearMissedPrayerMessage(): void {
    this.missedPrayerMessage$.next(null);
  }

  private async runSync(reason: string, forceRefreshLocation: boolean): Promise<void> {
    if (this.syncInFlight) {
      return this.syncInFlight;
    }

    this.syncInFlight = this.executeSync(reason, forceRefreshLocation)
      .finally(() => {
        this.syncInFlight = null;
      });

    return this.syncInFlight;
  }

  private async executeSync(reason: string, forceRefreshLocation: boolean): Promise<void> {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings?.location) {
      return;
    }

    const resolved = await this.locationService.resolveEffectiveLocation(forceRefreshLocation);
    const currentSnapshot = settings.locationSnapshot ?? null;
    const previousSnapshot = currentSnapshot as SalahLocationSnapshot | null;
    const timezoneChanged = previousSnapshot?.timezone !== resolved.snapshot.timezone;
    const dayChanged = this.hasLocalDayChanged(previousSnapshot?.lastUpdated);
    const movedSignificantly = this.locationService.isSignificantMove(previousSnapshot, resolved.snapshot);
    const selectedCityChanged = settings.location?.source !== resolved.selection.source
      || settings.location?.city?.city !== resolved.selection.city.city;
    const shouldPersist = !previousSnapshot || movedSignificantly || timezoneChanged || selectedCityChanged || dayChanged;

    let nextSettings: SalahSettings = settings;
    if (shouldPersist) {
      nextSettings = {
        ...settings,
        locationMode: resolved.selection.source,
        location: resolved.selection,
        locationSnapshot: resolved.snapshot
      };
      this.settingsService.updateSettings(nextSettings);
    }

    const shouldReschedule = shouldPersist || this.shouldRescheduleByReason(reason);
    if (shouldReschedule) {
      await this.notificationService.syncSalahNotifications();
      localStorage.setItem(this.LAST_SYNC_REASON_KEY, JSON.stringify({
        reason,
        at: new Date().toISOString()
      }));
    }

    this.updateMissedPrayerMessage(nextSettings, resolved.snapshot);
  }

  private updateMissedPrayerMessage(settings: SalahSettings, snapshot: SalahLocationSnapshot): void {
    const coordinates = settings.location?.city?.coordinates;
    if (!coordinates) {
      this.missedPrayerMessage$.next(null);
      return;
    }

    const now = new Date();
    const times = this.waqtService.getTimes(
      now,
      coordinates.latitude,
      coordinates.longitude,
      -now.getTimezoneOffset() / 60,
      settings.calculationMethod ?? 'karachi',
      settings.madhab ?? 'Hanafi',
      {
        sahriOffset: settings.sahriOffset,
        fajrOffset: settings.fajrOffset,
        dhuhrOffset: settings.dhuhrOffset,
        asrOffset: settings.asrOffset,
        iftarOffset: settings.iftarOffset,
        maghribOffset: settings.maghribOffset,
        ishaOffset: settings.ishaOffset
      }
    );

    const pending = this.notificationService.getPendingReminderEntries();
    const missed = SALAH_ORDER
      .map((key) => ({ key, start: new Date(times[key].start) }))
      .filter(({ key, start }) => this.notificationService.shouldConsiderMissedPrayer(key, start, now, pending))
      .sort((left, right) => right.start.getTime() - left.start.getTime())[0];

    if (!missed) {
      this.missedPrayerMessage$.next(null);
      return;
    }

    const messageKey = `${snapshot.currentCityId}:${missed.key}:${missed.start.toISOString()}`;
    if (localStorage.getItem(this.LAST_MISSED_PRAYER_KEY) === messageKey) {
      return;
    }

    localStorage.setItem(this.LAST_MISSED_PRAYER_KEY, messageKey);
    this.missedPrayerMessage$.next({
      city: settings.location?.city?.city ?? 'your city',
      salah: this.notificationService.getDisplayNameForSalah(missed.key, now)
    });
  }

  private hasLocalDayChanged(lastUpdated?: string): boolean {
    if (!lastUpdated) {
      return true;
    }

    const previous = new Date(lastUpdated);
    const now = new Date();
    return previous.getFullYear() !== now.getFullYear()
      || previous.getMonth() !== now.getMonth()
      || previous.getDate() !== now.getDate();
  }

  private shouldRescheduleByReason(reason: string): boolean {
    return reason === 'launch' || reason === 'resume' || reason === 'midnight' || reason === 'location-change';
  }
}
