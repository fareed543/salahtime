import { Component, HostListener, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ReminderPermissionKey, ReminderPermissionsService } from 'src/app/services/reminder-permissions.service';

const SNOOZE_STORAGE_KEY = 'reminder-health-snoozed-until';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Warns users whose salah reminders are on but cannot ring reliably (missing permissions or
 * an empty alarm queue) and fixes it in one tap. Covers installs that predate the setup
 * permissions step.
 */
@Component({
  selector: 'app-reminder-health-banner',
  templateUrl: './reminder-health-banner.component.html',
  styleUrls: ['./reminder-health-banner.component.scss']
})
export class ReminderHealthBannerComponent implements OnInit {
  visible = false;
  fixing = false;
  missing: ReminderPermissionKey[] = [];
  queueEmpty = false;
  showAutostartHint = false;

  constructor(
    private permissions: ReminderPermissionsService,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  // Re-check after the user returns from system settings.
  @HostListener('document:visibilitychange')
  async onVisibilityChange(): Promise<void> {
    if (!document.hidden && !this.fixing) {
      await this.refresh();
    }
  }

  async fix(): Promise<void> {
    if (this.fixing) {
      return;
    }

    this.fixing = true;
    try {
      // One system screen at a time; each resolves when the user comes back.
      for (const key of this.missing) {
        await this.permissions.request(key);
      }
      await this.notificationService.syncSalahNotifications();
    } finally {
      this.fixing = false;
    }

    await this.refresh();
  }

  dismiss(): void {
    this.localStorageService.setItem(SNOOZE_STORAGE_KEY, Date.now() + SNOOZE_MS);
    this.visible = false;
  }

  private async refresh(): Promise<void> {
    if (!this.permissions.isNative || !this.notificationService.hasActiveSalahReminders() || this.isSnoozed()) {
      this.visible = false;
      return;
    }

    try {
      const status = await this.permissions.getStatus();
      this.missing = this.permissions.applicableKeys.filter((key) => !status[key]);
      // With notifications allowed and reminders on, the 30-day queue should never be empty;
      // empty means alarms were wiped (force stop, OEM cleaner) and need rescheduling.
      this.queueEmpty = status.notifications
        && (await this.notificationService.listScheduledSalahNotifications()).length === 0;
      this.showAutostartHint = await this.permissions.needsAutostartHint();
      this.visible = this.missing.length > 0 || this.queueEmpty;
    } catch (error) {
      console.warn('[ReminderHealth] Status check failed', error);
      this.visible = false;
    }
  }

  private isSnoozed(): boolean {
    const snoozedUntil = this.localStorageService.getItem<number>(SNOOZE_STORAGE_KEY);
    return typeof snoozedUntil === 'number' && snoozedUntil > Date.now();
  }
}
