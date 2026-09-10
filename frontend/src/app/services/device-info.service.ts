import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';

export const PRAYER_WEB_MIN_WIDTH = new InjectionToken<number>('PRAYER_WEB_MIN_WIDTH', {
  providedIn: 'root', factory: () => 768
});

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  private readonly query: MediaQueryList | undefined;

  constructor(@Inject(DOCUMENT) document: Document,
    @Inject(PRAYER_WEB_MIN_WIDTH) minWidth: number, private router: Router) {
    this.query = document.defaultView?.matchMedia(`(min-width: ${minWidth}px)`);
    this.query?.addEventListener('change', () => {
      // Only switch an active prayer screen, never another page or country directory.
      let route = this.router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      if (route.data['prayerScreen']) {
        const target = this.redirect(this.router.url);
        if (target) void this.router.navigateByUrl(target, { replaceUrl: true });
      }
    });
  }

  get isWeb(): boolean { return this.query?.matches ?? true; }

  redirect(url: string) {
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children['primary']?.segments;
    const desired = this.isWeb ? 'prayer-times' : 'all-prayer-times';
    if (!segments?.length || segments[0].path === desired) return null;
    // Preserve city paths, query parameters and fragment.
    segments[0].path = desired;
    return tree;
  }

  isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }
}

export const prayerScreenGuard: CanActivateFn = (_route, state) =>
  inject(DeviceInfoService).redirect(state.url) ?? true;
