import { Injectable } from '@angular/core';
import { BackofficeI18nService } from '../shared/i18n/backoffice-i18n.service';

/** SweetAlert2 is loaded globally from index.html. */
declare const Swal: any;

type ToastIcon = 'success' | 'error' | 'warning' | 'info';

/**
 * Back-office feedback as centred SweetAlert dialogs (CR-023) instead of inline green/red
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

    // CR-023 (owner, 2026-11-19): the classic SweetAlert dialog for every result — big icon, title, message, OK.
    // Success also closes itself after 3 s; errors, warnings and notes wait for OK.
    void Swal.fire({
      icon,
      title: this.i18n.translate(ToastService.TITLES[icon]),
      text,
      confirmButtonText: this.i18n.translate('OK'),
      ...(icon === 'success' ? { timer: 3000, timerProgressBar: true } : {})
    });
  }

  private static readonly TITLES: Record<ToastIcon, string> = {
    success: 'Done!',
    error: 'Something went wrong',
    warning: 'Please check',
    info: 'Note'
  };
}
