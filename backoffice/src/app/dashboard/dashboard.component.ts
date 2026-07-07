import { Component, OnInit } from '@angular/core';
import { AdminDashboardService, AdminDashboardSummary, AdminStatCard } from '../services/admin-dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  summary: AdminDashboardSummary | null = null;
  statCards: AdminStatCard[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private adminDashboardService: AdminDashboardService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  get generatedAtText(): string {
    return this.summary?.generatedAt ? new Date(this.summary.generatedAt).toLocaleString() : '';
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
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to load the admin dashboard right now.';
        this.isLoading = false;
      }
    });
  }
}
