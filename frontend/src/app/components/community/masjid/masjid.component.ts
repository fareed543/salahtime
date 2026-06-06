import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

interface MasjidTimingRow {
  salah: string;
  azan: string;
  jamat: string;
}

interface MasjidCommitteeMember {
  name: string;
  role: string;
  phone?: string;
}

interface MasjidLocalDetails {
  email: string;
  contact: string;
  location: string;
  temperature: string;
  qrCodeUrl: string;
  qrApproved: boolean;
  qrApprovedBy: string;
  stayNearby: boolean;
  ladiesJamat: boolean;
  ladiesRamzanAccess: boolean;
  facilities: {
    wazuKhana: boolean;
    toilet: boolean;
    guslKhana: boolean;
    airConditioners: boolean;
    chairs: boolean;
  };
  committeeMembers: MasjidCommitteeMember[];
  timings: MasjidTimingRow[];
}

@Component({
  selector: 'app-masjid',
  template: `
<div class="row gx-3">
  <div class="col-12">
    <div class="page-hero card adminuiux-card shadow-sm border-0 mb-3">
      <div class="card-body d-flex justify-content-between align-items-start gap-3">
        <div class="hero-copy">
          <span class="badge text-bg-theme-1 mb-2">Masjid</span>
          <h4 class="mb-1">{{ detailMode ? (selectedMasjid?.name || selectedMasjid?.masjid_name || 'Masjid Details') : 'Masjid' }}</h4>
          <div *ngIf="detailMode && displayAddress" class="hero-address-chip">
            <i class="bi bi-geo-alt"></i>
            <span>{{ displayAddress }}</span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button *ngIf="!detailMode" class="btn btn-theme btn-sm" type="button" (click)="startCreate()">Add Masjid</button>
          <button *ngIf="detailMode" class="btn btn-outline-theme btn-sm" type="button" (click)="backToList()">Back</button>
        </div>
      </div>
    </div>
  </div>

  <div class="col-12" *ngIf="message">
    <div class="alert alert-success">{{ message }}</div>
  </div>

  <div class="col-12" *ngIf="loading">
    <div class="card adminuiux-card shadow-sm border-0">
      <div class="card-body text-secondary">Loading masjid list...</div>
    </div>
  </div>

  <ng-container *ngIf="!detailMode">
    <div class="col-12 col-lg-6" *ngFor="let masjid of masjids">
      <div class="card adminuiux-card shadow-sm border-0 mb-3 h-100">
        <div class="card-body">
          <div class="d-flex align-items-start gap-3">
            <span class="avatar avatar-50 rounded-circle bg-theme-1-subtle text-theme-1 d-inline-flex align-items-center justify-content-center">
              <i class="bi bi-building"></i>
            </span>
            <div class="flex-grow-1">
              <h6 class="mb-1">{{ masjid?.name || masjid?.masjid_name || 'Masjid' }}</h6>
              <p class="small text-secondary mb-1" *ngIf="masjid?.address">{{ masjid.address }}</p>
              <p class="small text-secondary mb-3" *ngIf="masjid?.pincode">Pincode: {{ masjid.pincode }}</p>
              <button class="btn btn-outline-theme btn-sm" type="button" (click)="openDetails(masjid)">View Details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ng-container>

  <ng-container *ngIf="detailMode && selectedMasjid">
    <div class="col-12">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h6 class="mb-0">Salah Timings</h6>
            <button *ngIf="editMode" class="btn btn-outline-theme btn-sm" type="button" (click)="addTimingRow()">Add Timing</button>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-4">
              <div class="masjid-stat-card compact">
                <span class="masjid-stat-label">Next Jamat</span>
                <div class="masjid-stat-value">{{ nextTiming?.salah || '--' }}</div>
                <div class="small text-secondary mt-1">{{ nextTiming?.jamat || nextTiming?.azan || '--' }}</div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="masjid-stat-card compact">
                <span class="masjid-stat-label">Countdown</span>
                <div class="masjid-stat-value">{{ nextCountdown }}</div>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <div class="masjid-stat-card compact">
                <span class="masjid-stat-label">Clock</span>
                <div class="masjid-stat-value">{{ currentClock }}</div>
                <div class="small text-secondary mt-1">{{ localDetails.temperature || '--' }}</div>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Salah</th>
                  <th>Azan Time</th>
                  <th>Jamat Salah</th>
                  <th *ngIf="editMode"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let timing of (editMode ? localDetails.timings : normalizedTimings); let i = index; trackBy: trackByIndex">
                  <td>
                    <span *ngIf="!editMode">{{ timing.salah }}</span>
                    <input *ngIf="editMode" class="form-control" [(ngModel)]="localDetails.timings[i].salah">
                  </td>
                  <td>
                    <span *ngIf="!editMode">{{ timing.azan || '-' }}</span>
                    <input *ngIf="editMode" class="form-control" [(ngModel)]="localDetails.timings[i].azan">
                  </td>
                  <td>
                    <span *ngIf="!editMode">{{ timing.jamat || '-' }}</span>
                    <input *ngIf="editMode" class="form-control" [(ngModel)]="localDetails.timings[i].jamat">
                  </td>
                  <td *ngIf="editMode" class="text-end">
                    <button class="btn btn-link text-danger p-0" type="button" (click)="removeTimingRow(i)">Remove</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12 col-xl-7">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div *ngIf="!editMode; else editMasjidTemplate">
            <div class="row g-3 detail-info-grid">
              <div class="col-12">
                <label class="small text-secondary d-block mb-1">Address</label>
                <div class="detail-strong">{{ displayAddress || '-' }}</div>
              </div>
              <div class="col-md-6">
                <label class="small text-secondary d-block mb-1">Contact</label>
                <div>{{ localDetails.contact || '-' }}</div>
              </div>
              <div class="col-md-6">
                <label class="small text-secondary d-block mb-1">Email</label>
                <div>{{ localDetails.email || '-' }}</div>
              </div>
              <div class="col-md-6">
                <label class="small text-secondary d-block mb-1">Temperature</label>
                <div>{{ localDetails.temperature || '-' }}</div>
              </div>
            </div>
          </div>

          <ng-template #editMasjidTemplate>
            <h6 class="mb-3">Edit Masjid</h6>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Masjid Name</label>
                <input class="form-control" [(ngModel)]="selectedMasjid.name">
              </div>
              <div class="col-md-6">
                <label class="form-label">Location</label>
                <input class="form-control" [(ngModel)]="localDetails.location">
              </div>
              <div class="col-md-6">
                <label class="form-label">City</label>
                <input class="form-control" [(ngModel)]="selectedMasjid.city">
              </div>
              <div class="col-md-6">
                <label class="form-label">State</label>
                <input class="form-control" [(ngModel)]="selectedMasjid.state">
              </div>
              <div class="col-md-6">
                <label class="form-label">Pincode</label>
                <input class="form-control" [(ngModel)]="selectedMasjid.pincode">
              </div>
              <div class="col-md-6">
                <label class="form-label">Country</label>
                <input class="form-control" [(ngModel)]="selectedMasjid.country">
              </div>
              <div class="col-md-6">
                <label class="form-label">Contact</label>
                <input class="form-control" [(ngModel)]="localDetails.contact">
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input class="form-control" [(ngModel)]="localDetails.email">
              </div>
              <div class="col-md-6">
                <label class="form-label">Temperature</label>
                <input class="form-control" [(ngModel)]="localDetails.temperature" placeholder="28 C">
              </div>
              <div class="col-md-6">
                <label class="form-label">QR Code URL</label>
                <input class="form-control" [(ngModel)]="localDetails.qrCodeUrl">
              </div>
              <div class="col-md-6">
                <label class="form-label">Approved By Committee</label>
                <input class="form-control" [(ngModel)]="localDetails.qrApprovedBy">
              </div>
              <div class="col-md-6 d-flex align-items-end">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="qrApproved" [(ngModel)]="localDetails.qrApproved">
                  <label class="form-check-label" for="qrApproved">QR Approved</label>
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-theme" type="button" (click)="saveMasjid()">Save</button>
              <button class="btn btn-outline-secondary" type="button" (click)="editMode = false">Cancel</button>
            </div>
          </ng-template>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h6 class="mb-0">Committee Members</h6>
            <button *ngIf="editMode" class="btn btn-outline-theme btn-sm" type="button" (click)="addCommitteeMember()">Add Member</button>
          </div>

          <div class="row g-3">
            <div class="col-12" *ngFor="let member of localDetails.committeeMembers; let i = index; trackBy: trackByIndex">
              <div class="rounded-3 border p-3">
                <div *ngIf="!editMode">
                  <div class="fw-semibold">{{ member.name }}</div>
                  <div class="small text-secondary">{{ member.role }}</div>
                  <div class="small text-secondary" *ngIf="member.phone">{{ member.phone }}</div>
                </div>
                <div class="row g-2" *ngIf="editMode">
                  <div class="col-md-4">
                    <input class="form-control" placeholder="Name" [(ngModel)]="member.name">
                  </div>
                  <div class="col-md-4">
                    <input class="form-control" placeholder="Role" [(ngModel)]="member.role">
                  </div>
                  <div class="col-md-3">
                    <input class="form-control" placeholder="Phone" [(ngModel)]="member.phone">
                  </div>
                  <div class="col-md-1 d-flex align-items-center">
                    <button class="btn btn-link text-danger p-0" type="button" (click)="removeCommitteeMember(i)">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12 col-xl-5">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <h6 class="mb-3">Facilities</h6>
          <div class="d-grid gap-2 detail-checklist">
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.facilities.wazuKhana" [disabled]="!editMode">
              <span>Wazu Khana</span>
            </label>
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.facilities.toilet" [disabled]="!editMode">
              <span>Toilet</span>
            </label>
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.facilities.guslKhana" [disabled]="!editMode">
              <span>Gusl Khana</span>
            </label>
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.facilities.airConditioners" [disabled]="!editMode">
              <span>Air Conditioners</span>
            </label>
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.facilities.chairs" [disabled]="!editMode">
              <span>Chairs</span>
            </label>
          </div>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <h6 class="mb-3">Access & Stay</h6>
          <div class="d-grid gap-2 detail-checklist">
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.stayNearby" [disabled]="!editMode">
              <span>Stay options nearby</span>
            </label>
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.ladiesJamat" [disabled]="!editMode">
              <span>Ladies jamat available</span>
            </label>
            <label class="facility-row">
              <input type="checkbox" [(ngModel)]="localDetails.ladiesRamzanAccess" [disabled]="!editMode">
              <span>Ramzan Isha & Taraweel for ladies</span>
            </label>
          </div>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <h6 class="mb-3">Donation QR</h6>
          <div class="small text-secondary mb-2">Committee approval required before accepting payments.</div>
          <div class="rounded-3 border p-3">
            <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
              <span>Approval</span>
              <span class="badge" [ngClass]="localDetails.qrApproved ? 'text-bg-success' : 'text-bg-warning'">
                {{ localDetails.qrApproved ? 'Approved' : 'Pending' }}
              </span>
            </div>
            <div class="small text-secondary mb-1">Approved By: {{ localDetails.qrApprovedBy || '-' }}</div>
            <div class="small text-secondary text-break">QR URL: {{ localDetails.qrCodeUrl || '-' }}</div>
          </div>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="isOwner">
        <div class="card-body">
          <h6 class="mb-3">Owner Actions</h6>
          <div class="d-grid gap-2">
            <button class="btn btn-outline-theme" type="button" (click)="enableEdit()">Edit</button>
            <button class="btn btn-outline-danger" type="button" (click)="deleteMasjid()">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </ng-container>
</div>
  `,
  styleUrls: ['./masjid.component.scss']
})
export class MasjidComponent implements OnInit, OnDestroy {
  masjids: any[] = [];
  loading = false;
  detailMode = false;
  createMode = false;
  selectedMasjid: any = null;
  localDetails: MasjidLocalDetails = this.createDefaultDetails();
  editMode = false;
  message = '';
  currentTime = new Date();

  private clockTimer?: ReturnType<typeof setInterval>;

  constructor(
    private ramadanService: RamadanApiService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.clockTimer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    this.route.paramMap.subscribe((params) => {
      const masjidId = params.get('id');
      this.createMode = this.router.url.includes('/masjid/new');
      this.detailMode = !!masjidId || this.createMode;
      this.loadMasjids(masjidId);
    });
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  get isOwner(): boolean {
    if (this.createMode) {
      return true;
    }

    if (!this.selectedMasjid) {
      return false;
    }

    if (this.selectedMasjid.canEdit != null) {
      return !!this.selectedMasjid.canEdit;
    }

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const currentUserId = String(userInfo?.id ?? userInfo?.user_id ?? userInfo?.id_user ?? '');
    const ownerId = String(this.selectedMasjid?.created_by ?? this.selectedMasjid?.id_customer ?? '');

    return !!currentUserId && !!ownerId && currentUserId === ownerId;
  }

  get currentClock(): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(this.currentTime);
  }

  get normalizedTimings(): MasjidTimingRow[] {
    return (this.localDetails.timings ?? [])
      .map((timing) => ({
        salah: timing?.salah ?? '',
        azan: timing?.azan ?? (timing as any)?.azan_time ?? '',
        jamat: timing?.jamat ?? (timing as any)?.jamat_time ?? ''
      }))
      .filter((timing) => !!timing.salah);
  }

  get nextTiming(): MasjidTimingRow | null {
    if (!this.normalizedTimings.length) {
      return null;
    }

    const upcoming = this.normalizedTimings
      .map((timing) => ({
        timing,
        target: this.parseTodayTime(timing.jamat || timing.azan)
      }))
      .filter((entry) => !!entry.target)
      .sort((first, second) => first.target!.getTime() - second.target!.getTime())
      .find((entry) => entry.target!.getTime() >= this.currentTime.getTime());

    return upcoming?.timing ?? this.normalizedTimings[0] ?? null;
  }

  get nextCountdown(): string {
    const next = this.nextTiming;
    if (!next) {
      return '--:--:--';
    }

    let target = this.parseTodayTime(next.jamat || next.azan);
    if (!target) {
      return '--:--:--';
    }

    if (target.getTime() < this.currentTime.getTime()) {
      target = new Date(target);
      target.setDate(target.getDate() + 1);
    }

    const remaining = Math.max(target.getTime() - this.currentTime.getTime(), 0);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  get displayAddress(): string {
    const parts = [
      this.localDetails.location || this.selectedMasjid?.address || '',
      this.selectedMasjid?.area || '',
      this.selectedMasjid?.city || '',
      this.selectedMasjid?.state || '',
      this.selectedMasjid?.pincode || '',
      this.selectedMasjid?.country || ''
    ]
      .map((value) => String(value).trim())
      .filter((value, index, array) => !!value && array.indexOf(value) === index);

    return parts.join(', ');
  }

  loadMasjids(masjidId?: string | null): void {
    this.loading = true;
    this.message = '';

    this.ramadanService.masjidList().subscribe({
      next: (response) => {
        this.masjids = Array.isArray(response) ? response : response?.list ?? [];
        this.loading = false;

        if (this.createMode) {
          this.selectedMasjid = this.createNewMasjid();
          this.localDetails = this.createDefaultDetails();
          this.editMode = true;
          return;
        }

        if (masjidId) {
          this.loadMasjidDetails(masjidId);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDetails(masjid: any): void {
    const id = this.getMasjidId(masjid);
    if (id) {
      this.router.navigate(['/masjid', id]);
    }
  }

  backToList(): void {
    this.router.navigate(['/masjid']);
  }

  startCreate(): void {
    this.router.navigate(['/masjid/new']);
  }

  enableEdit(): void {
    this.editMode = true;
  }

  saveMasjid(): void {
    if (!this.selectedMasjid) {
      return;
    }

    const payload = {
      id: this.createMode ? null : this.selectedMasjid.id,
      name: this.selectedMasjid.name,
      address: this.localDetails.location || this.selectedMasjid.address,
      area: this.selectedMasjid.area,
      city: this.selectedMasjid.city,
      state: this.selectedMasjid.state,
      pincode: this.selectedMasjid.pincode,
      country: this.selectedMasjid.country,
      status: this.selectedMasjid.status ?? 1,
      email: this.localDetails.email,
      contact: this.localDetails.contact,
      location: this.localDetails.location,
      temperature: this.localDetails.temperature,
      qrCodeUrl: this.localDetails.qrCodeUrl,
      qrApproved: this.localDetails.qrApproved,
      qrApprovedBy: this.localDetails.qrApprovedBy,
      stayNearby: this.localDetails.stayNearby,
      ladiesJamat: this.localDetails.ladiesJamat,
      ladiesRamzanAccess: this.localDetails.ladiesRamzanAccess,
      facilities: this.localDetails.facilities,
      committeeMembers: this.localDetails.committeeMembers,
      timings: this.normalizedTimings
    };

    this.loading = true;
    this.ramadanService.saveMasjid(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.selectedMasjid = response;
        this.localDetails = this.mapApiToLocalDetails(response);
        this.editMode = false;
        this.createMode = false;
        this.message = 'Masjid details updated.';
        this.router.navigate(['/masjid', response.id]);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  deleteMasjid(): void {
    if (!this.selectedMasjid?.id) {
      return;
    }

    this.loading = true;
    this.ramadanService.deleteMasjid(this.selectedMasjid.id).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Masjid deleted successfully.';
        this.router.navigate(['/masjid']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  addCommitteeMember(): void {
    this.localDetails.committeeMembers.push({ name: '', role: '', phone: '' });
  }

  removeCommitteeMember(index: number): void {
    this.localDetails.committeeMembers.splice(index, 1);
  }

  addTimingRow(): void {
    this.localDetails.timings.push({ salah: '', azan: '', jamat: '' });
  }

  removeTimingRow(index: number): void {
    this.localDetails.timings.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private mapApiToLocalDetails(masjid: any): MasjidLocalDetails {
    return {
      email: masjid?.email ?? '',
      contact: masjid?.contact ?? '',
      location: masjid?.location ?? masjid?.address ?? '',
      temperature: masjid?.temperature ?? '28 C',
      qrCodeUrl: masjid?.qrCodeUrl ?? '',
      qrApproved: !!masjid?.qrApproved,
      qrApprovedBy: masjid?.qrApprovedBy ?? '',
      stayNearby: !!masjid?.stayNearby,
      ladiesJamat: !!masjid?.ladiesJamat,
      ladiesRamzanAccess: !!masjid?.ladiesRamzanAccess,
      facilities: {
        wazuKhana: !!masjid?.facilities?.wazuKhana,
        toilet: !!masjid?.facilities?.toilet,
        guslKhana: !!masjid?.facilities?.guslKhana,
        airConditioners: !!masjid?.facilities?.airConditioners,
        chairs: !!masjid?.facilities?.chairs
      },
      committeeMembers: masjid?.committeeMembers ?? [],
      timings: (masjid?.timings ?? []).map((timing: any) => ({
        salah: timing?.salah ?? '',
        azan: timing?.azan ?? timing?.azan_time ?? '',
        jamat: timing?.jamat ?? timing?.jamat_time ?? ''
      }))
    };
  }

  private createDefaultDetails(): MasjidLocalDetails {
    return {
      email: '',
      contact: '',
      location: '',
      temperature: '28 C',
      qrCodeUrl: '',
      qrApproved: false,
      qrApprovedBy: '',
      stayNearby: false,
      ladiesJamat: false,
      ladiesRamzanAccess: false,
      facilities: {
        wazuKhana: false,
        toilet: false,
        guslKhana: false,
        airConditioners: false,
        chairs: false
      },
      committeeMembers: [],
      timings: [
        { salah: 'Fajr', azan: '', jamat: '' },
        { salah: 'Dhuhr', azan: '', jamat: '' },
        { salah: 'Asr', azan: '', jamat: '' },
        { salah: 'Maghrib', azan: '', jamat: '' },
        { salah: 'Isha', azan: '', jamat: '' },
        { salah: 'Juma', azan: '', jamat: '' }
      ]
    };
  }

  private createNewMasjid(): any {
    return {
      id: null,
      name: '',
      address: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
      status: 1
    };
  }

  private loadMasjidDetails(masjidId: string): void {
    this.loading = true;
    this.ramadanService.masjidDetails(masjidId).subscribe({
      next: (response) => {
        this.loading = false;
        this.selectedMasjid = response;
        this.localDetails = this.mapApiToLocalDetails(response);
      },
      error: () => {
        this.loading = false;
        this.selectedMasjid = null;
      }
    });
  }

  private getMasjidId(masjid: any): string {
    return String(masjid?.id ?? masjid?.id_masjid ?? '');
  }

  private parseTodayTime(value: string): Date | null {
    const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const date = new Date(this.currentTime);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
