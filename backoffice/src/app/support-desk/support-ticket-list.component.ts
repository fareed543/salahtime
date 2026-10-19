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
  languages: SupportOption[] = [];
  // Open issues (new + in progress) first, as that is the working queue.
  status = 'open';
  category = '';
  language = '';

  constructor(private readonly supportDesk: SupportDeskService) {
    super();
    this.perPage = 25;
  }

  ngOnInit(): void {
    this.supportDesk.options().subscribe({
      next: options => {
        this.categories = options.categories;
        this.statuses = options.statuses;
        this.languages = options.languages ?? [];
      }
    });
    this.loadItems();
  }

  /** Stat cards above the list (same style as Users); each one filters the list by its status. */
  get summaryCards(): Array<{ filter: string; label: string; value: number; share: number; subtext: string; icon: string; accent: string }> {
    const total = Object.values(this.counts).reduce((sum, count) => sum + count, 0);
    const share = (value: number) => (total ? Math.round((value / total) * 100) : 0);
    const card = (filter: string, label: string, value: number, subtext: string, icon: string, accent: string) =>
      ({ filter, label, value, share: share(value), subtext, icon, accent });

    return [
      card('open', 'Open', this.open, 'New and in progress', 'bx bx-envelope-open', 'primary'),
      card('new', 'New', this.counts['new'] || 0, 'Waiting for a first look', 'bx bx-bell', 'danger'),
      card('in_progress', 'In Progress', this.counts['in_progress'] || 0, 'Being worked on', 'bx bx-loader-circle', 'warning'),
      card('resolved', 'Resolved', this.counts['resolved'] || 0, 'Fixed or answered', 'bx bx-check-circle', 'success'),
      card('closed', 'Closed', this.counts['closed'] || 0, 'No further action', 'bx bx-archive', 'secondary')
    ];
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
      category: this.category,
      language: this.language
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
