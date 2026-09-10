import { DefaultUrlSerializer, Router } from '@angular/router';
import { DeviceInfoService } from './device-info.service';

describe('DeviceInfoService', () => {
  const serializer = new DefaultUrlSerializer();
  function setup(width: number) {
    const media = { matches: width >= 768, addEventListener: jasmine.createSpy() };
    const router = {
      parseUrl: (url: string) => serializer.parse(url),
      url: '/prayer-times/india/hyderabad?format=24#times',
      routerState: { snapshot: { root: { data: { prayerScreen: true } } } },
      navigateByUrl: jasmine.createSpy().and.resolveTo(true)
    };
    const document = { defaultView: { matchMedia: jasmine.createSpy().and.returnValue(media) } };
    const service = new DeviceInfoService(document as unknown as Document, 768, router as unknown as Router);
    return { service, media, router, document };
  }

  it('uses the configured breakpoint and preserves city, query and fragment on mobile', () => {
    const { service, document } = setup(767);
    expect(document.defaultView.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    expect(serializer.serialize(service.redirect('/prayer-times/india/hyderabad?format=24#times')!))
      .toBe('/all-prayer-times/india/hyderabad?format=24#times');
    expect(service.redirect('/all-prayer-times')).toBeNull();
  });

  it('routes tablets to web without a redirect loop', () => {
    const { service } = setup(768);
    expect(serializer.serialize(service.redirect('/all-prayer-times')!)).toBe('/prayer-times');
    expect(service.redirect('/prayer-times')).toBeNull();
  });

  it('switches an active prayer screen on resize but leaves directory pages alone', () => {
    const { media, router } = setup(1024);
    media.matches = false;
    const changed = media.addEventListener.calls.first().args[1];
    changed();
    expect(serializer.serialize(router.navigateByUrl.calls.first().args[0]))
      .toBe('/all-prayer-times/india/hyderabad?format=24#times');
    router.navigateByUrl.calls.reset();
    router.routerState.snapshot.root.data.prayerScreen = false;
    changed();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
