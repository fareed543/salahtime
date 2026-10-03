import { Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { ScreenHeaderAction, ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';
import {
  PROGRAM_TYPE_ICONS,
  ProgramType,
  getProgramId,
  getProgramType,
  isProgramActive,
  isProgramExpired,
  parseProgramDate
} from './program-utils';

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
  loading = false;
  // Program whose row "more actions" menu is open.
  openMenuId: string | null = null;
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
    private router: Router,
    private location: Location,
    public i18n: AppTranslateService
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
      return this.i18n.translateWithParams('PROGRAM_PAGE.ADD_PROGRAM', {});
    }

    return this.detailMode
      ? (this.selectedProgram?.name || this.i18n.translateWithParams('PROGRAM_PAGE.DETAILS', {}))
      : this.i18n.translateWithParams('PROGRAM_PAGE.TITLE', {});
  }

  get headerSubtitle(): string {
    if (!this.detailMode || this.editMode || !this.selectedProgram) {
      return '';
    }

    const status = this.isExpiredProgram(this.selectedProgram)
      ? this.i18n.translateWithParams('PROGRAM_PAGE.ENDED', {})
      : this.getStatusLabel(this.selectedProgram);
    return [this.getProgramTypeLabel(this.selectedProgram), status].filter(Boolean).join(' · ');
  }

  // Cached per state so the header gets the same array instance between change-detection passes.
  private headerActionsKey = '';
  private headerActionsCache: ScreenHeaderAction[] = [];

  get headerActions(): ScreenHeaderAction[] {
    const canEdit = this.detailMode && !this.editMode && this.canEditSelectedProgram;
    const canDelete = this.detailMode && !this.editMode && this.canDeleteProgram(this.selectedProgram);
    const key = [this.detailMode, canEdit, canDelete, this.i18n.current()].join('|');
    if (key !== this.headerActionsKey) {
      this.headerActionsKey = key;
      const t = (k: string) => this.i18n.translateWithParams(k, {});
      this.headerActionsCache = this.detailMode
        ? [
          ...(canEdit ? [{ id: 'edit', icon: 'pencil', ariaLabel: t('PROGRAM_PAGE.EDIT') }] : []),
          ...(canDelete ? [{ id: 'delete', icon: 'trash-2', ariaLabel: t('PROGRAM_PAGE.DELETE') }] : [])
        ]
        : [{ id: 'create', icon: 'plus', ariaLabel: t('PROGRAM_PAGE.ADD_PROGRAM') }];
    }
    return this.headerActionsCache;
  }

  onHeaderAction(action: ScreenHeaderAction): void {
    switch (action.id) {
      case 'create':
        this.startCreate();
        break;
      case 'edit':
        this.enableEdit();
        break;
      case 'delete':
        this.deleteProgram(this.selectedProgram);
        break;
    }
  }

  onBack(): void {
    // Create and edit forms live on the current URL, so Back closes the form instead of navigating.
    if (this.createMode) {
      this.backToList();
      return;
    }

    if (this.editMode) {
      this.cancelEdit();
      return;
    }

    if (ScreenHeaderComponent.hasInAppHistory()) {
      this.location.back();
      return;
    }

    void this.router.navigate(this.detailMode ? ['/programs'] : ['/'], { replaceUrl: true });
  }

  /* ---------------------------------------------------- list row helpers */

  trackByProgram = (_: number, program: any): string => this.getProgramId(program);

  getProgramType(program: any): ProgramType {
    return getProgramType(program);
  }

  getProgramTypeIcon(program: any): string {
    return PROGRAM_TYPE_ICONS[this.getProgramType(program)];
  }

  getProgramTypeLabel(program: any): string {
    return this.i18n.translateWithParams('PROGRAM_PAGE.' + this.getProgramType(program).toUpperCase(), {});
  }

  getStatusLabel(program: any): string {
    const status = String(program?.status ?? '').toUpperCase();
    return ['ACTIVE', 'INACTIVE', 'COMPLETED'].includes(status)
      ? this.i18n.translateWithParams('PROGRAM_PAGE.STATUS.' + status, {})
      : '';
  }

  getDateRange(program: any): string {
    const start = parseProgramDate(program?.start_date);
    const end = parseProgramDate(program?.end_date);
    if (!start && !end) {
      return '';
    }

    const thisYear = new Date().getFullYear();
    const format = (date: Date) => this.i18n.formatDate(date, date.getFullYear() === thisYear
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
    return [start, end].filter((date): date is Date => !!date).map(format).join(' – ');
  }

  hasRowActions(program: any): boolean {
    return this.canViewSubscriptions(program) || this.canEditProgram(program) || this.canDeleteProgram(program);
  }

  toggleMenu(program: any, event: Event): void {
    event.stopPropagation();
    const id = this.getProgramId(program);
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  runMenuAction(action: 'subscriptions' | 'edit' | 'delete', program: any): void {
    this.openMenuId = null;
    if (action === 'subscriptions') {
      this.viewSubscriptions(program);
    } else if (action === 'edit') {
      this.editProgram(program);
    } else {
      this.deleteProgram(program);
    }
  }

  // The menu button stops propagation, so any other click closes the open menu.
  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenuId = null;
  }

  get canEditSelectedProgram(): boolean {
    return this.canEditProgram(this.selectedProgram);
  }

  get hasSaveError(): boolean {
    const message = this.saveMessage.toLowerCase();
    return message.includes('unable') || message.includes('required') || message.includes('must');
  }

  get filteredPrograms(): any[] {
    return this.programs.filter((program) => this.activeTab === 'active'
      ? this.isActiveProgram(program)
      : this.isMyProgram(program));
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
            this.error = this.i18n.translateWithParams('PROGRAM_PAGE.DETAILS_UNAVAILABLE', {});
            return;
          }

          this.patchEditForm(this.selectedProgram);
          this.loadProgramDetails(programId);
          this.loadProgramStats(this.selectedProgram);

          if (this.route.snapshot.queryParamMap.get('edit') === '1') {
            this.enableEdit();
          }

          const subscribeId = this.route.snapshot.queryParamMap.get('subscribe');
          if (subscribeId === programId && !this.selectedProgram?.entrolled && this.isLoggedIn && this.canChangeSubscription(this.selectedProgram)) {
            this.toggleSubscription(this.selectedProgram);
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          }
        }
      },
      error: () => {
        this.error = this.i18n.translateWithParams('PROGRAM_PAGE.LOAD_ERROR', {});
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
      this.error = this.i18n.translateWithParams('PROGRAM_PAGE.CLOSED_CHANGES', {});
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
        this.error = error?.error?.error || this.i18n.translateWithParams('PROGRAM_PAGE.SUBSCRIPTION_ERROR', {});
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
    return isProgramExpired(program);
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

    // Edit mode starts once the program has loaded (see loadPrograms).
    void this.router.navigate(['/programs', id], { queryParams: { edit: 1 } });
  }

  deleteProgram(program: any): void {
    const id = this.getProgramId(program);
    if (!id) {
      return;
    }

    if (!this.canDeleteProgram(program)) {
      this.error = this.i18n.translateWithParams('PROGRAM_PAGE.DELETE_PERMISSION', {});
      return;
    }

    const name = program?.name || this.i18n.translateWithParams('PROGRAM_PAGE.THIS_PROGRAM', {});
    if (!window.confirm(this.i18n.translateWithParams('PROGRAM_PAGE.DELETE_CONFIRM', { name }))) {
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
        this.error = error?.error?.error || this.i18n.translateWithParams('PROGRAM_PAGE.DELETE_ERROR', {});
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
        this.saveMessage = this.i18n.translateWithParams('PROGRAM_PAGE.UPDATED', {});
        this.selectedProgram = savedProgram;
        this.programs = this.programs.map(program => this.getProgramId(program) === id ? this.selectedProgram : program);
        this.patchEditForm(this.selectedProgram);
      },
      error: (error) => {
        this.saving = false;
        this.saveMessage = this.extractApiError(error) || this.i18n.translateWithParams('PROGRAM_PAGE.SAVE_ERROR', {});
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
      this.createdSubscriberMessage = this.i18n.translateWithParams('PROGRAM_PAGE.NAME_PHONE_REQUIRED', {});
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
    this.createdSubscriberMessage = this.i18n.translateWithParams('PROGRAM_PAGE.SUBSCRIBER_ADDED', {});
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
    return getProgramId(program);
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
      return this.i18n.translateWithParams('PROGRAM_PAGE.PROGRAM_NAME_REQUIRED', {});
    }

    if (!this.editForm.code.trim()) {
      return this.i18n.translateWithParams('PROGRAM_PAGE.PROGRAM_CODE_REQUIRED', {});
    }

    if (!this.editForm.id_halqa) {
      return this.i18n.translateWithParams('PROGRAM_PAGE.AREA_REQUIRED', {});
    }

    if (!this.editForm.start_date) {
      return this.i18n.translateWithParams('PROGRAM_PAGE.START_DATE_REQUIRED', {});
    }

    if (!this.editForm.end_date) {
      return this.i18n.translateWithParams('PROGRAM_PAGE.END_DATE_REQUIRED', {});
    }

    if (this.editForm.end_date < this.editForm.start_date) {
      return this.i18n.translateWithParams('PROGRAM_PAGE.END_DATE_AFTER_START', {});
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
    return isProgramActive(program);
  }

  private isMyProgram(program: any): boolean {
    if (!this.isLoggedIn) {
      return false;
    }

    return program?.is_mine === true || !!program?.entrolled || this.canEditProgram(program);
  }

}
