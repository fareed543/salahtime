import { ScanResultComponent } from './scan-result.component';

describe('ScanResultComponent (NF-025)', () => {
  it('titles: green for ok, red titles for duplicate and invalid', () => {
    const card = new ScanResultComponent();
    card.result = { kind: 'ok' };
    expect(card.title).toBe('PROGRAM_SCAN.OK');
    card.result = { kind: 'duplicate' };
    expect(card.title).toBe('PROGRAM_SCAN.DUPLICATE');
    card.result = { kind: 'invalid', reason: 'not_today' };
    expect(card.title).toBe('PROGRAM_SCAN.INVALID');
  });

  it('formats the API time', () => {
    expect(new ScanResultComponent().time('2026-11-19 09:07:00')).toBe('9:07 AM');
    expect(new ScanResultComponent().time(null)).toBe('');
  });
});
