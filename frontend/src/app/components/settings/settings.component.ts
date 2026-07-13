import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import {
  SalahSettings,
  SettingsData
} from 'src/app/models/salah.model';
import { NotificationService } from 'src/app/services/notification.service';
import { SettingsService } from 'src/app/services/settings.service';
import {
  AzanReminderDialogComponent,
  AzanReminderDialogResult
} from 'src/app/shared/azan-reminder-dialog/azan-reminder-dialog.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  readonly farzOffsets = [
    { key: 'sahriOffset', label: 'Sahri' },
    { key: 'fajrOffset', label: 'Fajr' },
    { key: 'dhuhrOffset', label: 'Dhuhr' },
    { key: 'asrOffset', label: 'Asr' },
    { key: 'iftarOffset', label: 'Iftar' },
    { key: 'maghribOffset', label: 'Maghrib' },
    { key: 'ishaOffset', label: 'Isha' }
  ];

  readonly calculationMethods = SettingsData;
  salahSettingsForm!: FormGroup;
  scheduledNotifications: any[] = [];
  testingNotification = false;
  testNotificationMessage = '';
  testNotificationError = '';

  private readonly destroy$ = new Subject<void>();
  private formInitialized = false;
  private lastNotificationHash: string | null = null;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.settingsService.settings$
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe((settings) => {
        this.initOrUpdateForm(settings!);
        void this.syncNotificationsWhenNeeded(settings!);
      });

    void this.loadScheduledNotificationsIfPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openTestNotificationDialog(): void {
    this.testNotificationMessage = '';
    this.testNotificationError = '';

    const dialogRef = this.matDialog.open(AzanReminderDialogComponent, {
      panelClass: 'azan-reminder-dialog-panel',
      data: {
        selectedAzanId: 'default',
        salahName: 'Test Notification'
      }
    });

    dialogRef.afterClosed()
      .pipe(
        filter((result): result is AzanReminderDialogResult => !!result?.azanId),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => void this.sendTestNotification(result.azanId));
  }

  async onReset(): Promise<void> {
    await this.settingsService.resetToDefaults();
    await this.notificationService.cancelAllSalahNotifications();
    this.scheduledNotifications = [];
  }

  increment(control: string): void {
    const ctrl = this.salahSettingsForm.get(control);
    if (!ctrl) return;
    ctrl.setValue((Number(ctrl.value) || 0) + 1);
  }

  decrement(control: string): void {
    const ctrl = this.salahSettingsForm.get(control);
    if (!ctrl) return;
    ctrl.setValue((Number(ctrl.value) || 0) - 1);
  }

  private initOrUpdateForm(settings: SalahSettings): void {
    if (!this.formInitialized) {
      this.salahSettingsForm = this.fb.group({
        calculationMethod: [settings.calculationMethod],
        madhab: [settings.madhab],
        location: [settings.location],
        enableNotifications: [settings.enableNotifications],
        sahriOffset: [settings.sahriOffset ?? 0],
        fajrOffset: [settings.fajrOffset ?? 0],
        dhuhrOffset: [settings.dhuhrOffset ?? 0],
        asrOffset: [settings.asrOffset ?? 0],
        iftarOffset: [settings.iftarOffset ?? 0],
        maghribOffset: [settings.maghribOffset ?? 0],
        ishaOffset: [settings.ishaOffset ?? 0]
      });

      this.salahSettingsForm.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((value) => this.settingsService.updateSettings({
          ...this.settingsService.getCurrentSettings(),
          ...value
        }));
      this.formInitialized = true;
      return;
    }

    this.salahSettingsForm.patchValue({
      ...settings,
    }, { emitEvent: false });
  }

  private async syncNotificationsWhenNeeded(settings: SalahSettings): Promise<void> {
    const hash = JSON.stringify({
      enabled: settings.enableNotifications,
      location: settings.location,
      calculationMethod: settings.calculationMethod,
      madhab: settings.madhab,
      offsets: {
        sahri: settings.sahriOffset,
        fajr: settings.fajrOffset,
        dhuhr: settings.dhuhrOffset,
        asr: settings.asrOffset,
        maghrib: settings.maghribOffset,
        iftar: settings.iftarOffset,
        isha: settings.ishaOffset
      }
    });

    if (hash === this.lastNotificationHash) return;
    this.lastNotificationHash = hash;

    if (settings.enableNotifications) {
      await this.notificationService.syncSalahNotifications();
    } else {
      await this.notificationService.cancelAllSalahNotifications();
    }
    setTimeout(() => void this.loadScheduledNotifications(), 1000);
  }

  private async sendTestNotification(azanId: string): Promise<void> {
    this.testingNotification = true;
    this.testNotificationMessage = '';
    this.testNotificationError = '';

    try {
      const scheduled = await this.notificationService.showTestNotification({
        sound: azanId === 'default' ? 'default' : 'azan',
        azanId
      });
      if (scheduled) {
        this.testNotificationMessage = 'Test notification scheduled. It will appear in 2 seconds.';
      } else {
        this.testNotificationError = 'Notification permission is required to run the test.';
      }
    } catch {
      this.testNotificationError = 'Unable to schedule the test notification.';
    } finally {
      this.testingNotification = false;
    }
  }

  private async loadScheduledNotificationsIfPermission(): Promise<void> {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display === 'granted') {
      await this.loadScheduledNotifications();
    }
  }

  private async loadScheduledNotifications(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    this.scheduledNotifications = pending.notifications || [];
  }
}
