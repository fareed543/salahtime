import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminEmailListItem, EmailsService } from './emails.service';

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
  selector: 'app-emails-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class EmailsListComponent implements OnInit {
  items: AdminEmailListItem[] = [];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  templateOptions: Array<{ id: number; label: string }> = [];
  selectedTemplateId: number | null = null;
  readonly pageSizeOptions = [10, 25, 50, 100];
  summaryCards: SummaryCard[] = [];
  perPage = 10;
  page = 1;
  total = 0;
  totalPages = 1;
  deletingIds = new Set<number>();
  selectedIds = new Set<number>();

  constructor(private readonly emailsService: EmailsService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Emails' }
    ];
  }

  get showingFrom(): number {
    return this.total ? (this.page - 1) * this.perPage + 1 : 0;
  }

  get showingTo(): number {
    return Math.min(this.page * this.perPage, this.total);
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get hasSelectedRows(): boolean {
    return this.selectedCount > 0;
  }

  get isAllRowsSelected(): boolean {
    return !!this.items.length && this.items.every((item) => this.selectedIds.has(item.id));
  }

  get isBulkDeleting(): boolean {
    return this.items.some((item) => this.isDeleting(item.id));
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

  onFilterChange(): void {
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

  trackById(_: number, item: AdminEmailListItem): number {
    return item.id;
  }

  toggleAllRows(checked: boolean): void {
    if (checked) {
      this.items.forEach((item) => this.selectedIds.add(item.id));
      return;
    }

    this.items.forEach((item) => this.selectedIds.delete(item.id));
  }

  toggleRowSelection(id: number, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
      return;
    }

    this.selectedIds.delete(id);
  }

  async confirmDelete(item: AdminEmailListItem): Promise<void> {
    if (this.isDeleting(item.id)) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete email?',
      text: `Are you sure you want to delete ${item.name || item.subject || 'this email'}?`,
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
    this.emailsService.deleteEmail(item.id)
      .pipe(finalize(() => this.deletingIds.delete(item.id)))
      .subscribe({
        next: (response) => {
          if (this.items.length === 1 && this.page > 1) {
            this.page -= 1;
          }
          this.loadItems();
          void Swal.fire({
            title: 'Deleted',
            text: response?.message || 'Email deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the email right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      });
  }

  async confirmBulkDelete(): Promise<void> {
    if (!this.hasSelectedRows || this.isBulkDeleting) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete selected emails?',
      text: `Are you sure you want to delete ${this.selectedCount} selected ${this.selectedCount === 1 ? 'email' : 'emails'}?`,
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

    const ids = Array.from(this.selectedIds);
    ids.forEach((id) => this.deletingIds.add(id));
    this.emailsService.bulkDeleteEmails(ids)
      .pipe(finalize(() => ids.forEach((id) => this.deletingIds.delete(id))))
      .subscribe({
        next: (response) => {
          if (this.selectedCount === this.items.length && this.page > 1) {
            this.page -= 1;
          }
          this.selectedIds.clear();
          this.loadItems();
          void Swal.fire({
            title: 'Deleted',
            text: response?.message || 'Selected emails deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the selected emails right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      });
  }

  private loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.emailsService.getEmails(this.page, this.perPage, this.searchTerm, this.selectedTemplateId).subscribe({
      next: (response) => {
        this.items = response.items;
        this.selectedIds.forEach((id) => {
          if (!this.items.some((item) => item.id === id)) {
            this.selectedIds.delete(id);
          }
        });
        this.summaryCards = this.buildSummaryCards(response.summary);
        this.templateOptions = response.filterOptions.templates;
        this.total = response.pagination.total;
        this.totalPages = Math.max(response.pagination.totalPages, 1);
        this.page = response.pagination.page;
        this.perPage = response.pagination.perPage;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load emails right now.';
        this.isLoading = false;
      }
    });
  }

  private buildSummaryCards(summary: {
    totalEmails: number;
    templatedEmails: number;
    withoutTemplate: number;
    configuredSenders: number;
  }): SummaryCard[] {
    return [
      {
        label: 'Emails',
        value: summary.totalEmails,
        delta: `+${summary.configuredSenders}`,
        subtext: 'Total configured email records',
        icon: 'bx bx-envelope',
        accent: 'primary',
        trendClass: 'text-success'
      },
      {
        label: 'Templated',
        value: summary.templatedEmails,
        delta: `${summary.totalEmails ? Math.round((summary.templatedEmails / summary.totalEmails) * 100) : 0}%`,
        subtext: 'Attached to a template',
        icon: 'bx bx-file',
        accent: 'success',
        trendClass: 'text-success'
      },
      {
        label: 'Without Template',
        value: summary.withoutTemplate,
        delta: `${summary.totalEmails ? Math.round((summary.withoutTemplate / summary.totalEmails) * 100) : 0}%`,
        subtext: 'Standalone email bodies',
        icon: 'bx bx-unlink',
        accent: 'danger',
        trendClass: 'text-danger'
      },
      {
        label: 'Senders',
        value: summary.configuredSenders,
        delta: `${summary.totalEmails} emails`,
        subtext: 'Distinct from addresses',
        icon: 'bx bx-user-circle',
        accent: 'warning',
        trendClass: 'text-warning'
      }
    ];
  }
}
