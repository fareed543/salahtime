import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';

interface PendingDeleteRecord {
  id: string;
  deleteAfter: string;
}

@Component({
  selector: 'app-halqa',
  templateUrl: './halqa.component.html',
  styleUrls: ['./halqa.component.scss']
})
export class HalqaComponent implements OnInit {
  halqas: any[] = [];
  viewMode: 'grid' | 'list' = 'grid';
  loading = false;
  detailMode = false;
  selectedHalqa: any = null;
  editMode = false;
  message = '';
  editForm = {
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  };

  private readonly localEditsKey = 'halqaLocalEdits';
  private readonly localDeletesKey = 'halqaLocalDeletes';

  constructor(
    private ramadanService: RamadanApiService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorageService: LocalStorageService,
    private location: Location,
    public i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const halqaId = params.get('id');
      this.detailMode = !!halqaId;
      this.loadHalqas(halqaId);
    });
  }

  get isLoggedIn(): boolean {
    return !!this.localStorageService.getItem<any>('userInfo');
  }

  get headerTitle(): string {
    return this.detailMode
      ? (this.selectedHalqa?.name || this.i18n.translateWithParams('AREA_PAGE.DETAILS', {}))
      : this.i18n.translateWithParams('AREA_PAGE.TITLE', {});
  }

  get headerActions(): ScreenHeaderAction[] {
    if (this.detailMode) {
      return [
        { id: 'back', icon: 'bi-arrow-left', ariaLabel: this.i18n.translateWithParams('AREA_PAGE.BACK', {}) }
      ];
    }

    return [
      { id: 'create', icon: 'bi-plus-lg', ariaLabel: this.i18n.translateWithParams('AREA_PAGE.ADD', {}) },
      { id: 'list', icon: 'bi-list-ul', ariaLabel: this.i18n.translateWithParams('AREA_PAGE.SHOW_LIST', {}), active: this.viewMode === 'list' },
      { id: 'grid', icon: 'bi-grid', ariaLabel: this.i18n.translateWithParams('AREA_PAGE.SHOW_GRID', {}), active: this.viewMode === 'grid' },
      { id: 'filter', icon: 'bi-funnel', ariaLabel: this.i18n.translateWithParams('AREA_PAGE.OPEN_FILTERS', {}), active: false }
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

  get isOwner(): boolean {
    if (!this.selectedHalqa) {
      return false;
    }

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const currentUserId = String(userInfo?.id ?? userInfo?.user_id ?? userInfo?.id_user ?? '');
    const ownerId = String(
      this.selectedHalqa?.created_by ??
      this.selectedHalqa?.user_id ??
      this.selectedHalqa?.id_user ??
      this.selectedHalqa?.owner_id ??
      ''
    );

    return !!currentUserId && !!ownerId && currentUserId === ownerId;
  }

  loadHalqas(halqaId?: string | null): void {
    this.loading = true;
    this.message = '';
    this.ramadanService.halqaList().subscribe({
      next: (response) => {
        const remoteHalqas = Array.isArray(response) ? response : response?.halqas ?? response?.list ?? [];
        this.halqas = this.applyLocalOverrides(remoteHalqas);
        this.loading = false;

        if (halqaId) {
          this.selectedHalqa = this.halqas.find(halqa => this.getHalqaId(halqa) === halqaId) ?? null;
          if (this.selectedHalqa) {
            this.patchEditForm(this.selectedHalqa);
          }
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDetails(halqa: any): void {
    const id = this.getHalqaId(halqa);
    if (!id) {
      return;
    }

    this.router.navigate(['/area', id]);
  }

  backToList(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/area']);
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

  enableEdit(): void {
    if (!this.selectedHalqa) {
      return;
    }

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.patchEditForm(this.selectedHalqa);
    this.editMode = true;
  }

  saveEdit(): void {
    if (!this.selectedHalqa) {
      return;
    }

    const id = this.getHalqaId(this.selectedHalqa);
    const edits = this.localStorageService.getItem<Record<string, any>>(this.localEditsKey) ?? {};
    edits[id] = {
      ...this.selectedHalqa,
      ...this.editForm
    };
    this.localStorageService.setItem(this.localEditsKey, edits);
    this.selectedHalqa = edits[id];
    this.halqas = this.halqas.map(halqa => this.getHalqaId(halqa) === id ? this.selectedHalqa : halqa);
    this.editMode = false;
    this.message = this.i18n.translateWithParams('AREA_PAGE.UPDATED', {});
  }

  deleteHalqa(): void {
    if (!this.selectedHalqa) {
      return;
    }

    const id = this.getHalqaId(this.selectedHalqa);
    const deletes = this.localStorageService.getItem<PendingDeleteRecord[]>(this.localDeletesKey) ?? [];
    const existing = deletes.find(record => record.id === id);

    if (!existing) {
      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 5);
      deletes.push({
        id,
        deleteAfter: deleteAfter.toISOString()
      });
    }

    this.localStorageService.setItem(this.localDeletesKey, deletes);
    this.message = this.i18n.translateWithParams('AREA_PAGE.DELETE_SCHEDULED', {});
    this.router.navigate(['/area']);
  }

  private applyLocalOverrides(halqas: any[]): any[] {
    const edits = this.localStorageService.getItem<Record<string, any>>(this.localEditsKey) ?? {};
    const deletes = this.localStorageService.getItem<PendingDeleteRecord[]>(this.localDeletesKey) ?? [];
    const now = Date.now();

    return halqas
      .filter(halqa => {
        const scheduledDelete = deletes.find(record => record.id === this.getHalqaId(halqa));
        return !scheduledDelete || new Date(scheduledDelete.deleteAfter).getTime() > now;
      })
      .map(halqa => {
        const id = this.getHalqaId(halqa);
        const scheduledDelete = deletes.find(record => record.id === id);
        return {
          ...(edits[id] ?? halqa),
          pendingDeleteAfter: scheduledDelete?.deleteAfter ?? null
        };
      });
  }

  private getHalqaId(halqa: any): string {
    return String(halqa?.id_halqa ?? halqa?.id ?? '');
  }

  private patchEditForm(halqa: any): void {
    this.editForm = {
      name: halqa?.name ?? '',
      description: halqa?.description ?? '',
      start_date: halqa?.start_date ?? '',
      end_date: halqa?.end_date ?? ''
    };
  }
}
