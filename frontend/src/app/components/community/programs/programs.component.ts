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
  halqas: any[] = [];
  activeTab: 'active' | 'mine' = 'active';
  programTypeFilter: 'all' | 'general' | 'sehri' | 'iftar' = 'all';
  searchQuery = '';
  showFilters = false;
  viewMode: 'grid' | 'list' = 'list';
  loading = false;
  error = '';
  selectedProgram: any = null;
  detailMode = false;
  createMode = false;
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
    program_type: 'general',
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
    if (this.createMode) {
      return 'Add Program';
    }

    return this.detailMode ? (this.selectedProgram?.name || 'Program Details') : 'Programs';
  }

  get headerActions(): ScreenHeaderAction[] {
    if (this.detailMode) {
      const actions: ScreenHeaderAction[] = [
        { id: 'back', icon: 'bi-arrow-left', ariaLabel: 'Back to programs' }
      ];

      return actions;
    }

    return [
      { id: 'create', icon: 'bi-plus-lg', ariaLabel: 'Add program' }
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

  get hasSaveError(): boolean {
    const message = this.saveMessage.toLowerCase();
    return message.includes('unable') || message.includes('required') || message.includes('must');
  }

  get filteredPrograms(): any[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.programs.filter((program) => {
      const matchesTab = this.activeTab === 'active'
        ? this.isActiveProgram(program)
        : this.isMyProgram(program);
      const type = String(program?.program_type ?? 'general').toLowerCase();
      const matchesType = this.programTypeFilter === 'all' || type === this.programTypeFilter;
      const searchable = [program?.name, program?.code, program?.description, program?.program_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesTab && matchesType && (!query || searchable.includes(query));
    });
  }

  get isSuperAdmin(): boolean {
    const userInfo = this.localStorageService.getItem<any>('userInfo');
    return Number(userInfo?.customerTypeId ?? userInfo?.id_customer_type ?? 0) === 1;
  }

  loadPrograms(programId?: string | null): void {
    this.loading = true;
    this.error = '';
    this.selectedProgram = null;
    this.createMode = false;

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

          const subscribeId = this.route.snapshot.queryParamMap.get('subscribe');
          if (subscribeId === programId && !this.selectedProgram?.entrolled && this.isLoggedIn && this.canChangeSubscription(this.selectedProgram)) {
            this.toggleSubscription(this.selectedProgram);
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          }
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
    this.createMode = false;
    this.editMode = false;
    this.selectedProgram = null;
    this.router.navigate(['/programs']);
  }

  startCreate(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.error = '';
    this.saveMessage = '';
    this.createdSubscriberMessage = '';
    this.showSubscribeForOthers = false;
    this.selectedProgram = null;
    this.createMode = true;
    this.detailMode = true;
    this.editMode = true;
    this.resetEditForm();
    this.loadHalqas();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  openFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setActiveTab(tab: 'active' | 'mine'): void {
    this.activeTab = tab;
  }

  viewSubscriptions(program: any): void {
    const id = this.getProgramId(program);
    if (!id || !this.canViewSubscriptions(program)) {
      return;
    }

    this.router.navigate(['/subscription', id]);
  }

  canViewSubscriptions(program: any): boolean {
    return program?.canViewSubscriptions === true || program?.can_view_subscriptions === true;
  }

  toggleSubscription(program: any): void {
    const id = this.getProgramId(program);
    if (!id) {
      return;
    }

    if (!this.canChangeSubscription(program)) {
      this.error = 'This program is closed for subscription changes.';
      return;
    }

    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/programs/${id}?subscribe=${id}` }
      });
      return;
    }

    this.ramadanService.programEnrollment(Number(id)).subscribe({
      next: (response) => {
        program.entrolled = Number(response?.entrolled ?? (program.entrolled ? 0 : 1));
        program.is_subscribed = !!program.entrolled;
        if (response?.subscription_count !== undefined) {
          program.subscription_count = response.subscription_count;
        }
      },
      error: (error) => {
        if (error?.status === 401) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: `/programs/${id}?subscribe=${id}` }
          });
          return;
        }
        this.error = error?.error?.error || 'Unable to update the subscription right now.';
      }
    });
  }

  canChangeSubscription(program: any): boolean {
    return !!program && !this.isExpiredProgram(program);
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
    if (!program || !this.isLoggedIn) {
      return false;
    }

    if (program?.canDelete === true || program?.can_delete === true) {
      return true;
    }

    return this.isSuperAdmin || (this.canEditProgram(program) && !this.isExpiredProgram(program));
  }

  isExpiredProgram(program: any): boolean {
    if (program?.is_expired === true) {
      return true;
    }

    const endDate = this.parseDate(program?.end_date);
    if (!endDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate.getTime() < today.getTime();
  }

  getDeleteWarning(program: any): string {
    return program?.delete_warning || (
      this.isExpiredProgram(program) && !this.isSuperAdmin
        ? 'This program has ended and can only be deleted by a super admin.'
        : ''
    );
  }

  getProgramRegistrationUrl(program: any): string {
    const code = String(program?.code ?? '').trim();
    const id = this.getProgramId(program);
    const returnUrl = id ? `/programs/${id}?subscribe=${id}` : '/programs';
    const tree = this.router.createUrlTree(['/register'], {
      queryParams: {
        registrationCode: code || undefined,
        returnUrl
      }
    });
    return `${window.location.origin}${this.router.serializeUrl(tree)}`;
  }

  getProgramQrUrl(program: any): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(this.getProgramRegistrationUrl(program))}`;
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
    if (!id) {
      return;
    }

    if (!this.canDeleteProgram(program)) {
      this.error = this.getDeleteWarning(program) || 'You do not have permission to delete this program.';
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
      error: (error) => {
        this.loading = false;
        this.error = error?.error?.error || 'Unable to delete program right now.';
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
    if (this.createMode) {
      this.backToList();
      return;
    }

    this.editMode = false;
    this.patchEditForm(this.selectedProgram);
  }

  saveProgram(): void {
    if (this.saving) {
      return;
    }

    const validationMessage = this.validateProgramForm();
    if (validationMessage) {
      this.saveMessage = validationMessage;
      return;
    }

    const selectedProgramId = this.getProgramId(this.selectedProgram);

    const payload = {
      ...this.editForm,
      id: selectedProgramId || undefined,
      id_halqa: Number(this.editForm.id_halqa || this.selectedProgram?.id_halqa || 0),
      registration_allowed: this.editForm.registration_allowed ? 1 : 0,
      waitlist_enabled: this.editForm.waitlist_enabled ? 1 : 0,
      max_participants: Number(this.editForm.max_participants || 100)
    };

    this.saving = true;
    this.ramadanService.saveProgram(payload).subscribe({
      next: (response) => {
        this.saving = false;
        const savedProgram = {
          ...this.selectedProgram,
          ...response,
          canEdit: true,
          can_edit: true,
          canDelete: !this.isExpiredProgram(response),
          can_delete: !this.isExpiredProgram(response)
        };

        const id = this.getProgramId(savedProgram);

        if (this.createMode) {
          this.createMode = false;
          this.editMode = false;
          this.saveMessage = '';
          this.router.navigate(['/programs', id || String(response?.id ?? '')]);
          return;
        }

        this.editMode = false;
        this.saveMessage = 'Program details updated.';
        this.selectedProgram = savedProgram;
        this.programs = this.programs.map(program => this.getProgramId(program) === id ? this.selectedProgram : program);
        this.patchEditForm(this.selectedProgram);
      },
      error: (error) => {
        this.saving = false;
        this.saveMessage = this.extractApiError(error) || 'Unable to save program details right now.';
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
          entrolled: this.selectedProgram?.entrolled || programDetails?.entrolled ? 1 : 0,
          is_subscribed: !!(this.selectedProgram?.entrolled || programDetails?.is_subscribed),
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

  getProgramId(program: any): string {
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
      program_type: program?.program_type ?? 'general',
      registration_allowed: !!Number(program?.registration_allowed ?? 1),
      max_participants: Number(program?.max_participants ?? 100),
      waitlist_enabled: !!Number(program?.waitlist_enabled ?? 1),
      id_halqa: String(program?.id_halqa ?? '')
    };
  }

  private resetEditForm(): void {
    this.editForm = {
      name: '',
      code: '',
      start_date: '',
      end_date: '',
      contact_number: '',
      email: '',
      description: '',
      status: 'active',
      program_type: 'general',
      registration_allowed: true,
      max_participants: 100,
      waitlist_enabled: true,
      id_halqa: ''
    };
  }

  private loadHalqas(): void {
    if (!this.isLoggedIn || this.halqas.length > 0) {
      return;
    }

    this.ramadanService.halqaList().subscribe({
      next: (response) => {
        this.halqas = Array.isArray(response) ? response : response?.halqas ?? response?.list ?? [];
      }
    });
  }

  private validateProgramForm(): string {
    if (!this.editForm.name.trim()) {
      return 'Program name is required.';
    }

    if (!this.editForm.code.trim()) {
      return 'Program code is required.';
    }

    if (!this.editForm.id_halqa) {
      return 'Area is required.';
    }

    if (!this.editForm.start_date) {
      return 'Start date is required.';
    }

    if (!this.editForm.end_date) {
      return 'End date is required.';
    }

    if (this.editForm.end_date < this.editForm.start_date) {
      return 'End date must be on or after the start date.';
    }

    return '';
  }

  private extractApiError(error: any): string {
    const errorPayload = error?.error;

    if (typeof errorPayload?.error === 'string' && errorPayload.error.trim()) {
      return errorPayload.error;
    }

    if (errorPayload && typeof errorPayload === 'object') {
      const firstMessage = Object.values(errorPayload)
        .flatMap((value: any) => Array.isArray(value) ? value : [value])
        .find((value: any) => typeof value === 'string' && value.trim());

      if (typeof firstMessage === 'string') {
        return firstMessage;
      }
    }

    return '';
  }

  private isActiveProgram(program: any): boolean {
    if (program?.is_active !== undefined) {
      return program.is_active === true || Number(program.is_active) === 1;
    }

    return String(program?.status ?? 'active').toLowerCase() === 'active' && !this.isExpiredProgram(program);
  }

  private isMyProgram(program: any): boolean {
    if (!this.isLoggedIn) {
      return false;
    }

    return program?.is_mine === true || !!program?.entrolled || this.canEditProgram(program);
  }

  private parseDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return null;
    }

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
}
