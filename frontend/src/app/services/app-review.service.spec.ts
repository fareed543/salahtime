import { AppReviewService } from './app-review.service';
import { DeviceInfoService } from './device-info.service';
import { LocalStorageService } from './local-storage.service';

/** CR-015: when Google Play's review sheet may be requested. */
describe('AppReviewService', () => {
  class TestReviewService extends AppReviewService {
    requested = 0;
    protected override requestSheet(): void {
      this.requested++;
    }
  }

  function setup(options: { android?: boolean; activeDays?: number; lastRequestDaysAgo?: number } = {}) {
    const store = new Map<string, unknown>();
    const localStorage = {
      getItem: <T>(key: string) => (store.has(key) ? (store.get(key) as T) : null),
      setItem: (key: string, value: unknown) => store.set(key, value),
    } as unknown as LocalStorageService;
    const android = options.android ?? true;
    const deviceInfo = {
      isNativeApp: () => android,
      isAndroid: () => android,
    } as unknown as DeviceInfoService;

    if (options.activeDays !== undefined) {
      store.set('app_review_active_days', { count: options.activeDays, lastDay: '2000-01-01' });
    }
    if (options.lastRequestDaysAgo !== undefined) {
      store.set('app_review_last_requested_at', new Date(Date.now() - options.lastRequestDaysAgo * 86_400_000).toISOString());
    }

    return { service: new TestReviewService(deviceInfo, localStorage), store };
  }

  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());

  function settle(): void {
    jasmine.clock().tick(1300);
  }

  it('never asks on the website', () => {
    const { service } = setup({ android: false, activeDays: 10 });
    service.onPrayersMarked(true);
    service.onZikarTargetReached();
    settle();
    expect(service.requested).toBe(0);
  });

  it('does not ask after only one active day', () => {
    const { service } = setup({ activeDays: 1 });
    service.onZikarTargetReached();
    settle();
    expect(service.requested).toBe(0);
  });

  it('asks after two active days when all of today\'s prayers are marked', () => {
    const { service } = setup({ activeDays: 2 });
    service.onPrayersMarked(true);
    settle();
    expect(service.requested).toBe(1);
  });

  it('does not ask while some of today\'s prayers are unmarked', () => {
    const { service } = setup({ activeDays: 5 });
    service.onPrayersMarked(false);
    settle();
    expect(service.requested).toBe(0);
  });

  it('asks when a Zikar dhikr reaches its target', () => {
    const { service } = setup({ activeDays: 2 });
    service.onZikarTargetReached();
    settle();
    expect(service.requested).toBe(1);
  });

  it('asks only once when both moments happen the same day', () => {
    const { service } = setup({ activeDays: 3 });
    service.onZikarTargetReached();
    service.onPrayersMarked(true);
    service.onZikarTargetReached();
    settle();
    expect(service.requested).toBe(1);
  });

  it('waits 60 days between requests', () => {
    expect(runWithLastRequest(59)).toBe(0);
    expect(runWithLastRequest(61)).toBe(1);
  });

  function runWithLastRequest(daysAgo: number): number {
    const { service } = setup({ activeDays: 4, lastRequestDaysAgo: daysAgo });
    service.onZikarTargetReached();
    settle();
    return service.requested;
  }

  it('counts each calendar day once', () => {
    const { service, store } = setup();
    service.recordActiveDay();
    service.recordActiveDay();
    expect((store.get('app_review_active_days') as { count: number }).count).toBe(1);
  });
});
