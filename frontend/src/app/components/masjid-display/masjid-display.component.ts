import { DOCUMENT, Location } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HijriCalendarService } from 'src/app/services/hijri-calendar.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';

export type DisplayTheme = 'emerald' | 'midnight' | 'sand' | 'light' | 'gold';

type SalahKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';

interface DisplayTiming {
  key: SalahKey;
  labelKey: string;
  azan: string;
  jamat: string;
}

interface CachedMasjid {
  name: string;
  address: string;
  timings: DisplayTiming[];
  updatedAt: string | null;
}

const THEMES: DisplayTheme[] = ['emerald', 'midnight', 'sand', 'light', 'gold'];
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

/**
 * Full-screen display for a masjid's own monitors: large clock, today's azan/jamat times,
 * next-jamat countdown and themes. Runs unattended, so it caches the last timings, refreshes
 * periodically and keeps the screen awake where the browser allows it.
 */
@Component({
  selector: 'app-masjid-display',
  templateUrl: './masjid-display.component.html',
  styleUrls: ['./masjid-display.component.scss']
})
export class MasjidDisplayComponent implements OnInit, OnDestroy {
  readonly themes = THEMES;
  masjidId = '';
  name = '';
  address = '';
  timings: DisplayTiming[] = [];
  updatedAt: string | null = null;
  loading = true;
  notFound = false;
  usingCache = false;
  theme: DisplayTheme = 'emerald';
  now = new Date();
  controlsVisible = true;
  themeMenuOpen = false;
  isFullscreen = false;

  private clockTimer?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private wakeLock: { release(): Promise<void> } | null = null;
  private routeSub?: Subscription;
  private requestSub?: Subscription;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private ramadanApi: RamadanApiService,
    private localStorageService: LocalStorageService,
    private hijri: HijriCalendarService,
    public i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    // The global body padding reserves room for the bottom nav, which this screen does not have.
    this.document.body.style.paddingBottom = '0px';
    this.document.body.classList.add('masjid-display-active');

    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.masjidId = params.get('id') ?? '';
      this.theme = this.readTheme();
      this.restoreCache();
      this.load();
    });

    this.clockTimer = setInterval(() => this.now = new Date(), 1000);
    this.refreshTimer = setInterval(() => this.load(), REFRESH_MS);
    this.hijri.loadAdjustments().subscribe();
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
    void this.wakeLock?.release().catch(() => undefined);
    if (this.document.fullscreenElement) {
      void this.document.exitFullscreen().catch(() => undefined);
    }
  }

  /* ------------------------------------------------------------ display */

  get clock(): string {
    return new Intl.DateTimeFormat(this.i18n.getDateLocale(), { hour: '2-digit', minute: '2-digit', hour12: true }).format(this.now);
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

  /** Today's rows: Jumu'ah only on Fridays, where it replaces Dhuhr. */
  get todayTimings(): DisplayTiming[] {
    const jumuah = this.timings.find((timing) => timing.key === 'jumuah');
    const rows = this.timings.filter((timing) => timing.key !== 'jumuah');
    if (!this.isFriday || !jumuah) {
      return rows;
    }

    // On Fridays Jumu'ah takes Dhuhr's slot so the cards stay in prayer order.
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
      const jamat = this.toToday(timing.jamat);
      return !!jamat && nowMs >= jamat.getTime() && nowMs < jamat.getTime() + JAMAT_IN_PROGRESS_MS;
    }) ?? null;
  }

  /** Next upcoming jamat today, or tomorrow's first one after Isha. */
  get next(): { timing: DisplayTiming; at: Date; tomorrow: boolean } | null {
    const nowMs = this.now.getTime();
    const upcoming = this.todayTimings
      .map((timing) => ({ timing, at: this.toToday(timing.jamat || timing.azan) }))
      .filter((entry): entry is { timing: DisplayTiming; at: Date } => !!entry.at && entry.at.getTime() > nowMs)
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    if (upcoming) {
      return { ...upcoming, tomorrow: false };
    }

    const first = this.timings.find((timing) => timing.key === 'fajr' && (timing.jamat || timing.azan));
    const at = first ? this.toToday(first.jamat || first.azan) : null;
    if (!first || !at) {
      return null;
    }
    at.setDate(at.getDate() + 1);
    return { timing: first, at, tomorrow: true };
  }

  get countdown(): string {
    const next = this.next;
    if (!next) {
      return '--:--:--';
    }
    const total = Math.max(0, Math.floor((next.at.getTime() - this.now.getTime()) / 1000));
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  }

  isNext(timing: DisplayTiming): boolean {
    const next = this.next;
    return !!next && !next.tomorrow && next.timing.key === timing.key;
  }

  isPast(timing: DisplayTiming): boolean {
    const jamat = this.toToday(timing.jamat || timing.azan);
    return !!jamat && jamat.getTime() + JAMAT_IN_PROGRESS_MS <= this.now.getTime();
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

  trackByKey(_: number, timing: DisplayTiming): string {
    return timing.key;
  }

  /* ----------------------------------------------------------- controls */

  @HostListener('document:mousemove')
  @HostListener('document:touchstart')
  @HostListener('document:keydown')
  onActivity(): void {
    this.controlsVisible = true;
    this.scheduleHideControls();
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
    if (ScreenHeaderComponent.hasInAppHistory()) {
      this.location.back();
      return;
    }
    void this.router.navigate(['/masjid', this.masjidId], { replaceUrl: true });
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

        const data: CachedMasjid = {
          name: masjid.name,
          address: [masjid.address, masjid.area, masjid.city].map((part: unknown) => String(part ?? '').trim()).filter(Boolean)
            .filter((part: string, index: number, parts: string[]) => parts.indexOf(part) === index).join(', '),
          timings: this.normalizeTimings(masjid.timings ?? []),
          updatedAt: masjid.timingsUpdatedAt ?? null
        };
        this.apply(data);
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

  /** Parses stored "05:30 AM" style times (or 24h "17:30") as today's date. */
  private toToday(value: string): Date | null {
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
    const date = new Date(this.now);
    date.setHours(hours, minutes, 0, 0);
    return date;
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

  private readTheme(): DisplayTheme {
    const saved = this.localStorageService.getItem<DisplayTheme>(this.themeKey);
    return saved && THEMES.includes(saved) ? saved : 'emerald';
  }

  private get themeKey(): string {
    return `masjid-display-theme-${this.masjidId}`;
  }

  private get cacheKey(): string {
    return `masjid-display-cache-${this.masjidId}`;
  }
}
