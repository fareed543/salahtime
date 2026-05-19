import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
  programList: any[] = [];
  selectedProgram: any = '';
  subscribers: any[] = [];
  filteredSubscribers: any[] = [];
  userImagePath = '';
  loading = false;
  query = '';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor(
    private ramadanService: RamadanApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.ramadanService.programList().subscribe({
      next: (response) => {
        this.programList = Array.isArray(response) ? response : [];
        this.selectedProgram = this.programList[0]?.id_program ?? this.programList[0]?.id ?? '';
        this.loadSubscribers();
      }
    });
  }

  loadSubscribers(): void {
    this.loading = true;
    this.ramadanService.getSubscribers(this.selectedProgram).subscribe({
      next: (response) => {
        this.userImagePath = response?.userImagePath ?? '';
        this.subscribers = response?.list ?? response ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.subscribers = [];
        this.filteredSubscribers = [];
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const normalizedQuery = this.query.trim().toLowerCase();
    const filtered = this.subscribers.filter((member) => {
      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        member?.firstname,
        member?.lastname,
        member?.phone,
        member?.occupation,
        member?.company_name,
        member?.masjid
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    this.filteredSubscribers = [...filtered].sort((a, b) => {
      const left = `${a?.firstname ?? ''} ${a?.lastname ?? ''}`.trim().toLowerCase();
      const right = `${b?.firstname ?? ''} ${b?.lastname ?? ''}`.trim().toLowerCase();
      if (left === right) {
        return 0;
      }

      const result = left.localeCompare(right);
      return this.sortOrder === 'asc' ? result : -result;
    });
  }

  toggleSort(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  clearQuery(): void {
    this.query = '';
    this.applyFilters();
  }

  openUser(member: any): void {
    const id = member?.id;
    if (!id) {
      return;
    }

    this.router.navigate(['/users', id]);
  }
}
