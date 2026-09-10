import { WaqtService } from './waqt.service';

describe('WaqtService overnight timings', () => {
  const service = new WaqtService();
  const timesFor = (date: Date, fajrOffset = 0) =>
    service.getTimes(date, 26.4499, 74.6399, 5.5, 'karachi', 'Hanafi', { fajrOffset });

  for (const date of [new Date(2026, 8, 10), new Date(2026, 8, 30), new Date(2026, 11, 31)]) {
    it(`ends Isha at the following day's calculated Fajr for ${date.toDateString()}`, () => {
      const today = timesFor(date, 7);
      const tomorrow = timesFor(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), 7);
      expect(today.isha.end.getTime()).toBe(tomorrow.fajr.start.getTime());
      expect(today.isha.end.getTime()).toBeGreaterThan(today.isha.start.getTime());
      expect(today.isha.end.getHours()).not.toBe(0);
    });
  }

  it('keeps Tahajjud on the selected morning and ends it one minute before Sahri', () => {
    const date = new Date(2026, 8, 10);
    const today = timesFor(date);
    expect(today.tahajjud.start.toDateString()).toBe(date.toDateString());
    expect(today.tahajjud.end.toDateString()).toBe(date.toDateString());
    expect(today.tahajjud.end.getTime()).toBe(today.sahri.start.getTime() - 60000);
    expect(today.tahajjud.end.getTime()).toBeGreaterThan(today.tahajjud.start.getTime());
    expect(today.tahajjud.end.getTime()).toBeLessThan(today.fajr.start.getTime());
  });
});
