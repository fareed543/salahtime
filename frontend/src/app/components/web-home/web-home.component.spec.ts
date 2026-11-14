import { HomePrayer, nextPrayer, timeUntil } from './web-home.component';

describe('WebHome helpers (NF-020)', () => {
  const at = (h: number, m: number) => new Date(2026, 10, 14, h, m);
  const prayers: HomePrayer[] = [
    { key: 'fajr', nameKey: 'FAJR', time: at(5, 1), sub: at(6, 16), next: false },
    { key: 'dhuhr', nameKey: 'DHUHR', time: at(12, 10), sub: null, next: false },
    { key: 'asr', nameKey: 'ASR', time: at(15, 42), sub: null, next: false },
    { key: 'maghrib', nameKey: 'MAGHRIB', time: at(18, 2), sub: null, next: false },
    { key: 'isha', nameKey: 'ISHA', time: at(19, 15), sub: null, next: false }
  ];

  it('finds the next prayer after now', () => {
    expect(nextPrayer(prayers, at(14, 30))?.key).toBe('asr');
    expect(nextPrayer(prayers, at(4, 0))?.key).toBe('fajr');
  });

  it('returns null after Isha', () => {
    expect(nextPrayer(prayers, at(21, 0))).toBeNull();
  });

  it('counts hours and minutes, rounding up to the next minute', () => {
    expect(timeUntil(at(15, 42), at(14, 30))).toEqual({ hours: 1, minutes: 12 });
    expect(timeUntil(at(15, 42), new Date(2026, 10, 14, 15, 30, 30))).toEqual({ hours: 0, minutes: 12 });
    expect(timeUntil(at(15, 42), at(16, 0))).toEqual({ hours: 0, minutes: 0 });
  });
});
