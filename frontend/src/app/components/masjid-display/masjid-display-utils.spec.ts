import {
  BoardTiming,
  currentWaqt,
  DEFAULT_DISPLAY_COLORS,
  displayPalette,
  dueBeeps,
  formatCountdown,
  nextEvent,
  parseClock,
  readDisplayColors
} from './masjid-display-utils';

const TODAY: BoardTiming[] = [
  { key: 'fajr', labelKey: 'FAJR', azan: '04:55 AM', jamat: '05:30 AM' },
  { key: 'dhuhr', labelKey: 'DHUHR', azan: '12:45 PM', jamat: '01:15 PM' },
  { key: 'asr', labelKey: 'ASR', azan: '04:19 PM', jamat: '04:40 PM' },
  { key: 'maghrib', labelKey: 'MAGHRIB', azan: '06:05 PM', jamat: '06:15 PM' },
  { key: 'isha', labelKey: 'ISHA', azan: '20:15', jamat: '' }
];

const at = (hours: number, minutes: number, seconds = 0) => new Date(2026, 9, 26, hours, minutes, seconds);

describe('masjid-display-utils', () => {
  it('parses 12h and 24h times on the given day', () => {
    expect(parseClock('12:45 PM', at(8, 0))?.getHours()).toBe(12);
    expect(parseClock('12:10 am', at(8, 0))?.getHours()).toBe(0);
    expect(parseClock('20:15', at(8, 0))?.getHours()).toBe(20);
    expect(parseClock('soon', at(8, 0))).toBeNull();
  });

  it('counts down to the next azan and the next jamat separately', () => {
    const now = at(8, 41, 3);
    const azan = nextEvent(TODAY, 'azan', now)!;
    const jamat = nextEvent(TODAY, 'jamat', now)!;
    expect(azan.timing.key).toBe('dhuhr');
    expect(formatCountdown(azan.at.getTime() - now.getTime())).toBe('04:03:57');
    expect(jamat.timing.key).toBe('dhuhr');
    expect(formatCountdown(jamat.at.getTime() - now.getTime())).toBe('04:33:57');
  });

  it('after azan but before jamat, the azan countdown moves on while jamat stays', () => {
    const now = at(13, 0);
    expect(nextEvent(TODAY, 'azan', now)!.timing.key).toBe('asr');
    expect(nextEvent(TODAY, 'jamat', now)!.timing.key).toBe('dhuhr');
  });

  it('uses azan for a row with no jamat time and rolls over to tomorrow\'s Fajr after Isha', () => {
    expect(nextEvent(TODAY, 'jamat', at(19, 0))!.timing.key).toBe('isha');
    const next = nextEvent(TODAY, 'jamat', at(21, 0))!;
    expect(next.tomorrow).toBeTrue();
    expect(next.timing.key).toBe('fajr');
    expect(next.at.getDate()).toBe(27);
  });

  it('reports each azan/jamat once as the clock passes it', () => {
    expect(dueBeeps(TODAY, at(12, 44, 59), at(12, 45, 0))).toEqual([{ key: 'dhuhr', kind: 'azan' }]);
    expect(dueBeeps(TODAY, at(12, 45, 0), at(12, 45, 1))).toEqual([]);
    expect(dueBeeps(TODAY, at(13, 14, 59), at(13, 15, 0))).toEqual([{ key: 'dhuhr', kind: 'jamat' }]);
  });

  it('accepts only three #rrggbb colours', () => {
    expect(readDisplayColors({ bg: '#000000', card: '#111111', accent: '#ffffff' })).toEqual({ bg: '#000000', card: '#111111', accent: '#ffffff' });
    expect(readDisplayColors({ bg: 'red', card: '#111111', accent: '#ffffff' })).toBeNull();
    expect(readDisplayColors(null)).toBeNull();
  });

  it('picks readable text for dark and light backgrounds', () => {
    expect(displayPalette(DEFAULT_DISPLAY_COLORS)['--text']).toBe('#f7f3ea');
    expect(displayPalette(DEFAULT_DISPLAY_COLORS)['--accent-text']).toBe('#1f1608');
    const sand = displayPalette({ bg: '#f5eedf', card: '#fffaf0', accent: '#7a5a1d' });
    expect(sand['--text']).toBe('#2a2116');
    expect(sand['--accent-text']).toBe('#fffaf0');
    // A highlight too close to the background is not used as text on it.
    expect(displayPalette({ bg: '#ffffff', card: '#ffffff', accent: '#fefefe' })['--accent-on-bg']).toBe('#2a2116');
  });
});

describe('currentWaqt', () => {
  const w = (startH: number, startM: number, endH: number, endM: number, endDay = 26) =>
    ({ start: at(startH, startM), end: new Date(2026, 9, endDay, endH, endM), type: '', icon: '', color: '' });
  const today: any = {
    tahajjud: w(1, 7, 3, 18), fajr: w(4, 49, 6, 1), tulu: w(6, 1, 6, 21), ishraq: w(6, 21, 7, 31), chast: w(7, 31, 11, 42),
    zawal: w(11, 47, 11, 57), dhuhr: w(11, 57, 16, 7), asr: w(16, 7, 17, 41), gurub: w(17, 41, 17, 44),
    maghrib: w(17, 44, 18, 29), awabin: w(18, 4, 18, 29), isha: w(18, 56, 4, 49, 27)
  };
  const yesterday: any = { isha: { start: new Date(2026, 9, 25, 18, 56), end: at(4, 49) } };

  it('shows the farz waqt running now', () => {
    expect(currentWaqt(today, yesterday, at(13, 30))).toEqual(jasmine.objectContaining({ key: 'dhuhr', kind: 'farz', upcoming: false }));
  });

  it('before Fajr shows last night\'s Isha', () => {
    const now = currentWaqt(today, yesterday, at(0, 47))!;
    expect(now.key).toBe('isha');
    expect(now.start.getDate()).toBe(25);
  });

  it('between farz waqts shows makruh, then nafil, then the next farz', () => {
    expect(currentWaqt(today, yesterday, at(6, 10))!.kind).toBe('makruh');
    expect(currentWaqt(today, yesterday, at(9, 0))).toEqual(jasmine.objectContaining({ key: 'chast', kind: 'nafil' }));
    expect(currentWaqt(today, yesterday, at(11, 44))).toEqual(jasmine.objectContaining({ key: 'dhuhr', upcoming: true }));
  });
});
