import { DeviceInfoService } from './device-info.service';

describe('DeviceInfoService', () => {
  function setup(width: number) {
    const media = { matches: width >= 768, addEventListener: jasmine.createSpy() };
    const document = { defaultView: { matchMedia: jasmine.createSpy().and.returnValue(media), addEventListener: jasmine.createSpy() } };
    const service = new DeviceInfoService(document as unknown as Document, 768);
    return { service, media, document };
  }

  it('uses the configured breakpoint', () => {
    const { service, document } = setup(767);
    expect(document.defaultView.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    expect(service.isWeb).toBeFalse();
  });

  it('treats tablets and wider as web', () => {
    expect(setup(768).service.isWeb).toBeTrue();
  });

  it('emits when the screen crosses the breakpoint', () => {
    const { service, media } = setup(1024);
    const values: boolean[] = [];
    service.isWeb$.subscribe(value => values.push(value));

    media.matches = false;
    media.addEventListener.calls.first().args[1]();

    expect(values).toEqual([true, false]);
  });
});
