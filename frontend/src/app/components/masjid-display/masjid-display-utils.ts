import { SalahKey as WaqtKey, SalahTime } from 'src/app/models/salah.model';

/** Salah rows the masjid display shows; Jumu'ah takes Dhuhr's place on Fridays. */
export type BoardSalahKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';

export interface BoardTiming {
  key: BoardSalahKey;
  labelKey: string;
  azan: string;
  jamat: string;
}

export interface BoardEvent {
  timing: BoardTiming;
  at: Date;
  tomorrow: boolean;
}

export type BeepKind = 'azan' | 'jamat';

export interface DisplayColors {
  bg: string;
  card: string;
  accent: string;
}

/** The board's own emerald-and-gold look; also the starting values of the owner's colour pickers. */
export const DEFAULT_DISPLAY_COLORS: DisplayColors = { bg: '#0c2b25', card: '#123a32', accent: '#e6b15c' };

/** Ready-made colour sets offered on the masjid edit form (the approved CR-002 mock-ups). */
export const DISPLAY_COLOR_PRESETS: ReadonlyArray<{ labelKey: string; colors: DisplayColors }> = [
  { labelKey: 'MASJID_DISPLAY.THEMES.EMERALD', colors: DEFAULT_DISPLAY_COLORS },
  { labelKey: 'MASJID_DISPLAY.THEMES.SAND', colors: { bg: '#f5eedf', card: '#fffaf0', accent: '#7a5a1d' } },
  { labelKey: 'MASJID_DISPLAY.THEMES.MIDNIGHT', colors: { bg: '#0b1222', card: '#131c33', accent: '#38bdf8' } }
];

/** Nafil and makruh rows, in time order, keyed by WaqtService's names. */
export const NAFIL_KEYS: ReadonlyArray<{ key: WaqtKey; labelKey: string }> = [
  { key: 'tahajjud', labelKey: 'TAHAJJUD' },
  { key: 'ishraq', labelKey: 'ISHRAQ' },
  { key: 'chast', labelKey: 'CHAST' },
  { key: 'awabin', labelKey: 'AWABIN' }
];

export const MAKRUH_KEYS: ReadonlyArray<{ key: WaqtKey; labelKey: string }> = [
  { key: 'tulu', labelKey: 'DASHBOARD.SALAH_NAMES.TULU' },
  { key: 'zawal', labelKey: 'ZAWAL' },
  { key: 'gurub', labelKey: 'DASHBOARD.SALAH_NAMES.GURUB' }
];

/** Parses stored "05:30 AM" style times (or 24h "17:30") as a time on `day`'s date. */
export function parseClock(value: string, day: Date): Date | null {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }
  let hours = Number(match[1]) % 24;
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Next azan or jamat after `now` among today's rows, else tomorrow's Fajr. Jamat falls back to
 * azan only for a row with no jamat time, so a masjid that lists azan only still gets a countdown.
 */
export function nextEvent(today: BoardTiming[], kind: BeepKind, now: Date): BoardEvent | null {
  const timeOf = (timing: BoardTiming) => (kind === 'azan' ? timing.azan : timing.jamat || timing.azan);
  const upcoming = today
    .map((timing) => ({ timing, at: parseClock(timeOf(timing), now) }))
    .filter((entry): entry is { timing: BoardTiming; at: Date } => !!entry.at && entry.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  if (upcoming) {
    return { ...upcoming, tomorrow: false };
  }

  const fajr = today.find((timing) => timing.key === 'fajr' && timeOf(timing));
  const at = fajr ? parseClock(timeOf(fajr), now) : null;
  if (!fajr || !at) {
    return null;
  }
  at.setDate(at.getDate() + 1);
  return { timing: fajr, at, tomorrow: true };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/**
 * Azan/jamat times the clock passed between two ticks, so each beeps once. A page that loads
 * after a time has passed starts with `from` = load time and does not beep for it.
 */
export function dueBeeps(today: BoardTiming[], from: Date, to: Date): Array<{ key: BoardSalahKey; kind: BeepKind }> {
  const due: Array<{ key: BoardSalahKey; kind: BeepKind }> = [];
  today.forEach((timing) => {
    (['azan', 'jamat'] as BeepKind[]).forEach((kind) => {
      const at = parseClock(timing[kind], to);
      if (at && at.getTime() > from.getTime() && at.getTime() <= to.getTime()) {
        due.push({ key: timing.key, kind });
      }
    });
  });
  return due;
}

export type WaqtKind = 'farz' | 'makruh' | 'nafil';

export interface CurrentWaqt {
  key: WaqtKey;
  labelKey: string;
  kind: WaqtKind;
  start: Date;
  end: Date;
  /** True when nothing runs now and this is the next farz waqt instead. */
  upcoming: boolean;
}

const FARZ_KEYS: ReadonlyArray<WaqtKey> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * The waqt running now, for the board's side panel: a farz salah first, else a makruh time,
 * else a nafil time, else the next farz waqt. Before Fajr the running Isha is last night's,
 * so `yesterday` (the previous day's windows) is needed then.
 */
export function currentWaqt(
  today: Record<WaqtKey, SalahTime>,
  yesterday: Record<WaqtKey, SalahTime> | null,
  now: Date
): CurrentWaqt | null {
  const nowMs = now.getTime();
  const contains = (window?: SalahTime) => !!window && nowMs >= window.start.getTime() && nowMs < window.end.getTime();
  const result = (key: WaqtKey, labelKey: string, kind: WaqtKind, window: SalahTime, upcoming = false): CurrentWaqt =>
    ({ key, labelKey, kind, start: window.start, end: window.end, upcoming });

  if (yesterday && contains(yesterday.isha)) {
    return result('isha', 'ISHA', 'farz', yesterday.isha);
  }
  const farz = FARZ_KEYS.find((key) => contains(today[key]));
  if (farz) {
    return result(farz, farz.toUpperCase(), 'farz', today[farz]);
  }
  const makruh = MAKRUH_KEYS.find(({ key }) => contains(today[key]));
  if (makruh) {
    return result(makruh.key, makruh.labelKey, 'makruh', today[makruh.key]);
  }
  const nafil = NAFIL_KEYS.find(({ key }) => contains(today[key]));
  if (nafil) {
    return result(nafil.key, nafil.labelKey, 'nafil', today[nafil.key]);
  }
  const next = FARZ_KEYS.find((key) => today[key] && today[key].start.getTime() > nowMs);
  return next ? result(next, next.toUpperCase(), 'farz', today[next], true) : null;
}

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

/** Owner colours from the API, or null when missing or malformed. */
export function readDisplayColors(value: unknown): DisplayColors | null {
  const colors = value as Partial<DisplayColors> | null;
  return colors && isValidHex(colors.bg) && isValidHex(colors.card) && isValidHex(colors.accent)
    ? { bg: colors.bg, card: colors.card, accent: colors.accent }
    : null;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * CSS variables for the board from the owner's three colours. Text colours are derived from
 * the background and highlight luminance, so any choice stays readable.
 */
export function displayPalette(colors: DisplayColors): Record<string, string> {
  const dark = luminance(colors.bg) < 0.35;
  const accentDark = luminance(colors.accent) < 0.35;
  const text = dark ? '#f7f3ea' : '#2a2116';
  return {
    '--bg': colors.bg,
    '--surface': colors.card,
    '--surface-border': dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(42, 33, 22, 0.12)',
    '--text': text,
    '--muted': dark ? 'rgba(247, 243, 234, 0.62)' : 'rgba(42, 33, 22, 0.62)',
    '--accent': colors.accent,
    '--accent-text': accentDark ? '#fffaf0' : '#1f1608',
    // The highlight used as text on the background falls back to the text colour when too close to it.
    '--accent-on-bg': Math.abs(luminance(colors.accent) - luminance(colors.bg)) > 0.25 ? colors.accent : text,
    '--makruh': dark ? '#f4a491' : '#a3412a',
    '--now': colors.accent
  };
}
