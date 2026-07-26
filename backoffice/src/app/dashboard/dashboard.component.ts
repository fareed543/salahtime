import { Component, OnInit } from '@angular/core';
import {
  AdminDashboardService,
  AdminDashboardSummary,
  AdminStatCard,
  AdminVisitorPeriodStats,
  AdminVisitorPoint
} from '../services/admin-dashboard.service';

interface DashboardHighlightCard {
  title: string;
  value: string;
  trend: string;
  icon: string;
  iconImage: string;
  tone: 'positive' | 'warning' | 'neutral';
}

interface DashboardMonthlyPoint {
  label: string;
  value: number;
  height: number;
}

interface VisitorTabOption {
  key: VisitorPeriodKey;
  label: string;
  caption: string;
}

interface VisitorMetricCard {
  label: string;
  value: string;
  helper: string;
  tone: 'primary' | 'success' | 'warning';
}

type VisitorPeriodKey = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface DashboardTransactionItem {
  title: string;
  subtitle: string;
  meta: string;
  amount: string;
  amountClass: string;
  icon: string;
}

interface DashboardSummaryStat {
  label: string;
  value: string;
  helper: string;
}

interface DashboardCategoryStat {
  title: string;
  subtitle: string;
  value: string;
  icon: string;
  theme: string;
}

interface DashboardTimelineItem {
  title: string;
  subtitle: string;
  meta: string;
  time: string;
  tone: 'primary' | 'success' | 'info';
}

interface DashboardRegionStat {
  country: string;
  visits: string;
  percent: number;
  tone: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly visitorTabs: VisitorTabOption[] = [
    { key: 'daily', label: 'Daily', caption: 'Past 24 hours' },
    { key: 'weekly', label: 'Weekly', caption: 'Past 7 days' },
    { key: 'monthly', label: 'Monthly', caption: 'Past 30 days' },
    { key: 'yearly', label: 'Yearly', caption: 'Past 12 months' }
  ];

  summary: AdminDashboardSummary | null = null;
  statCards: AdminStatCard[] = [];
  highlightCards: DashboardHighlightCard[] = [];
  monthlyActivity: DashboardMonthlyPoint[] = [];
  transactionItems: DashboardTransactionItem[] = [];
  summaryStats: DashboardSummaryStat[] = [];
  categoryStats: DashboardCategoryStat[] = [];
  timelineItems: DashboardTimelineItem[] = [];
  regionStats: DashboardRegionStat[] = [];
  selectedVisitorPeriod: VisitorPeriodKey = 'weekly';
  isLoading = true;
  errorMessage = '';

  constructor(private adminDashboardService: AdminDashboardService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  get generatedAtText(): string {
    return this.summary?.generatedAt ? new Date(this.summary.generatedAt).toLocaleString() : '';
  }

  get completionPercent(): number {
    if (!this.summary) {
      return 0;
    }

    const totalUsers = this.summary.statusBreakdown.users.active + this.summary.statusBreakdown.users.inactive;
    if (!totalUsers) {
      return 0;
    }

    return Math.round((this.summary.statusBreakdown.users.active / totalUsers) * 100);
  }

  get weeklyIncomeText(): string {
    if (!this.summary) {
      return '0';
    }

    return this.formatCompactNumber(this.summary.counts.programs * 1250);
  }

  get weeklyIncomeDelta(): string {
    if (!this.summary) {
      return 'No change available';
    }

    const inactiveUsers = this.summary.statusBreakdown.users.inactive;
    return `${inactiveUsers || 0} fewer inactive users than the active base`;
  }

  get overviewGrowthPercent(): number {
    if (!this.summary) {
      return 0;
    }

    return Math.max(18, Math.min(96, this.getPercent(this.summary.counts.programs, this.summary.counts.users || 1)));
  }

  get overviewPrimaryAmount(): string {
    if (!this.summary) {
      return '$0';
    }

    return `$${(this.summary.counts.users * 12).toLocaleString('en-US')}`;
  }

  get overviewSecondaryAmount(): string {
    if (!this.summary) {
      return '$0';
    }

    return `$${(this.summary.counts.masjids * 4600).toLocaleString('en-US')}`;
  }

  get activeVisitorStats(): AdminVisitorPeriodStats | null {
    return this.summary?.visitorStats?.[this.selectedVisitorPeriod] ?? null;
  }

  get visitorHeadline(): string {
    const period = this.activeVisitorStats;
    if (!period) {
      return '0';
    }

    return this.formatCompactNumber(period.total);
  }

  get visitorSubline(): string {
    const activeTab = this.visitorTabs.find((tab) => tab.key === this.selectedVisitorPeriod);
    return activeTab ? `New visitors in the ${activeTab.caption.toLowerCase()}` : '';
  }

  get visitorMetricCards(): VisitorMetricCard[] {
    const period = this.activeVisitorStats;
    if (!period) {
      return [];
    }

    const highestPoint = period.points.reduce<AdminVisitorPoint | null>((best, point) => {
      if (!best || point.value > best.value) {
        return point;
      }

      return best;
    }, null);

    return [
      {
        label: 'Average',
        value: this.formatAverage(period.average),
        helper: 'per time block',
        tone: 'primary'
      },
      {
        label: 'Peak',
        value: this.formatCompactNumber(period.peak.value),
        helper: highestPoint ? highestPoint.shortLabel : 'No spikes yet',
        tone: 'success'
      },
      {
        label: 'Audience Base',
        value: this.formatCompactNumber(this.summary?.visitorStats.total ?? 0),
        helper: 'total registered users',
        tone: 'warning'
      }
    ];
  }

  get visitorPolylinePoints(): string {
    const period = this.activeVisitorStats;
    if (!period?.points.length) {
      return '';
    }

    const width = 560;
    const height = 220;
    const left = 12;
    const right = width - 12;
    const top = 18;
    const bottom = height - 26;
    const maxValue = Math.max(...period.points.map((point) => point.value), 1);

    return period.points
      .map((point, index) => {
        const x = left + ((right - left) / Math.max(period.points.length - 1, 1)) * index;
        const y = bottom - ((bottom - top) * point.value) / maxValue;
        return `${x},${y}`;
      })
      .join(' ');
  }

  get visitorAreaPath(): string {
    const period = this.activeVisitorStats;
    if (!period?.points.length) {
      return '';
    }

    const width = 560;
    const height = 220;
    const left = 12;
    const right = width - 12;
    const top = 18;
    const bottom = height - 26;
    const maxValue = Math.max(...period.points.map((point) => point.value), 1);
    const pathSegments = period.points.map((point, index) => {
      const x = left + ((right - left) / Math.max(period.points.length - 1, 1)) * index;
      const y = bottom - ((bottom - top) * point.value) / maxValue;
      return `L ${x} ${y}`;
    });

    return [`M ${left} ${bottom}`, ...pathSegments, `L ${right} ${bottom}`, 'Z'].join(' ');
  }

  get visitorMaxValue(): number {
    const values = this.activeVisitorStats?.points.map((point) => point.value) ?? [];
    return Math.max(...values, 1);
  }

  getSecondaryBarHeight(value: number): number {
    return Math.max((value / this.visitorMaxValue) * 55, 16);
  }

  private loadSummary(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminDashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.statCards = [
          {
            key: 'masjids',
            label: 'Masjids',
            count: summary.counts.masjids,
            icon: 'bx bx-building-house',
            helperText: `${summary.statusBreakdown.masjids.active} active masjids`,
            accent: 'emerald'
          },
          {
            key: 'users',
            label: 'Users',
            count: summary.counts.users,
            icon: 'bx bx-user',
            helperText: `${summary.statusBreakdown.users.active} active users`,
            accent: 'blue'
          },
          {
            key: 'programs',
            label: 'Programs',
            count: summary.counts.programs,
            icon: 'bx bx-calendar-event',
            helperText: `${summary.statusBreakdown.programTypes.length} program types tracked`,
            accent: 'amber'
          },
          {
            key: 'locations',
            label: 'Locations',
            count: summary.counts.locations,
            icon: 'bx bx-map',
            helperText: 'Location master records available',
            accent: 'rose'
          }
        ];
        this.highlightCards = this.buildHighlightCards(summary);
        this.monthlyActivity = this.buildMonthlyActivity(summary);
        this.transactionItems = this.buildTransactionItems(summary);
        this.summaryStats = this.buildSummaryStats(summary);
        this.categoryStats = this.buildCategoryStats(summary);
        this.timelineItems = this.buildTimelineItems(summary);
        this.regionStats = this.buildRegionStats(summary);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to load the admin dashboard right now.';
        this.isLoading = false;
      }
    });
  }

  setVisitorPeriod(period: VisitorPeriodKey): void {
    this.selectedVisitorPeriod = period;
  }

  private buildHighlightCards(summary: AdminDashboardSummary): DashboardHighlightCard[] {
    return [
      {
        title: 'Active Users',
        value: this.formatCompactNumber(summary.statusBreakdown.users.active),
        trend: `${this.getPercent(summary.statusBreakdown.users.active, summary.counts.users)}% of total users`,
        icon: 'bx bx-up-arrow-alt',
        iconImage: 'assets/img/icons/unicons/chart-success.png',
        tone: 'positive'
      },
      {
        title: 'Active Masjids',
        value: this.formatCompactNumber(summary.statusBreakdown.masjids.active),
        trend: `${this.getPercent(summary.statusBreakdown.masjids.active, summary.counts.masjids)}% currently active`,
        icon: 'bx bx-up-arrow-alt',
        iconImage: 'assets/img/icons/unicons/wallet-info.png',
        tone: 'positive'
      },
      {
        title: 'Programs',
        value: this.formatCompactNumber(summary.counts.programs),
        trend: `${summary.statusBreakdown.programTypes.length} program types tracked`,
        icon: 'bx bx-right-arrow-alt',
        iconImage: 'assets/img/icons/unicons/paypal.png',
        tone: 'warning'
      },
      {
        title: 'Locations',
        value: this.formatCompactNumber(summary.counts.locations),
        trend: 'Master records available',
        icon: 'bx bx-right-arrow-alt',
        iconImage: 'assets/img/icons/unicons/wallet.png',
        tone: 'neutral'
      }
    ];
  }

  private buildMonthlyActivity(summary: AdminDashboardSummary): DashboardMonthlyPoint[] {
    const source = summary.statusBreakdown.programTypes.length
      ? summary.statusBreakdown.programTypes.slice(0, 4)
      : summary.statusBreakdown.programs.slice(0, 4);
    const fallbackLabels = ['Jan', 'Feb', 'Mar', 'Apr'];
    const values = source.map((item) => item.count);
    const maxValue = Math.max(...values, 1);

    return source.map((item, index) => ({
      label: fallbackLabels[index] || item.label.slice(0, 3),
      value: item.count,
      height: Math.max(32, Math.round((item.count / maxValue) * 124))
    }));
  }

  private buildTransactionItems(summary: AdminDashboardSummary): DashboardTransactionItem[] {
    const items = [
      ...summary.recent.users.map((item) => this.mapRecentItem(item.title, item.subtitle, item.meta, 'assets/img/icons/unicons/paypal.png', true)),
      ...summary.recent.masjids.map((item) => this.mapRecentItem(item.title, item.subtitle, item.meta, 'assets/img/icons/unicons/wallet.png', true)),
      ...summary.recent.programs.map((item) => this.mapRecentItem(item.title, item.subtitle, item.meta, 'assets/img/icons/unicons/chart.png', false))
    ];

    return items.slice(0, 6);
  }

  private buildSummaryStats(summary: AdminDashboardSummary): DashboardSummaryStat[] {
    return [
      {
        label: 'Users',
        value: this.formatCompactNumber(summary.counts.users),
        helper: `${summary.statusBreakdown.users.active} active`
      },
      {
        label: 'Visitors',
        value: this.formatCompactNumber(summary.visitorStats.total),
        helper: 'registered audience'
      },
      {
        label: 'Masjids',
        value: this.formatCompactNumber(summary.counts.masjids),
        helper: `${summary.statusBreakdown.masjids.inactive} inactive`
      },
      {
        label: 'Statuses',
        value: this.formatCompactNumber(summary.statusBreakdown.programs.length),
        helper: 'tracked groups'
      }
    ];
  }

  private buildCategoryStats(summary: AdminDashboardSummary): DashboardCategoryStat[] {
    const source = summary.statusBreakdown.programTypes.length
      ? summary.statusBreakdown.programTypes.slice(0, 4)
      : summary.statusBreakdown.programs.slice(0, 4);
    const fallbacks = [
      { icon: 'bx bx-mobile-alt', theme: 'theme-primary', subtitle: 'Mobile and web' },
      { icon: 'bx bx-layer', theme: 'theme-success', subtitle: 'Grouped activity' },
      { icon: 'bx bx-map-alt', theme: 'theme-info', subtitle: 'Regional reach' },
      { icon: 'bx bx-football', theme: 'theme-secondary', subtitle: 'Community events' }
    ];

    return source.map((item, index) => ({
      title: item.label,
      subtitle: fallbacks[index]?.subtitle || 'Tracked activity',
      value: this.formatCompactNumber(item.count),
      icon: fallbacks[index]?.icon || 'bx bx-category',
      theme: fallbacks[index]?.theme || 'theme-primary'
    }));
  }

  private buildTimelineItems(summary: AdminDashboardSummary): DashboardTimelineItem[] {
    const rawItems = [
      ...summary.recent.programs.map((item) => ({ ...item, tone: 'primary' as const })),
      ...summary.recent.users.map((item) => ({ ...item, tone: 'success' as const })),
      ...summary.recent.masjids.map((item) => ({ ...item, tone: 'info' as const }))
    ].slice(0, 4);

    return rawItems.map((item, index) => ({
      title: item.title,
      subtitle: item.subtitle,
      meta: item.meta,
      time: ['12 min ago', '45 min ago', '2 hours ago', 'Today'][index] || 'Today',
      tone: item.tone
    }));
  }

  private buildRegionStats(summary: AdminDashboardSummary): DashboardRegionStat[] {
    const total = Math.max(summary.counts.users + summary.counts.masjids + summary.counts.programs, 1);
    const base = [
      { country: 'USA', value: summary.counts.users * 24, tone: 'tone-green' },
      { country: 'India', value: summary.counts.masjids * 16, tone: 'tone-blue' },
      { country: 'UAE', value: summary.counts.programs * 14, tone: 'tone-cyan' },
      { country: 'UK', value: summary.counts.locations * 9, tone: 'tone-amber' },
      { country: 'Canada', value: summary.counts.users * 7, tone: 'tone-red' }
    ];

    return base.map((item) => ({
      country: item.country,
      visits: this.formatCompactNumber(item.value),
      percent: Math.max(8, Math.min(84, Math.round((item.value / total) * 100))),
      tone: item.tone
    }));
  }

  private mapRecentItem(
    title: string,
    subtitle: string,
    meta: string,
    icon: string,
    positive: boolean
  ): DashboardTransactionItem {
    return {
      title,
      subtitle,
      meta,
      amount: positive ? '+Live' : 'Tracked',
      amountClass: positive ? 'is-positive' : 'is-neutral',
      icon
    };
  }

  private formatCompactNumber(value: number): string {
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  private formatAverage(value: number): string {
    return new Intl.NumberFormat('en', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1
    }).format(value);
  }

  private getPercent(value: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }
}
