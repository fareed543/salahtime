import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LaunchScreenService {
  private readonly minDurationMs = 3000;

  private minDurationElapsed = false;
  private appReady = false;
  private firstViewReady = false;
  private splashHidden = false;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.document.defaultView?.setTimeout(() => {
      this.minDurationElapsed = true;
      this.tryHideSplash();
    }, this.minDurationMs);
  }

  markAppReady(): void {
    this.appReady = true;
    this.tryHideSplash();
  }

  markFirstViewReady(): void {
    this.firstViewReady = true;
    this.tryHideSplash();
  }

  shouldShowInlineLoader(active: boolean): boolean {
    return active && this.splashHidden;
  }

  private tryHideSplash(): void {
    if (!this.minDurationElapsed || !this.appReady || !this.firstViewReady || this.splashHidden) {
      return;
    }

    const hideSplash = (this.document.defaultView as (Window & { __hideSalahTimeSplash?: () => void }) | null)?.__hideSalahTimeSplash;
    hideSplash?.();
    this.splashHidden = true;
  }
}
