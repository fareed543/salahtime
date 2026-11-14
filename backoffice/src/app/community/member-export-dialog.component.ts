import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, debounceTime, finalize, switchMap, takeUntil } from 'rxjs';
import { ToastService } from '../services/toast.service';
import {
  CommunityService,
  MEMBER_PROFESSIONS,
  MemberExportFilters,
  MemberExportMasjidOption,
  MemberProfession
} from './community.service';
// The PDF code (jsPDF) is loaded only when Generate PDF is pressed, to keep it out of the initial bundle.

/** NF-016: filter dialog on the Masjids list -> Generate PDF. */
@Component({
  selector: 'app-member-export-dialog',
  template: `
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="memberExportTitle" (click)="onBackdrop($event)">
      <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="memberExportTitle"><i class="bx bx-export me-2"></i>Export members to PDF</h5>
            <button type="button" class="btn-close" aria-label="Close" (click)="closed.emit()"></button>
          </div>
          <div class="modal-body">
            <div *ngIf="loadingOptions" class="text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading masjids...</div>

            <ng-container *ngIf="!loadingOptions">
              <!-- Masjids -->
              <div class="mb-4">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="fw-semibold">Masjids</span>
                  <div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox" id="mexAllMasjids" [(ngModel)]="allMasjids" (ngModelChange)="refreshCount()">
                    <label class="form-check-label" for="mexAllMasjids">All masjids ({{ masjids.length }})</label>
                  </div>
                </div>
                <ng-container *ngIf="!allMasjids">
                  <input type="search" class="form-control form-control-sm mb-2" placeholder="Search masjid, area or city" [(ngModel)]="masjidSearch" aria-label="Search masjids">
                  <div class="d-flex gap-2 mb-2">
                    <button type="button" class="btn btn-xs btn-outline-primary btn-sm" (click)="selectShown(true)">Select shown</button>
                    <button type="button" class="btn btn-xs btn-outline-secondary btn-sm" (click)="selectShown(false)">Clear</button>
                    <small class="text-muted ms-auto align-self-center">{{ selectedMasjids.size }} selected</small>
                  </div>
                  <div class="mex-masjid-list border rounded">
                    <label *ngFor="let m of shownMasjids; trackBy: trackById" class="d-flex align-items-center gap-2 px-3 py-2 border-bottom mex-masjid-row">
                      <input type="checkbox" class="form-check-input m-0" [checked]="selectedMasjids.has(m.id)" (change)="toggleMasjid(m.id)">
                      <span class="flex-grow-1">{{ m.name }}<small class="text-muted d-block">{{ placeOf(m) }}</small></span>
                      <span class="badge bg-label-secondary">{{ m.members }}</span>
                    </label>
                    <p *ngIf="!shownMasjids.length" class="text-muted text-center py-3 mb-0">No masjids match.</p>
                  </div>
                </ng-container>
              </div>

              <!-- Gender -->
              <div class="mb-4">
                <span class="fw-semibold d-block mb-2">Gender</span>
                <div class="btn-group" role="group" aria-label="Gender">
                  <ng-container *ngFor="let g of genderOptions">
                    <input type="radio" class="btn-check" name="mexGender" [id]="'mexGender-' + g.value" [value]="g.value" [(ngModel)]="gender" (ngModelChange)="refreshCount()">
                    <label class="btn btn-outline-primary btn-sm" [for]="'mexGender-' + g.value">{{ g.label }}</label>
                  </ng-container>
                </div>
              </div>

              <!-- Profession -->
              <div class="mb-2">
                <span class="fw-semibold d-block mb-2">Profession <small class="text-muted fw-normal">(none ticked = all)</small></span>
                <div class="d-flex flex-wrap gap-2">
                  <ng-container *ngFor="let p of professionOptions">
                    <input type="checkbox" class="btn-check" [id]="'mexProf-' + p.value" [checked]="professions.has(p.value)" (change)="toggleProfession(p.value)">
                    <label class="btn btn-outline-primary btn-sm" [for]="'mexProf-' + p.value">{{ p.label }}</label>
                  </ng-container>
                </div>
              </div>
            </ng-container>
          </div>
          <div class="modal-footer justify-content-between">
            <span class="text-muted" aria-live="polite">
              <ng-container *ngIf="counting"><span class="spinner-border spinner-border-sm me-1"></span>Counting...</ng-container>
              <ng-container *ngIf="!counting && count">{{ count.total }} members in {{ count.masjidCount }} masjids</ng-container>
            </span>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary" (click)="closed.emit()">Cancel</button>
              <button type="button" class="btn btn-primary" [disabled]="!canGenerate" (click)="generate()">
                <span *ngIf="generating" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!generating" class="bx bx-download me-1"></i>Generate PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  `,
  styles: [`
    .mex-masjid-list { max-height: 260px; overflow-y: auto; }
    .mex-masjid-row { cursor: pointer; margin: 0; }
    .mex-masjid-row:last-child { border-bottom: 0 !important; }
  `]
})
export class MemberExportDialogComponent implements OnInit, OnDestroy {
  @Output() readonly closed = new EventEmitter<void>();

  readonly genderOptions = [
    { value: 'both', label: 'Both' },
    { value: 'm', label: 'Male' },
    { value: 'f', label: 'Female' }
  ];
  readonly professionOptions = MEMBER_PROFESSIONS;

  masjids: MemberExportMasjidOption[] = [];
  allMasjids = true;
  masjidSearch = '';
  selectedMasjids = new Set<number>();
  gender: 'both' | 'm' | 'f' = 'both';
  professions = new Set<MemberProfession>();

  loadingOptions = true;
  counting = false;
  generating = false;
  count: { total: number; masjidCount: number } | null = null;

  private readonly count$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly community: CommunityService, private readonly toast: ToastService) {}

  ngOnInit(): void {
    document.body.classList.add('modal-open');
    this.count$
      .pipe(
        debounceTime(250),
        switchMap(() => {
          this.counting = true;
          return this.community.memberExportCount(this.filters()).pipe(finalize(() => (this.counting = false)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({ next: (c) => (this.count = c), error: () => (this.count = null) });

    this.community
      .memberExportOptions()
      .pipe(finalize(() => (this.loadingOptions = false)))
      .subscribe({
        next: (options) => {
          this.masjids = options;
          this.refreshCount();
        },
        error: (err) => this.toast.error(err, 'Unable to load masjids.')
      });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
    this.destroy$.next();
    this.destroy$.complete();
  }

  get shownMasjids(): MemberExportMasjidOption[] {
    const q = this.masjidSearch.trim().toLowerCase();
    return q ? this.masjids.filter((m) => `${m.name} ${m.area} ${m.city}`.toLowerCase().includes(q)) : this.masjids;
  }

  get canGenerate(): boolean {
    return !this.generating && !this.loadingOptions && !!this.count?.total && (this.allMasjids || this.selectedMasjids.size > 0);
  }

  placeOf(m: MemberExportMasjidOption): string {
    return [m.area, m.city].filter(Boolean).join(', ');
  }

  trackById(_: number, m: MemberExportMasjidOption): number {
    return m.id;
  }

  toggleMasjid(id: number): void {
    this.selectedMasjids.has(id) ? this.selectedMasjids.delete(id) : this.selectedMasjids.add(id);
    this.refreshCount();
  }

  selectShown(select: boolean): void {
    if (select) {
      this.shownMasjids.forEach((m) => this.selectedMasjids.add(m.id));
    } else {
      this.selectedMasjids.clear();
    }
    this.refreshCount();
  }

  toggleProfession(value: MemberProfession): void {
    this.professions.has(value) ? this.professions.delete(value) : this.professions.add(value);
    this.refreshCount();
  }

  refreshCount(): void {
    if (!this.allMasjids && !this.selectedMasjids.size) {
      this.count = { total: 0, masjidCount: 0 };
      return;
    }
    this.count$.next();
  }

  filters(): MemberExportFilters {
    return {
      masjidIds: this.allMasjids ? [] : [...this.selectedMasjids],
      genders: this.gender === 'both' ? [] : [this.gender],
      professions: [...this.professions]
    };
  }

  generate(): void {
    const filters = this.filters();
    const names = this.masjids.filter((m) => this.selectedMasjids.has(m.id)).map((m) => m.name);
    this.generating = true;
    this.community
      .memberExport(filters)
      .pipe(finalize(() => (this.generating = false)))
      .subscribe({
        next: (result) => {
          if (!result.masjids.length) {
            this.toast.warning('No members match the filters.');
            return;
          }
          this.generating = true;
          import('./member-export-pdf')
            .then(async (pdf) => {
              const logo = await pdf.loadBrandLogo();
              pdf.buildMemberExportPdf(result, pdf.summarizeFilters(filters, names), logo).save(pdf.memberExportFileName());
              this.toast.success('PDF downloaded.');
              this.closed.emit();
            })
            .catch((err) => this.toast.error(err, 'Unable to build the PDF.'))
            .finally(() => (this.generating = false));
        },
        error: (err) => this.toast.error(err, 'Unable to export members.')
      });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
