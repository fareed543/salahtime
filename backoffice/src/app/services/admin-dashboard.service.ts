import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { LocalStorageService } from './local-storage.service';

export interface AdminStatCard {
  key: string;
  label: string;
  count: number;
  icon: string;
  helperText: string;
  accent: string;
}

export interface AdminRecentItem {
  id: number;
  title: string;
  subtitle: string;
  meta: string;
}

export interface AdminPendingMasjid {
  id: number;
  name: string;
  location: string;
  submittedAt: string;
}

export interface AdminDashboardSummary {
  generatedAt: string;
  counts: {
    masjids: number;
    users: number;
    programs: number;
    locations: number;
  };
  statusBreakdown: {
    users: { active: number; inactive: number };
    masjids: { active: number; inactive: number; pending?: number };
    programs: Array<{ label: string; count: number }>;
    programTypes: Array<{ label: string; count: number }>;
  };
  recent: {
    users: AdminRecentItem[];
    masjids: AdminRecentItem[];
    programs: AdminRecentItem[];
    /** Oldest first; up to 5. Older APIs omit it. */
    pendingMasjids?: AdminPendingMasjid[];
  };
  visitorStats: AdminVisitorStats;
  insights: AdminDashboardInsights;
}

export interface AdminDashboardInsights {
  registrations: {
    currentYear: number;
    previousYear: number;
    months: Array<{ label: string; current: number | null; previous: number }>;
    ytdCurrent: number;
    ytdPrevious: number;
    growthPercent: number | null;
  };
  users: {
    thisMonth: number;
    lastMonth: number;
    thisWeek: number;
    today: number;
    emailVerified: number;
    mobileVerified: number;
  };
  usersByRole: Array<{ label: string; count: number }>;
  masjidsByCity: Array<{ label: string; country: string; count: number; active: number }>;
  subscribers: { push: number | null; sehri: number | null };
  appVersion: { version: string; releaseDate: string | null; mandatory: boolean } | null;
  /** Null for roles without Support Desk access. */
  support: {
    total: number;
    open: number;
    byStatus: Record<string, number>;
    recent: Array<{
      id: number;
      reference: string;
      category: string;
      name: string;
      email: string;
      status: string;
      platform: string;
      createdAt: string;
    }>;
  } | null;
  activity: Array<{
    type: 'user' | 'masjid' | 'program' | 'query';
    title: string;
    subtitle: string;
    at: string;
    link: string;
  }>;
}

export interface AdminVisitorPoint {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
}

export interface AdminVisitorPeriodStats {
  total: number;
  average: number;
  peak: {
    label: string;
    value: number;
  };
  points: AdminVisitorPoint[];
}

export interface AdminVisitorStats {
  total: number;
  daily: AdminVisitorPeriodStats;
  weekly: AdminVisitorPeriodStats;
  monthly: AdminVisitorPeriodStats;
  yearly: AdminVisitorPeriodStats;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {}

  getSummary(): Observable<AdminDashboardSummary> {
    return this.http.get<AdminDashboardSummary>(
      `${environment.apiUrl}admin/dashboard-summary`,
      { headers: this.buildAuthHeaders() }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = this.localStorageService.getItem<string>('accessToken');
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
