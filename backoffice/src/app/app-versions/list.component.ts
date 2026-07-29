import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminAppVersionItem, AppVersionsService } from './app-versions.service';

@Component({
  selector: 'app-app-versions-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class AppVersionsListComponent implements OnInit {
  historyItems: AdminAppVersionItem[] = [];
  isLoading = true;
  activatingVersionId: number | null = null;
  deletingVersionId: number | null = null;
  errorMessage = '';

  constructor(private readonly appVersionsService: AppVersionsService) {}

  ngOnInit(): void {
    this.loadVersions();
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'App Versions' }
    ];
  }

  trackByVersionId(_: number, item: AdminAppVersionItem): number {
    return item.id;
  }

  activateVersion(item: AdminAppVersionItem): void {
    if (item.isActive || this.activatingVersionId !== null || this.deletingVersionId !== null) {
      return;
    }

    this.activatingVersionId = item.id;
    this.appVersionsService.activateAppVersion(item.id)
      .pipe(finalize(() => { this.activatingVersionId = null; }))
      .subscribe({
        next: (response) => {
          this.historyItems = response.items ?? [];
        },
        error: (error) => {
          this.errorMessage = error?.error?.error || error?.message || 'Unable to activate the selected app version.';
        }
      });
  }

  deleteVersion(item: AdminAppVersionItem): void {
    if (item.isActive || this.deletingVersionId !== null || this.activatingVersionId !== null) {
      return;
    }

    const confirmed = window.confirm(`Delete version ${item.version}?`);
    if (!confirmed) {
      return;
    }

    this.deletingVersionId = item.id;
    this.appVersionsService.deleteAppVersion(item.id)
      .pipe(finalize(() => { this.deletingVersionId = null; }))
      .subscribe({
        next: (response) => {
          this.historyItems = response.items ?? [];
        },
        error: (error) => {
          this.errorMessage = error?.error?.error || error?.message || 'Unable to delete the selected app version.';
        }
      });
  }

  private loadVersions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.appVersionsService.getAppVersions().subscribe({
      next: (response) => {
        this.historyItems = response.items ?? [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load app version settings right now.';
        this.isLoading = false;
      }
    });
  }
}
