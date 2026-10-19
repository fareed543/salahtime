import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard registrations chart, app version and languages cards', () => {
  let dashboardService: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<any>;
  let appVersions: jasmine.SpyObj<any>;
  let languages: jasmine.SpyObj<any>;
  let component: DashboardComponent;
  let swalResult: { isConfirmed: boolean };

  const months = (current: Array<number | null>, previous: number[]) =>
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, index) => ({
      label, current: current[index] ?? null, previous: previous[index] ?? 0
    }));
  const period = { total: 0, average: 0, peak: { label: '', value: 0 }, points: [] };

  const summary = (insights: Record<string, unknown> = {}) => ({
    generatedAt: '2026-10-19T10:00:00Z',
    counts: { masjids: 0, users: 0, programs: 0, locations: 0 },
    statusBreakdown: { users: { active: 0, inactive: 0 }, masjids: { active: 0, inactive: 0, pending: 0 }, programs: [], programTypes: [] },
    recent: { users: [], masjids: [], programs: [], pendingMasjids: [] },
    visitorStats: { total: 0, daily: period, weekly: period, monthly: period, yearly: period },
    insights: {
      registrations: {
        currentYear: 2026, previousYear: 2025,
        // Real local numbers: one big month each year, several single sign-ups.
        months: months([1, 118, 4, 0, 1, 0, 0, 0, 0, 1, null, null], [2, 6, 222, 0, 0, 0, 0, 0, 0, 0, 2, 0]),
        ytdCurrent: 125, ytdPrevious: 230, growthPercent: -46
      },
      users: { thisMonth: 1, lastMonth: 0, thisWeek: 0, today: 0, emailVerified: 9, mobileVerified: 1 },
      usersByRole: [], masjidsByCity: [], subscribers: { push: 0, sehri: 0 },
      appVersion: { id: 2, version: '1.0.63', versionCode: 63, releaseDate: '2026-07-22 18:31:00', mandatory: true },
      appVersionNext: { id: 3, version: '1.0.64', versionCode: 64, releaseDate: null, mandatory: false },
      appAdoption: { windowDays: 30, devices: 412, onLive: 301, byVersion: [{ label: '1.0.63', count: 301 }, { label: '1.0.62', count: 74 }], byPlatform: [] },
      languages: [
        { id: 1, name: 'English', nativeName: 'English', code: 'en', isRtl: false, active: true, isFallback: true },
        { id: 3, name: 'Arabic', nativeName: 'العربية', code: 'ar', isRtl: true, active: true, isFallback: false },
        { id: 9, name: 'French', nativeName: 'Français', code: 'fr', isRtl: false, active: false, isFallback: false }
      ],
      support: null,
      activity: [],
      ...insights
    }
  });

  const load = (data = summary()) => {
    dashboardService.getSummary.and.returnValue(of(data));
    (component as any).loadSummary();
  };

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj('AdminDashboardService', ['getSummary']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    appVersions = jasmine.createSpyObj('AppVersionsService', ['activateAppVersion']);
    languages = jasmine.createSpyObj('LanguagesService', ['toggleLanguageStatus']);
    component = new DashboardComponent(dashboardService, {} as any, {} as any, toast, appVersions, languages);
    swalResult = { isConfirmed: true };
    (window as any).Swal = { fire: jasmine.createSpy('fire').and.callFake(() => Promise.resolve(swalResult)) };
  });

  afterEach(() => delete (window as any).Swal);

  describe('registrations chart', () => {
    it('draws both years upwards from one zero line (no mirrored, "negative" bars)', () => {
      load();
      const zero = component.registrationZeroY;
      for (const bar of component.registrationBars) {
        expect(bar.currentY + bar.currentHeight).toBeCloseTo(zero, 5);
        expect(bar.previousY + bar.previousHeight).toBeCloseTo(zero, 5);
      }
    });

    it('keeps bar heights proportional to the counts', () => {
      load();
      const feb = component.registrationBars[1];
      const mar = component.registrationBars[2];
      expect(mar.previousHeight / feb.currentHeight).toBeCloseTo(222 / 118, 1);
    });

    it('labels the axis in round steps that fit the peak (222 -> 0..240)', () => {
      load();
      expect(component.registrationAxis.map((tick) => tick.label)).toEqual(['240', '180', '120', '60', '0']);
    });

    it('puts the two years side by side, not on top of each other', () => {
      load();
      const feb = component.registrationBars[1];
      expect(feb.currentX + component.registrationBarWidth).toBeLessThanOrEqual(feb.previousX);
    });

    it('draws nothing for empty months and future months', () => {
      load();
      const apr = component.registrationBars[3];
      const nov = component.registrationBars[10];
      expect(apr.currentHeight).toBe(0);
      expect(apr.previousHeight).toBe(0);
      expect(nov.current).toBeNull();
      expect(nov.currentHeight).toBe(0);
    });

    it('copes with a year without any sign-ups', () => {
      load(summary({ registrations: { currentYear: 2026, previousYear: 2025, months: months([], []), ytdCurrent: 0, ytdPrevious: 0, growthPercent: null } }));
      expect(component.registrationBars.every((bar) => bar.currentHeight === 0 && bar.previousHeight === 0)).toBeTrue();
      expect(component.registrationAxis[0].label).toBe('4');
    });
  });

  describe('app version card', () => {
    it('shows how many active devices run the live build', () => {
      load();
      expect(component.appAdoptionPercent).toBe(73);
      expect(component.appDevicesBehind).toBe(111);
    });

    it('makes the waiting build live after confirmation', fakeAsync(() => {
      load();
      appVersions.activateAppVersion.and.returnValue(of({ current: null, items: [] }));
      void component.makeNextVersionLive();
      flushMicrotasks();
      expect(appVersions.activateAppVersion).toHaveBeenCalledWith(3);
      expect(toast.success).toHaveBeenCalledWith('v1.0.64 is now live.');
    }));

    it('does nothing when the admin cancels', fakeAsync(() => {
      load();
      swalResult = { isConfirmed: false };
      void component.makeNextVersionLive();
      flushMicrotasks();
      expect(appVersions.activateAppVersion).not.toHaveBeenCalled();
    }));

    it('shows an error toast when publishing fails', fakeAsync(() => {
      load();
      appVersions.activateAppVersion.and.returnValue(throwError(() => ({ error: { error: 'Version not found.' } })));
      void component.makeNextVersionLive();
      flushMicrotasks();
      expect(toast.error).toHaveBeenCalled();
      expect(component.publishingVersion).toBeFalse();
    }));

    it('has no adoption figure when no device checked in', () => {
      load(summary({ appAdoption: { windowDays: 30, devices: 0, onLive: 0, byVersion: [], byPlatform: [] } }));
      expect(component.appAdoptionPercent).toBeNull();
      expect(component.appDevicesBehind).toBe(0);
    });

    it('names platforms properly', () => {
      expect(component.platformLabel('ios')).toBe('iOS');
      expect(component.platformLabel('android')).toBe('Android');
      expect(component.platformLabel('kaios')).toBe('kaios');
    });
  });

  describe('languages card', () => {
    it('counts the languages offered in the app', () => {
      load();
      expect(component.activeLanguageCount).toBe(2);
    });

    it('switches a language on from the card', () => {
      load();
      const french = component.insights!.languages![2];
      languages.toggleLanguageStatus.and.returnValue(of({ message: 'Language enabled.', item: { status: true } }));
      component.toggleLanguage(french);
      expect(languages.toggleLanguageStatus).toHaveBeenCalledWith(9);
      expect(french.active).toBeTrue();
      expect(toast.success).toHaveBeenCalledWith('Language enabled.');
    });

    it('never switches off English, the fallback language', () => {
      load();
      component.toggleLanguage(component.insights!.languages![0]);
      expect(languages.toggleLanguageStatus).not.toHaveBeenCalled();
    });

    it('keeps the language as it was when the switch fails', () => {
      load();
      const arabic = component.insights!.languages![1];
      languages.toggleLanguageStatus.and.returnValue(throwError(() => ({ error: { error: 'Unable to update language status.' } })));
      component.toggleLanguage(arabic);
      expect(arabic.active).toBeTrue();
      expect(toast.error).toHaveBeenCalled();
      expect(component.togglingLanguageIds.has(3)).toBeFalse();
    });
  });
});
