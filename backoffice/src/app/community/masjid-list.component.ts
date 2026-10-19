import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { CommunityService, MasjidMadhab, MasjidRow, madhabBadgeClass, madhabLabel } from './community.service';
import { PagedList } from './paged-list';

export type MasjidListView = 'cards' | 'table';

@Component({
  selector: 'app-masjid-list',
  templateUrl: './masjid-list.component.html',
  styleUrls: ['./community.scss']
})
export class MasjidListComponent extends PagedList implements OnInit {
  static readonly VIEW_STORAGE_KEY = 'backoffice.masjidListView';
  readonly breadcrumbs = [{ label: 'Home', route: '/dashboard' }, { label: 'Community' }, { label: 'Masjids' }];
  items: MasjidRow[] = [];
  summary: Record<string, number> = {};
  status = '';
  /** Cards by default (ST-00013); the table stays one click away and is remembered per browser. */
  view: MasjidListView = 'cards';

  constructor(
    private readonly community: CommunityService,
    private readonly route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit(): void {
    this.view = MasjidListComponent.readView();
    // The dashboard's "View all" opens the list already filtered: /community/masjids?status=pending
    const status = this.route.snapshot.queryParamMap.get('status') ?? '';
    if (['active', 'inactive', 'pending'].includes(status)) {
      this.status = status;
    }
    this.loadItems();
  }

  setView(view: MasjidListView): void {
    this.view = view;
    try {
      localStorage.setItem(MasjidListComponent.VIEW_STORAGE_KEY, view);
    } catch {
      // Private mode or blocked storage: the choice just is not remembered.
    }
  }

  locationOf(item: MasjidRow): string {
    return [item.city, item.state, item.pincode].filter(Boolean).join(', ') || '-';
  }

  madhabLabel(madhab: MasjidMadhab | null): string {
    return madhabLabel(madhab);
  }

  madhabBadgeClass(madhab: MasjidMadhab | null): string {
    return madhabBadgeClass(madhab);
  }

  toggleStatus(item: MasjidRow): void {
    this.busyIds.add(item.id);
    this.community.toggleMasjidStatus(item.id)
      .pipe(finalize(() => this.busyIds.delete(item.id)))
      .subscribe({
        next: (response) => {
          this.toast.success(response?.message || 'Masjid status updated.');
          this.loadItems();
        },
        error: (error) => this.toast.error(error, 'Status update failed.')
      });
  }

  async confirmDelete(item: MasjidRow): Promise<void> {
    const confirmed = await this.confirmDanger(
      `Delete ${item.name}?`,
      'This permanently deletes the masjid with its timings, committee members and contact details. Consider marking it inactive instead.'
    );
    if (!confirmed) {
      return;
    }

    this.busyIds.add(item.id);
    this.community.deleteMasjid(item.id)
      .pipe(finalize(() => this.busyIds.delete(item.id)))
      .subscribe({
        next: (response) => {
          this.toast.success(response?.message || 'Masjid deleted.');
          if (this.items.length === 1 && this.page > 1) {
            this.page -= 1;
          }
          this.loadItems();
        },
        error: (error) => this.toast.error(error, 'Delete failed.')
      });
  }

  protected loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.community.listMasjids({ page: this.page, perPage: this.perPage, search: this.searchTerm, status: this.status })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.items = response.items;
          this.summary = response.summary;
          this.applyPagination(response.pagination);
        },
        error: (error) => {
          this.errorMessage = error?.error?.error || error?.message || 'Unable to load masjids.';
        }
      });
  }

  private static readView(): MasjidListView {
    try {
      return localStorage.getItem(MasjidListComponent.VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  }
}
