import { Injectable } from '@angular/core';
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
 * Branded SweetAlert2 toasts and confirm dialogs.
 * The library is loaded on first use, so it stays out of the initial bundle (PERF-03).
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private swal?: Promise<typeof import('sweetalert2').default>;

  success(message: string): void {
    void this.toast('success', message);
  }

  error(message: string): void {
    void this.toast('error', message, 6000);
  }

  warning(message: string): void {
    void this.toast('warning', message, 5000);
  }

  info(message: string): void {
    void this.toast('info', message);
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

  private async toast(icon: SweetAlertIcon, message: string, timer = 3500): Promise<void> {
    if (!message) {
      return;
    }
    const Swal = await this.load();
    await Swal.fire(this.brand({
      toast: true,
      position: 'top',
      icon,
      title: message,
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: (popup) => {
        popup.addEventListener('mouseenter', Swal.stopTimer);
        popup.addEventListener('mouseleave', Swal.resumeTimer);
      },
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
