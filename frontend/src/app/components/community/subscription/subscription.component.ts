import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
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
  shareStatus = '';
  stats = {
    total: 0,
    local: 0,
    remote: 0
  };

  private readonly localSubscriberPrefix = 'programSubscribers:';

  constructor(
    private ramadanService: RamadanApiService,
    private router: Router,
    private route: ActivatedRoute,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.ramadanService.programList().subscribe({
      next: (response) => {
        this.programList = Array.isArray(response) ? response : [];
        const routeProgramId = this.route.snapshot.paramMap.get('programId');
        this.selectedProgram = routeProgramId ?? this.programList[0]?.id_program ?? this.programList[0]?.id ?? '';
        this.loadSubscribers();
      }
    });
  }

  loadSubscribers(): void {
    this.loading = true;
    this.ramadanService.getSubscribers(this.selectedProgram).subscribe({
      next: (response) => {
        this.userImagePath = response?.userImagePath ?? '';
        const remoteSubscribers = response?.list ?? response ?? [];
        const localSubscribers = this.getLocalSubscribers(String(this.selectedProgram));
        this.subscribers = [...localSubscribers, ...remoteSubscribers];
        this.stats = {
          total: this.subscribers.length,
          local: localSubscribers.length,
          remote: remoteSubscribers.length
        };
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        const localSubscribers = this.getLocalSubscribers(String(this.selectedProgram));
        this.subscribers = [...localSubscribers];
        this.stats = {
          total: localSubscribers.length,
          local: localSubscribers.length,
          remote: 0
        };
        this.applyFilters();
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
        member?.masjid,
        member?.email
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

  downloadList(): void {
    const lines = this.buildExportLines();
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `subscriptions-${this.selectedProgram || 'all'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async shareList(): Promise<void> {
    const text = this.buildExportLines().join('\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Subscriptions List',
          text
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        this.shareStatus = 'Subscriptions list copied to clipboard.';
        setTimeout(() => this.shareStatus = '', 2500);
      }
    } catch {
      this.shareStatus = 'Unable to share right now.';
      setTimeout(() => this.shareStatus = '', 2500);
    }
  }

  openUser(member: any): void {
    const id = member?.id;
    if (!id) {
      return;
    }

    this.router.navigate(['/users', id]);
  }

  private buildExportLines(): string[] {
    const programName = this.programList.find(
      program => String(program?.id_program ?? program?.id ?? '') === String(this.selectedProgram)
    )?.name ?? 'Subscriptions';

    return [
      `Subscriptions List - ${programName}`,
      `Total: ${this.filteredSubscribers.length}`,
      '',
      ...this.filteredSubscribers.map((member, index) => {
        const fullName = `${member?.firstname ?? ''} ${member?.lastname ?? ''}`.trim() || 'Subscriber';
        const phone = member?.phone ?? '-';
        const email = member?.email ?? '-';
        const masjid = member?.masjid ?? '-';
        return `${index + 1}. ${fullName} | Phone: ${phone} | Email: ${email} | Masjid: ${masjid}`;
      })
    ];
  }

  private getLocalSubscribers(programId: string): any[] {
    return this.localStorageService.getItem<any[]>(`${this.localSubscriberPrefix}${programId}`) ?? [];
  }
}
