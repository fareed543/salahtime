import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { LocationReleaseStatus, LocationsService } from './locations.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

/**
 * Publishes the countries/cities to the app: the app downloads the latest release
 * (its bundled list is only the offline fallback), and the website build picks it up for SEO pages.
 */
@Component({
  selector: 'app-location-release',
  templateUrl: './location-release.component.html'
})
export class LocationReleaseComponent implements OnInit {
  readonly breadcrumbs = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Locations', route: '/locations/countries' },
    { label: 'Release to App' }
  ];

  status: LocationReleaseStatus | null = null;
  isLoading = true;
  isReleasing = false;
  isDownloading = false;
  errorMessage = '';
  notes = '';

  constructor(
    private readonly locationsService: LocationsService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get nextVersion(): number {
    return (this.status?.latest?.version ?? 0) + 1;
  }

  get hasChanges(): boolean {
    return !!this.status && !this.status.draft.upToDate;
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.locationsService.releaseStatus()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (status) => this.status = status,
        error: (error) => this.errorMessage = error?.error?.error || 'Unable to load the release status.'
      });
  }

  downloadPreview(): void {
    this.isDownloading = true;
    this.locationsService.releasePreview()
      .pipe(finalize(() => this.isDownloading = false))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `locations-v${this.nextVersion}-preview.json`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toast.error('Unable to download the preview.')
      });
  }

  async confirmRelease(): Promise<void> {
    if (!this.status || !this.hasChanges || this.isReleasing) {
      return;
    }
    const counts = this.status.draft.changes.counts;
    const result = await Swal.fire({
      title: `Release version ${this.nextVersion}?`,
      text: `${this.status.draft.cityCount} cities in ${this.status.draft.countryCount} countries `
        + `(${counts.added} added, ${counts.removed} removed, ${counts.updated} updated). `
        + 'Apps download it on their next check; the website uses it from its next build.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Release',
      cancelButtonText: 'Cancel',
      focusCancel: true
    });
    if (!result.isConfirmed) {
      return;
    }

    this.isReleasing = true;
    this.locationsService.release(this.notes.trim())
      .pipe(finalize(() => this.isReleasing = false))
      .subscribe({
        next: (response) => {
          this.toast.success(response.message);
          this.notes = '';
          this.load();
        },
        error: (error) => this.toast.error(error, 'Unable to release the locations.')
      });
  }

  changeSummary(changes: { added: number; removed: number; updated: number } | null): string {
    if (!changes) {
      return '—';
    }
    return `+${changes.added} / −${changes.removed} / ~${changes.updated}`;
  }
}
