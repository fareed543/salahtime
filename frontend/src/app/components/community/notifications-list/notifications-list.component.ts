import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { PushPermission, PushService } from 'src/app/services/push.service';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';

interface Announcement {
  id: number;
  title: string;
  message: string;
  publishedAt: string | null;
}

/**
 * NF-013: announcements published in the back office, newest first. Tapping a push notification
 * opens this screen; it also serves users who turned push notifications off, and the website.
 */
@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, LoadingSpinnerComponent, ScreenHeaderComponent],
  template: `
    <div class="row gx-3">
      <div class="col-12">
        <app-screen-header [title]="'ANNOUNCEMENTS.TITLE' | translate" [subtitle]="'ANNOUNCEMENTS.SUBTITLE' | translate" [showBack]="true" backFallback="/"></app-screen-header>
      </div>

      <div class="col-12" *ngIf="permission === 'prompt' || permission === 'denied'">
        <div class="nl-hint">
          <i class="bi bi-bell-slash" aria-hidden="true"></i>
          <span>{{ (permission === 'denied' ? 'ANNOUNCEMENTS.OFF_DENIED' : 'ANNOUNCEMENTS.OFF_PROMPT') | translate }}</span>
          <button *ngIf="permission === 'prompt'" type="button" class="btn btn-sm btn-theme" (click)="turnOn()">{{ 'PUSH.TURN_ON' | translate }}</button>
        </div>
      </div>

      <div class="col-12" *ngIf="loading">
        <app-loading-spinner [label]="'ANNOUNCEMENTS.TITLE' | translate"></app-loading-spinner>
      </div>

      <div class="col-12" *ngIf="!loading">
        <p class="text-secondary" *ngIf="error">{{ 'ANNOUNCEMENTS.LOAD_ERROR' | translate }}</p>
        <div class="nl-empty" *ngIf="!error && !items.length">
          <i class="bi bi-bell" aria-hidden="true"></i>
          <p>{{ 'ANNOUNCEMENTS.EMPTY' | translate }}</p>
        </div>
        <ul class="nl-list" *ngIf="items.length">
          <li *ngFor="let item of items; trackBy: trackById" class="card adminuiux-card border-0 shadow-sm">
            <div class="card-body">
              <h2 class="nl-title">{{ item.title }}</h2>
              <p class="nl-message">{{ item.message }}</p>
              <time class="nl-date" *ngIf="item.publishedAt" [attr.datetime]="item.publishedAt">{{ toDate(item.publishedAt) | date:'d MMM y, h:mm a' }}</time>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .nl-hint { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.75rem; margin-bottom: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.75rem; background: rgba(17, 116, 99, 0.08); font-size: 0.875rem; }
    .nl-hint span { flex: 1 1 12rem; min-width: 0; }
    .nl-hint i { color: #117463; }
    .nl-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
    .nl-title { margin: 0 0 0.35rem; font-size: 1rem; font-weight: 700; overflow-wrap: anywhere; }
    .nl-message { margin: 0 0 0.5rem; white-space: pre-line; overflow-wrap: anywhere; }
    .nl-date { font-size: 0.8125rem; color: #5f7470; }
    .nl-empty { padding: 3rem 1rem; text-align: center; color: #5f7470; }
    .nl-empty i { font-size: 2rem; color: #117463; }
  `]
})
export class NotificationsListComponent implements OnInit {
  items: Announcement[] = [];
  loading = true;
  error = false;
  permission: PushPermission = 'unsupported';

  constructor(private http: HttpClient, private push: PushService) {}

  ngOnInit(): void {
    this.push.permission$.subscribe((value) => this.permission = value);
    this.http.get<{ list: Announcement[] }>(`${environment.apiUrl}admin/public-notifications`).subscribe({
      next: (response) => {
        this.items = response?.list ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  trackById = (_: number, item: Announcement): number => item.id;

  /** MySQL "Y-m-d H:i:s" as a local date. */
  toDate(value: string): Date {
    return new Date(value.replace(' ', 'T'));
  }

  async turnOn(): Promise<void> {
    await this.push.askPermission();
  }
}
