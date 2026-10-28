import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { PagedList } from '../community/paged-list';
import { BLOG_STATUS_BADGES, BlogRow, BlogService } from './blog.service';

@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.component.html',
  styleUrls: ['../community/community.scss', '../support-desk/support-desk.scss']
})
export class BlogListComponent extends PagedList implements OnInit {
  readonly breadcrumbs = [{ label: 'Home', route: '/dashboard' }, { label: 'Blog' }];
  items: BlogRow[] = [];
  counts: Record<string, number> = {};
  // The review queue first: articles waiting for an editor.
  status = 'submitted';

  constructor(private readonly blog: BlogService) {
    super();
    this.perPage = 25;
  }

  ngOnInit(): void {
    this.loadItems();
  }

  /** Stat cards above the list; each one filters the list by its status. */
  get summaryCards(): Array<{ filter: string; label: string; value: number; subtext: string; icon: string; accent: string }> {
    const count = (key: string) => this.counts[key] || 0;
    return [
      { filter: 'submitted', label: 'To review', value: count('submitted'), subtext: 'Waiting for an editor', icon: 'bx bx-time-five', accent: 'warning' },
      { filter: 'changes_proposed', label: 'With author', value: count('changes_proposed'), subtext: 'Your changes, awaiting approval', icon: 'bx bx-edit', accent: 'info' },
      { filter: 'published', label: 'Published', value: count('published'), subtext: 'On the site', icon: 'bx bx-globe', accent: 'success' },
      { filter: 'rejected', label: 'Rejected', value: count('rejected'), subtext: 'Returned with a reason', icon: 'bx bx-x-circle', accent: 'danger' },
      { filter: 'draft', label: 'Drafts', value: count('draft'), subtext: 'Not submitted yet', icon: 'bx bx-file', accent: 'secondary' }
    ];
  }

  badgeFor(item: BlogRow): string {
    return BLOG_STATUS_BADGES[this.statusKey(item)] ?? 'bg-label-secondary';
  }

  statusLabel(item: BlogRow): string {
    return item.status === 'published' && !item.isPublic ? 'Unpublished' : item.statusLabel;
  }

  filterStatus(status: string): void {
    this.status = this.status === status ? '' : status;
    this.onFilterChange();
  }

  protected loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.blog.list({ page: this.page, perPage: this.perPage, search: this.searchTerm, status: this.status })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => {
          this.items = response.items;
          this.counts = response.summary.statusCounts;
          this.applyPagination(response.pagination);
        },
        error: error => {
          this.errorMessage = error?.error?.error || 'Unable to load articles.';
        }
      });
  }

  private statusKey(item: BlogRow): string {
    return item.status === 'published' && !item.isPublic ? 'unpublished' : item.status;
  }
}
