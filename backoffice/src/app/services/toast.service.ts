import { Injectable } from '@angular/core';
import { BackofficeI18nService } from '../shared/i18n/backoffice-i18n.service';

/** SweetAlert2 is loaded globally from index.html. */
declare const Swal: any;

type ToastIcon = 'success' | 'error' | 'warning' | 'info';

/**
 * Back-office feedback as SweetAlert toasts (top-right, auto-closing) instead of inline green/red
 * banners. Messages pass through the back-office translations like the old banners did.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private readonly i18n: BackofficeI18nService) {}

  success(message: string, params?: Record<string, string | number>): void {
    this.show('success', message, params);
  }

  info(message: string, params?: Record<string, string | number>): void {
    this.show('info', message, params);
  }

  warning(message: string, params?: Record<string, string | number>): void {
    this.show('warning', message, params);
  }

  /** Accepts a message or an HTTP error; the API's own `error`/`message` text wins when present. */
  error(messageOrError: unknown, fallback = 'Unable to complete the request.'): void {
    this.show('error', ToastService.errorText(messageOrError, fallback));
  }

  static errorText(messageOrError: unknown, fallback = 'Unable to complete the request.'): string {
    if (typeof messageOrError === 'string') {
      return messageOrError || fallback;
    }
    const error = messageOrError as any;
    return error?.error?.error || error?.error?.message || error?.message || fallback;
  }

  private show(icon: ToastIcon, message: string, params?: Record<string, string | number>): void {
    const text = this.i18n.translate(message, params);
    if (!text) {
      return;
    }

    if (typeof Swal === 'undefined') {
      // CDN blocked: still tell the admin about failures.
      if (icon === 'error') {
        window.alert(text);
      }
      return;
    }

    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: text,
      showConfirmButton: false,
      showCloseButton: true,
      timer: icon === 'error' ? 6000 : 3500,
      timerProgressBar: true,
      didOpen: (toast: HTMLElement) => {
        toast.addEventListener('mouseenter', () => Swal.stopTimer());
        toast.addEventListener('mouseleave', () => Swal.resumeTimer());
      }
    });
  }
}
