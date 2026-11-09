import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOGIN_REDIRECT } from './auth.interceptor';
import { NotifyService } from './notify.service';

export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

const INSTALL_ID_KEY = 'pushInstallId';
const ANNOUNCEMENTS_CHANNEL = 'announcements';

/**
 * NF-013: Firebase push notifications on Android.
 * - Never asks permission by itself: the Home card asks in context (askPermission()).
 * - When permission is granted, registers with FCM and sends the device token to the API, which
 *   subscribes it to the "all-users" topic for back-office announcements.
 * - Tapping a notification opens the Notifications list.
 * The website has no push (out of scope); it only shows the Notifications list.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  /** Current permission, for the Home card. */
  readonly permission$ = new BehaviorSubject<PushPermission>('unsupported');
  private started = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private zone: NgZone,
    private notify: NotifyService
  ) {}

  get isSupported(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
  }

  /** Called once at app start: listeners, channel, and registration when already allowed. */
  async start(): Promise<void> {
    if (!this.isSupported || this.started) {
      return;
    }
    this.started = true;
    try {
      await PushNotifications.createChannel({
        id: ANNOUNCEMENTS_CHANNEL,
        name: 'Announcements',
        description: 'Announcements from SalahTime and your masjid programs',
        importance: 4,
        visibility: 1,
        sound: 'default'
      });
      await PushNotifications.addListener('registration', (token: Token) => this.sendToken(token.value));
      await PushNotifications.addListener('registrationError', (error) => console.warn('Push registration failed', error));
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        // In the foreground Android does not show the system notification: show it in the app.
        this.zone.run(() => this.notify.info([notification.title, notification.body].filter(Boolean).join(': ')));
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', (_action: ActionPerformed) => {
        this.zone.run(() => void this.router.navigate(['/notifications']));
      });

      const status = await PushNotifications.checkPermissions();
      this.permission$.next(this.mapPermission(status.receive));
      if (status.receive === 'granted') {
        await PushNotifications.register();
      }
    } catch (error) {
      console.warn('Push notifications unavailable', error);
      this.permission$.next('unsupported');
    }
  }

  /** Asks Android's notification permission (Home card) and registers when allowed. */
  async askPermission(): Promise<PushPermission> {
    if (!this.isSupported) {
      return 'unsupported';
    }
    const status = await PushNotifications.requestPermissions();
    const permission = this.mapPermission(status.receive);
    this.permission$.next(permission);
    if (permission === 'granted') {
      await PushNotifications.register();
    }
    return permission;
  }

  /** Re-sends the token after sign-in / sign-out so per-user messages reach the right person. */
  async refreshRegistration(): Promise<void> {
    if (this.isSupported && this.permission$.value === 'granted') {
      await PushNotifications.register();
    }
  }

  private sendToken(pushToken: string): void {
    this.http.post(`${environment.apiUrl}admin/register-push-subscription`, {
      installId: this.installId(),
      platform: Capacitor.getPlatform(),
      pushToken,
      notificationsEnabled: true,
      appVersion: environment.appVersion
    }, { context: new HttpContext().set(SKIP_LOGIN_REDIRECT, true) }).subscribe({
      error: (error) => console.warn('Push token not saved', error)
    });
  }

  private installId(): string {
    let id = '';
    try {
      id = localStorage.getItem(INSTALL_ID_KEY) ?? '';
      if (!id) {
        id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem(INSTALL_ID_KEY, id);
      }
    } catch {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }
    return id;
  }

  private mapPermission(value: string): PushPermission {
    return value === 'granted' ? 'granted' : value === 'denied' ? 'denied' : 'prompt';
  }
}
