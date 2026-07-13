import { Injectable } from '@angular/core';
import {
  Channel,
  LocalNotifications,
  PendingLocalNotificationSchema
} from '@capacitor/local-notifications';

import { environment } from 'src/environments/environment';
import { AZAN_SOUND_FILE_BY_ID } from '../models/azan.model';
import { getSalahName, SalahKey, SalahSettings } from '../models/salah.model';
import { LocalStorageService } from './local-storage.service';
import { SettingsService } from './settings.service';
import { WaqtService } from './waqt.service';

export type SalahReminderSound = 'azan' | 'default';

export interface SalahReminderPreference {
  enabled: boolean;
  sound: SalahReminderSound;
  azanId?: string;
}

interface PendingReminderEntry {
  key: SalahKey;
  at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly DEFAULT_REMINDER_SOUND: SalahReminderSound = 'azan';
  private readonly DEFAULT_AZAN_ID = 'adhan-makkah';
  // Android channels are immutable; version this ID when sound setup changes.
  private readonly CHANNEL_PREFIX = 'salah_azan_v5_';
  private readonly DEFAULT_OPTION_ID = 'default';
  private readonly REMINDER_PREFERENCE_STORAGE_KEY = 'salah-reminder-preferences';

  private readonly PRAYER_NOTIFICATION_IDS: Record<SalahKey, number> = {
    sahri: 201,
    fajr: 202,
    tulu: 203,
    ishraq: 204,
    chast: 205,
    zawal: 206,
    dhuhr: 207,
    asr: 208,
    gurub: 209,
    iftar: 210,
    maghrib: 211,
    awabin: 212,
    isha: 213,
    tahajjud: 214,
  };

  private readonly NEXT_DAY_NOTIFICATION_OFFSET = 1000;

  constructor(
    private settingsService: SettingsService,
    private waqtService: WaqtService,
    private localStorageService: LocalStorageService
  ) {}

  /* ------------------------------------------------------------------ */
  /* Permissions                                                         */
  /* ------------------------------------------------------------------ */

  async ensurePermission(): Promise<boolean> {
    const current = await LocalNotifications.checkPermissions();
    const permission = current.display === 'prompt'
      ? await LocalNotifications.requestPermissions()
      : current;

    if (permission.display !== 'granted') {
      console.warn('[Notification] Permission not granted');
      return false;
    }
    return true;
  }

  async ensurePermissionOnLaunchIfNeeded(): Promise<void> {
    const settings = this.settingsService.getCurrentSettings();
    const shouldAsk = !!settings?.enableNotifications || this.hasEnabledReminderPreferences();
    if (!shouldAsk) {
      return;
    }

    await this.ensurePermission();
  }

  /* ------------------------------------------------------------------ */
  /* Status / UI Notifications                                           */
  /* ------------------------------------------------------------------ */

  async showStatusNotification(title: string, body: string) {
    if (!(await this.ensurePermission())) return;
    await this.ensureDefaultNotificationChannel();

    await this.scheduleNotification({
      id: Date.now(),
      title,
      body,
      delayMs: 1000
    });
  }

  async showTestNotification(preference: Pick<SalahReminderPreference, 'sound' | 'azanId'>): Promise<boolean> {
    if (!(await this.ensurePermission())) return false;
    const normalizedPreference = this.normalizeReminderPreference({
      enabled: true,
      sound: preference.sound,
      azanId: preference.azanId
    });

    if (normalizedPreference.sound === 'azan') {
      await this.ensureAzanNotificationChannel(normalizedPreference.azanId, true);
    } else {
      await this.ensureDefaultNotificationChannel();
    }

    await this.scheduleNotification({
      id: this.getTestNotificationId(),
      title: 'Test Notification',
      body: normalizedPreference.sound === 'azan'
        ? 'Azan notification sound test'
        : 'Default notification sound test',
      delayMs: 2000,
      channelId: this.getChannelIdForPreference(normalizedPreference),
      sound: this.getSoundFileForPreference(normalizedPreference)
    });
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Salah Notifications                                                 */
  /* ------------------------------------------------------------------ */

  async cancelAllSalahNotifications() {
    await LocalNotifications.cancel({
      notifications: this.getAllManagedNotificationIds()
        .map(id => ({ id }))
    });
    this.localStorageService.setItem('pending-salah-reminder-entries', []);

    console.log('[Notification] Salah notifications cancelled');
  }

  async listScheduledSalahNotifications(): Promise<PendingLocalNotificationSchema[]> {
    const result = await LocalNotifications.getPending();
    const ids = this.getAllManagedNotificationIds();

    return result.notifications.filter(n => ids.includes(n.id));
  }

  getPendingReminderEntries(): PendingReminderEntry[] {
    const pending = this.localStorageService.getItem<PendingReminderEntry[]>('pending-salah-reminder-entries');
    return Array.isArray(pending) ? pending : [];
  }

  async syncSalahNotifications(): Promise<void> {
    let settings = this.settingsService.getCurrentSettings();
    if (!settings?.location) {
      return;
    }

    const hasEnabledReminders = this.hasEnabledReminderPreferences();
    if (!settings.enableNotifications && !hasEnabledReminders) {
      return;
    }

    if (!settings.enableNotifications && hasEnabledReminders) {
      settings = {
        ...settings,
        enableNotifications: true
      };
      this.settingsService.updateSettings(settings);
    }

    if (!(await this.ensurePermission())) {
      return;
    }

    await this.cancelAllSalahNotifications();
    await this.scheduleSalahNotifications(settings);
  }

  async enableReminderAndSync(key: SalahKey, preference: SalahReminderPreference): Promise<boolean> {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings?.location) {
      return false;
    }

    if (!(await this.ensurePermission())) {
      return false;
    }

    const normalizedPreference = this.normalizeReminderPreference(preference);

    if (normalizedPreference.sound === 'azan') {
      await this.ensureAzanNotificationChannel(normalizedPreference.azanId);
    }

    this.setReminderPreference(key, normalizedPreference);

    if (!settings.enableNotifications) {
      this.settingsService.updateSettings({
        ...settings,
        enableNotifications: true
      });
    }

    await this.syncSalahNotifications();
    return true;
  }

  async scheduleSalahNotifications(settings: SalahSettings): Promise<void> {
    if (!settings.location) {
      return;
    }

    await this.ensureDefaultNotificationChannel();

    const reminderPreferences = this.getReminderPreferences();
    await Promise.all(
      Object.values(reminderPreferences)
        .filter((preference): preference is SalahReminderPreference => !!preference?.enabled && preference.sound === 'azan')
        .map((preference) => this.ensureAzanNotificationChannel(preference.azanId))
    );

    const allowWhileIdle = await this.canUseExactAlarms();
    const notifications = this.buildSalahNotifications(settings, allowWhileIdle);
    this.localStorageService.setItem('pending-salah-reminder-entries', notifications
      .map((notification) => {
        const key = this.getSalahKeyFromNotificationId(notification.id);
        return key ? { key, at: notification.schedule.at.toISOString() } : null;
      })
      .filter((entry): entry is PendingReminderEntry => !!entry));

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  getReminderPreference(key: SalahKey): SalahReminderPreference {
    const saved = this.getSavedReminderPreferences();
    return saved[key] ?? this.getDefaultReminderPreference();
  }

  getReminderPreferences(): Partial<Record<SalahKey, SalahReminderPreference>> {
    return this.getSavedReminderPreferences();
  }

  setReminderPreference(key: SalahKey, preference: SalahReminderPreference): void {
    const saved = this.getSavedReminderPreferences();
    saved[key] = this.normalizeReminderPreference(preference);
    this.localStorageService.setItem(this.REMINDER_PREFERENCE_STORAGE_KEY, saved);
  }

  /* ------------------------------------------------------------------ */
  /* Internal Helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async scheduleNotification(opts: {
    id: number;
    title: string;
    body: string;
    delayMs?: number;
    at?: Date;
    sound?: string;
    channelId?: string;
  }) {
    const scheduleAt =
      opts.at ?? new Date(Date.now() + (opts.delayMs ?? 0));
    const allowWhileIdle = await this.canUseExactAlarms();

    await LocalNotifications.schedule({
      notifications: [{
        id: opts.id,
        title: opts.title,
        body: opts.body,
        schedule: { at: scheduleAt, allowWhileIdle },
        channelId: opts.channelId ?? environment.notificationChannelId,
        sound: opts.sound
      }]
    });
  }

  private buildSalahNotifications(settings: SalahSettings, allowWhileIdle: boolean) {
    const coordinates = settings.location?.city?.coordinates;
    if (!coordinates) {
      return [];
    }

    const now = new Date();
    const notifications: Array<{
      id: number;
      title: string;
      body: string;
      schedule: { at: Date; allowWhileIdle: boolean };
      channelId: string;
      sound?: string;
    }> = [];

    [0, 1].forEach(dayOffset => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const times = this.waqtService.getTimes(
        date,
        coordinates.latitude,
        coordinates.longitude,
        -date.getTimezoneOffset() / 60,
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

      (Object.keys(times) as SalahKey[]).forEach(key => {
        const salah = times[key];
        if (!salah || !this.shouldScheduleSalah(key, settings)) {
          return;
        }

        const reminderPreference = this.getReminderPreference(key);
        if (!reminderPreference.enabled) {
          return;
        }

        const start = new Date(salah.start);
        if (start <= now) {
          return;
        }

        const { title, body } = this.getNotificationContent(
          key,
          salah.type,
          start,
          new Date(salah.end)
        );

        notifications.push({
          id: this.getManagedNotificationId(key, dayOffset),
          title,
          body,
          schedule: { at: start, allowWhileIdle },
          channelId: this.getChannelIdForPreference(reminderPreference),
          sound: this.getSoundFileForPreference(reminderPreference)
        });
      });
    });

    return notifications;
  }

  private shouldScheduleSalah(key: SalahKey, settings: SalahSettings): boolean {
    return settings.enableNotifications;
  }

  private hasEnabledReminderPreferences(): boolean {
    return Object.values(this.getSavedReminderPreferences()).some(preference => !!preference?.enabled);
  }

  private getNotificationContent(
    key: string,
    type: string,
    start: Date,
    end: Date
  ): { title: string; body: string } {
    const name = this.getDisplayNameForSalah(key as SalahKey, start);
    const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      title: type === 'makruh' ? `${name} Makruh` : name,
      body: `Time: ${startTime} - ${endTime}`
    };
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private formatSalahName(key: SalahKey): string {
    return getSalahName(key, new Date()) ?? this.capitalize(key);
  }

  getDisplayNameForSalah(key: SalahKey, date: Date): string {
    return getSalahName(key, date) ?? this.capitalize(key);
  }

  shouldConsiderMissedPrayer(key: SalahKey, start: Date, now: Date, pendingEntries: PendingReminderEntry[]): boolean {
    if (start > now) {
      return false;
    }

    const reminderPreference = this.getReminderPreference(key);
    if (!reminderPreference.enabled) {
      return false;
    }

    return !pendingEntries.some((entry) =>
      entry.key === key &&
      new Date(entry.at).getTime() === start.getTime()
    );
  }

  private getManagedNotificationId(key: SalahKey, dayOffset: number): number {
    const baseId = this.PRAYER_NOTIFICATION_IDS[key];
    return dayOffset === 0 ? baseId : baseId + this.NEXT_DAY_NOTIFICATION_OFFSET;
  }

  private getAllManagedNotificationIds(): number[] {
    return Object.values(this.PRAYER_NOTIFICATION_IDS).flatMap(id => [
      id,
      id + this.NEXT_DAY_NOTIFICATION_OFFSET
    ]);
  }

  private getSalahKeyFromNotificationId(id: number): SalahKey | null {
    const normalizedId = id >= this.NEXT_DAY_NOTIFICATION_OFFSET
      ? id - this.NEXT_DAY_NOTIFICATION_OFFSET
      : id;
    const entry = Object.entries(this.PRAYER_NOTIFICATION_IDS)
      .find(([, notificationId]) => notificationId === normalizedId);
    return (entry?.[0] as SalahKey | undefined) ?? null;
  }

  private getTestNotificationId(): number {
    return 900000 + Math.floor(Date.now() % 100000);
  }

  private async canUseExactAlarms(): Promise<boolean> {
    try {
      const result = await LocalNotifications.checkExactNotificationSetting();
      return result.exact_alarm === 'granted';
    } catch {
      return true;
    }
  }

  private getSavedReminderPreferences(): Partial<Record<SalahKey, SalahReminderPreference>> {
    const saved = this.localStorageService.getItem<Partial<Record<SalahKey, SalahReminderPreference>>>(
      this.REMINDER_PREFERENCE_STORAGE_KEY
    ) ?? {};

    Object.values(saved).forEach((preference) => {
      if (!preference) {
        return;
      }

      const normalized = this.normalizeReminderPreference(preference);
      preference.sound = normalized.sound;
      preference.azanId = normalized.azanId;
    });

    return saved;
  }

  private getDefaultReminderPreference(): SalahReminderPreference {
    return {
      enabled: false,
      sound: this.DEFAULT_REMINDER_SOUND,
      azanId: this.DEFAULT_AZAN_ID
    };
  }

  async ensureAzanNotificationChannel(azanId?: string, recreate = false): Promise<void> {
    const resolvedAzanId = this.getResolvedAzanId(azanId);
    const sound = this.getSoundFileByAzanId(resolvedAzanId);
    if (!sound) {
      await this.ensureDefaultNotificationChannel();
      return;
    }
    const channelId = this.getChannelIdForAzanId(resolvedAzanId);

    if (recreate) {
      try {
        await LocalNotifications.deleteChannel({ id: channelId });
      } catch {
        // ignore missing channel/deletion failures
      }
    }

    const channel: Channel = {
      id: channelId,
      name: `${environment.notificationChannelName} ${resolvedAzanId}`,
      description: environment.notificationChannelName,
      importance: 5,
      vibration: true,
      sound
    };

    try {
      await LocalNotifications.createChannel(channel);
    } catch {
      // ignore channel recreation failures
    }
  }

  async ensureDefaultNotificationChannel(): Promise<void> {
    const channel: Channel = {
      id: environment.notificationChannelId,
      name: environment.notificationChannelName,
      description: environment.notificationChannelName,
      importance: 5,
      vibration: true
    };

    try {
      await LocalNotifications.createChannel(channel);
    } catch {
      // ignore channel recreation failures
    }
  }

  private getSoundFileForPreference(preference: SalahReminderPreference): string | undefined {
    if (preference.sound !== 'azan') {
      return undefined;
    }

    return this.getSoundFileByAzanId(preference.azanId);
  }

  private getChannelIdForPreference(preference: SalahReminderPreference): string {
    if (preference.sound !== 'azan') {
      return environment.notificationChannelId;
    }

    return this.getChannelIdForAzanId(preference.azanId);
  }

  private getChannelIdForAzanId(azanId?: string): string {
    const safeId = this.getResolvedAzanId(azanId).replace(/[^a-z0-9_-]/gi, '-');
    return `${this.CHANNEL_PREFIX}${safeId}`;
  }

  private getSoundFileByAzanId(azanId?: string): string | undefined {
    return AZAN_SOUND_FILE_BY_ID[this.getResolvedAzanId(azanId)];
  }

  private normalizeReminderPreference(preference: SalahReminderPreference): SalahReminderPreference {
    const sound = preference.sound === 'default' ? 'default' : this.DEFAULT_REMINDER_SOUND;

    return {
      enabled: preference.enabled,
      sound,
      azanId: sound === 'azan'
        ? this.getResolvedAzanId(preference.azanId)
        : this.DEFAULT_OPTION_ID
    };
  }

  private getResolvedAzanId(azanId?: string): string {
    if (!azanId || azanId === this.DEFAULT_OPTION_ID || !AZAN_SOUND_FILE_BY_ID[azanId]) {
      return this.DEFAULT_AZAN_ID;
    }

    return azanId;
  }
}
