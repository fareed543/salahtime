import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { LocalStorageService } from './local-storage.service';

interface PublishedNotificationItem {
  id: number;
  title: string;
  message: string;
  audience: string;
  publishedAt: string;
}

interface PublishedNotificationsResponse {
  items: PublishedNotificationItem[];
  serverTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastNotificationService {
  private readonly installIdKey = 'broadcast-notification-install-id';
  private readonly lastSeenIdKey = 'broadcast-notification-last-seen-id';
  private readonly deliveredIdsKey = 'broadcast-notification-delivered-ids';
  private readonly localNotificationOffset = 800000;

  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService
  ) {}

  syncPublishedNotifications(): Observable<number> {
    const sinceId = this.localStorageService.getItem<number>(this.lastSeenIdKey) ?? 0;

    return this.http.get<PublishedNotificationsResponse>(
      `${environment.apiUrl}admin/public-notifications?sinceId=${sinceId}&limit=20`
    ).pipe(
      map((response) => {
        const items = response.items ?? [];
        void this.registerInstall();

        if (!items.length) {
          return 0;
        }

        let deliveredCount = 0;
        for (const item of items) {
          this.markLastSeenId(item.id);

          if (!this.isAudienceSupported(item.audience) || this.hasDelivered(item.id)) {
            continue;
          }

          void this.showLocalNotification(item);
          this.markDelivered(item.id);
          deliveredCount++;
        }

        return deliveredCount;
      }),
      catchError(() => of(0))
    );
  }

  async registerInstall(pushToken?: string | null): Promise<void> {
    const payload = {
      installId: this.getOrCreateInstallId(),
      platform: Capacitor.getPlatform(),
      pushToken: pushToken ?? null,
      notificationsEnabled: true,
      appVersion: environment.appVersion
    };

    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}admin/register-push-subscription`, payload));
    } catch {}
  }

  private isAudienceSupported(audience: string): boolean {
    return !audience || audience === 'all';
  }

  private hasDelivered(id: number): boolean {
    return this.getDeliveredIds().includes(id);
  }

  private markDelivered(id: number): void {
    const ids = this.getDeliveredIds();
    if (ids.includes(id)) {
      return;
    }

    const next = [...ids, id].slice(-100);
    this.localStorageService.setItem(this.deliveredIdsKey, next);
  }

  private getDeliveredIds(): number[] {
    const ids = this.localStorageService.getItem<number[]>(this.deliveredIdsKey);
    return Array.isArray(ids) ? ids.filter((value) => Number.isInteger(value)) : [];
  }

  private markLastSeenId(id: number): void {
    const current = this.localStorageService.getItem<number>(this.lastSeenIdKey) ?? 0;
    if (id > current) {
      this.localStorageService.setItem(this.lastSeenIdKey, id);
    }
  }

  private getOrCreateInstallId(): string {
    const existing = this.localStorageService.getRawItem(this.installIdKey);
    if (existing) {
      return existing;
    }

    const generated = `install-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.localStorageService.setItem(this.installIdKey, generated);
    return generated;
  }

  private async showLocalNotification(item: PublishedNotificationItem): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: this.localNotificationOffset + item.id,
          title: item.title,
          body: item.message,
          channelId: environment.notificationChannelId,
          schedule: { at: new Date(Date.now() + 1000) }
        }]
      });
    } catch {}
  }
}
