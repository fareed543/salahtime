import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PushService } from 'src/app/services/push.service';
import { NotifyService } from 'src/app/services/notify.service';
import { AppTranslateService } from 'src/app/services/translate.service';

const DISMISSED_KEY = 'pushPromptDismissedAt';
const ASK_AGAIN_DAYS = 30;

/**
 * NF-013: asks for notification permission in context (never on first launch): a Home card that
 * explains what the user gets, then the Android prompt. Hidden on the website, when already
 * allowed or blocked, and for 30 days after "Not now".
 */
@Component({
  selector: 'app-push-prompt-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section class="push-card mb-3" *ngIf="visible" role="group" [attr.aria-label]="'PUSH.CARD_TITLE' | translate">
      <span class="push-card-icon" aria-hidden="true"><i class="bi bi-bell"></i></span>
      <div class="push-card-copy">
        <h2 class="push-card-title">{{ 'PUSH.CARD_TITLE' | translate }}</h2>
        <p class="push-card-text">{{ 'PUSH.CARD_TEXT' | translate }}</p>
        <div class="push-card-actions">
          <button type="button" class="btn btn-sm btn-theme" [disabled]="busy" (click)="turnOn()">{{ 'PUSH.TURN_ON' | translate }}</button>
          <button type="button" class="btn btn-sm btn-link" (click)="notNow()">{{ 'PUSH.NOT_NOW' | translate }}</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .push-card { display: flex; gap: 0.75rem; padding: 0.875rem 1rem; border-radius: 1rem; background: #fff; box-shadow: 0 0.25rem 1rem rgba(14, 52, 44, 0.08); }
    .push-card-icon { flex: 0 0 2.5rem; width: 2.5rem; height: 2.5rem; display: grid; place-items: center; border-radius: 50%; background: rgba(17, 116, 99, 0.12); color: #117463; font-size: 1.2rem; }
    .push-card-copy { min-width: 0; }
    .push-card-title { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 700; }
    .push-card-text { margin: 0 0 0.5rem; font-size: 0.875rem; color: #5f7470; }
    .push-card-actions { display: flex; gap: 0.25rem; align-items: center; }
  `]
})
export class PushPromptCardComponent implements OnInit {
  visible = false;
  busy = false;

  constructor(private push: PushService, private notify: NotifyService, private i18n: AppTranslateService) {}

  ngOnInit(): void {
    if (!this.push.isSupported) {
      return;
    }
    this.push.permission$.subscribe((permission) => {
      this.visible = permission === 'prompt' && !this.recentlyDismissed();
    });
  }

  async turnOn(): Promise<void> {
    this.busy = true;
    const result = await this.push.askPermission();
    this.busy = false;
    this.visible = false;
    if (result === 'granted') {
      this.notify.success(this.i18n.translateWithParams('PUSH.ENABLED', {}));
    }
  }

  notNow(): void {
    this.visible = false;
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
  }

  private recentlyDismissed(): boolean {
    try {
      const at = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
      return at > 0 && Date.now() - at < ASK_AGAIN_DAYS * 86400000;
    } catch {
      return false;
    }
  }
}
