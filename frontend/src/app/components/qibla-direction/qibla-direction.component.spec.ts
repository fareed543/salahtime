import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { QiblaDirectionComponent } from './qibla-direction.component';

describe('QiblaDirectionComponent compass heading (Motorola fix)', () => {
  let component: QiblaDirectionComponent;
  let locationService: jasmine.SpyObj<any>;

  const absolute = (alpha: number | null, type = 'deviceorientationabsolute') =>
    new DeviceOrientationEvent(type, { alpha: alpha as number, beta: 0, gamma: 0, absolute: true });
  const relative = (alpha: number) =>
    new DeviceOrientationEvent('deviceorientation', { alpha, beta: 0, gamma: 0, absolute: false });
  const send = (event: Event) => window.dispatchEvent(event);
  const start = () => {
    void component.ngOnInit();
    flushMicrotasks();
  };

  beforeEach(() => {
    locationService = jasmine.createSpyObj('LocationService', ['getLocation']);
    // Yercaud, where the Motorola report came from.
    locationService.getLocation.and.resolveTo({ lat: 11.7813, lng: 78.2178 });
    const localStorageService = jasmine.createSpyObj('LocalStorageService', ['getItem', 'setItem']);
    localStorageService.getItem.and.returnValue(null);
    const i18n = jasmine.createSpyObj('AppTranslateService', ['translateWithParams']);
    i18n.translateWithParams.and.callFake((key: string) => key);
    component = new QiblaDirectionComponent(locationService, localStorageService, i18n);
    component.vibrationEnabled = false;
  });

  afterEach(() => component.ngOnDestroy());

  describe('positive', () => {
    it('uses the true-north reading (deviceorientationabsolute)', fakeAsync(() => {
      start();
      send(absolute(90));
      expect(component.heading).toBe(270);
      expect(component.directionLabel).toBe('W');
      expect(component.canShowCompass).toBeTrue();
      component.ngOnDestroy();
      tick(3000);
    }));

    it('uses a plain deviceorientation event when the browser flags it absolute', () => {
      expect(component.extractHeading(absolute(45, 'deviceorientation'))).toBe(315);
    });

    it('uses the iPhone compass heading', () => {
      const ios = Object.assign(new Event('deviceorientation'), { webkitCompassHeading: 45, alpha: 10, absolute: false });
      expect(component.extractHeading(ios as unknown as DeviceOrientationEvent)).toBe(45);
    });

    it('corrects for a screen turned to landscape', () => {
      spyOn<any>(component, 'screenAngle').and.returnValue(90);
      expect(component.extractHeading(absolute(90))).toBe(0);
    });

    it('smooths readings and settles on the true heading', fakeAsync(() => {
      start();
      send(absolute(90));
      for (let i = 0; i < 40; i++) {
        send(absolute(80));
      }
      expect(component.heading).toBeCloseTo(280, 0);
      component.ngOnDestroy();
      tick(3000);
    }));

    it('turns the short way round across north (350° -> 10°)', fakeAsync(() => {
      start();
      send(absolute(10));   // heading 350
      send(absolute(350));  // target 10: moves forward to 354, not back through 180
      expect(component.heading).toBeCloseTo(354, 5);
      component.ngOnDestroy();
      tick(3000);
    }));

    it('gives the Qibla bearing for Yercaud as west-north-west', fakeAsync(() => {
      start();
      expect(component.kaabaBearing).toBeGreaterThan(285);
      expect(component.kaabaBearing).toBeLessThan(300);
      expect(component.qiblaBearingText).toMatch(/^\d{3}° WNW$/);
      component.ngOnDestroy();
      tick(3000);
    }));
  });

  describe('negative', () => {
    it('ignores relative readings that start from wherever the phone pointed', fakeAsync(() => {
      start();
      send(relative(123));
      expect(component.heading).toBe(0);
      expect(component.headingSupported).toBeFalse();
      component.ngOnDestroy();
      tick(3000);
    }));

    it('stays steady when true-north and relative readings alternate (the Motorola jitter)', fakeAsync(() => {
      start();
      for (let i = 0; i < 40; i++) {
        send(absolute(90));   // true heading 270
        send(relative(300));  // arbitrary frame: would have shown 60
        expect(Math.abs(component.heading - 270)).withContext(`event pair ${i}`).toBeLessThan(0.5);
      }
      component.ngOnDestroy();
      tick(3000);
    }));

    it('falls back to the calibration screen with the bearing, without a warning, when no true-north reading arrives', fakeAsync(() => {
      start();
      send(relative(10));
      tick(2999);
      expect(component.compassUnavailable).toBeFalse();
      tick(1);
      expect(component.compassUnavailable).toBeTrue();
      expect(component.errorMessage).toBe('');
      expect(component.calibrationMessage).toBe('QIBLA_PAGE.STATUS.CALIBRATION_DEFAULT');
      expect(component.canShowCompass).toBeFalse();
    }));

    it('ignores a true-north event without a value', fakeAsync(() => {
      start();
      send(absolute(null));
      tick(3000);
      expect(component.compassUnavailable).toBeTrue();
    }));

    it('does not report a missing compass once a true-north reading has arrived', fakeAsync(() => {
      start();
      send(absolute(90));
      tick(5000);
      expect(component.compassUnavailable).toBeFalse();
      expect(component.errorMessage).toBe('');
    }));

    it('keeps a location error instead of replacing it with the compass message', fakeAsync(() => {
      locationService.getLocation.and.rejectWith(new Error('denied'));
      start();
      tick(3000);
      expect(component.compassUnavailable).toBeTrue();
      expect(component.errorMessage).toBe('QIBLA_PAGE.STATUS.LOCATION_ERROR');
    }));

    it('clears the no-compass state on Try again', fakeAsync(() => {
      start();
      tick(3000);
      expect(component.compassUnavailable).toBeTrue();
      void component.refresh();
      flushMicrotasks();
      expect(component.compassUnavailable).toBeFalse();
      send(absolute(0));
      expect(component.canShowCompass).toBeTrue();
      component.ngOnDestroy();
      tick(3000);
    }));

    it('opens the sensor readout only after five quick taps', fakeAsync(() => {
      for (let i = 0; i < 4; i++) {
        component.onCompassTap();
      }
      expect(component.debugEnabled).toBeFalse();
      tick(1600);
      component.onCompassTap();
      expect(component.debugEnabled).toBeFalse();
      for (let i = 0; i < 4; i++) {
        component.onCompassTap();
      }
      expect(component.debugEnabled).toBeTrue();
      tick(1600);
    }));
  });
});
