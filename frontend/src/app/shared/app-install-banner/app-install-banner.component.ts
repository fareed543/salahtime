import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, filter, takeUntil } from 'rxjs';
import { SeoCityPageService } from 'src/app/seo/seo-city-page.service';
import { DeviceInfoService } from 'src/app/services/device-info.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { playStoreLink } from 'src/app/utils/play-store-link';

export const APP_BANNER_DISMISSED_KEY = 'app_banner_dismissed_until';
export const APP_BANNER_HIDE_MS = 14 * 24 * 60 * 60 * 1000;
export const APP_BANNER_DELAY_MS = 3000;

/** City pages whose 2nd and 3rd URL segments are <country>/<city> (CR-006, NF-009, NF-010). */
const CITY_PAGE_SECTION = /^(prayer-times|sehri-iftar|[a-z]+-time)$/;

/**
 * CR-014: "Get the app" bar for visitors on an Android browser (never inside the app, on desktop
 * or iPhone). Shows 3 s after the first page, names the city on city pages, and stays hidden for
 * 14 days after ✕ or Install. Rendered by Angular only, so the prerendered SEO HTML never has it.
 */
@Component({
  selector: 'app-install-banner',
  standalone: true,
  imports: [NgIf, TranslateModule],
  templateUrl: './app-install-banner.component.html',
  styleUrls: ['./app-install-banner.component.scss']
})
export class AppInstallBannerComponent implements OnInit, OnDestroy {
  visible = false;
  installUrl = '';
  cityName = '';
  bottomOffset = 0;

  private timer?: ReturnType<typeof setTimeout>;
  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private deviceInfo: DeviceInfoService,
    private localStorage: LocalStorageService,
    private cityPages: SeoCityPageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.eligible()) {
      return;
    }

    this.updateForUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(e => {
        this.updateForUrl(e.urlAfterRedirects);
        if (this.visible) {
          this.measureBottomOffset();
        }
      });

    this.timer = setTimeout(() => {
      this.visible = true;
      this.measureBottomOffset();
      this.cdr.markForCheck();
    }, APP_BANNER_DELAY_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Android browser, not the app, not hidden by an earlier ✕ / Install. */
  eligible(): boolean {
    if (this.deviceInfo.isNativeApp()) {
      return false;
    }
    const userAgent = this.document.defaultView?.navigator?.userAgent ?? '';
    if (!/Android/i.test(userAgent)) {
      return false;
    }
    const hiddenUntil = Number(this.localStorage.getItem<number>(APP_BANNER_DISMISSED_KEY) ?? 0);
    return !(hiddenUntil > Date.now());
  }

  onInstall(): void {
    this.hideFor14Days();
  }

  dismiss(): void {
    this.hideFor14Days();
  }

  // The phone navigation bar floats at the bottom (with a gap below it); sit right above its top edge.
  @HostListener('window:resize')
  measureBottomOffset(): void {
    const footer = this.document.querySelector('.adminuiux-mobile-footer') as HTMLElement | null;
    const view = this.document.defaultView;
    const shown = !!footer && !!view && view.getComputedStyle(footer).display !== 'none';
    this.bottomOffset = shown ? Math.max(0, Math.round(view!.innerHeight - footer!.getBoundingClientRect().top)) : 0;
  }

  private hideFor14Days(): void {
    this.localStorage.setItem(APP_BANNER_DISMISSED_KEY, Date.now() + APP_BANNER_HIDE_MS);
    this.visible = false;
  }

  private updateForUrl(url: string): void {
    this.installUrl = playStoreLink('banner', url);
    const segments = (url || '').split(/[?#]/)[0].split('/').filter(Boolean);
    this.cityName = '';
    if (segments.length >= 3 && CITY_PAGE_SECTION.test(segments[0])) {
      const expected = url;
      this.cityPages.findCity(segments[1], segments[2])
        .then(city => {
          if (city && this.router.url === expected) {
            this.cityName = city.city;
            this.cdr.markForCheck();
          }
        })
        .catch(() => undefined);
    }
  }
}
