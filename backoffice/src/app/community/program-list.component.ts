import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { CommunityService, ProgramRow } from './community.service';
import { PagedList } from './paged-list';

@Component({
  selector: 'app-program-list',
  templateUrl: './program-list.component.html',
  styleUrls: ['./community.scss']
})
export class ProgramListComponent extends PagedList implements OnInit {
  readonly breadcrumbs = [{ label: 'Home', route: '/dashboard' }, { label: 'Community' }, { label: 'Programs' }];
  items: ProgramRow[] = [];
  summary: Record<string, number> = {};
  type = '';
  state = '';

  constructor(private readonly community: CommunityService) {
    super();
  }

  ngOnInit(): void {
    this.loadItems();
  }

  stateBadge(state: ProgramRow['state']): string {
    return state === 'active' ? 'bg-label-success' : state === 'ended' ? 'bg-label-secondary' : 'bg-label-warning';
  }

  async confirmDelete(item: ProgramRow): Promise<void> {
    // Members and packet history are removed with the program, so spell out what is lost.
    const confirmed = await this.confirmDanger(
      `Delete ${item.name}?`,
      `This permanently deletes the program, its ${item.memberCount} member${item.memberCount === 1 ? '' : 's'} `
        + `and ${item.packetRecordCount} packet record${item.packetRecordCount === 1 ? '' : 's'}. This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    this.busyIds.add(item.id);
    this.community.deleteProgram(item.id)
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
    this.community.listPrograms({
      page: this.page,
      perPage: this.perPage,
      search: this.searchTerm,
      type: this.type,
      state: this.state
    })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.items = response.items;
          this.summary = response.summary;
          this.applyPagination(response.pagination);
        },
        error: (error) => {
          this.errorMessage = error?.error?.error || error?.message || 'Unable to load programs.';
        }
      });
  }
}
