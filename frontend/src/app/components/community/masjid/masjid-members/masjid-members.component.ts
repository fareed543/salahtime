import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { GenderConfirmComponent } from 'src/app/shared/gender-confirm/gender-confirm.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';

/**
 * NF-012: users linked to this masjid. Everyone sees only their own gender (CR-023: no "All"); the owner (and super admin) also sees
 * contact and work details, other members name + photo.
 * Hidden for everyone else. The API enforces the same rules.
 */
@Component({
  selector: 'app-masjid-members',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, GenderConfirmComponent, LoadingSpinnerComponent],
  template: `
    <section class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="visible">
      <div class="card-body">
        <div class="mm-head">
          <h2 class="h6 mb-0">{{ 'MASJID_MEMBERS.TITLE' | translate }}<span class="mm-total" *ngIf="!loading && !needsGender"> {{ members.length }}</span></h2>
          <!-- CR-023 (owner): no "All" — brothers see only Brothers, sisters only Sisters (the API filters too). -->
          <div class="mm-segment" *ngIf="viewerGender && !needsGender">
            <span class="mm-pill">{{ (viewerGender === 'f' ? 'PROGRAM_CONSOLE.SISTERS' : 'PROGRAM_CONSOLE.BROTHERS') | translate }} {{ members.length }}</span>
          </div>
        </div>

        <app-gender-confirm *ngIf="needsGender" reason="PROGRAM_CONSOLE.GENDER_REASON" (confirmed)="load()"></app-gender-confirm>
        <app-loading-spinner *ngIf="loading" size="sm" [label]="'PROGRAM_CONSOLE.LOADING' | translate"></app-loading-spinner>

        <ng-container *ngIf="!loading && !needsGender">
          <label class="visually-hidden" [for]="searchId">{{ 'PROGRAM_CONSOLE.SEARCH_MEMBERS' | translate }}</label>
          <input *ngIf="members.length > 8" class="form-control form-control-sm mb-2" type="search" [id]="searchId"
            [(ngModel)]="query" [placeholder]="'PROGRAM_CONSOLE.SEARCH_MEMBERS' | translate">
          <ul class="mm-list">
            <li *ngFor="let member of visibleMembers; trackBy: trackById">
              <span class="mm-avatar" aria-hidden="true">
                <img *ngIf="avatar(member)" [src]="avatar(member)" alt="">
                <i *ngIf="!avatar(member)" class="bi bi-person"></i>
              </span>
              <span class="mm-copy">
                <span class="mm-name">{{ member.firstname }} {{ member.lastname }}</span>
                <span class="mm-meta" *ngIf="canManage">
                  <a *ngIf="member.phone" [href]="'tel:' + member.phone">{{ member.phone }}</a>
                  <ng-container *ngIf="member.occupation"> · {{ member.occupation }}</ng-container>
                  <ng-container *ngIf="member.company_name"> · {{ member.company_name }}</ng-container>
                </span>
              </span>
            </li>
            <li *ngIf="!visibleMembers.length" class="mm-empty">{{ 'MASJID_MEMBERS.EMPTY' | translate }}</li>
          </ul>
        </ng-container>
      </div>
    </section>
  `,
  styles: [`
    .mm-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
    .mm-total { color: #5f7470; font-weight: 400; }
    .mm-note { margin: 0 0 0.5rem; font-size: 0.8125rem; color: #5f7470; }
    .mm-segment { display: inline-flex; padding: 0.2rem; border-radius: 999px; background: rgba(17, 116, 99, 0.08); }
    .mm-segment button { min-height: 2.25rem; padding: 0.25rem 0.8rem; border: 0; border-radius: 999px; background: none; font-size: 0.8125rem; font-weight: 600; color: #17352f; }
    .mm-segment button.active { background: #117463; color: #fff; }
    .mm-pill { display: inline-flex; align-items: center; min-height: 2.25rem; padding: 0.25rem 0.9rem; border-radius: 999px; background: #117463; color: #fff; font-size: 0.8125rem; font-weight: 600; }
    .mm-list { list-style: none; margin: 0; padding: 0; }
    .mm-list li { display: flex; align-items: center; gap: 0.65rem; padding: 0.5rem 0; }
    .mm-list li + li { border-top: 1px solid #e9efec; }
    .mm-avatar { flex: 0 0 2.25rem; width: 2.25rem; height: 2.25rem; display: grid; place-items: center; overflow: hidden; border-radius: 50%; background: rgba(17, 116, 99, 0.1); color: #117463; }
    .mm-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .mm-copy { display: flex; flex-direction: column; min-width: 0; }
    .mm-name { font-weight: 600; overflow-wrap: anywhere; }
    .mm-meta { font-size: 0.8125rem; color: #5f7470; overflow-wrap: anywhere; }
    .mm-meta a { color: inherit; }
    .mm-empty { justify-content: center; color: #5f7470; padding: 1rem 0 !important; }
  `]
})
export class MasjidMembersComponent implements OnChanges {
  @Input() masjidId: string | number | null = null;
  /** Owner of the masjid (or super admin). */
  @Input() canManage = false;

  members: any[] = [];
  counts: { m: number; f: number } | null = null;
  /** The viewer's own gender: the only list shown on this screen. */
  viewerGender: 'm' | 'f' | null = null;
  query = '';
  loading = false;
  needsGender = false;
  imagePath = '';
  readonly searchId = `mm-search-${Math.random().toString(36).slice(2, 8)}`;

  constructor(private ramadanApi: RamadanApiService, private storage: LocalStorageService) {}

  /** Owner, super admin, or a signed-in user whose masjid is this one. */
  get visible(): boolean {
    if (!this.masjidId || !this.storage.hasNonEmptyItem('accessToken')) {
      return false;
    }
    if (this.canManage) {
      return true;
    }
    const user = this.storage.getItem<any>('userInfo');
    return String(user?.masjid ?? '') === String(this.masjidId) || Number(user?.roleId ?? user?.id_role) === 1;
  }

  ngOnChanges(): void {
    if (this.visible) {
      this.load();
    }
  }

  trackById = (_: number, member: any): number => Number(member.id);

  get visibleMembers(): any[] {
    const term = this.query.trim().toLowerCase();
    return term
      ? this.members.filter((m) => `${m.firstname} ${m.lastname} ${m.phone ?? ''} ${m.occupation ?? ''}`.toLowerCase().includes(term))
      : this.members;
  }

  avatar(member: any): string {
    return member?.image && member.image !== 'no-image.jpg' ? `${this.imagePath}${member.image}` : '';
  }

  load(): void {
    if (!this.masjidId) {
      return;
    }
    this.loading = true;
    this.needsGender = false;
    this.ramadanApi.masjidMembers(this.masjidId).subscribe({
      next: (response) => {
        this.loading = false;
        this.members = response?.list ?? [];
        this.counts = response?.counts ?? null;
        this.viewerGender = response?.viewer_gender === 'f' ? 'f' : response?.viewer_gender === 'm' ? 'm' : null;
        this.imagePath = response?.imagePath ?? response?.userImagePath ?? '';
        if (response?.can_manage === true) {
          this.canManage = true;
        }
      },
      error: (error) => {
        this.loading = false;
        this.members = [];
        this.needsGender = error?.error?.code === 'gender_required';
      }
    });
  }
}
