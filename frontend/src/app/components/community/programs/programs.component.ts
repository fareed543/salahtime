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
  editMode = false;
  saving = false;
  saveMessage = '';
  showSubscribeForOthers = false;
  createdSubscriberMessage = '';
  editForm = {
    name: '',
    code: '',
    start_date: '',
    end_date: '',
    contact_number: '',
    email: '',
    description: '',
    status: 'active',
    registration_allowed: true,
    max_participants: 100,
    waitlist_enabled: true,
    id_halqa: ''
  };
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
      const actions: ScreenHeaderAction[] = [
        { id: 'back', icon: 'bi-arrow-left', ariaLabel: 'Back to programs' }
      ];

      if (this.canEditSelectedProgram) {
        actions.push({ id: 'edit', icon: 'bi-pencil', ariaLabel: 'Edit program', active: this.editMode });
        actions.push({ id: 'delete', icon: 'bi-trash', ariaLabel: 'Delete program' });
      }

      return actions;
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
      case 'edit':
        this.enableEdit();
        break;
      case 'delete':
        this.deleteProgram(this.selectedProgram);
        break;
    }
  }

  get canEditSelectedProgram(): boolean {
    return this.canEditProgram(this.selectedProgram);
  }

  loadPrograms(programId?: string | null): void {
    this.loading = true;
    this.error = '';
    this.selectedProgram = null;

    const request$ = this.ramadanService.programList();

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

          this.patchEditForm(this.selectedProgram);
          this.loadProgramDetails(programId);
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
      next: (response) => {
        program.entrolled = Number(response?.entrolled ?? (program.entrolled ? 0 : 1));
        program.is_subscribed = !!program.entrolled;
        if (response?.subscription_count !== undefined) {
          program.subscription_count = response.subscription_count;
        }
      }
    });
  }

  canEditProgram(program: any): boolean {
    if (!program) {
      return false;
    }

    if (program.canEdit === true || program.can_edit === true) {
      return true;
    }

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const currentUserId = String(userInfo?.id ?? userInfo?.id_customer ?? userInfo?.customer_id ?? '');
    const ownerId = String(program?.created_by ?? program?.id_customer ?? '');
    return !!currentUserId && !!ownerId && currentUserId === ownerId;
  }

  canDeleteProgram(program: any): boolean {
    return this.canEditProgram(program) || program?.canDelete === true || program?.can_delete === true;
  }

  editProgram(program: any): void {
    const id = this.getProgramId(program);
    if (!id || !this.canEditProgram(program)) {
      return;
    }

    this.router.navigate(['/programs', id]).then(() => {
      setTimeout(() => this.enableEdit(), 0);
    });
  }

  deleteProgram(program: any): void {
    const id = this.getProgramId(program);
    if (!id || !this.canDeleteProgram(program)) {
      return;
    }

    const name = program?.name || 'this program';
    if (!window.confirm(`Delete ${name}?`)) {
      return;
    }

    this.loading = true;
    this.ramadanService.deleteProgram(id).subscribe({
      next: () => {
        this.loading = false;
        this.programs = this.programs.filter(item => this.getProgramId(item) !== id);
        if (this.detailMode) {
          this.router.navigate(['/programs']);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to delete program right now.';
      }
    });
  }

  enableEdit(): void {
    if (!this.canEditSelectedProgram || !this.selectedProgram) {
      return;
    }

    this.patchEditForm(this.selectedProgram);
    this.saveMessage = '';
    this.editMode = true;
  }

  cancelEdit(): void {
    this.editMode = false;
    this.patchEditForm(this.selectedProgram);
  }

  saveProgram(): void {
    if (!this.selectedProgram || this.saving) {
      return;
    }

    const payload = {
      ...this.editForm,
      id: this.getProgramId(this.selectedProgram),
      id_halqa: Number(this.editForm.id_halqa || this.selectedProgram?.id_halqa || 0),
      registration_allowed: this.editForm.registration_allowed ? 1 : 0,
      waitlist_enabled: this.editForm.waitlist_enabled ? 1 : 0,
      max_participants: Number(this.editForm.max_participants || 100)
    };

    this.saving = true;
    this.ramadanService.saveProgram(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.editMode = false;
        this.saveMessage = 'Program details updated.';
        this.selectedProgram = {
          ...this.selectedProgram,
          ...response,
          canEdit: true,
          can_edit: true,
          canDelete: true,
          can_delete: true
        };
        const id = this.getProgramId(this.selectedProgram);
        this.programs = this.programs.map(program => this.getProgramId(program) === id ? this.selectedProgram : program);
        this.patchEditForm(this.selectedProgram);
      },
      error: () => {
        this.saving = false;
        this.saveMessage = 'Unable to save program details right now.';
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

  private loadProgramDetails(programId: string): void {
    this.ramadanService.programDetails(programId).subscribe({
      next: (response) => {
        const programDetails = response?.program ?? null;
        if (!programDetails) {
          return;
        }

        this.selectedProgram = {
          ...this.selectedProgram,
          ...programDetails,
          canEdit: programDetails?.canEdit || programDetails?.can_edit,
          can_edit: programDetails?.canEdit || programDetails?.can_edit,
          canDelete: programDetails?.canDelete || programDetails?.can_delete,
          can_delete: programDetails?.canDelete || programDetails?.can_delete
        };
        this.patchEditForm(this.selectedProgram);
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

  private patchEditForm(program: any): void {
    this.editForm = {
      name: program?.name ?? '',
      code: program?.code ?? '',
      start_date: program?.start_date ?? '',
      end_date: program?.end_date ?? '',
      contact_number: program?.contact_number ?? '',
      email: program?.email ?? '',
      description: program?.description ?? '',
      status: program?.status ?? 'active',
      registration_allowed: !!Number(program?.registration_allowed ?? 1),
      max_participants: Number(program?.max_participants ?? 100),
      waitlist_enabled: !!Number(program?.waitlist_enabled ?? 1),
      id_halqa: String(program?.id_halqa ?? '')
    };
  }
}
