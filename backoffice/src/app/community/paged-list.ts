import { Directive } from '@angular/core';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

/** Paging, busy-row and dialog helpers shared by the community list screens. */
@Directive()
export abstract class PagedList {
  readonly pageSizeOptions = [10, 25, 50, 100];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  page = 1;
  perPage = 10;
  total = 0;
  totalPages = 1;
  busyIds = new Set<number>();

  protected abstract loadItems(): void;

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

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected applyPagination(pagination: { page: number; perPage: number; total: number; totalPages: number }): void {
    this.total = pagination.total;
    this.totalPages = pagination.totalPages;
    this.page = pagination.page;
    this.perPage = pagination.perPage;
  }

  protected async confirmDanger(title: string, text: string): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      focusCancel: true
    });
    return !!result.isConfirmed;
  }

  protected showError(title: string, error: any): void {
    void Swal.fire({
      title,
      text: error?.error?.error || error?.message || 'Unable to complete the request.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}
