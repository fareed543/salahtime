import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminNotificationItem,
  NotificationsService,
  SaveAdminNotificationPayload
} from './notifications.service';

interface NotificationFormValue {
  title: string;
  message: string;
  audience: string;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  isPublishing = false;
  errorMessage = '';
  feedbackMessage = '';
  form: NotificationFormValue = this.createEmptyForm();
  mode: 'create' | 'view' | 'edit' = 'create';
  notificationId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string; isPublished: boolean } | null = null;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' ?? 'create';
    const idParam = this.route.snapshot.paramMap.get('id');
    this.notificationId = idParam ? Number(idParam) : null;
    if (this.notificationId) {
      this.loadNotification(this.notificationId);
      return;
    }

    this.isLoading = false;
  }

  get title(): string {
    if (this.mode === 'edit') {
      return 'Edit Notification';
    }
    if (this.mode === 'view') {
      return 'Notification Details';
    }
    return 'Create Notification';
  }

  get subtitle(): string {
    if (this.mode === 'edit') {
      return 'Update the selected announcement before saving or publishing it.';
    }
    if (this.mode === 'view') {
      return 'Review the selected notification record and delivery status.';
    }
    return 'Create a new announcement for installed users.';
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Notifications', route: '/notifications' },
      { label: this.title }
    ];
  }

  save(): void {
    if (this.isReadOnly) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.notificationsService.saveNotification(payload).subscribe({
      next: async (response) => {
        const nextId = response.current?.id ?? this.notificationId ?? null;
        this.isSaving = false;
        this.feedbackMessage = 'Notification draft saved successfully.';
        if (nextId) {
          await this.router.navigate(['/notifications', nextId]);
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save the notification draft.';
      }
    });
  }

  publish(): void {
    if (this.isReadOnly) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isPublishing = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.notificationsService.publishNotification(payload).subscribe({
      next: async (response) => {
        const nextId = response.current?.id ?? this.notificationId ?? null;
        this.isPublishing = false;

        const dispatch = response.publishDispatch;
        if (dispatch?.attempted && dispatch.success) {
          this.feedbackMessage = `Notification published successfully to ${dispatch.tokenCount ?? 0} registered devices.`;
        } else if (dispatch?.attempted) {
          this.feedbackMessage = 'Notification was published, but push delivery reported an issue. Frontend sync will still pick it up.';
        } else {
          this.feedbackMessage = 'Notification published successfully. Frontend sync will deliver it to installed users.';
        }

        if (nextId) {
          await this.router.navigate(['/notifications', nextId]);
        }
      },
      error: (error) => {
        this.isPublishing = false;
        this.errorMessage = error?.error?.error || error?.message || 'Unable to publish the notification.';
      }
    });
  }

  cancelEdit(): void {
    if (this.notificationId) {
      if (this.mode === 'edit') {
        void this.router.navigate(['/notifications', this.notificationId]);
        return;
      }

      this.loadNotification(this.notificationId);
      return;
    }

    this.form = this.createEmptyForm();
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  private buildPayload(): SaveAdminNotificationPayload | null {
    const title = this.form.title.trim();
    const message = this.form.message.trim();

    if (!title) {
      this.errorMessage = 'Notification title is required.';
      return null;
    }

    if (!message) {
      this.errorMessage = 'Notification message is required.';
      return null;
    }

    return {
      id: this.notificationId,
      title,
      message,
      audience: this.form.audience.trim() || 'all'
    };
  }

  private mapItemToForm(item: AdminNotificationItem | null): NotificationFormValue {
    if (!item) {
      return this.createEmptyForm();
    }

    return {
      title: item.title ?? '',
      message: item.message ?? '',
      audience: item.audience ?? 'all'
    };
  }

  private createEmptyForm(): NotificationFormValue {
    return {
      title: '',
      message: '',
      audience: 'all'
    };
  }

  formatAuditDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  private loadNotification(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationsService.getNotificationById(id).subscribe({
      next: (item) => {
        if (!item) {
          this.errorMessage = 'Notification not found.';
          this.isLoading = false;
          return;
        }

        this.form = this.mapItemToForm(item);
        this.auditDetails = {
          createdAt: item.createdAt ?? '',
          updatedAt: item.updatedAt ?? '',
          isPublished: item.isPublished
        };
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load notification records right now.';
        this.isLoading = false;
      }
    });
  }
}
