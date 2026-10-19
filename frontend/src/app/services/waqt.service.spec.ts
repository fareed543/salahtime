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

describe('WaqtService high latitudes', () => {
  const service = new WaqtService();
  const hhmm = (date: Date) => date.toTimeString().slice(0, 5);
  const isValid = (date: Date) => !Number.isNaN(date.getTime());
  const at = (lat: number, lng: number, tz: number, date: Date, method = 'mwl') =>
    service.getTimes(date, lat, lng, tz, method, 'Hanafi');

  const london = (date: Date, method = 'mwl') => at(51.5074, -0.1278, date.getMonth() >= 2 && date.getMonth() <= 9 ? 1 : 0, date, method);
  const midsummer = new Date(2026, 5, 21);

  describe('positive', () => {
    it('gives London a valid Fajr and Isha at midsummer, when the sun never reaches 18°', () => {
      const times = london(midsummer);
      expect(isValid(times.fajr.start)).toBeTrue();
      expect(isValid(times.isha.start)).toBeTrue();
      expect(hhmm(times.fajr.start)).toBe('02:30');
      expect(hhmm(times.isha.start)).toBe('23:25');
    });

    it('gives Paris a valid Fajr at midsummer', () => {
      const times = at(48.8566, 2.3522, 2, midsummer);
      expect(isValid(times.fajr.start)).toBeTrue();
      expect(hhmm(times.fajr.start)).toBe('03:26');
    });

    it('keeps the order Fajr < sunrise < Dhuhr < Asr < Maghrib < Isha in London all year', () => {
      for (let month = 0; month < 12; month++) {
        const times = london(new Date(2026, month, 21));
        const order = [times.fajr.start, times.tulu.start, times.dhuhr.start, times.asr.start, times.maghrib.start, times.isha.start];
        order.forEach((time) => expect(isValid(time)).withContext(`month ${month + 1}`).toBeTrue());
        for (let i = 1; i < order.length; i++) {
          expect(order[i].getTime()).withContext(`month ${month + 1}, step ${i}`).toBeGreaterThan(order[i - 1].getTime());
        }
      }
    });

    it('produces valid times for northern UK and Canadian cities in summer', () => {
      for (const [lat, lng, tz] of [[55.95, -3.19, 1], [57.15, -2.09, 1], [53.55, -113.49, -6]]) {
        const times = at(lat, lng, tz, midsummer);
        expect(isValid(times.fajr.start)).toBeTrue();
        expect(isValid(times.isha.start)).toBeTrue();
        expect(isValid(times.sahri.start)).toBeTrue();
        expect(isValid(times.tahajjud.start)).toBeTrue();
      }
    });
  });

  describe('negative: the rule must not touch normal latitudes or fixed Isha', () => {
    it('leaves low-latitude times exactly as before', () => {
      expect(hhmm(at(13.08, 80.27, 5.5, midsummer).fajr.start)).toBe('04:24');
      expect(hhmm(at(13.08, 80.27, 5.5, midsummer).isha.start)).toBe('19:51');
      expect(hhmm(at(28.61, 77.21, 5.5, midsummer, 'karachi').fajr.start)).toBe('03:49');
      expect(hhmm(at(28.61, 77.21, 5.5, midsummer, 'karachi').isha.start)).toBe('20:55');
      expect(hhmm(at(40.71, -74.0, -4, midsummer, 'isna').fajr.start)).toBe('03:45');
      expect(hhmm(at(40.71, -74.0, -4, midsummer, 'isna').isha.start)).toBe('22:08');
    });

    it('leaves London\'s winter times uncapped', () => {
      const winter = london(new Date(2026, 11, 21));
      const night = winter.tulu.start.getTime() + 86400000 - winter.maghrib.start.getTime();
      expect(winter.tulu.start.getTime() - winter.fajr.start.getTime()).toBeLessThan((18 / 60) * night);
    });

    it('keeps a fixed "90 minutes after Maghrib" Isha even in London at midsummer', () => {
      const times = london(midsummer, 'makkah');
      expect(times.isha.start.getTime() - times.maghrib.start.getTime()).toBe(90 * 60000);
    });
  });
});
