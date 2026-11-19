import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

// SalahTime brand colours (see styles/_variables.scss).
const BRAND = {
  primary: '#117463',
  primaryDark: '#11483f',
  danger: '#c0392b',
  warning: '#d68910',
  info: '#1aa992',
};

const ICON_COLOR: Record<SweetAlertIcon, string> = {
  success: BRAND.primary,
  error: BRAND.danger,
  warning: BRAND.warning,
  info: BRAND.info,
  question: BRAND.primary,
};

/**
 * Branded SweetAlert2 notifications for action results (CR-004): success, warning and info as
 * auto-closing toasts, errors as a centered dialog with an OK button so they cannot be missed.
 * Messages are shown as given; callers translate keys first.
 * The library is loaded on first use, so it stays out of the initial bundle (PERF-03).
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private swal?: Promise<typeof import('sweetalert2').default>;

  constructor(private readonly translate: TranslateService) {}

  // CR-023 (owner, 2026-11-19): every action result is the classic SweetAlert dialog — big icon, title,
  // message, OK — centred on screen. Success also closes itself after 3 s so quick flows keep moving.
  success(message: string): void {
    void this.alert('success', message, 3000);
  }

  error(message: string): void {
    void this.alert('error', message);
  }

  warning(message: string): void {
    void this.alert('warning', message);
  }

  info(message: string): void {
    void this.alert('info', message);
  }

  /** Resolves true when the user confirms. */
  async confirm(options: { title: string; text?: string; confirmText: string; cancelText: string; danger?: boolean }): Promise<boolean> {
    const Swal = await this.load();
    const result = await Swal.fire(this.brand({
      icon: options.danger ? 'warning' : 'question',
      title: options.title,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmText,
      cancelButtonText: options.cancelText,
      confirmButtonColor: options.danger ? BRAND.danger : BRAND.primary,
      reverseButtons: true,
      focusCancel: !!options.danger,
    }));
    return result.isConfirmed;
  }

  private async alert(icon: SweetAlertIcon, message: string, timer?: number): Promise<void> {
    if (!message) {
      return;
    }
    const Swal = await this.load();
    await Swal.fire(this.brand({
      icon,
      title: this.translate.instant(`NOTIFY.TITLE_${icon.toUpperCase()}`),
      text: message,
      confirmButtonText: this.translate.instant('TIME_PICKER.OK'),
      ...(timer ? { timer, timerProgressBar: true } : {}),
    }));
  }

  private brand(options: SweetAlertOptions): SweetAlertOptions {
    const icon = options.icon as SweetAlertIcon | undefined;
    return {
      color: BRAND.primaryDark,
      iconColor: icon ? ICON_COLOR[icon] : BRAND.primary,
      confirmButtonColor: BRAND.primary,
      cancelButtonColor: '#6b7280',
      customClass: { popup: 'st-swal' },
      ...options,
    };
  }

  private load(): Promise<typeof import('sweetalert2').default> {
    this.swal ??= import('sweetalert2').then((module) => module.default);
    return this.swal;
  }
}
