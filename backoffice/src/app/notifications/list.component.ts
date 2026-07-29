import { Component, OnInit } from '@angular/core';
import { AdminNotificationItem, NotificationsService } from './notifications.service';

@Component({
  selector: 'app-notifications-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class NotificationsListComponent implements OnInit {
  items: AdminNotificationItem[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private readonly notificationsService: NotificationsService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Notifications' }
    ];
  }

  trackById(_: number, item: AdminNotificationItem): number {
    return item.id;
  }

  private loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationsService.getNotifications().subscribe({
      next: (response) => {
        this.items = response.items ?? [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load notification records right now.';
        this.isLoading = false;
      }
    });
  }
}
