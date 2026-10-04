import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * The one way screens should implement "Back".
 *
 * Back must never navigate *forward* to the previous screen's URL: that pushes a new history
 * entry, and when the other screen goes back through history the two keep sending the user to
 * each other (list -> details -> list -> details...). Instead:
 *   - with an earlier in-app page, go back through history;
 *   - otherwise (opened from a link, notification or fresh start) replace the current entry
 *     with the fallback route, so the history never grows.
 */
@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  constructor(private location: Location, private router: Router) {}

  /** True when history.back() stays inside the app (Angular stamps each entry with navigationId). */
  hasInAppHistory(): boolean {
    const navigationId = (window.history.state as { navigationId?: number } | null)?.navigationId ?? 0;
    return navigationId > 1;
  }

  back(fallback: string | any[] = '/'): void {
    if (this.hasInAppHistory()) {
      this.location.back();
      return;
    }

    void this.router.navigate(Array.isArray(fallback) ? fallback : [fallback], { replaceUrl: true });
  }
}
