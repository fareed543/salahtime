import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminLanguageItem, LanguagesService } from './languages.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

interface SummaryCard {
  label: string;
  value: number;
  delta: string;
  subtext: string;
  icon: string;
  accent: string;
  trendClass: string;
}

@Component({
  selector: 'app-languages-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class LanguagesListComponent implements OnInit {
  items: AdminLanguageItem[] = [];
  summaryCards: SummaryCard[] = [];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  readonly pageSizeOptions = [10, 25, 50, 100];
  perPage = 10;
  page = 1;
  total = 0;
  totalPages = 1;
  deletingIds = new Set<number>();
  togglingIds = new Set<number>();

  constructor(private readonly languagesService: LanguagesService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Languages' }
    ];
  }

  get showingFrom(): number {
    return this.total ? (this.page - 1) * this.perPage + 1 : 0;
  }

  get showingTo(): number {
    return Math.min(this.page * this.perPage, this.total);
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

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.page = 1;
    this.loadItems();
  }

  onPerPageChange(value: string): void {
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

  isEllipsis(pageNumber: number): boolean {
    return pageNumber === -1;
  }

  isDeleting(id: number): boolean {
    return this.deletingIds.has(id);
  }

  isToggling(id: number): boolean {
    return this.togglingIds.has(id);
  }

  trackById(_: number, item: AdminLanguageItem): number {
    return item.id;
  }

  async toggleStatus(item: AdminLanguageItem): Promise<void> {
    if (this.isToggling(item.id)) {
      return;
    }

    this.togglingIds.add(item.id);
    this.languagesService.toggleLanguageStatus(item.id)
      .pipe(finalize(() => this.togglingIds.delete(item.id)))
      .subscribe({
        next: (response) => {
          this.items = this.items.map((currentItem) => currentItem.id === item.id ? response.item : currentItem);
          void Swal.fire({
            title: 'Updated',
            text: response.message,
            icon: 'success',
            confirmButtonText: 'OK',
          });
          this.loadItems();
        },
        error: (error) => {
          void Swal.fire({
            title: 'Update failed',
            text: error?.error?.error || error?.message || 'Unable to update language status right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      });
  }

  async confirmDelete(item: AdminLanguageItem): Promise<void> {
    if (this.isDeleting(item.id)) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete language?',
      text: `Are you sure you want to delete ${item.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.deletingIds.add(item.id);
    this.languagesService.deleteLanguage(item.id)
      .pipe(finalize(() => this.deletingIds.delete(item.id)))
      .subscribe({
        next: (response) => {
          if (this.items.length === 1 && this.page > 1) {
            this.page -= 1;
          }
          this.loadItems();
          void Swal.fire({
            title: 'Deleted',
            text: response?.message || 'Language deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the language right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      });
  }

  private loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.languagesService.getLanguages(this.page, this.perPage, this.searchTerm).subscribe({
      next: (response) => {
        this.items = response.items;
        this.summaryCards = this.buildSummaryCards(response.summary);
        this.total = response.pagination.total;
        this.totalPages = Math.max(response.pagination.totalPages, 1);
        this.page = response.pagination.page;
        this.perPage = response.pagination.perPage;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load languages right now.';
        this.isLoading = false;
      }
    });
  }

  private buildSummaryCards(summary: {
    totalLanguages: number;
    enabledLanguages: number;
    disabledLanguages: number;
    rtlLanguages: number;
  }): SummaryCard[] {
    return [
      {
        label: 'Languages',
        value: summary.totalLanguages,
        delta: `${summary.enabledLanguages} enabled`,
        subtext: 'Total languages available in back office',
        icon: 'bx bx-world',
        accent: 'primary',
        trendClass: 'text-success'
      },
      {
        label: 'Enabled',
        value: summary.enabledLanguages,
        delta: `${summary.totalLanguages ? Math.round((summary.enabledLanguages / summary.totalLanguages) * 100) : 0}%`,
        subtext: 'Available for independent backoffice use',
        icon: 'bx bx-check-circle',
        accent: 'success',
        trendClass: 'text-success'
      },
      {
        label: 'Disabled',
        value: summary.disabledLanguages,
        delta: `${summary.totalLanguages ? Math.round((summary.disabledLanguages / summary.totalLanguages) * 100) : 0}%`,
        subtext: 'Hidden from backoffice selection',
        icon: 'bx bx-block',
        accent: 'danger',
        trendClass: 'text-danger'
      },
      {
        label: 'RTL',
        value: summary.rtlLanguages,
        delta: 'Arabic and Urdu',
        subtext: 'Languages using right-to-left layout',
        icon: 'bx bx-align-right',
        accent: 'warning',
        trendClass: 'text-warning'
      }
    ];
  }
}
