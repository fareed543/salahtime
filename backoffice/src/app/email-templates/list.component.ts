import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminEmailTemplateListItem, EmailTemplatesService } from './email-templates.service';

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
  selector: 'app-email-templates-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class EmailTemplatesListComponent implements OnInit {
  items: AdminEmailTemplateListItem[] = [];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  readonly pageSizeOptions = [10, 25, 50, 100];
  summaryCards: SummaryCard[] = [];
  perPage = 10;
  page = 1;
  total = 0;
  totalPages = 1;
  deletingIds = new Set<number>();
  selectedIds = new Set<number>();

  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Email Templates' }
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

  trackById(_: number, item: AdminEmailTemplateListItem): number {
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

  async confirmDelete(item: AdminEmailTemplateListItem): Promise<void> {
    if (this.isDeleting(item.id)) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete email template?',
      text: `Are you sure you want to delete ${item.title || 'this template'}?`,
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
    this.emailTemplatesService.deleteEmailTemplate(item.id)
      .pipe(finalize(() => this.deletingIds.delete(item.id)))
      .subscribe({
        next: (response) => {
          if (this.items.length === 1 && this.page > 1) {
            this.page -= 1;
          }
          this.loadItems();
          void Swal.fire({
            title: 'Deleted',
            text: response?.message || 'Email template deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the email template right now.',
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
      title: 'Delete selected templates?',
      text: `Are you sure you want to delete ${this.selectedCount} selected ${this.selectedCount === 1 ? 'template' : 'templates'}?`,
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
    this.emailTemplatesService.bulkDeleteEmailTemplates(ids)
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
            text: response?.message || 'Selected email templates deleted successfully.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        },
        error: (error) => {
          void Swal.fire({
            title: 'Delete failed',
            text: error?.error?.error || error?.message || 'Unable to delete the selected templates right now.',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      });
  }

  private loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.emailTemplatesService.getEmailTemplates(this.page, this.perPage, this.searchTerm).subscribe({
      next: (response) => {
        this.items = response.items;
        this.selectedIds.forEach((id) => {
          if (!this.items.some((item) => item.id === id)) {
            this.selectedIds.delete(id);
          }
        });
        this.summaryCards = this.buildSummaryCards(response.summary);
        this.total = response.pagination.total;
        this.totalPages = Math.max(response.pagination.totalPages, 1);
        this.page = response.pagination.page;
        this.perPage = response.pagination.perPage;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load email templates right now.';
        this.isLoading = false;
      }
    });
  }

  private buildSummaryCards(summary: {
    totalTemplates: number;
    templatesInUse: number;
    availableTemplates: number;
    linkedEmails: number;
  }): SummaryCard[] {
    return [
      {
        label: 'Templates',
        value: summary.totalTemplates,
        delta: `${summary.totalTemplates ? Math.round((summary.templatesInUse / summary.totalTemplates) * 100) : 0}%`,
        subtext: 'Total saved templates',
        icon: 'bx bx-file',
        accent: 'primary',
        trendClass: 'text-success'
      },
      {
        label: 'Templates In Use',
        value: summary.templatesInUse,
        delta: `+${summary.linkedEmails}`,
        subtext: 'Used by email records',
        icon: 'bx bx-link-alt',
        accent: 'success',
        trendClass: 'text-success'
      },
      {
        label: 'Available',
        value: summary.availableTemplates,
        delta: `${summary.totalTemplates ? Math.round((summary.availableTemplates / summary.totalTemplates) * 100) : 0}%`,
        subtext: 'Ready for new emails',
        icon: 'bx bx-check-circle',
        accent: 'info',
        trendClass: 'text-primary'
      },
      {
        label: 'Linked Emails',
        value: summary.linkedEmails,
        delta: `${summary.templatesInUse} active`,
        subtext: 'Email records using templates',
        icon: 'bx bx-envelope',
        accent: 'warning',
        trendClass: 'text-warning'
      }
    ];
  }
}
