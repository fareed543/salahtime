import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LocationKind, LocationsService } from './locations.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

@Component({
  selector: 'app-location-list',
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss']
})
export class LocationListComponent implements OnInit {
  kind: LocationKind = 'countries';
  items: any[] = [];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  status = '';
  countryId = '';
  stateId = '';
  featured = '';
  countries: any[] = [];
  states: any[] = [];
  readonly pageSizeOptions = [10, 25, 50, 100];
  perPage = 10;
  page = 1;
  total = 0;
  totalPages = 1;
  busyIds = new Set<number>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly locationsService: LocationsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const routeKind = params.get('kind') as LocationKind;
      this.kind = ['countries', 'states', 'cities'].includes(routeKind) ? routeKind : 'countries';
      this.page = 1;
      this.loadItems();
    });
  }

  get title(): string {
    return this.kind === 'countries' ? 'Countries' : this.kind === 'states' ? 'States & Provinces' : 'Cities';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [{ label: 'Home', route: '/dashboard' }, { label: 'Locations' }, { label: this.title }];
  }

  get pageNumbers(): number[] {
    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }
    if (this.page <= 4) {
      return [1, 2, 3, 4, 5, -1, this.totalPages];
    }
    if (this.page >= this.totalPages - 3) {
      return [1, -1, this.totalPages - 4, this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages];
    }
    return [1, -1, this.page - 1, this.page, this.page + 1, -1, this.totalPages];
  }

  get showingFrom(): number {
    return this.total ? (this.page - 1) * this.perPage + 1 : 0;
  }

  get showingTo(): number {
    return Math.min(this.page * this.perPage, this.total);
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadItems();
  }

  onPerPageChange(value: number): void {
    this.perPage = Number(value);
    this.page = 1;
    this.loadItems();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.loadItems();
  }

  isBusy(id: number): boolean {
    return this.busyIds.has(id);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const normalizedValue = value.includes(' ') ? value.replace(' ', 'T') : value;
    const date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  async toggleStatus(item: any): Promise<void> {
    this.busyIds.add(item.id);
    this.locationsService.toggleStatus(this.kind, item.id)
      .pipe(finalize(() => this.busyIds.delete(item.id)))
      .subscribe({
        next: () => this.loadItems(),
        error: (error) => this.showError('Status update failed', error)
      });
  }

  async confirmDelete(item: any): Promise<void> {
    const result = await Swal.fire({
      title: `Delete ${item.name}?`,
      text: 'Referenced records should be deactivated instead of deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      focusCancel: true,
    });
    if (!result.isConfirmed) {
      return;
    }

    this.busyIds.add(item.id);
    this.locationsService.delete(this.kind, item.id)
      .pipe(finalize(() => this.busyIds.delete(item.id)))
      .subscribe({
        next: () => this.loadItems(),
        error: (error) => this.showError('Delete failed', error)
      });
  }

  trackById(_: number, item: any): number {
    return item.id;
  }

  private loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.locationsService.list(this.kind, {
      page: this.page,
      perPage: this.perPage,
      search: this.searchTerm,
      status: this.status,
      countryId: this.countryId,
      stateId: this.stateId,
      featured: this.featured
    }).pipe(finalize(() => this.isLoading = false)).subscribe({
      next: (response) => {
        try {
          const items = response.items ?? [];
          const pagination = response.pagination ?? {
            page: this.page,
            perPage: this.perPage,
            total: items.length,
            totalPages: 1
          };

          this.items = items;
          this.countries = response.filterOptions?.countries ?? this.countries;
          this.states = response.filterOptions?.states ?? this.states;
          this.total = pagination.total ?? items.length;
          this.totalPages = Math.max(pagination.totalPages ?? 1, 1);
          this.page = pagination.page ?? this.page;
          this.perPage = pagination.perPage ?? this.perPage;
        } catch (error: any) {
          this.items = response.items ?? [];
          this.total = this.items.length;
          this.totalPages = 1;
          this.errorMessage = error?.message || 'Locations loaded, but the list could not be prepared.';
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load locations.';
      }
    });
  }

  private showError(title: string, error: any): void {
    void Swal.fire({
      title,
      text: error?.error?.error || error?.message || 'Unable to complete the request.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}
