import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SalahKey as WaqtKey, SalahTime } from 'src/app/models/salah.model';
import { HijriCalendarService } from 'src/app/services/hijri-calendar.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { BackNavigationService } from 'src/app/services/back-navigation.service';
import { WaqtService } from 'src/app/services/waqt.service';
import {
  ARABIC_NAMES,
  BeepKind,
  BoardEvent,
  BoardSalahKey,
  BoardTiming,
  DisplayColors,
  MAKRUH_KEYS,
  NAFIL_KEYS,
  displayPalette,
  dueBeeps,
  formatCountdown,
  nextEvent,
  parseClock,
  readDisplayColors,
  waqtFor
} from './masjid-display-utils';

/** 'masjid' = the colours the masjid owner saved; offered only when there are some. */
export type DisplayTheme = 'masjid' | 'emerald' | 'midnight' | 'sand' | 'light' | 'gold';

type SalahKey = BoardSalahKey;
type DisplayTiming = BoardTiming;

interface CachedMasjid {
  name: string;
  address: string;
  timings: DisplayTiming[];
  updatedAt: string | null;
  // Added by CR-002; absent in caches saved by older versions.
  latitude?: number | null;
  longitude?: number | null;
  madhab?: string | null;
  displayColors?: DisplayColors | null;
}

interface WindowRow {
  key: string;
  labelKey: string;
  starts: string;
  ends: string;
  now: boolean;
}

const BUILT_IN_THEMES: DisplayTheme[] = ['emerald', 'midnight', 'sand', 'light', 'gold'];
const SALAH_ORDER: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];
const SALAH_ALIASES: Record<string, SalahKey> = {
  fajr: 'fajr', fajar: 'fajr',
  dhuhr: 'dhuhr', zuhr: 'dhuhr', zohar: 'dhuhr', zohr: 'dhuhr',
  asr: 'asr', asar: 'asr',
  maghrib: 'maghrib', magrib: 'maghrib',
  isha: 'isha',
  jumuah: 'jumuah', juma: 'jumuah', jumma: 'jumuah', jummah: 'jumuah', jumah: 'jumuah', friday: 'jumuah'
};
const JAMAT_IN_PROGRESS_MS = 10 * 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;
const CONTROLS_HIDE_MS = 4000;
// Masjids have no calculation-method setting; Karachi is the app's default (CR-002 decision).
const WAQT_METHOD = 'karachi';
// Beep patterns: azan 3 short, jamat 1 long, so the two are told apart by ear.
const BEEPS: Record<BeepKind, { frequency: number; durationMs: number; count: number }> = {
  azan: { frequency: 880, durationMs: 200, count: 3 },
  jamat: { frequency: 660, durationMs: 900, count: 1 }
};

/**
 * Full-screen display for a masjid's own monitors: clock, today's salah table with waqt windows,
 * nafil and makruh tables, azan and jamat countdowns with a beep, and the masjid's colours.
 * Runs unattended, so it caches the last timings, refreshes periodically and keeps the screen
 * awake where the browser allows it.
 */
@Component({
  selector: 'app-masjid-display',
  templateUrl: './masjid-display.component.html',
  styleUrls: ['./masjid-display.component.scss', './masjid-display-controls.scss']
})
export class MasjidDisplayComponent implements OnInit, OnDestroy {
  masjidId = '';
  name = '';
  address = '';
  timings: DisplayTiming[] = [];
  updatedAt: string | null = null;
  latitude: number | null = null;
  longitude: number | null = null;
  madhab: string | null = null;
  displayColors: DisplayColors | null = null;
  loading = true;
  notFound = false;
  usingCache = false;
  theme: DisplayTheme = 'emerald';
  now = new Date();
  controlsVisible = true;
  themeMenuOpen = false;
  isFullscreen = false;
  soundOn = true;
  // True while the browser holds audio back until someone taps the screen.
  soundBlocked = false;

  private clockTimer?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private wakeLock: { release(): Promise<void> } | null = null;
  private routeSub?: Subscription;
  private requestSub?: Subscription;
  private audio: AudioContext | null = null;
  private waqtCache: { day: string; key: string; times: Record<WaqtKey, SalahTime> | null } | null = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigation: BackNavigationService,
    private ramadanApi: RamadanApiService,
    private localStorageService: LocalStorageService,
    private hijri: HijriCalendarService,
    private waqt: WaqtService,
    public i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    // The global body padding reserves room for the bottom nav, which this screen does not have.
    this.document.body.style.paddingBottom = '0px';
    this.document.body.classList.add('masjid-display-active');

    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.masjidId = params.get('id') ?? '';
      this.soundOn = this.localStorageService.getItem<boolean>(this.soundKey) !== false;
      this.restoreCache();
      this.theme = this.readTheme();
      this.load();
    });

    this.clockTimer = setInterval(() => this.tick(), 1000);
    this.refreshTimer = setInterval(() => this.load(), REFRESH_MS);
    this.hijri.loadAdjustments().subscribe();
    this.prepareAudio();
    void this.requestWakeLock();
    this.scheduleHideControls();
  }

  ngOnDestroy(): void {
    this.document.body.style.paddingBottom = '';
    this.document.body.classList.remove('masjid-display-active');
    clearInterval(this.clockTimer);
    clearInterval(this.refreshTimer);
    clearTimeout(this.hideTimer);
    this.routeSub?.unsubscribe();
    this.requestSub?.unsubscribe();
    void this.audio?.close().catch(() => undefined);
    void this.wakeLock?.release().catch(() => undefined);
    if (this.document.fullscreenElement) {
      void this.document.exitFullscreen().catch(() => undefined);
    }
  }

  /* ------------------------------------------------------------ display */

  get clock(): string {
    return new Intl.DateTimeFormat(this.i18n.getDateLocale(), { hour: '2-digit', minute: '2-digit', hour12: true }).format(this.now);
  }

  /** Clock split into time and AM/PM, so the meridiem can sit small beside the big digits. */
  get clockParts(): { time: string; meridiem: string } {
    const parts = new Intl.DateTimeFormat(this.i18n.getDateLocale(), { hour: '2-digit', minute: '2-digit', hour12: true }).formatToParts(this.now);
    const meridiem = parts.find((part) => part.type === 'dayPeriod')?.value ?? '';
    const time = parts.filter((part) => part.type !== 'dayPeriod').map((part) => part.value).join('').trim();
    return { time, meridiem };
  }

  get seconds(): string {
    return String(this.now.getSeconds()).padStart(2, '0');
  }

  get gregorianDate(): string {
    return this.i18n.formatDate(this.now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  get hijriDate(): string {
    return this.hijri.formatHijriDate(this.now);
  }

  get isFriday(): boolean {
    return this.now.getDay() === 5;
  }

  get themes(): DisplayTheme[] {
    return this.displayColors ? ['masjid', ...BUILT_IN_THEMES] : BUILT_IN_THEMES;
  }

  /** Inline CSS variables for the owner's colours; the built-in themes come from the stylesheet. */
  get paletteStyle(): Record<string, string> | null {
    return this.theme === 'masjid' && this.displayColors ? displayPalette(this.displayColors) : null;
  }

  /** Today's rows: Jumu'ah only on Fridays, where it replaces Dhuhr. */
  get todayTimings(): DisplayTiming[] {
    const jumuah = this.timings.find((timing) => timing.key === 'jumuah');
    const rows = this.timings.filter((timing) => timing.key !== 'jumuah');
    if (!this.isFriday || !jumuah) {
      return rows;
    }

    // On Fridays Jumu'ah takes Dhuhr's slot so the rows stay in prayer order.
    const dhuhrIndex = rows.findIndex((timing) => timing.key === 'dhuhr');
    if (dhuhrIndex >= 0) {
      rows[dhuhrIndex] = jumuah;
    } else {
      const afterNoon = rows.findIndex((timing) => SALAH_ORDER.indexOf(timing.key) > SALAH_ORDER.indexOf('dhuhr'));
      rows.splice(afterNoon < 0 ? rows.length : afterNoon, 0, jumuah);
    }
    return rows;
  }

  /** Timing whose jamat is running now (within 10 minutes of its start), if any. */
  get inProgress(): DisplayTiming | null {
    const nowMs = this.now.getTime();
    return this.todayTimings.find((timing) => {
      const jamat = parseClock(timing.jamat, this.now);
      return !!jamat && nowMs >= jamat.getTime() && nowMs < jamat.getTime() + JAMAT_IN_PROGRESS_MS;
    }) ?? null;
  }

  get nextAzan(): BoardEvent | null {
    return nextEvent(this.todayTimings, 'azan', this.now);
  }

  get nextJamat(): BoardEvent | null {
    return nextEvent(this.todayTimings, 'jamat', this.now);
  }

  get azanCountdown(): string {
    const next = this.nextAzan;
    return next ? formatCountdown(next.at.getTime() - this.now.getTime()) : '--:--:--';
  }

  get jamatCountdown(): string {
    const next = this.nextJamat;
    return next ? formatCountdown(next.at.getTime() - this.now.getTime()) : '--:--:--';
  }

  /** The highlighted row: the salah whose jamat comes next today. */
  isNext(timing: DisplayTiming): boolean {
    const next = this.nextJamat;
    return !!next && !next.tomorrow && next.timing.key === timing.key;
  }

  isPast(timing: DisplayTiming): boolean {
    const jamat = parseClock(timing.jamat || timing.azan, this.now);
    return !!jamat && jamat.getTime() + JAMAT_IN_PROGRESS_MS <= this.now.getTime();
  }

  arabicName(timing: DisplayTiming): string {
    return ARABIC_NAMES[timing.key];
  }

  /** Waqt windows need the masjid's map pin; without one the Starts/Ends columns and tables hide. */
  get hasWaqt(): boolean {
    return !!this.waqtTimes;
  }

  waqtStart(timing: DisplayTiming): string {
    const window = this.waqtTimes ? waqtFor(timing.key, this.waqtTimes) : null;
    return window ? this.formatTime(window.start) : '--';
  }

  waqtEnd(timing: DisplayTiming): string {
    const window = this.waqtTimes ? waqtFor(timing.key, this.waqtTimes) : null;
    return window ? this.formatTime(window.end) : '--';
  }

  get nafilRows(): WindowRow[] {
    return this.windowRows(NAFIL_KEYS, true);
  }

  get makruhRows(): WindowRow[] {
    return this.windowRows(MAKRUH_KEYS, false);
  }

  get lastUpdatedLabel(): string {
    if (!this.updatedAt) {
      return '';
    }
    const date = new Date(this.updatedAt.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return this.i18n.translateWithParams('MASJID_DISPLAY.LAST_UPDATED', {
      date: this.i18n.formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' })
    });
  }

  trackByKey(_: number, item: { key: string }): string {
    return item.key;
  }

  /* ----------------------------------------------------------- controls */

  @HostListener('document:mousemove')
  @HostListener('document:touchstart')
  @HostListener('document:keydown')
  onActivity(): void {
    this.controlsVisible = true;
    this.scheduleHideControls();
  }

  /** A tap or key press is what browsers accept as permission to play sound. */
  @HostListener('document:pointerdown')
  @HostListener('document:keydown')
  unlockAudio(): void {
    if (this.audio?.state === 'suspended') {
      void this.audio.resume().then(() => this.soundBlocked = false).catch(() => undefined);
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!this.document.fullscreenElement;
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    // Wake locks are released when the page is hidden; take it again on return.
    if (!this.document.hidden) {
      void this.requestWakeLock();
      this.load();
    }
  }

  setTheme(theme: DisplayTheme): void {
    this.theme = theme;
    this.themeMenuOpen = false;
    this.localStorageService.setItem(this.themeKey, theme);
  }

  toggleThemeMenu(): void {
    this.themeMenuOpen = !this.themeMenuOpen;
  }

  toggleSound(): void {
    this.soundOn = !this.soundOn;
    this.localStorageService.setItem(this.soundKey, this.soundOn);
    if (this.soundOn) {
      this.unlockAudio();
      this.beep('azan');
    }
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (this.document.fullscreenElement) {
        await this.document.exitFullscreen();
      } else {
        await this.document.documentElement.requestFullscreen();
      }
    } catch {
      // Not allowed here (e.g. some WebViews); the screen is already chrome-free.
    }
  }

  exit(): void {
    this.backNavigation.back(['/masjid', this.masjidId]);
  }

  /* --------------------------------------------------------------- clock */

  private tick(): void {
    const previous = this.now;
    this.now = new Date();
    if (!this.soundOn) {
      return;
    }
    const due = dueBeeps(this.todayTimings, previous, this.now);
    // Jamat wins when both fall in the same second.
    const kind = due.some((event) => event.kind === 'jamat') ? 'jamat' : due.length ? 'azan' : null;
    if (kind) {
      this.beep(kind);
    }
  }

  private prepareAudio(): void {
    const audioWindow = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }
    try {
      const audio = new AudioCtor();
      this.audio = audio;
      this.soundBlocked = audio.state === 'suspended';
    } catch {
      this.audio = null;
    }
  }

  private beep(kind: BeepKind): void {
    if (!this.audio || this.audio.state !== 'running') {
      return;
    }
    const { frequency, durationMs, count } = BEEPS[kind];
    const start = this.audio.currentTime + 0.05;
    for (let index = 0; index < count; index++) {
      const at = start + index * (durationMs / 1000 + 0.15);
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      // Short fade in/out so the beep does not click.
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.4, at + 0.02);
      gain.gain.setValueAtTime(0.4, at + durationMs / 1000 - 0.03);
      gain.gain.linearRampToValueAtTime(0, at + durationMs / 1000);
      oscillator.connect(gain).connect(this.audio.destination);
      oscillator.start(at);
      oscillator.stop(at + durationMs / 1000);
    }
  }

  /* --------------------------------------------------------------- waqt */

  /** Today's waqt/nafil/makruh windows at the masjid's pin, recomputed once a day. */
  private get waqtTimes(): Record<WaqtKey, SalahTime> | null {
    if (this.latitude == null || this.longitude == null) {
      return null;
    }
    const day = this.now.toDateString();
    const key = `${this.latitude},${this.longitude},${this.madhab}`;
    if (this.waqtCache?.day !== day || this.waqtCache.key !== key) {
      let times: Record<WaqtKey, SalahTime> | null = null;
      try {
        const madhab = this.madhab === 'shafi' ? 'Shafi' : 'Hanafi';
        // The display stands in the masjid, so the device's own time zone is the masjid's.
        const tz = -this.now.getTimezoneOffset() / 60;
        times = this.waqt.getTimes(new Date(this.now), this.latitude, this.longitude, tz, WAQT_METHOD, madhab);
      } catch {
        times = null;
      }
      this.waqtCache = { day, key, times };
    }
    return this.waqtCache.times;
  }

  private windowRows(keys: ReadonlyArray<{ key: WaqtKey; labelKey: string }>, markNow: boolean): WindowRow[] {
    const times = this.waqtTimes;
    if (!times) {
      return [];
    }
    const nowMs = this.now.getTime();
    return keys
      .filter(({ key }) => !!times[key])
      .map(({ key, labelKey }) => ({
        key,
        labelKey,
        starts: this.formatTime(times[key].start),
        ends: this.formatTime(times[key].end),
        now: markNow && nowMs >= times[key].start.getTime() && nowMs < times[key].end.getTime()
      }));
  }

  /** Same look as the masjid's own saved times ("04:55 AM"), which sit in the same table. */
  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat(this.i18n.getDateLocale(), { hour: '2-digit', minute: '2-digit', hour12: true }).format(date).toUpperCase();
  }

  /* --------------------------------------------------------------- data */

  private load(): void {
    if (!this.masjidId) {
      return;
    }

    this.requestSub?.unsubscribe();
    this.requestSub = this.ramadanApi.masjidDetails(this.masjidId).subscribe({
      next: (response) => {
        const masjid = typeof response === 'string' ? JSON.parse(response) : response;
        if (!masjid?.name) {
          this.notFound = !this.timings.length;
          this.loading = false;
          return;
        }

        const toCoordinate = (value: unknown) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
        const data: CachedMasjid = {
          name: masjid.name,
          address: [masjid.address, masjid.area, masjid.city].map((part: unknown) => String(part ?? '').trim()).filter(Boolean)
            .filter((part: string, index: number, parts: string[]) => parts.indexOf(part) === index).join(', '),
          timings: this.normalizeTimings(masjid.timings ?? []),
          updatedAt: masjid.timingsUpdatedAt ?? null,
          latitude: toCoordinate(masjid.latitude),
          longitude: toCoordinate(masjid.longitude),
          madhab: masjid.madhab ?? null,
          displayColors: readDisplayColors(masjid.displayColors)
        };
        const hadColors = !!this.displayColors;
        this.apply(data);
        // Colours just saved by the owner take over screens that were on the default look.
        if (!hadColors && this.displayColors && !this.localStorageService.getItem<DisplayTheme>(this.themeKey)) {
          this.theme = 'masjid';
        } else if (this.theme === 'masjid' && !this.displayColors) {
          this.theme = this.readTheme();
        }
        this.usingCache = false;
        this.notFound = false;
        this.loading = false;
        this.localStorageService.setItem(this.cacheKey, data);
      },
      error: (error) => {
        // Keep showing cached timings through network blips; only a real 404 with nothing cached is "not found".
        this.loading = false;
        this.usingCache = this.timings.length > 0;
        this.notFound = !this.timings.length && error?.status === 404;
      }
    });
  }

  private apply(data: CachedMasjid): void {
    this.name = data.name;
    this.address = data.address;
    this.timings = data.timings;
    this.updatedAt = data.updatedAt;
    this.latitude = data.latitude ?? null;
    this.longitude = data.longitude ?? null;
    this.madhab = data.madhab ?? null;
    this.displayColors = data.displayColors ?? null;
  }

  private restoreCache(): void {
    const cached = this.localStorageService.getItem<CachedMasjid>(this.cacheKey);
    if (cached?.name) {
      this.apply(cached);
      this.usingCache = true;
      this.loading = false;
    }
  }

  private normalizeTimings(rows: any[]): DisplayTiming[] {
    const byKey = new Map<SalahKey, DisplayTiming>();
    rows.forEach((row) => {
      const key = SALAH_ALIASES[String(row?.salah ?? '').toLowerCase().replace(/[^a-z]/g, '')];
      if (!key || byKey.has(key)) {
        return;
      }
      byKey.set(key, {
        key,
        labelKey: key.toUpperCase(),
        azan: String(row?.azan ?? row?.azan_time ?? '').trim(),
        jamat: String(row?.jamat ?? row?.jamat_time ?? '').trim()
      });
    });
    return SALAH_ORDER.filter((key) => byKey.has(key)).map((key) => byKey.get(key)!);
  }

  private scheduleHideControls(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (!this.themeMenuOpen) {
        this.controlsVisible = false;
      }
    }, CONTROLS_HIDE_MS);
  }

  private async requestWakeLock(): Promise<void> {
    const wakeLockApi = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
    if (!wakeLockApi || this.document.hidden) {
      return;
    }
    try {
      this.wakeLock = await wakeLockApi.request('screen');
    } catch {
      // Denied (battery saver, unsupported WebView); the display still works.
    }
  }

  /** The screen's own choice, else the masjid's colours, else emerald. */
  private readTheme(): DisplayTheme {
    const saved = this.localStorageService.getItem<DisplayTheme>(this.themeKey);
    if (saved && this.themes.includes(saved)) {
      return saved;
    }
    return this.displayColors ? 'masjid' : 'emerald';
  }

  private get themeKey(): string {
    return `masjid-display-theme-${this.masjidId}`;
  }

  private get soundKey(): string {
    return `masjid-display-sound-${this.masjidId}`;
  }

  private get cacheKey(): string {
    return `masjid-display-cache-${this.masjidId}`;
  }
}
