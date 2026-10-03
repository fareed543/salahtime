import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import {
  ReminderPermissionKey,
  ReminderPermissionStatus,
  ReminderPermissionsService
} from 'src/app/services/reminder-permissions.service';

interface PermissionRow {
  key: ReminderPermissionKey;
  icon: string;
  titleKey: string;
  descKey: string;
}

const PERMISSION_ROWS: Record<ReminderPermissionKey, PermissionRow> = {
  notifications: {
    key: 'notifications',
    icon: 'bi-bell-fill',
    titleKey: 'ONBOARDING.PERM_NOTIFICATIONS_TITLE',
    descKey: 'ONBOARDING.PERM_NOTIFICATIONS_DESC'
  },
  exactAlarms: {
    key: 'exactAlarms',
    icon: 'bi-alarm-fill',
    titleKey: 'ONBOARDING.PERM_ALARMS_TITLE',
    descKey: 'ONBOARDING.PERM_ALARMS_DESC'
  },
  battery: {
    key: 'battery',
    icon: 'bi-battery-charging',
    titleKey: 'ONBOARDING.PERM_BATTERY_TITLE',
    descKey: 'ONBOARDING.PERM_BATTERY_DESC'
  }
};

@Component({
  selector: 'app-onboarding-notifications',
  templateUrl: './onboarding-notifications.component.html'
})
export class OnboardingNotificationsComponent implements OnInit {
  // Emits whether notification permission ended up granted.
  @Output() turnOn = new EventEmitter<boolean>();

  readonly rows: PermissionRow[];
  status: ReminderPermissionStatus | null = null;
  busy = false;

  constructor(private permissions: ReminderPermissionsService) {
    this.rows = this.permissions.applicableKeys.map((key) => PERMISSION_ROWS[key]);
  }

  async ngOnInit(): Promise<void> {
    await this.refreshStatus();
  }

  // Users may grant a permission from system settings and come back; reflect that.
  @HostListener('document:visibilitychange')
  async onVisibilityChange(): Promise<void> {
    if (!document.hidden && !this.busy) {
      await this.refreshStatus();
    }
  }

  get allGranted(): boolean {
    return !!this.status && this.rows.every((row) => this.status![row.key]);
  }

  isGranted(key: ReminderPermissionKey): boolean {
    return !!this.status?.[key];
  }

  async allow(key: ReminderPermissionKey): Promise<void> {
    if (this.busy || this.isGranted(key)) {
      return;
    }

    this.busy = true;
    try {
      await this.requestAndStore(key);
    } finally {
      this.busy = false;
    }
  }

  async allowAll(): Promise<void> {
    if (this.busy) {
      return;
    }

    this.busy = true;
    try {
      // One system prompt at a time, in order; each resolves when the user returns.
      for (const row of this.rows) {
        if (!this.isGranted(row.key)) {
          await this.requestAndStore(row.key);
        }
      }
    } finally {
      this.busy = false;
    }

    if (this.allGranted) {
      this.finish();
    }
  }

  finish(): void {
    this.turnOn.emit(this.isGranted('notifications'));
  }

  private async requestAndStore(key: ReminderPermissionKey): Promise<void> {
    const granted = await this.permissions.request(key);
    this.status = { ...(this.status ?? { notifications: false, exactAlarms: false, battery: false }), [key]: granted };
  }

  private async refreshStatus(): Promise<void> {
    this.status = await this.permissions.getStatus();
  }
}
