import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { CommunityService, MasjidMadhab, MasjidRow, madhabBadgeClass, madhabLabel } from './community.service';
import { PagedList } from './paged-list';

@Component({
  selector: 'app-masjid-list',
  templateUrl: './masjid-list.component.html',
  styleUrls: ['./community.scss']
})
export class MasjidListComponent extends PagedList implements OnInit {
  readonly breadcrumbs = [{ label: 'Home', route: '/dashboard' }, { label: 'Community' }, { label: 'Masjids' }];
  items: MasjidRow[] = [];
  summary: Record<string, number> = {};
  status = '';

  constructor(private readonly community: CommunityService) {
    super();
  }

  ngOnInit(): void {
    this.loadItems();
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
        next: () => this.loadItems(),
        error: (error) => this.showError('Status update failed', error)
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
        next: () => {
          if (this.items.length === 1 && this.page > 1) {
            this.page -= 1;
          }
          this.loadItems();
        },
        error: (error) => this.showError('Delete failed', error)
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
}
