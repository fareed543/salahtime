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
    masjids: { active: number; inactive: number };
    programs: Array<{ label: string; count: number }>;
    programTypes: Array<{ label: string; count: number }>;
  };
  recent: {
    users: AdminRecentItem[];
    masjids: AdminRecentItem[];
    programs: AdminRecentItem[];
  };
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
