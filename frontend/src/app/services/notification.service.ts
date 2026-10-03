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
import { ReminderPermissionsService } from './reminder-permissions.service';
import { SettingsService } from './settings.service';
import { WaqtService } from './waqt.service';

export type SalahReminderSound = 'azan' | 'default';

export interface SalahReminderPreference {
  enabled: boolean;
  sound: SalahReminderSound;
  azanId?: string;
}

const ZIKAR_SOUND_BY_ID: Record<string, string> = {
  SUBHANALLAH: 'subhanallah.mp3',
  ALHAMDULILLAH: 'alhamdulillah.mp3',
  ALLAHU_AKBAR: 'allahu_akbar.mp3',
  ASTAGHFIRULLAH: 'astaghfirullah.mp3',
  LA_ILAHA_ILLALLAH: 'la_ilaha_illallah.mp3',
  SUBHANALLAHI_WA_BIHAMDIHI: 'subhanallahi_wa_bihamdihi.mp3',
  SUBHANALLAHIL_AZEEM: 'subhanallahil_azeem.mp3',
  LA_HAWLA_WALA_QUWWATA: 'la_hawla_wala_quwwata.mp3',
  HASBIYALLAH: 'hasbiyallah.mp3',
  ALLAHUMMA_SALLI: 'allahumma_salli.mp3',
  RABBIGHFIRLI: 'rabbighfirli.mp3',
  YA_HAYYU_YA_QAYYUM: 'ya_hayyu_ya_qayyum.mp3'
};

export interface ZikarReminderItem {
  id: string;
  text: string;
}

export interface ZikarReminderConfig {
  enabled: boolean;
  category: string;
  intervalMinutes: number;
  // Slot n fires at anchorAt + n * interval, so refills keep the same rhythm and dua order.
  anchorAt: number;
  items: ZikarReminderItem[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly DEFAULT_REMINDER_SOUND: SalahReminderSound = 'azan';
  private readonly DEFAULT_AZAN_ID = 'adhan-makkah';
  // Android channels are immutable; version this ID when sound setup changes.
  private readonly CHANNEL_PREFIX = 'salah_azan_v5_';
  private readonly DEFAULT_OPTION_ID = 'default';
  private readonly REMINDER_PREFERENCE_STORAGE_KEY = 'salah-reminder-preferences';
  private readonly GLOBAL_REMINDER_PREFERENCE_STORAGE_KEY = 'salah-global-reminder-preference';
  // Keep a rolling queue so reminders continue working even when the app is
  // not opened for several days. It is refreshed on launch/resume/midnight.
  private readonly SCHEDULE_DAYS_AHEAD = 30;
  private readonly ZIKAR_CONFIG_STORAGE_KEY = 'zikar-reminder-config';
  private readonly ZIKAR_NOTIFICATION_BASE_ID = 40000;
  // Rolling zikar queue, refilled on launch/resume. Android caps an app at 500 pending
  // alarms; salah uses up to 30 days x 14 = 420, so zikar must stay below ~80.
  private readonly ZIKAR_QUEUE_SIZE = 48;
  // IDs used by the earlier one-shot zikar schedule; still cancelled so old installs clean up.
  private readonly LEGACY_ZIKAR_NOTIFICATION_IDS = Array.from({ length: 12 }, (_, index) => 700 + index);

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
    private localStorageService: LocalStorageService,
    private reminderPermissions: ReminderPermissionsService
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

  async showZikarTestNotification(text = 'This is a Zikar notification test.'): Promise<boolean> {
    if (!(await this.ensurePermission())) return false;
    const sound = ZIKAR_SOUND_BY_ID['SUBHANALLAH'];
    const channelId = await this.ensureZikarNotificationChannel(sound);
    await this.scheduleNotification({
      id: this.getTestNotificationId() + 1,
      title: 'Zikar reminder',
      body: text,
      delayMs: 2000,
      sound,
      channelId
    });
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Salah Notifications                                                 */
  /* ------------------------------------------------------------------ */

  async scheduleZikarNotifications(items: ZikarReminderItem[], intervalMinutes = 10, category = 'all'): Promise<boolean> {
    if (!items.length) {
      await this.cancelZikarNotifications();
      return false;
    }

    if (!(await this.ensurePermission())) {
      return false;
    }

    const config: ZikarReminderConfig = {
      enabled: true,
      category,
      intervalMinutes: Math.max(1, Math.floor(intervalMinutes)),
      anchorAt: Date.now(),
      items
    };
    this.localStorageService.setItem(this.ZIKAR_CONFIG_STORAGE_KEY, config);

    // Without exact alarms Android batches inexact alarms that are minutes apart, so two
    // reminders arrive together and the alert rate limiter silences the second one.
    await this.reminderPermissions.request('exactAlarms');
    await this.queueZikarNotifications(config);
    return true;
  }

  /** Tops up the rolling zikar queue; called on app launch/resume. */
  async refillZikarNotifications(): Promise<void> {
    const config = this.getZikarReminderConfig();
    if (!config?.enabled || !config.items.length) {
      return;
    }

    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        return;
      }
      await this.queueZikarNotifications(config);
    } catch (error) {
      console.warn('[Notification] Zikar refill failed', error);
    }
  }

  async cancelZikarNotifications(): Promise<void> {
    const config = this.getZikarReminderConfig();
    if (config?.enabled) {
      this.localStorageService.setItem(this.ZIKAR_CONFIG_STORAGE_KEY, { ...config, enabled: false });
    }
    await this.cancelZikarQueue();
  }

  getZikarReminderConfig(): ZikarReminderConfig | null {
    return this.localStorageService.getItem<ZikarReminderConfig>(this.ZIKAR_CONFIG_STORAGE_KEY);
  }

  async cancelAllSalahNotifications() {
    await LocalNotifications.cancel({
      notifications: this.getAllManagedNotificationIds()
        .map(id => ({ id }))
    });

    console.log('[Notification] Salah notifications cancelled');
  }

  async listScheduledSalahNotifications(): Promise<PendingLocalNotificationSchema[]> {
    const result = await LocalNotifications.getPending();
    const ids = this.getAllManagedNotificationIds();

    return result.notifications.filter(n => ids.includes(n.id));
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

    // Without "Alarms & reminders" Android may deliver azan minutes late. Opens the system
    // screen only when not yet granted (setup normally covers it).
    await this.reminderPermissions.request('exactAlarms');

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

    const notifications = this.buildSalahNotifications(settings);

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  getReminderPreference(key: SalahKey): SalahReminderPreference {
    const saved = this.getSavedReminderPreferences();
    return saved[key] ?? this.getGlobalReminderPreference();
  }

  getReminderPreferences(): Partial<Record<SalahKey, SalahReminderPreference>> {
    return this.getSavedReminderPreferences();
  }

  setReminderPreference(key: SalahKey, preference: SalahReminderPreference): void {
    const saved = this.getSavedReminderPreferences();
    saved[key] = this.normalizeReminderPreference(preference);
    this.localStorageService.setItem(this.REMINDER_PREFERENCE_STORAGE_KEY, saved);
  }

  getGlobalReminderPreference(): SalahReminderPreference {
    const saved = this.localStorageService.getItem<SalahReminderPreference>(
      this.GLOBAL_REMINDER_PREFERENCE_STORAGE_KEY
    );

    if (!saved) {
      return this.getDefaultReminderPreference();
    }

    return this.normalizeReminderPreference({
      enabled: true,
      sound: saved.sound,
      azanId: saved.azanId
    });
  }

  setGlobalReminderPreference(preference: Pick<SalahReminderPreference, 'sound' | 'azanId'>): void {
    const normalized = this.normalizeReminderPreference({
      enabled: true,
      sound: preference.sound,
      azanId: preference.azanId
    });

    this.localStorageService.setItem(this.GLOBAL_REMINDER_PREFERENCE_STORAGE_KEY, normalized);
  }

  async applyGlobalReminderPreferenceToEnabledRemindersAndSync(): Promise<void> {
    const saved = this.getSavedReminderPreferences();
    const globalPreference = this.getGlobalReminderPreference();
    let hasEnabledReminder = false;

    (Object.keys(saved) as SalahKey[]).forEach((key) => {
      const preference = saved[key];
      if (!preference?.enabled) {
        return;
      }

      hasEnabledReminder = true;
      saved[key] = {
        ...preference,
        sound: globalPreference.sound,
        azanId: globalPreference.azanId
      };
    });

    this.localStorageService.setItem(this.REMINDER_PREFERENCE_STORAGE_KEY, saved);

    if (hasEnabledReminder) {
      await this.syncSalahNotifications();
    }
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

    await LocalNotifications.schedule({
      notifications: [{
        id: opts.id,
        title: opts.title,
        body: opts.body,
        schedule: { at: scheduleAt, allowWhileIdle: true },
        channelId: opts.channelId ?? environment.notificationChannelId,
        sound: opts.sound
      }]
    });
  }

  // allowWhileIdle is always true: the plugin then uses setExactAndAllowWhileIdle when exact
  // alarms are granted, and setAndAllowWhileIdle (RTC_WAKEUP) otherwise. With false it fell back
  // to a plain RTC alarm that never wakes a dozing phone, so azans were silently skipped.
  private buildSalahNotifications(settings: SalahSettings) {
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

    Array.from({ length: this.SCHEDULE_DAYS_AHEAD }, (_, dayOffset) => dayOffset).forEach(dayOffset => {
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
          schedule: { at: start, allowWhileIdle: true },
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

  /** True when the user expects salah reminders to ring. */
  hasActiveSalahReminders(): boolean {
    const settings = this.settingsService.getCurrentSettings();
    return !!settings?.location && this.hasEnabledReminderPreferences();
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

  private getManagedNotificationId(key: SalahKey, dayOffset: number): number {
    const baseId = this.PRAYER_NOTIFICATION_IDS[key];
    return baseId + (dayOffset * this.NEXT_DAY_NOTIFICATION_OFFSET);
  }

  private getAllManagedNotificationIds(): number[] {
    return Object.values(this.PRAYER_NOTIFICATION_IDS).flatMap(id =>
      Array.from(
        { length: this.SCHEDULE_DAYS_AHEAD },
        (_, dayOffset) => id + (dayOffset * this.NEXT_DAY_NOTIFICATION_OFFSET)
      )
    );
  }

  private getTestNotificationId(): number {
    return 900000 + Math.floor(Date.now() % 100000);
  }


  private async queueZikarNotifications(config: ZikarReminderConfig): Promise<void> {
    await this.cancelZikarQueue();

    const intervalMs = config.intervalMinutes * 60 * 1000;
    const elapsedSlots = Math.floor((Date.now() - config.anchorAt) / intervalMs);
    const firstSlot = Math.max(1, elapsedSlots + 1);
    const channelBySound = await this.ensureZikarNotificationChannels(config.items);

    const notifications = Array.from({ length: this.ZIKAR_QUEUE_SIZE }, (_, offset) => {
      const slot = firstSlot + offset;
      const item = config.items[(slot - 1) % config.items.length];
      const sound = ZIKAR_SOUND_BY_ID[item.id];
      return {
        // Consecutive slots map to distinct IDs, so a refill replaces rather than duplicates.
        id: this.ZIKAR_NOTIFICATION_BASE_ID + (slot % this.ZIKAR_QUEUE_SIZE),
        title: item.text,
        body: '',
        schedule: { at: new Date(config.anchorAt + (slot * intervalMs)), allowWhileIdle: true },
        channelId: (sound && channelBySound.get(sound)) || environment.notificationChannelId,
        sound,
        extra: { zikarId: item.id }
      };
    });

    await LocalNotifications.schedule({ notifications });
  }

  private async cancelZikarQueue(): Promise<void> {
    const queueIds = Array.from({ length: this.ZIKAR_QUEUE_SIZE }, (_, index) => this.ZIKAR_NOTIFICATION_BASE_ID + index);
    await LocalNotifications.cancel({
      notifications: [...queueIds, ...this.LEGACY_ZIKAR_NOTIFICATION_IDS].map(id => ({ id }))
    });
  }

  private async ensureZikarNotificationChannels(items: ZikarReminderItem[]): Promise<Map<string, string>> {
    const sounds = Array.from(new Set(
      items.map(item => ZIKAR_SOUND_BY_ID[item.id]).filter((sound): sound is string => !!sound)
    ));
    if (sounds.length < items.length) {
      await this.ensureDefaultNotificationChannel();
    }

    const channelIds = await Promise.all(sounds.map(sound => this.ensureZikarNotificationChannel(sound)));
    return new Map(sounds.map((sound, index) => [sound, channelIds[index]]));
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

    await this.ensureSoundNotificationChannel(
      channelId,
      `${environment.notificationChannelName} ${resolvedAzanId}`,
      environment.notificationChannelName,
      sound
    );
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

  private async ensureZikarNotificationChannel(sound: string): Promise<string> {
    // Bumped from v4: older channels were created while the zikar raw sounds were stripped by shrinkResources.
    const channelId = `zikar_v5_${sound.replace(/[^a-z0-9]/gi, '_').replace(/_mp3$/, '')}`;
    await this.ensureSoundNotificationChannel(
      channelId,
      'Zikar Notifications',
      'Zikar reminder notifications',
      sound
    );
    return channelId;
  }

  private async ensureSoundNotificationChannel(
    id: string,
    name: string,
    description: string,
    sound: string
  ): Promise<void> {
    const channel: Channel = {
      id,
      name,
      description,
      importance: 5,
      vibration: true,
      sound
    };

    try {
      await LocalNotifications.createChannel(channel);
    } catch {
      // Android channels are immutable; an existing channel can be reused.
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
