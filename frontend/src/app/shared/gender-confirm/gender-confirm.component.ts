import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotifyService } from 'src/app/services/notify.service';
import { AppTranslateService } from 'src/app/services/translate.service';

export type Gender = 'm' | 'f';

/** The signed-in user's gender, or null when it is not set or not yet confirmed (NF-012). */
export function storedGender(storage: LocalStorageService): Gender | null {
  const user = storage.getItem<any>('userInfo');
  return user?.gender === 'm' || user?.gender === 'f' ? user.gender : null;
}

/** True when the user still has to confirm their gender once (accounts from before NF-012). */
export function needsGenderConfirmation(storage: LocalStorageService): boolean {
  const user = storage.getItem<any>('userInfo');
  return !!user && (Number(user.gender_confirmed ?? 0) !== 1 || !storedGender(storage));
}

/**
 * NF-012: member lists are separated by gender, so a user without a confirmed gender picks it
 * here once. Saves to the profile and emits the choice.
 */
@Component({
  selector: 'app-gender-confirm',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="gender-confirm" role="group" [attr.aria-labelledby]="headingId">
      <div class="gender-confirm-copy">
        <h2 class="gender-confirm-title" [id]="headingId">{{ 'GENDER_CONFIRM.TITLE' | translate }}</h2>
        <p class="gender-confirm-text">{{ (reason || 'GENDER_CONFIRM.TEXT') | translate }}</p>
      </div>
      <div class="gender-confirm-options">
        <button type="button" class="btn" [class.btn-theme]="current === 'm'" [class.btn-outline-theme]="current !== 'm'"
          [disabled]="saving" (click)="choose('m')">
          <i class="bi bi-person" aria-hidden="true"></i>{{ 'GENDER.MALE' | translate }}
        </button>
        <button type="button" class="btn" [class.btn-theme]="current === 'f'" [class.btn-outline-theme]="current !== 'f'"
          [disabled]="saving" (click)="choose('f')">
          <i class="bi bi-person-standing-dress" aria-hidden="true"></i>{{ 'GENDER.FEMALE' | translate }}
        </button>
      </div>
    </section>
  `,
  styles: [`
    .gender-confirm {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;
      padding: 1rem; border-radius: 0.75rem;
      background: var(--adminuiux-theme-1-bg-subtle, rgba(var(--bs-primary-rgb, 13, 110, 253), 0.08));
    }
    .gender-confirm-copy { min-width: 0; flex: 1 1 14rem; }
    .gender-confirm-title { font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem; }
    .gender-confirm-text { margin: 0; font-size: 0.875rem; color: var(--bs-secondary-color, #6c757d); }
    .gender-confirm-options { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .gender-confirm-options .btn { display: inline-flex; align-items: center; gap: 0.375rem; }
  `]
})
export class GenderConfirmComponent {
  /** Translation key explaining why we ask; defaults to the general text. */
  @Input() reason = '';
  @Output() confirmed = new EventEmitter<Gender>();

  saving = false;
  readonly headingId = `gender-confirm-${Math.random().toString(36).slice(2, 8)}`;

  constructor(
    private authApi: AuthApiService,
    private storage: LocalStorageService,
    private notify: NotifyService,
    private i18n: AppTranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  get current(): Gender | null {
    return storedGender(this.storage);
  }

  choose(gender: Gender): void {
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    const stored = this.storage.getItem<any>('userInfo') ?? {};
    this.authApi.saveProfile({ gender }).subscribe({
      next: (response) => {
        this.saving = false;
        // saveProfile stores the server profile; keep the login-only fields (roles, permissions).
        const remembered = localStorage.getItem('userInfo') !== null;
        this.storage.setAuthItem('userInfo', { ...stored, ...(response ?? {}), gender, gender_confirmed: 1 }, remembered);
        this.notify.success(this.i18n.translateWithParams('GENDER_CONFIRM.SAVED', {}));
        this.confirmed.emit(gender);
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.notify.error(this.i18n.translateWithParams('GENDER_CONFIRM.ERROR', {}));
        this.cdr.markForCheck();
      }
    });
  }
}
