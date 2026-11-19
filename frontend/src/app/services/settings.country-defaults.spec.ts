import { SettingsService } from './settings.service';
import { countryDefaults, countryKey } from '../config/country-defaults';
import { cityMethodNote, ramadanRange } from '../seo/seo-content';

/** CR-027: a location in another country takes that country's method and madhab unless the user chose their own. */
describe('SettingsService country defaults', () => {
  let service: SettingsService;
  const city = (name: string, country: string): any => ({
    source: 'manual', city: { city: name, country, coordinates: { latitude: 0, longitude: 0 } }
  });
  const base = (): any => ({ calculationMethod: 'karachi', madhab: 'Hanafi', location: city('Hyderabad', 'India') });

  beforeEach(() => {
    localStorage.removeItem('salahSettings');
    service = new SettingsService();
    service.updateSettings(base());
  });

  it('moving to London uses the UK defaults (MWL, Hanafi)', () => {
    service.updateSettings({ ...service.getCurrentSettings(), location: city('London', 'United Kingdom') });
    expect(service.getCurrentSettings().calculationMethod).toBe('mwl');
    expect(service.getCurrentSettings().madhab).toBe('Hanafi');
  });

  it('moving to Riyadh uses Umm al-Qura and Shafii Asr', () => {
    service.updateSettings({ ...service.getCurrentSettings(), location: city('Riyadh', 'Saudi Arabia') });
    expect(service.getCurrentSettings().calculationMethod).toBe('makkah');
    expect(service.getCurrentSettings().madhab).toBe('Shafii');
  });

  it('a method the user picked is kept in every country', () => {
    service.updateSettings({ ...service.getCurrentSettings(), calculationMethod: 'isna', methodChosen: true });
    service.updateSettings({ ...service.getCurrentSettings(), location: city('Dubai', 'United Arab Emirates') });
    expect(service.getCurrentSettings().calculationMethod).toBe('isna');
  });

  it('another city in the same country does not reset a changed method', () => {
    service.updateSettings({ ...service.getCurrentSettings(), calculationMethod: 'mwl' });
    service.updateSettings({ ...service.getCurrentSettings(), location: city('Mumbai', 'India') });
    expect(service.getCurrentSettings().calculationMethod).toBe('mwl');
  });
});

describe('country-defaults table', () => {
  it('finds countries by name or slug, including Türkiye', () => {
    expect(countryKey('Türkiye')).toBe('turkiye');
    expect(countryDefaults('United Arab Emirates')?.method).toBe('gulf');
    expect(countryDefaults('nowhere')).toBeNull();
  });

  it('Ramadan: Pakistan a day after Umm al-Qura, the UK on it, a back-office date always wins', () => {
    const ummAlQura = { start: new Date(2027, 1, 8), days: 29 };
    expect(ramadanRange(ummAlQura, 'pakistan', null, countryDefaults('pakistan')?.ramadanDelayDays).start).toEqual(new Date(2027, 1, 9));
    expect(ramadanRange(ummAlQura, 'united-kingdom', null, countryDefaults('united-kingdom')?.ramadanDelayDays).start).toEqual(new Date(2027, 1, 8));
    expect(ramadanRange(ummAlQura, 'india', { updatedStartDate: '2027-02-10', updatedEndDate: '2027-03-11' }, 1).start).toEqual(new Date(2027, 1, 10));
  });

  it('page note names the country method', () => {
    expect(cityMethodNote({ country: 'India' })).toBe('University of Islamic Sciences, Karachi method, Hanafi Asr');
    expect(cityMethodNote({ country: 'United States' })).toBe("ISNA method, Shafi'i Asr");
  });
});
