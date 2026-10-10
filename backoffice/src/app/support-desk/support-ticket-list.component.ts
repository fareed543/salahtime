import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { PagedList } from '../community/paged-list';
import { STATUS_BADGES, SupportDeskService, SupportOption, SupportTicketRow, SupportTicketStatus } from './support-desk.service';

@Component({
  selector: 'app-support-ticket-list',
  templateUrl: './support-ticket-list.component.html',
  styleUrls: ['../community/community.scss', './support-desk.scss']
})
export class SupportTicketListComponent extends PagedList implements OnInit {
  readonly breadcrumbs = [{ label: 'Home', route: '/dashboard' }, { label: 'Support Desk' }];
  readonly statusBadges = STATUS_BADGES;
  items: SupportTicketRow[] = [];
  counts: Record<string, number> = {};
  open = 0;
  categories: SupportOption[] = [];
  statuses: SupportOption[] = [];
  // Open issues (new + in progress) first, as that is the working queue.
  status = 'open';
  category = '';

  constructor(private readonly supportDesk: SupportDeskService) {
    super();
    this.perPage = 25;
  }

  ngOnInit(): void {
    this.supportDesk.options().subscribe({
      next: options => {
        this.categories = options.categories;
        this.statuses = options.statuses;
      }
    });
    this.loadItems();
  }

  badgeFor(status: SupportTicketStatus): string {
    return this.statusBadges[status] ?? 'bg-label-secondary';
  }

  filterStatus(status: string): void {
    this.status = this.status === status ? '' : status;
    this.onFilterChange();
  }

  reporter(item: SupportTicketRow): string {
    return item.name || item.email || 'Anonymous';
  }

  protected loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.supportDesk.listTickets({
      page: this.page,
      perPage: this.perPage,
      search: this.searchTerm,
      status: this.status,
      category: this.category
    })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => {
          this.items = response.items;
          this.counts = response.summary.statusCounts;
          this.open = response.summary.open;
          this.applyPagination(response.pagination);
        },
        error: error => {
          this.errorMessage = error?.error?.error || 'Unable to load reported issues.';
        }
      });
  }
}
