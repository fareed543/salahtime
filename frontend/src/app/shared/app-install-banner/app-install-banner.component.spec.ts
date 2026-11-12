import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { playStoreLink, siteSection } from 'src/app/utils/play-store-link';
import {
  APP_BANNER_DELAY_MS,
  APP_BANNER_DISMISSED_KEY,
  APP_BANNER_HIDE_MS,
  AppInstallBannerComponent
} from './app-install-banner.component';

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36';

describe('playStoreLink (CR-014)', () => {
  it('uses the first URL segment as campaign, home for the home page', () => {
    expect(siteSection('/')).toBe('home');
    expect(siteSection('')).toBe('home');
    expect(siteSection('/prayer-times/india/hyderabad?x=1')).toBe('prayer-times');
    expect(siteSection('/Sehri-Iftar/india/chennai#top')).toBe('sehri-iftar');
    expect(siteSection('/<script>')).toBe('script');
  });

  it('adds an encoded install referrer to the Play URL', () => {
    const url = playStoreLink('banner', '/asr-time/india/indore');
    expect(url).toContain('id=com.wallet.salahtime');
    expect(decodeURIComponent(url.split('&referrer=')[1]))
      .toBe('utm_source=website&utm_medium=banner&utm_campaign=asr-time');
    expect(playStoreLink('header', '/')).toContain(encodeURIComponent('utm_medium=header&utm_campaign=home'));
  });
});

describe('AppInstallBannerComponent (CR-014)', () => {
  let store: Record<string, unknown>;
  let events: Subject<unknown>;
  let router: { url: string; events: Subject<unknown> };
  let native: boolean;
  let findCity: jasmine.Spy;

  function create(userAgent: string, url = '/'): AppInstallBannerComponent {
    router.url = url;
    // Floating nav: 56 px tall, 30 px above the screen edge → bar sits 86 px up.
    const footer = { getBoundingClientRect: () => ({ top: 800 - 86, height: 56 }) };
    const document = {
      defaultView: { navigator: { userAgent }, innerHeight: 800, getComputedStyle: () => ({ display: 'block' }) },
      querySelector: () => footer
    } as unknown as Document;
    const localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: unknown) => { store[key] = value; }
    };
    return new AppInstallBannerComponent(
      document,
      router as any,
      { isNativeApp: () => native } as any,
      localStorage as any,
      { findCity } as any,
      { markForCheck: () => undefined } as any
    );
  }

  beforeEach(() => {
    store = {};
    events = new Subject();
    router = { url: '/', events };
    native = false;
    findCity = jasmine.createSpy('findCity').and.resolveTo(null);
  });

  it('is offered only in an Android browser', () => {
    expect(create(ANDROID_UA).eligible()).toBeTrue();
    expect(create(IPHONE_UA).eligible()).toBeFalse();
    expect(create(DESKTOP_UA).eligible()).toBeFalse();
    native = true;
    expect(create(ANDROID_UA).eligible()).toBeFalse();
  });

  it('appears after 3 seconds, above the phone navigation bar', fakeAsync(() => {
    const banner = create(ANDROID_UA);
    banner.ngOnInit();
    tick(APP_BANNER_DELAY_MS - 1);
    expect(banner.visible).toBeFalse();
    tick(1);
    expect(banner.visible).toBeTrue();
    expect(banner.bottomOffset).toBe(86);
    expect(banner.installUrl).toContain(encodeURIComponent('utm_campaign=home'));
    banner.ngOnDestroy();
  }));

  it('stays hidden for 14 days after close or install', fakeAsync(() => {
    const banner = create(ANDROID_UA);
    banner.ngOnInit();
    tick(APP_BANNER_DELAY_MS);
    const before = Date.now();
    banner.dismiss();
    expect(banner.visible).toBeFalse();
    expect(store[APP_BANNER_DISMISSED_KEY]).toBeGreaterThanOrEqual(before + APP_BANNER_HIDE_MS);
    expect(create(ANDROID_UA).eligible()).toBeFalse();

    store[APP_BANNER_DISMISSED_KEY] = Date.now() - 1;
    expect(create(ANDROID_UA).eligible()).toBeTrue();
    banner.ngOnDestroy();
  }));

  it('does nothing on desktop', fakeAsync(() => {
    const banner = create(DESKTOP_UA);
    banner.ngOnInit();
    tick(APP_BANNER_DELAY_MS);
    expect(banner.visible).toBeFalse();
  }));

  it('names the city on city pages and follows navigation', fakeAsync(() => {
    findCity.and.callFake(async (country: string, slug: string) =>
      country === 'india' && slug === 'hyderabad' ? { city: 'Hyderabad' } : null);
    const banner = create(ANDROID_UA, '/sehri-iftar/india/hyderabad');
    banner.ngOnInit();
    flushMicrotasks();
    expect(findCity).toHaveBeenCalledWith('india', 'hyderabad');
    expect(banner.cityName).toBe('Hyderabad');
    expect(banner.installUrl).toContain(encodeURIComponent('utm_campaign=sehri-iftar'));

    router.url = '/duas';
    events.next(new NavigationEnd(1, '/duas', '/duas'));
    flushMicrotasks();
    expect(banner.cityName).toBe('');
    expect(banner.installUrl).toContain(encodeURIComponent('utm_campaign=duas'));

    router.url = '/prayer-times/india/hyderabad/november-2026';
    events.next(new NavigationEnd(2, router.url, router.url));
    flushMicrotasks();
    expect(banner.cityName).toBe('Hyderabad');

    tick(APP_BANNER_DELAY_MS);
    banner.ngOnDestroy();
  }));
});
