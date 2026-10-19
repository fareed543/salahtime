import { Component, OnInit } from '@angular/core';
import {
  AdminDashboardInsights,
  AdminDashboardService,
  AdminDashboardLanguage,
  AdminDashboardSummary,
  AdminPendingMasjid,
  AdminVisitorPeriodStats
} from '../services/admin-dashboard.service';
import { AuthStateService } from '../services/auth-state.service';
import { ToastService } from '../services/toast.service';
import { CommunityService } from '../community/community.service';
import { AppVersionsService } from '../app-versions/app-versions.service';
import { LanguagesService } from '../languages/languages.service';

declare const Swal: { fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }> };

type SignupPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Tone = 'primary' | 'success' | 'info' | 'warning' | 'danger' | 'secondary';

interface StatCard {
  label: string;
  value: string;
  trend: string;
  trendTone: 'success' | 'danger' | 'muted';
  trendIcon: string;
  icon: string;
  tone: Tone;
  link: string;
}

interface RegistrationBar {
  label: string;
  x: number;
  current: number | null;
  previous: number;
  currentX: number;
  currentY: number;
  currentHeight: number;
  previousX: number;
  previousY: number;
  previousHeight: number;
}

interface DonutSegment {
  label: string;
  count: number;
  percent: number;
  dashArray: string;
  dashOffset: number;
  color: string;
  tone: Tone;
  icon: string;
}

interface ActivityItem {
  title: string;
  subtitle: string;
  when: string;
  link: string;
  icon: string;
  tone: Tone;
}

/** Chart geometry for the inline SVG charts (no chart library, keeps the bundle small). */
const BAR_CHART = { width: 720, height: 280, left: 34, right: 12, top: 16, bottom: 30 };
const AREA_CHART = { width: 340, height: 170, padX: 8, top: 14, bottom: 22 };
const SPARK = { width: 180, height: 80, pad: 6 };
const DONUT_RADIUS = 42;
const GAUGE_RADIUS = 62;

const ROLE_STYLES: Array<{ tone: Tone; color: string; icon: string }> = [
  { tone: 'primary', color: '#696cff', icon: 'bx bx-user' },
  { tone: 'success', color: '#71dd37', icon: 'bx bx-user-check' },
  { tone: 'info', color: '#03c3ec', icon: 'bx bx-shield-quarter' },
  { tone: 'warning', color: '#ffab00', icon: 'bx bx-donate-heart' },
  { tone: 'secondary', color: '#8592a3', icon: 'bx bx-group' }
];

const ACTIVITY_STYLES: Record<string, { icon: string; tone: Tone }> = {
  user: { icon: 'bx bx-user-plus', tone: 'primary' },
  masjid: { icon: 'bx bx-building-house', tone: 'success' },
  program: { icon: 'bx bx-calendar-event', tone: 'info' },
  query: { icon: 'bx bx-message-square-error', tone: 'warning' }
};

const STATUS_STYLES: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'danger' },
  in_progress: { label: 'In progress', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'secondary' }
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly barChart = BAR_CHART;
  readonly areaChart = AREA_CHART;
  readonly spark = SPARK;
  readonly donutRadius = DONUT_RADIUS;
  readonly gaugeRadius = GAUGE_RADIUS;
  readonly signupTabs: Array<{ key: SignupPeriod; label: string; caption: string }> = [
    { key: 'daily', label: 'Today', caption: 'last 24 hours' },
    { key: 'weekly', label: 'Week', caption: 'last 7 days' },
    { key: 'monthly', label: 'Month', caption: 'last 30 days' },
    { key: 'yearly', label: 'Year', caption: 'last 12 months' }
  ];

  summary: AdminDashboardSummary | null = null;
  insights: AdminDashboardInsights | null = null;
  isLoading = true;
  errorMessage = '';
  signupPeriod: SignupPeriod = 'weekly';

  statCards: StatCard[] = [];
  sideCards: StatCard[] = [];
  /** Masjids waiting for approval, highlighted at the top (ST-00013). */
  pendingMasjids: AdminPendingMasjid[] = [];
  pendingMasjidCount = 0;
  approvingIds = new Set<number>();
  /** Bar width in the grouped registrations chart (two bars per month). */
  registrationBarWidth = 12;
  publishingVersion = false;
  togglingLanguageIds = new Set<number>();
  registrationBars: RegistrationBar[] = [];
  registrationAxis: Array<{ y: number; label: string }> = [];
  registrationZeroY = 0;
  roleSegments: DonutSegment[] = [];
  activityItems: ActivityItem[] = [];
  weeklySparkPath = '';
  weeklySparkLast: { x: number; y: number } | null = null;

  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    private readonly authStateService: AuthStateService,
    private readonly community: CommunityService,
    private readonly toast: ToastService,
    private readonly appVersions: AppVersionsService,
    private readonly languagesService: LanguagesService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  get adminName(): string {
    return this.authStateService.getCurrentUser()?.firstname?.trim() || 'Admin';
  }

  get generatedAtText(): string {
    return this.summary?.generatedAt ? new Date(this.summary.generatedAt).toLocaleString() : '';
  }

  get growthPercent(): number | null {
    return this.insights?.registrations.growthPercent ?? null;
  }

  /** 270° gauge: dash length for |growth| capped at 100%. */
  get gaugeDash(): string {
    const arc = 2 * Math.PI * GAUGE_RADIUS * 0.75;
    const share = Math.min(Math.abs(this.growthPercent ?? 0), 100) / 100;
    return `${arc * share} ${2 * Math.PI * GAUGE_RADIUS}`;
  }

  get gaugeTrack(): string {
    const circumference = 2 * Math.PI * GAUGE_RADIUS;
    return `${circumference * 0.75} ${circumference}`;
  }

  get activePercent(): number {
    if (!this.summary) {
      return 0;
    }
    return this.percent(this.summary.statusBreakdown.users.active, this.summary.counts.users);
  }

  get activeRingDash(): string {
    const circumference = 2 * Math.PI * 22;
    return `${(circumference * this.activePercent) / 100} ${circumference}`;
  }

  get signupStats(): AdminVisitorPeriodStats | null {
    return this.summary?.visitorStats?.[this.signupPeriod] ?? null;
  }

  get signupCaption(): string {
    return this.signupTabs.find((tab) => tab.key === this.signupPeriod)?.caption ?? '';
  }

  get signupLinePath(): string {
    return this.smoothPath(this.signupPoints());
  }

  get signupAreaPath(): string {
    const points = this.signupPoints();
    if (!points.length) {
      return '';
    }
    const baseline = AREA_CHART.height - AREA_CHART.bottom;
    return `${this.smoothPath(points)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  }

  get signupLastPoint(): { x: number; y: number } | null {
    const points = this.signupPoints();
    return points.length ? points[points.length - 1] : null;
  }

  get signupAxisLabels(): Array<{ x: number; label: string }> {
    const stats = this.signupStats;
    if (!stats?.points.length) {
      return [];
    }
    const points = this.signupPoints();
    // Keep the x-axis readable: at most 7 labels.
    const step = Math.max(1, Math.ceil(points.length / 7));
    return stats.points
      .map((point, index) => ({ x: points[index].x, label: point.shortLabel }))
      .filter((_, index) => index % step === 0 || index === points.length - 1);
  }

  get supportStatusList(): Array<{ label: string; count: number; tone: Tone }> {
    const byStatus = this.insights?.support?.byStatus ?? {};
    return Object.keys(STATUS_STYLES)
      .filter((key) => byStatus[key])
      .map((key) => ({ label: STATUS_STYLES[key].label, count: byStatus[key], tone: STATUS_STYLES[key].tone }));
  }

  get topRole(): DonutSegment | null {
    return this.roleSegments.length ? this.roleSegments[0] : null;
  }

  get maxCityCount(): number {
    return Math.max(...(this.insights?.masjidsByCity ?? []).map((city) => city.count), 1);
  }

  setSignupPeriod(period: SignupPeriod): void {
    this.signupPeriod = period;
  }

  statusLabel(status: string): string {
    return STATUS_STYLES[status]?.label ?? this.titleCase(status);
  }

  statusTone(status: string): Tone {
    return STATUS_STYLES[status]?.tone ?? 'secondary';
  }

  titleCase(value: string): string {
    return (value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase() : '?';
  }

  relativeTime(value: string): string {
    const date = this.parseServerDate(value);
    if (!date) {
      return '';
    }
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days}d ago`;
    }
    return days < 365 ? `${Math.floor(days / 30)}mo ago` : `${Math.floor(days / 365)}y ago`;
  }

  approveMasjid(masjid: AdminPendingMasjid): void {
    this.approvingIds.add(masjid.id);
    this.community.toggleMasjidStatus(masjid.id).subscribe({
      next: (response) => {
        this.approvingIds.delete(masjid.id);
        this.pendingMasjids = this.pendingMasjids.filter((item) => item.id !== masjid.id);
        this.pendingMasjidCount = Math.max(this.pendingMasjidCount - 1, 0);
        this.toast.success(response?.message || 'Masjid approved.');
        // Refill the list and counts quietly behind the toast.
        this.loadSummary(false);
      },
      error: (error) => {
        this.approvingIds.delete(masjid.id);
        this.toast.error(error, 'Unable to approve the masjid.');
      }
    });
  }

  compact(value: number | null | undefined): string {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value ?? 0);
  }

  number(value: number | null | undefined): string {
    return new Intl.NumberFormat('en').format(value ?? 0);
  }

  private loadSummary(showLoader = true): void {
    this.isLoading = showLoader;
    this.errorMessage = '';

    this.adminDashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.insights = summary.insights ?? null;
        this.buildView(summary);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to load the dashboard right now.';
        this.isLoading = false;
      }
    });
  }

  private buildView(summary: AdminDashboardSummary): void {
    const insights = summary.insights;
    const monthTrend = this.trend(insights?.users.thisMonth ?? 0, insights?.users.lastMonth ?? 0, 'vs last month');

    this.pendingMasjids = summary.recent.pendingMasjids ?? [];
    this.pendingMasjidCount = summary.statusBreakdown.masjids.pending ?? this.pendingMasjids.length;
    const masjidTrend: Pick<StatCard, 'trend' | 'trendTone' | 'trendIcon'> = this.pendingMasjidCount > 0
      ? { trend: `${this.pendingMasjidCount} waiting for approval`, trendTone: 'danger', trendIcon: 'bx bx-time-five' }
      : { trend: `${summary.statusBreakdown.masjids.active} active`, trendTone: 'muted', trendIcon: 'bx bx-check-circle' };

    this.statCards = [
      {
        label: 'Users',
        value: this.number(summary.counts.users),
        ...monthTrend,
        icon: 'bx bx-user',
        tone: 'primary',
        link: '/users'
      },
      {
        label: 'Masjids',
        value: this.number(summary.counts.masjids),
        ...masjidTrend,
        icon: 'bx bx-building-house',
        tone: 'success',
        link: '/community/masjids'
      }
    ];

    this.sideCards = [
      {
        label: 'Sehri Alerts',
        value: this.number(insights?.subscribers.sehri),
        trend: 'Ramadan subscriptions',
        trendTone: 'muted',
        trendIcon: 'bx bx-moon',
        icon: 'bx bx-bell',
        tone: 'warning',
        link: '/notifications'
      },
      {
        label: 'Programs',
        value: this.number(summary.counts.programs),
        trend: `${summary.statusBreakdown.programTypes.length} types`,
        trendTone: 'muted',
        trendIcon: 'bx bx-category',
        icon: 'bx bx-calendar-event',
        tone: 'info',
        link: '/community/programs'
      }
    ];

    this.buildRegistrationChart(insights);
    this.roleSegments = this.buildRoleDonut(insights?.usersByRole ?? []);
    this.activityItems = (insights?.activity ?? []).map((item) => ({
      title: item.title,
      subtitle: item.subtitle,
      when: this.relativeTime(item.at),
      link: item.link,
      icon: ACTIVITY_STYLES[item.type]?.icon ?? 'bx bx-bolt-circle',
      tone: ACTIVITY_STYLES[item.type]?.tone ?? 'secondary'
    }));
    this.buildWeeklySpark(summary.visitorStats.weekly);
  }

  /**
   * This year and last year side by side for each month, both rising from one zero line, with the
   * count printed on every bar. (It used to mirror last year below the axis, which read as negative
   * sign-ups, and gave tiny months a fixed minimum height so 1 and 5 looked the same.)
   */
  private buildRegistrationChart(insights: AdminDashboardInsights | undefined): void {
    const months = insights?.registrations.months ?? [];
    const { width, height, left, right, top, bottom } = BAR_CHART;
    const plotHeight = height - top - bottom;
    const baseY = top + plotHeight;
    const step = this.niceStep(Math.max(...months.map((m) => Math.max(m.current ?? 0, m.previous)), 1) / 4);
    const max = step * 4;
    const slot = (width - left - right) / Math.max(months.length, 1);
    const barWidth = Math.max(Math.min(14, (slot - 10) / 2), 4);
    const heightOf = (value: number) => (value > 0 ? Math.max((value / max) * plotHeight, 1.5) : 0);

    this.registrationZeroY = baseY;
    this.registrationBarWidth = barWidth;
    this.registrationBars = months.map((month, index) => {
      const center = left + slot * index + slot / 2;
      const currentHeight = heightOf(month.current ?? 0);
      const previousHeight = heightOf(month.previous);
      return {
        label: month.label,
        x: center,
        current: month.current,
        previous: month.previous,
        currentX: center - barWidth - 1,
        currentY: baseY - currentHeight,
        currentHeight,
        previousX: center + 1,
        previousY: baseY - previousHeight,
        previousHeight
      };
    });
    this.registrationAxis = [4, 3, 2, 1, 0].map((multiple, index) => ({
      y: top + (plotHeight / 4) * index,
      label: this.compact(step * multiple)
    }));
  }

  /** Round axis step (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten): a peak of 222 gives 60 per line, top 240. */
  private niceStep(raw: number): number {
    if (raw <= 1) {
      return 1;
    }
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / magnitude;
    const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => fraction <= candidate) ?? 10;
    return Math.max(Math.round(nice * magnitude), 1);
  }

  // ---- App version and languages: act from the dashboard ----

  get appAdoptionPercent(): number | null {
    const adoption = this.insights?.appAdoption;
    return adoption && adoption.devices > 0 ? Math.round((adoption.onLive / adoption.devices) * 100) : null;
  }

  get appDevicesBehind(): number {
    const adoption = this.insights?.appAdoption;
    return adoption ? Math.max(adoption.devices - adoption.onLive, 0) : 0;
  }

  get maxVersionDevices(): number {
    return Math.max(...(this.insights?.appAdoption?.byVersion ?? []).map((row) => row.count), 1);
  }

  platformLabel(platform: string): string {
    const names: Record<string, string> = { android: 'Android', ios: 'iOS', web: 'Web', unknown: 'Unknown' };
    return names[platform.toLowerCase()] ?? platform;
  }

  get activeLanguageCount(): number {
    return (this.insights?.languages ?? []).filter((language) => language.active).length;
  }

  /** Publishes the newer saved build as the live one (the version the app offers as an update). */
  async makeNextVersionLive(): Promise<void> {
    const next = this.insights?.appVersionNext;
    if (!next?.id || this.publishingVersion) {
      return;
    }
    const confirmed = typeof Swal === 'undefined' || !!(await Swal.fire({
      title: `Make v${next.version} live?`,
      text: next.mandatory
        ? 'This build is mandatory: every user will be asked to update before using the app.'
        : 'Users on older builds will be offered this update.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Make live',
      cancelButtonText: 'Cancel',
      focusCancel: true
    })).isConfirmed;
    if (!confirmed) {
      return;
    }

    this.publishingVersion = true;
    this.appVersions.activateAppVersion(next.id).subscribe({
      next: () => {
        this.publishingVersion = false;
        this.toast.success(`v${next.version} is now live.`);
        this.loadSummary(false);
      },
      error: (error) => {
        this.publishingVersion = false;
        this.toast.error(error, 'Unable to make this version live.');
      }
    });
  }

  /** Switches a language on or off in the app, straight from the card. */
  toggleLanguage(language: AdminDashboardLanguage): void {
    if (language.isFallback || this.togglingLanguageIds.has(language.id)) {
      return;
    }
    this.togglingLanguageIds.add(language.id);
    this.languagesService.toggleLanguageStatus(language.id).subscribe({
      next: (response) => {
        this.togglingLanguageIds.delete(language.id);
        language.active = response?.item ? !!response.item.status : !language.active;
        this.toast.success(response?.message || `${language.name} ${language.active ? 'switched on' : 'switched off'}.`);
      },
      error: (error) => {
        this.togglingLanguageIds.delete(language.id);
        this.toast.error(error, 'Unable to update the language right now.');
      }
    });
  }

  private buildRoleDonut(roles: Array<{ label: string; count: number }>): DonutSegment[] {
    const total = roles.reduce((sum, role) => sum + role.count, 0) || 1;
    const circumference = 2 * Math.PI * DONUT_RADIUS;
    let offset = 0;
    return roles.slice(0, 5).map((role, index) => {
      const style = ROLE_STYLES[index] ?? ROLE_STYLES[ROLE_STYLES.length - 1];
      const length = (role.count / total) * circumference;
      const segment: DonutSegment = {
        label: this.titleCase(role.label),
        count: role.count,
        percent: Math.round((role.count / total) * 100),
        // Small gap between slices.
        dashArray: `${Math.max(length - 2, 0.5)} ${circumference}`,
        dashOffset: -offset,
        color: style.color,
        tone: style.tone,
        icon: style.icon
      };
      offset += length;
      return segment;
    });
  }

  private buildWeeklySpark(stats: AdminVisitorPeriodStats | undefined): void {
    const values = stats?.points.map((point) => point.value) ?? [];
    if (!values.length) {
      this.weeklySparkPath = '';
      this.weeklySparkLast = null;
      return;
    }
    const max = Math.max(...values, 1);
    const { width, height, pad } = SPARK;
    const points = values.map((value, index) => ({
      x: pad + ((width - pad * 2) / Math.max(values.length - 1, 1)) * index,
      y: height - pad - ((height - pad * 2) * value) / max
    }));
    this.weeklySparkPath = this.smoothPath(points);
    this.weeklySparkLast = points[points.length - 1];
  }

  private signupPoints(): Array<{ x: number; y: number }> {
    const stats = this.signupStats;
    if (!stats?.points.length) {
      return [];
    }
    const { width, height, padX, top, bottom } = AREA_CHART;
    const max = Math.max(...stats.points.map((point) => point.value), 1);
    const count = stats.points.length;
    return stats.points.map((point, index) => ({
      x: padX + ((width - padX * 2) / Math.max(count - 1, 1)) * index,
      y: height - bottom - ((height - top - bottom) * point.value) / max
    }));
  }

  /** Catmull-Rom spline through the points, as cubic Bézier segments. */
  private smoothPath(points: Array<{ x: number; y: number }>): string {
    if (!points.length) {
      return '';
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      path += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }

  private trend(current: number, previous: number, suffix: string): Pick<StatCard, 'trend' | 'trendTone' | 'trendIcon'> {
    if (!previous) {
      return {
        trend: `${current} new this month`,
        trendTone: current ? 'success' : 'muted',
        trendIcon: current ? 'bx bx-up-arrow-alt' : 'bx bx-minus'
      };
    }
    const change = Math.round(((current - previous) / previous) * 100);
    return {
      trend: `${change > 0 ? '+' : ''}${change}% ${suffix}`,
      trendTone: change >= 0 ? 'success' : 'danger',
      trendIcon: change >= 0 ? 'bx bx-up-arrow-alt' : 'bx bx-down-arrow-alt'
    };
  }

  /** Rounded, but never shows 100% (or 0%) unless it really is. */
  private percent(value: number, total: number): number {
    if (!total) {
      return 0;
    }
    const rounded = Math.round((value / total) * 100);
    if (rounded === 100 && value < total) {
      return 99;
    }
    return rounded === 0 && value > 0 ? 1 : rounded;
  }

  /** The API sends server-local "YYYY-MM-DD HH:mm:ss" timestamps. */
  private parseServerDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value || '');
    if (!match) {
      return null;
    }
    const [, y, m, d, h, min, s] = match;
    return new Date(+y, +m - 1, +d, +h, +min, +(s ?? 0));
  }
}
