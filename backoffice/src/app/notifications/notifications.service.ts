import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environment/environment';

export interface AdminNotificationItem {
  id: number;
  title: string;
  message: string;
  audience: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  createdByCustomerId: number | null;
  publishedByCustomerId: number | null;
}

export interface AdminNotificationsResponse {
  current: AdminNotificationItem | null;
  items: AdminNotificationItem[];
  publishDispatch?: {
    attempted: boolean;
    success?: boolean;
    reason?: string | null;
    /** NF-013: devices with notifications on (all subscribed to the "all-users" topic). */
    deviceCount?: number;
  };
}

/** NF-013: result of "Send test to my phone". */
export interface TestNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  removed: number;
  reason?: string;
}

export interface SaveAdminNotificationPayload {
  id?: number | null;
  title: string;
  message: string;
  audience: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  getNotifications(): Observable<AdminNotificationsResponse> {
    return this.http.get<AdminNotificationsResponse>(
      `${environment.apiUrl}admin/notifications`,
      { headers: this.buildAuthHeaders() }
    );
  }

  getNotificationById(id: number): Observable<AdminNotificationItem | null> {
    return this.getNotifications().pipe(
      map((response) => (response.items ?? []).find((item) => item.id === id) ?? null)
    );
  }

  saveNotification(payload: SaveAdminNotificationPayload): Observable<AdminNotificationsResponse> {
    return this.http.post<AdminNotificationsResponse>(
      `${environment.apiUrl}admin/save-notification`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  /** NF-013: sends a test push to the signed-in admin's own devices only. */
  sendTestNotification(payload: { title?: string; message?: string }): Observable<TestNotificationResult> {
    return this.http.post<TestNotificationResult>(
      `${environment.apiUrl}admin/send-test-notification`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  publishNotification(payload: SaveAdminNotificationPayload): Observable<AdminNotificationsResponse> {
    return this.http.post<AdminNotificationsResponse>(
      `${environment.apiUrl}admin/publish-notification`,
      payload,
      { headers: this.buildAuthHeaders() }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
