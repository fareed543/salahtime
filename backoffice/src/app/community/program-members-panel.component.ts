import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subject, Subscription, debounceTime, finalize } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { CommunityService, ProgramMember, ProgramMembersResponse } from './community.service';

type RoleFilter = '' | 'volunteers' | 'subscribers' | 'waitlist';

/**
 * CR-024 (PRG-R24): back-office members of one program — search by name or mobile, add a subscriber
 * by mobile (new people get name + gender), make volunteer / subscriber, remove.
 */
@Component({
  selector: 'app-program-members-panel',
  template: `
    <div class="card">
      <div class="card-header d-flex flex-wrap align-items-center gap-2">
        <h5 class="mb-0 me-auto">Members</h5>
        <span class="text-muted small" *ngIf="data">
          {{ data.counts.total }} total · {{ data.counts.volunteers }} volunteers · {{ data.counts.subscribers }} subscribers
          <ng-container *ngIf="data.counts.waitlisted"> · {{ data.counts.waitlisted }} waitlisted</ng-container>
          <ng-container *ngIf="data.seatsLeft !== null"> · {{ data.seatsLeft }} seats left</ng-container>
        </span>
        <button type="button" class="btn btn-sm btn-primary" (click)="toggleAdd()" [disabled]="ended">
          <i class="bx bx-user-plus me-1"></i>Add subscriber
        </button>
      </div>

      <div class="card-body border-bottom" *ngIf="addOpen">
        <div class="row g-2 align-items-end">
          <div class="col-sm-4">
            <label class="form-label" for="pmPhone">Mobile number</label>
            <input id="pmPhone" class="form-control" type="tel" inputmode="numeric" maxlength="14" [(ngModel)]="add.phone" placeholder="10-digit mobile">
          </div>
          <ng-container *ngIf="needsName">
            <div class="col-sm-3">
              <label class="form-label" for="pmFirst">First name</label>
              <input id="pmFirst" class="form-control" [(ngModel)]="add.firstname">
            </div>
            <div class="col-sm-3">
              <label class="form-label" for="pmLast">Last name</label>
              <input id="pmLast" class="form-control" [(ngModel)]="add.lastname">
            </div>
            <div class="col-sm-2">
              <label class="form-label" for="pmGender">Gender</label>
              <select id="pmGender" class="form-select" [(ngModel)]="add.gender">
                <option value="">Select</option>
                <option value="m">Brother</option>
                <option value="f">Sister</option>
              </select>
            </div>
          </ng-container>
          <div class="col-12 d-flex flex-wrap align-items-center gap-3">
            <div class="form-check mb-0" *ngIf="full">
              <input id="pmForce" class="form-check-input" type="checkbox" [(ngModel)]="add.force">
              <label class="form-check-label" for="pmForce">Program is full — add even if full</label>
            </div>
            <span class="text-muted small" *ngIf="needsName">Not on the app yet: enter the name and gender to create the account.</span>
            <button type="button" class="btn btn-sm btn-primary ms-auto" (click)="submitAdd()" [disabled]="adding">{{ adding ? 'Adding...' : 'Add' }}</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="toggleAdd()">Cancel</button>
          </div>
        </div>
      </div>

      <div class="card-body pb-2">
        <div class="row g-2">
          <div class="col-md-6">
            <input class="form-control" type="search" placeholder="Search name or mobile" aria-label="Search members"
              [(ngModel)]="search" (ngModelChange)="searchChanged.next()">
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select" aria-label="Role" [(ngModel)]="role" (ngModelChange)="load()">
              <option value="">All roles</option>
              <option value="volunteers">Volunteers</option>
              <option value="subscribers">Subscribers</option>
              <option value="waitlist">Waitlist</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select" aria-label="Gender" [(ngModel)]="gender" (ngModelChange)="load()">
              <option value="">Brothers &amp; sisters</option>
              <option value="m">Brothers</option>
              <option value="f">Sisters</option>
            </select>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0 pm-table">
          <thead>
            <tr><th>Name</th><th>Mobile</th><th>Gender</th><th>Role</th><th class="text-end">Actions</th></tr>
          </thead>
          <tbody>
            <tr *ngIf="loading"><td colspan="5" class="text-muted">Loading members...</td></tr>
            <tr *ngIf="!loading && !data?.items?.length"><td colspan="5" class="text-muted">No members found.</td></tr>
            <tr *ngFor="let member of data?.items; trackBy: trackById">
              <td class="fw-semibold text-truncate" style="max-width: 14rem" [title]="member.name">{{ member.name || '-' }}</td>
              <td><a *ngIf="member.phone" [href]="'tel:' + member.phone">{{ member.phone }}</a></td>
              <td>{{ member.gender === 'f' ? 'Sister' : member.gender === 'm' ? 'Brother' : '-' }}</td>
              <td>
                <span class="badge" [ngClass]="roleClass(member)">{{ roleLabel(member) }}</span>
              </td>
              <td class="text-end text-nowrap">
                <ng-container *ngIf="member.role !== 1 && !ended">
                  <button *ngIf="member.role === 3" type="button" class="btn btn-sm btn-outline-primary me-1" [disabled]="busyId === member.id" (click)="setRole(member, 2)">Make volunteer</button>
                  <button *ngIf="member.role === 2" type="button" class="btn btn-sm btn-outline-secondary me-1" [disabled]="busyId === member.id" (click)="setRole(member, 3)">Make subscriber</button>
                  <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="busyId === member.id" (click)="setRole(member, 0)" [attr.aria-label]="'Remove ' + member.name">
                    <i class="bx bx-trash"></i>
                  </button>
                </ng-container>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    /* Phones: each member is a stacked row (name; mobile · gender · role; actions) instead of a wide table. */
    @media (max-width: 767.98px) {
      .pm-table thead { display: none; }
      .pm-table tr { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 0.75rem; padding: 0.6rem 1rem; border-bottom: 1px solid var(--bs-border-color, #e4e6e8); }
      .pm-table td { border: 0; padding: 0; }
      .pm-table td:first-child { flex: 1 1 100%; max-width: none !important; }
      .pm-table td:last-child { margin-inline-start: auto; }
      .pm-table td[colspan] { flex: 1 1 100%; }
    }
  `]
})
export class ProgramMembersPanelComponent implements OnChanges, OnDestroy {
  @Input() programId = 0;
  @Input() ended = false;

  data: ProgramMembersResponse | null = null;
  loading = false;
  search = '';
  role: RoleFilter = '';
  gender = '';
  busyId: number | null = null;

  addOpen = false;
  adding = false;
  needsName = false;
  full = false;
  add = { phone: '', firstname: '', lastname: '', gender: '', force: false };

  readonly searchChanged = new Subject<void>();
  private readonly subscription: Subscription;

  constructor(private readonly community: CommunityService, private readonly toast: ToastService) {
    this.subscription = this.searchChanged.pipe(debounceTime(300)).subscribe(() => this.load());
  }

  ngOnChanges(): void {
    if (this.programId) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  trackById = (_: number, member: ProgramMember): number => member.id;

  load(): void {
    this.loading = true;
    this.community.programMembers(this.programId, { search: this.search.trim(), role: this.role, gender: this.gender })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => this.data = response,
        error: (error) => this.toast.error(error, 'Unable to load the members.')
      });
  }

  roleLabel(member: ProgramMember): string {
    if (member.role === 1) return 'Admin';
    if (member.role === 2) return 'Volunteer';
    return member.status === 'waitlisted' ? 'Waitlisted' : 'Subscriber';
  }

  roleClass(member: ProgramMember): string {
    if (member.role === 1) return 'bg-label-primary';
    if (member.role === 2) return 'bg-label-info';
    return member.status === 'waitlisted' ? 'bg-label-warning' : 'bg-label-success';
  }

  toggleAdd(): void {
    this.addOpen = !this.addOpen;
    this.needsName = false;
    this.full = false;
    this.add = { phone: '', firstname: '', lastname: '', gender: '', force: false };
  }

  submitAdd(): void {
    if (this.adding) {
      return;
    }
    this.adding = true;
    const payload = this.needsName ? { ...this.add } : { phone: this.add.phone, force: this.add.force };
    this.community.addProgramMember(this.programId, payload)
      .pipe(finalize(() => this.adding = false))
      .subscribe({
        next: (response) => {
          this.toast.success(response.message || 'Subscriber added.');
          this.toggleAdd();
          this.load();
        },
        error: (error) => {
          const body = error?.error ?? {};
          if (['firstname', 'lastname', 'gender'].includes(body.key) && !this.needsName) {
            // Mobile not on the app yet: ask for name + gender, then add again.
            this.needsName = true;
            this.toast.info('This mobile is not on the app yet. Enter the name and gender.');
            return;
          }
          if (body.code === 'program_full') {
            this.full = true;
          }
          this.toast.error(error, 'Unable to add the subscriber.');
        }
      });
  }

  setRole(member: ProgramMember, role: 0 | 2 | 3): void {
    const question = role === 0 ? `Remove ${member.name} from this program?`
      : role === 2 ? `Make ${member.name} a volunteer?` : `Make ${member.name} a subscriber?`;
    if (!window.confirm(question)) {
      return;
    }
    this.busyId = member.id;
    this.community.setProgramMemberRole(this.programId, member.id, role)
      .pipe(finalize(() => this.busyId = null))
      .subscribe({
        next: (response) => {
          this.toast.success(response.message || 'Member updated.');
          this.load();
        },
        error: (error) => this.toast.error(error, 'Unable to update the member.')
      });
  }
}
