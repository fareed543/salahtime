import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';

export const PRAYER_WEB_MIN_WIDTH = new InjectionToken<number>('PRAYER_WEB_MIN_WIDTH', {
  providedIn: 'root', factory: () => 768
});

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  private readonly query: MediaQueryList | undefined;
  private readonly isWebSubject: BehaviorSubject<boolean>;

  /**
   * Whether the screen is wide enough for the web prayer layout. Layouts switch in place on
   * the same URL; never redirect by width, since Google indexes with a phone-sized browser.
   */
  readonly isWeb$: Observable<boolean>;

  constructor(@Inject(DOCUMENT) document: Document,
    @Inject(PRAYER_WEB_MIN_WIDTH) minWidth: number) {
    this.query = document.defaultView?.matchMedia(`(min-width: ${minWidth}px)`);
    this.isWebSubject = new BehaviorSubject(this.isWeb);
    this.isWeb$ = this.isWebSubject.pipe(distinctUntilChanged());
    const update = () => this.isWebSubject.next(this.isWeb);
    this.query?.addEventListener('change', update);
    // Some environments (device emulation, older WebViews) skip the media 'change' event.
    document.defaultView?.addEventListener('resize', update);
  }

  get isWeb(): boolean { return this.query?.matches ?? true; }

  isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }
}
