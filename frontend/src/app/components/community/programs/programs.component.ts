import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';

interface LocalSubscriber {
  id: string;
  firstname: string;
  lastname: string;
  phone: string;
  email?: string;
  createdLocally: boolean;
  programId: string;
  createdAt: string;
}

@Component({
  selector: 'app-programs',
  templateUrl: './programs.component.html',
  styleUrls: ['./programs.component.scss']
})
export class ProgramsComponent implements OnInit {
  programs: any[] = [];
  viewMode: 'grid' | 'list' = 'grid';
  loading = false;
  error = '';
  selectedProgram: any = null;
  detailMode = false;
  subscriberStats = {
    total: 0,
    local: 0,
    remote: 0
  };
  detailLoading = false;
  showSubscribeForOthers = false;
  createdSubscriberMessage = '';
  createdSubscriber = {
    firstname: '',
    lastname: '',
    phone: '',
    email: ''
  };

  private readonly localSubscriberPrefix = 'programSubscribers:';

  constructor(
    private ramadanService: RamadanApiService,
    private localStorageService: LocalStorageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const programId = params.get('id');
      this.detailMode = !!programId;
      this.loadPrograms(programId);
    });
  }

  get isLoggedIn(): boolean {
    return !!this.localStorageService.getItem<any>('userInfo');
  }

  get headerTitle(): string {
    return this.detailMode ? (this.selectedProgram?.name || 'Program Details') : 'Programs';
  }

  get headerActions(): ScreenHeaderAction[] {
    if (this.detailMode) {
      return [
        { id: 'back', icon: 'bi-arrow-left', ariaLabel: 'Back to programs' }
      ];
    }

    return [
      { id: 'create', icon: 'bi-plus-lg', ariaLabel: 'Add program' },
      { id: 'list', icon: 'bi-list-ul', ariaLabel: 'Show list view', active: this.viewMode === 'list' },
      { id: 'grid', icon: 'bi-grid', ariaLabel: 'Show grid view', active: this.viewMode === 'grid' },
      { id: 'filter', icon: 'bi-funnel', ariaLabel: 'Open filters' }
    ];
  }

  onHeaderAction(action: ScreenHeaderAction): void {
    switch (action.id) {
      case 'back':
        this.backToList();
        break;
      case 'create':
        this.startCreate();
        break;
      case 'list':
        this.setViewMode('list');
        break;
      case 'grid':
        this.setViewMode('grid');
        break;
      case 'filter':
        this.openFilters();
        break;
    }
  }

  loadPrograms(programId?: string | null): void {
    this.loading = true;
    this.error = '';
    this.selectedProgram = null;

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const request$ = userInfo?.pincode
      ? this.ramadanService.getAllProgramsList(userInfo.pincode)
      : this.ramadanService.programList();

    request$.subscribe({
      next: (response) => {
        this.programs = Array.isArray(response) ? response : [];
        this.loading = false;

        if (programId) {
          this.selectedProgram = this.findProgram(programId);
          if (!this.selectedProgram) {
            this.error = 'Program details are not available right now.';
            return;
          }

          this.loadProgramStats(this.selectedProgram);
        }
      },
      error: () => {
        this.error = 'Unable to load programs right now.';
        this.loading = false;
      }
    });
  }

  openDetails(program: any): void {
    const id = this.getProgramId(program);
    if (!id) {
      return;
    }

    this.router.navigate(['/programs', id]);
  }

  backToList(): void {
    this.router.navigate(['/programs']);
  }

  startCreate(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  openFilters(): void {}

  viewSubscriptions(program: any): void {
    const id = this.getProgramId(program);
    if (!id) {
      return;
    }

    this.router.navigate(['/subscription', id]);
  }

  toggleSubscription(program: any): void {
    const id = this.getProgramId(program);
    if (!id) {
      return;
    }

    this.ramadanService.programEnrollment(Number(id)).subscribe({
      next: () => {
        program.entrolled = !program.entrolled;
      }
    });
  }

  toggleSubscribeForOthers(): void {
    this.showSubscribeForOthers = !this.showSubscribeForOthers;
    this.createdSubscriberMessage = '';
  }

  createSubscriber(): void {
    if (!this.selectedProgram) {
      return;
    }

    const firstname = this.createdSubscriber.firstname.trim();
    const lastname = this.createdSubscriber.lastname.trim();
    const phone = this.createdSubscriber.phone.trim();

    if (!firstname || !phone) {
      this.createdSubscriberMessage = 'Name and phone are required.';
      return;
    }

    const programId = this.getProgramId(this.selectedProgram);
    const nextSubscriber: LocalSubscriber = {
      id: `local-${Date.now()}`,
      firstname,
      lastname,
      phone,
      email: this.createdSubscriber.email.trim(),
      createdLocally: true,
      programId,
      createdAt: new Date().toISOString()
    };

    const existing = this.getLocalSubscribers(programId);
    existing.unshift(nextSubscriber);
    this.localStorageService.setItem(this.getLocalSubscriberKey(programId), existing);
    this.createdSubscriber = { firstname: '', lastname: '', phone: '', email: '' };
    this.createdSubscriberMessage = 'Subscriber added to this program.';
    this.showSubscribeForOthers = false;
    this.loadProgramStats(this.selectedProgram);
  }

  private loadProgramStats(program: any): void {
    const programId = this.getProgramId(program);
    if (!programId) {
      return;
    }

    this.detailLoading = true;
    const localSubscribers = this.getLocalSubscribers(programId);

    this.ramadanService.getSubscribers(programId).subscribe({
      next: (response) => {
        const remoteSubscribers = response?.list ?? response ?? [];
        this.subscriberStats = {
          total: remoteSubscribers.length + localSubscribers.length,
          local: localSubscribers.length,
          remote: remoteSubscribers.length
        };
        this.detailLoading = false;
      },
      error: () => {
        this.subscriberStats = {
          total: localSubscribers.length,
          local: localSubscribers.length,
          remote: 0
        };
        this.detailLoading = false;
      }
    });
  }

  private findProgram(programId: string): any {
    return this.programs.find(program => this.getProgramId(program) === programId) ?? null;
  }

  private getProgramId(program: any): string {
    return String(program?.id_program ?? program?.id ?? '');
  }

  private getLocalSubscriberKey(programId: string): string {
    return `${this.localSubscriberPrefix}${programId}`;
  }

  private getLocalSubscribers(programId: string): LocalSubscriber[] {
    return this.localStorageService.getItem<LocalSubscriber[]>(this.getLocalSubscriberKey(programId)) ?? [];
  }
}
