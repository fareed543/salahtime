import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';

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
  <div class="col-12" *ngIf="!(detailMode && fullScreenMode)">
    <app-screen-header
      [title]="headerTitle"
      [subtitle]="headerSubtitle"
      [actions]="headerActions"
      [actionGroupLabel]="detailMode ? ('MASJID_PAGE.ACTIONS' | translate) : ('MASJID_PAGE.LIST_ACTIONS' | translate)"
      (actionSelected)="onHeaderAction($event)"></app-screen-header>
  </div>

  <div class="col-12" *ngIf="message">
    <div class="alert alert-success">{{ message }}</div>
  </div>

  <div class="col-12" *ngIf="loading">
    <div class="card adminuiux-card shadow-sm border-0">
      <div class="card-body text-secondary">{{ 'MASJID_PAGE.LOADING' | translate }}</div>
    </div>
  </div>

  <div class="col-12" *ngIf="!loading && !detailMode && masjids.length === 0">
    <div class="card adminuiux-card shadow-sm border-0 community-empty-card mb-3">
      <div class="card-body text-center py-5">
        <span class="community-empty-icon">
          <i class="bi bi-building-x"></i>
        </span>
        <h2 class="h5 mt-3 mb-2">{{ 'MASJID_PAGE.EMPTY_TITLE' | translate }}</h2>
        <p class="text-secondary mb-0">{{ 'MASJID_PAGE.EMPTY_TEXT' | translate }}</p>
      </div>
    </div>
  </div>

  <ng-container *ngIf="!detailMode">
    <div class="col-12 mb-3" *ngIf="isLoggedIn">
      <div class="masjid-tabs" role="tablist" [attr.aria-label]="'MASJID_PAGE.LISTS' | translate">
        <button type="button" role="tab" class="masjid-tab" [class.active]="activeTab === 'all'" [attr.aria-selected]="activeTab === 'all'" aria-controls="masjid-list-panel" (click)="setActiveTab('all')">{{ 'MASJID_PAGE.TITLE' | translate }}</button>
        <button type="button" role="tab" class="masjid-tab" [class.active]="activeTab === 'favorites'" [attr.aria-selected]="activeTab === 'favorites'" aria-controls="masjid-list-panel" (click)="setActiveTab('favorites')">{{ 'MASJID_PAGE.FAVORITES' | translate }}</button>
      </div>
    </div>

    <div class="col-12" *ngIf="!loading && filteredMasjids.length === 0">
      <div class="card adminuiux-card shadow-sm border-0 community-empty-card mb-3">
        <div class="card-body text-center py-5">
          <span class="community-empty-icon">
            <i class="bi" [ngClass]="activeTab === 'favorites' ? 'bi-heartbreak' : 'bi-building-x'"></i>
          </span>
          <h2 class="h5 mt-3 mb-2">{{ activeTab === 'favorites' ? ('MASJID_PAGE.EMPTY_FAVORITES' | translate) : ('MASJID_PAGE.EMPTY_TITLE' | translate) }}</h2>
          <p class="text-secondary mb-0" *ngIf="activeTab === 'favorites'">{{ 'MASJID_PAGE.EMPTY_FAVORITES_TEXT' | translate }}</p>
          <p class="text-secondary mb-0" *ngIf="activeTab !== 'favorites'">{{ 'MASJID_PAGE.EMPTY_TEXT' | translate }}</p>
        </div>
      </div>
    </div>

    <div *ngFor="let masjid of filteredMasjids" class="col-12 col-md-6 mb-3">
        <div
          class="card adminuiux-card shadow-sm overflow-hidden mb-3 community-list-card cursor-pointer"
          role="button"
          tabindex="0"
          (click)="openDetails(masjid)"
          (keydown.enter)="openDetails(masjid)"
          (keydown.space)="openDetails(masjid); $event.preventDefault()">
          <div class="card-body">
            <div class="d-flex h-100 flex-column gap-3">
              <div class="d-flex align-items-start justify-content-between gap-3">
                <div class="flex-grow-1 min-w-0">
                  <h2 class="h6 mb-1 masjid-list-title">{{ masjid?.name || masjid?.masjid_name || ('MASJID_PAGE.TITLE' | translate) }}</h2>
                  <p class="small text-secondary mb-0">{{ getListLocation(masjid) || masjid?.address || ('MASJID_PAGE.DETAILS' | translate) }}</p>
                </div>
                <div class="d-flex align-items-start gap-1">
                  <button *ngIf="isLoggedIn" type="button" class="btn btn-sm btn-square btn-link rounded favorite-action" [class.is-favorite]="isFavoriteMasjid(masjid)" [attr.aria-label]="isFavoriteMasjid(masjid) ? ('MASJID_PAGE.REMOVE_FAVORITE' | translate) : ('MASJID_PAGE.ADD_FAVORITE' | translate)" (click)="$event.stopPropagation(); toggleFavoriteMasjid(masjid)">
                    <i class="bi" [ngClass]="isFavoriteMasjid(masjid) ? 'bi-heart-fill' : 'bi-heart'"></i>
                  </button>
                  <button *ngIf="canEditMasjid(masjid)" type="button" class="btn btn-sm btn-square btn-link rounded text-theme-1" [attr.aria-label]="'MASJID_PAGE.EDIT_MASJID' | translate" (click)="$event.stopPropagation(); openMasjidEditor(masjid)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button *ngIf="canDeleteMasjid(masjid)" type="button" class="btn btn-sm btn-square btn-link rounded text-danger" [attr.aria-label]="'MASJID_PAGE.DELETE_MASJID' | translate" (click)="$event.stopPropagation(); deleteMasjidRecord(masjid)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <div class="masjid-prayer-table">
                <div class="masjid-prayer-grid">
                  <div class="masjid-prayer-item" *ngFor="let timing of getListTimingRows(masjid)">
                    <div class="masjid-prayer-name">{{ timing.label }}</div>
                    <div class="masjid-prayer-meta">
                      <span>{{ 'MASJID_PAGE.AZAN' | translate }}</span>
                      <strong>{{ timing.azan || '--' }}</strong>
                    </div>
                    <div class="masjid-prayer-meta">
                      <span>{{ 'MASJID_PAGE.JAMAT' | translate }}</span>
                      <strong>{{ timing.jamat || '--' }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <div class="col-12 col-md-6 mb-3">
      <button type="button" class="card adminuiux-card overflow-hidden bg-theme-1-subtle h-100 style-none border-0 w-100 masjid-add-card" (click)="startCreate()">
        <div class="card-body">
          <div class="row gx-3 h-100 justify-content-center align-items-center">
            <div class="col-auto">
              <div class="text-center">
                <span class="avatar avatar-80 bg-theme-1-subtle text-theme-1 rounded-circle border border-theme-1 mb-3">
                  <i class="bi bi-building-add fs-1"></i>
                </span>
                <div class="style-none">
                  <p class="text-truncated mb-0">+ {{ 'MASJID_PAGE.TITLE' | translate }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  </ng-container>

  <ng-container *ngIf="detailMode && selectedMasjid">
    <div class="col-12" *ngIf="fullScreenMode">
      <div class="card adminuiux-card shadow-sm border-0 mb-3 masjid-fullscreen-hero">
        <div class="card-body">
          <span class="masjid-name-label">{{ 'MASJID_PAGE.SCREEN' | translate }}</span>
          <h1 class="masjid-fullscreen-title mb-2">{{ selectedMasjid?.name || selectedMasjid?.masjid_name || ('MASJID_PAGE.DETAILS' | translate) }}</h1>
          <p class="text-secondary mb-0">{{ displayAddress || '-' }}</p>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h2 class="h6 mb-0">{{ 'MASJID_PAGE.SALAH_TIMING' | translate }}</h2>
            <button *ngIf="editMode" class="btn btn-outline-theme btn-sm" type="button" (click)="addTimingRow()">{{ 'MASJID_PAGE.ADD_TIMING' | translate }}</button>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-4 col-md-4">
              <div class="masjid-stat-card compact">
                <span class="masjid-stat-label">{{ 'MASJID_PAGE.NEXT_JAMAT' | translate }}</span>
                <div class="masjid-stat-value">{{ nextTiming?.salah || '--' }}</div>
                <div class="small text-secondary mt-1">{{ nextTiming?.jamat || nextTiming?.azan || '--' }}</div>
              </div>
            </div>
            <div class="col-4 col-md-4">
              <div class="masjid-stat-card compact">
                <span class="masjid-stat-label">{{ 'COUNTDOWN' | translate }}</span>
                <div class="masjid-stat-value">{{ nextCountdown }}</div>
              </div>
            </div>
            <div class="col-4 col-md-4">
              <div class="masjid-stat-card compact">
                <span class="masjid-stat-label">{{ 'MASJID_PAGE.CLOCK' | translate }}</span>
                <div class="masjid-stat-value">{{ currentClock }}</div>
                <div class="small text-secondary mt-1">{{ localDetails.temperature || '--' }}</div>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ 'NAV.SALAH' | translate }}</th>
                  <th>{{ 'MASJID_PAGE.AZAN' | translate }}</th>
                  <th>{{ 'MASJID_PAGE.JAMAT' | translate }}</th>
                  <th *ngIf="editMode"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let timing of (editMode ? localDetails.timings : detailTimings); let i = index; trackBy: trackByIndex">
                  <td>
                    <span *ngIf="!editMode">{{ timing.salah }}</span>
                    <input *ngIf="editMode" class="form-control" [attr.aria-label]="'Salah name for row ' + (i + 1)" [(ngModel)]="localDetails.timings[i].salah">
                  </td>
                  <td>
                    <span *ngIf="!editMode">{{ timing.azan || '-' }}</span>
                    <input *ngIf="editMode" class="form-control" [attr.aria-label]="'Azan time for ' + (timing.salah || ('row ' + (i + 1)))" [(ngModel)]="localDetails.timings[i].azan">
                  </td>
                  <td>
                    <span *ngIf="!editMode">{{ timing.jamat || '-' }}</span>
                    <input *ngIf="editMode" class="form-control" [attr.aria-label]="'Jamat time for ' + (timing.salah || ('row ' + (i + 1)))" [(ngModel)]="localDetails.timings[i].jamat">
                  </td>
                  <td *ngIf="editMode" class="text-end">
                    <button class="btn btn-link text-danger p-0 masjid-icon-action" type="button" [attr.aria-label]="'MASJID_PAGE.REMOVE_TIMING' | translate" (click)="removeTimingRow(i)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div [class]="detailColumnClass">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div *ngIf="!editMode; else editMasjidTemplate">
            <div class="row g-3 detail-info-grid">
              <div class="col-12">
                <div class="masjid-name-highlight" *ngIf="!fullScreenMode">
                  <span class="masjid-name-label">{{ 'MASJID_PAGE.TITLE' | translate }}</span>
                  <h2 class="masjid-name-value mb-0">{{ selectedMasjid?.name || selectedMasjid?.masjid_name || ('MASJID_PAGE.DETAILS' | translate) }}</h2>
                </div>
              </div>
              <div class="col-12">
                <div class="masjid-address-card">
                  <span class="masjid-address-icon">
                    <i class="bi bi-geo-alt-fill"></i>
                  </span>
                  <div class="masjid-address-copy">
                    <label class="small text-secondary d-block mb-1">{{ 'MASJID_PAGE.ADDRESS' | translate }}</label>
                    <div class="detail-strong">{{ displayAddress || '-' }}</div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <label class="small text-secondary d-block mb-1">{{ 'MASJID_PAGE.TEMPERATURE' | translate }}</label>
                <div>{{ localDetails.temperature || '-' }}</div>
              </div>
            </div>
          </div>

          <ng-template #editMasjidTemplate>
            <h2 class="h6 mb-3">{{ 'MASJID_PAGE.EDIT_MASJID' | translate }}</h2>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Masjid Name</label>
                <input class="form-control" aria-label="Masjid Name" [(ngModel)]="selectedMasjid.name">
              </div>
              <div class="col-md-6">
                <label class="form-label">Location</label>
                <input class="form-control" aria-label="Location" [(ngModel)]="localDetails.location">
              </div>
              <div class="col-md-6">
                <label class="form-label">City</label>
                <input class="form-control" aria-label="City" [(ngModel)]="selectedMasjid.city">
              </div>
              <div class="col-md-6">
                <label class="form-label">State</label>
                <input class="form-control" aria-label="State" [(ngModel)]="selectedMasjid.state">
              </div>
              <div class="col-md-6">
                <label class="form-label">Pincode</label>
                <input class="form-control" aria-label="Pincode" [(ngModel)]="selectedMasjid.pincode">
              </div>
              <div class="col-md-6">
                <label class="form-label">Country</label>
                <input class="form-control" aria-label="Country" [(ngModel)]="selectedMasjid.country">
              </div>
              <div class="col-md-6">
                <label class="form-label">Contact</label>
                <input class="form-control" aria-label="Contact" [(ngModel)]="localDetails.contact">
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input class="form-control" aria-label="Email" [(ngModel)]="localDetails.email">
              </div>
              <div class="col-md-6">
                <label class="form-label">Temperature</label>
                <input class="form-control" aria-label="Temperature" [(ngModel)]="localDetails.temperature" placeholder="28 C">
              </div>
              <div class="col-md-6">
                <label class="form-label">QR Code URL</label>
                <input class="form-control" aria-label="QR Code URL" [(ngModel)]="localDetails.qrCodeUrl">
              </div>
              <div class="col-md-6">
                <label class="form-label">QR Code Image</label>
                <input class="form-control" type="file" accept="image/*" aria-label="QR Code Image" (change)="onQrCodeSelected($event)">
              </div>
              <div class="col-md-6">
                <label class="form-label">Approved By Committee</label>
                <input class="form-control" aria-label="Approved By Committee" [(ngModel)]="localDetails.qrApprovedBy">
              </div>
              <div class="col-md-6 d-flex align-items-end">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="qrApproved" [(ngModel)]="localDetails.qrApproved">
                  <label class="form-check-label" for="qrApproved">QR Approved</label>
                </div>
              </div>
              <div class="col-12" *ngIf="qrDisplayUrl">
                <div class="qr-preview-card">
                  <img [src]="qrDisplayUrl" alt="Masjid QR code preview" class="qr-preview-image">
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-theme" type="button" (click)="saveMasjid()">{{ 'COMMON.SAVE' | translate }}</button>
              <button class="btn btn-outline-secondary" type="button" (click)="editMode = false">{{ 'COMMON.CANCEL' | translate }}</button>
            </div>
          </ng-template>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h2 class="h6 mb-0">{{ 'MASJID_PAGE.COMMITTEE_MEMBERS' | translate }}</h2>
            <button *ngIf="editMode" class="btn btn-outline-theme btn-sm" type="button" (click)="addCommitteeMember()">{{ 'MASJID_PAGE.ADD_MEMBER' | translate }}</button>
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
                    <input class="form-control" [attr.aria-label]="'Committee member ' + (i + 1) + ' name'" placeholder="Name" [(ngModel)]="member.name">
                  </div>
                  <div class="col-md-4">
                    <input class="form-control" [attr.aria-label]="'Committee member ' + (i + 1) + ' role'" placeholder="Role" [(ngModel)]="member.role">
                  </div>
                  <div class="col-md-3">
                    <input class="form-control" [attr.aria-label]="'Committee member ' + (i + 1) + ' phone'" placeholder="Phone" [(ngModel)]="member.phone">
                  </div>
                  <div class="col-md-1 d-flex align-items-center">
                    <button class="btn btn-link text-danger p-0 masjid-icon-action" type="button" aria-label="Remove committee member" (click)="removeCommitteeMember(i)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h2 class="h6 mb-0">{{ 'MASJID_PAGE.ASSOCIATED_USER' | translate }}</h2>
              <div class="small text-secondary">{{ 'MASJID_PAGE.USERS_LINKED' | translate:{ count: masjidUsers.length } }}</div>
            </div>
            <button class="btn btn-sm btn-square btn-link rounded" type="button" (click)="loadMasjidUsers(selectedMasjid?.id)" [attr.aria-label]="'MASJID_PAGE.REFRESH_USERS' | translate">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </div>

          <div *ngIf="usersLoading" class="small text-secondary">{{ 'MASJID_PAGE.LOADING_USERS' | translate }}</div>
          <div *ngIf="!usersLoading && masjidUsers.length === 0" class="small text-secondary">{{ 'MASJID_PAGE.NO_USERS' | translate }}</div>

          <div class="associated-user-list" *ngIf="!usersLoading && masjidUsers.length > 0">
            <button class="associated-user-row" type="button" *ngFor="let user of masjidUsers" (click)="openUser(user)">
              <span class="associated-user-avatar">
                <img *ngIf="user?.image" [src]="masjidUserImagePath + user.image" [alt]="user?.firstname">
                <i *ngIf="!user?.image" class="bi bi-person"></i>
              </span>
              <span class="associated-user-copy">
                <strong>{{ user?.firstname }} {{ user?.lastname }}</strong>
                <small>{{ user?.phone || '-' }}</small>
              </span>
              <i class="bi bi-arrow-right-short"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div [class]="sideColumnClass">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <h2 class="h6 mb-3">{{ fullScreenMode ? 'Features' : 'Facilities' }}</h2>
          <div class="d-grid gap-2 detail-checklist">
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="facilityWazuKhana" [(ngModel)]="localDetails.facilities.wazuKhana" [disabled]="!editMode">
              <label class="form-check-label" for="facilityWazuKhana">Wazu Khana</label>
            </div>
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="facilityToilet" [(ngModel)]="localDetails.facilities.toilet" [disabled]="!editMode">
              <label class="form-check-label" for="facilityToilet">Toilet</label>
            </div>
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="facilityGuslKhana" [(ngModel)]="localDetails.facilities.guslKhana" [disabled]="!editMode">
              <label class="form-check-label" for="facilityGuslKhana">Gusl Khana</label>
            </div>
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="facilityAirConditioners" [(ngModel)]="localDetails.facilities.airConditioners" [disabled]="!editMode">
              <label class="form-check-label" for="facilityAirConditioners">Air Conditioners</label>
            </div>
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="facilityChairs" [(ngModel)]="localDetails.facilities.chairs" [disabled]="!editMode">
              <label class="form-check-label" for="facilityChairs">Chairs</label>
            </div>
          </div>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <h2 class="h6 mb-3">Access & Stay</h2>
          <div class="d-grid gap-2 detail-checklist">
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="stayNearby" [(ngModel)]="localDetails.stayNearby" [disabled]="!editMode">
              <label class="form-check-label" for="stayNearby">Stay options nearby</label>
            </div>
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="ladiesJamat" [(ngModel)]="localDetails.ladiesJamat" [disabled]="!editMode">
              <label class="form-check-label" for="ladiesJamat">Ladies jamat available</label>
            </div>
            <div class="form-check form-switch facility-switch">
              <input class="form-check-input" type="checkbox" id="ladiesRamzanAccess" [(ngModel)]="localDetails.ladiesRamzanAccess" [disabled]="!editMode">
              <label class="form-check-label" for="ladiesRamzanAccess">Ramzan Isha & Taraweel for ladies</label>
            </div>
          </div>
        </div>
      </div>

      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <h2 class="h6 mb-3">Donation QR</h2>
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
            <div class="qr-display-card mt-3" *ngIf="qrDisplayUrl">
              <img [src]="qrDisplayUrl" alt="Masjid QR code" class="qr-display-image">
            </div>
          </div>
        </div>
      </div>
    </div>
  </ng-container>

  <app-user-details
    *ngIf="selectedUserId"
    [userId]="selectedUserId"
    [dialogMode]="true"
    (closed)="closeUserDialog()"></app-user-details>
</div>
  `,
  styleUrls: ['./masjid.component.scss']
})
export class MasjidComponent implements OnInit, OnDestroy {
  masjids: any[] = [];
  loading = false;
  detailMode = false;
  createMode = false;
  fullScreenMode = false;
  activeTab: 'all' | 'favorites' = 'all';
  selectedMasjid: any = null;
  localDetails: MasjidLocalDetails = this.createDefaultDetails();
  editMode = false;
  message = '';
  currentTime = new Date();
  usersLoading = false;
  masjidUsers: any[] = [];
  masjidUserImagePath = '';
  selectedUserId: number | string | null = null;
  favoriteMasjidIds: string[] = [];
  qrCodeFile: File | null = null;
  qrCodePreviewUrl = '';
  private readonly listSalahOrder = [
    { key: 'fajr', label: 'Fajr' },
    { key: 'dhuhr', label: 'Zohar' },
    { key: 'asr', label: 'Asar' },
    { key: 'maghrib', label: 'Magrib' },
    { key: 'isha', label: 'Isha' }
  ] as const;

  private clockTimer?: ReturnType<typeof setInterval>;

  constructor(
    private ramadanService: RamadanApiService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorageService: LocalStorageService,
    public i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    this.clockTimer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      const masjidId = params.get('id');
      this.createMode = this.router.url.includes('/masjid/new');
      this.detailMode = !!masjidId || this.createMode;
      this.fullScreenMode = this.detailMode && queryParams.get('fullscreen') === '1';
      if (this.fullScreenMode) {
        this.editMode = false;
      }
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

    return this.canEditMasjid(this.selectedMasjid);
  }

  get isLoggedIn(): boolean {
    return !!this.getCurrentUserId();
  }

  get headerTitle(): string {
    return this.detailMode
      ? (this.selectedMasjid?.name || this.selectedMasjid?.masjid_name || this.i18n.translateWithParams('MASJID_PAGE.DETAILS', {}))
      : this.i18n.translateWithParams('MASJID_PAGE.TITLE', {});
  }

  get headerSubtitle(): string {
    return this.detailMode ? this.displayAddress : '';
  }

  get filteredMasjids(): any[] {
    if (!this.isLoggedIn || this.activeTab === 'all') {
      return this.masjids;
    }

    return this.masjids.filter((masjid) => this.isFavoriteMasjid(masjid));
  }

  get detailColumnClass(): string {
    return this.fullScreenMode ? 'col-12' : 'col-12 col-xl-7';
  }

  get sideColumnClass(): string {
    return this.fullScreenMode ? 'col-12' : 'col-12 col-xl-5';
  }

  get qrDisplayUrl(): string {
    return this.qrCodePreviewUrl || this.localDetails.qrCodeUrl || '';
  }

  get headerActions(): ScreenHeaderAction[] {
    if (this.detailMode) {
      if (this.fullScreenMode) {
        return [];
      }

      const actions: ScreenHeaderAction[] = [
        { id: 'back', icon: 'bi-arrow-left', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.BACK', {}) },
        { id: 'fullscreen', icon: 'bi-arrows-fullscreen', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.OPEN_FULLSCREEN', {}) }
      ];

      if (this.isOwner) {
        actions.push({ id: 'edit', icon: 'bi-pencil', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.EDIT_MASJID', {}) });
        if (!this.createMode) {
          actions.push({ id: 'delete', icon: 'bi-trash', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.DELETE_MASJID', {}) });
        }
      }

      return actions;
    }

    return [
      { id: 'create', icon: 'bi-plus-lg', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.ADD_MASJID', {}) }
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
      case 'fullscreen':
        this.openFullScreen();
        break;
      case 'edit':
        this.enableEdit();
        break;
      case 'delete':
        this.deleteMasjid();
        break;
    }
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
    return this.mergeTimings(this.localDetails.timings ?? []);
  }

  get detailTimings(): MasjidTimingRow[] {
    return this.mergeTimings(this.localDetails.timings ?? []);
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
    this.loadFavoriteMasjids();

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

  setActiveTab(tab: 'all' | 'favorites'): void {
    this.activeTab = tab;
  }

  openFullScreen(): void {
    if (!this.selectedMasjid?.id) {
      return;
    }

    this.router.navigate(['/masjid', this.selectedMasjid.id], {
      queryParams: { fullscreen: 1 }
    });
  }

  openMasjidEditor(masjid: any): void {
    if (!this.ensureLoggedIn()) {
      return;
    }

    if (!this.canEditMasjid(masjid)) {
      return;
    }

    const id = this.getMasjidId(masjid);
    if (!id) {
      return;
    }

    this.router.navigate(['/masjid', id]).then(() => {
      setTimeout(() => {
        this.enableEdit();
      }, 0);
    });
  }

  backToList(): void {
    this.router.navigate(['/masjid']);
  }

  startCreate(): void {
    if (!this.ensureLoggedIn()) {
      return;
    }

    this.router.navigate(['/masjid/new']);
  }

  enableEdit(): void {
    if (!this.ensureLoggedIn()) {
      return;
    }

    this.editMode = true;
  }

  saveMasjid(): void {
    if (!this.selectedMasjid) {
      return;
    }

    const payload = new FormData();
    payload.append('id', this.createMode ? '' : String(this.selectedMasjid.id ?? ''));
    payload.append('name', this.selectedMasjid.name ?? '');
    payload.append('address', this.localDetails.location || this.selectedMasjid.address || '');
    payload.append('area', this.selectedMasjid.area ?? '');
    payload.append('city', this.selectedMasjid.city ?? '');
    payload.append('state', this.selectedMasjid.state ?? '');
    payload.append('pincode', this.selectedMasjid.pincode ?? '');
    payload.append('country', this.selectedMasjid.country ?? '');
    payload.append('status', String(this.selectedMasjid.status ?? 1));
    payload.append('email', this.localDetails.email ?? '');
    payload.append('contact', this.localDetails.contact ?? '');
    payload.append('location', this.localDetails.location ?? '');
    payload.append('temperature', this.localDetails.temperature ?? '');
    payload.append('qrCodeUrl', this.localDetails.qrCodeUrl ?? '');
    payload.append('qrApproved', String(this.localDetails.qrApproved));
    payload.append('qrApprovedBy', this.localDetails.qrApprovedBy ?? '');
    payload.append('stayNearby', String(this.localDetails.stayNearby));
    payload.append('ladiesJamat', String(this.localDetails.ladiesJamat));
    payload.append('ladiesRamzanAccess', String(this.localDetails.ladiesRamzanAccess));
    payload.append('facilities', JSON.stringify(this.localDetails.facilities));
    payload.append('committeeMembers', JSON.stringify(this.localDetails.committeeMembers));
    payload.append('timings', JSON.stringify(this.normalizedTimings));

    if (this.qrCodeFile) {
      payload.append('qrCodeFile', this.qrCodeFile);
    }

    this.loading = true;
    this.ramadanService.saveMasjid(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.selectedMasjid = response;
        this.localDetails = this.mapApiToLocalDetails(response);
        this.qrCodeFile = null;
        this.qrCodePreviewUrl = '';
        this.editMode = false;
        this.createMode = false;
        this.message = this.i18n.translateWithParams('MASJID_PAGE.UPDATED', {});
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

    this.deleteMasjidRecord(this.selectedMasjid, true);
  }

  deleteMasjidRecord(masjid: any, fromDetail = false): void {
    const id = this.getMasjidId(masjid);
    if (!id || !this.canDeleteMasjid(masjid)) {
      return;
    }

    const name = masjid?.name || masjid?.masjid_name || this.i18n.translateWithParams('MASJID_PAGE.THIS_MASJID', {});
    if (!window.confirm(this.i18n.translateWithParams('MASJID_PAGE.DELETE_CONFIRM', { name }))) {
      return;
    }

    this.loading = true;
    this.ramadanService.deleteMasjid(id).subscribe({
      next: () => {
        this.loading = false;
        this.message = this.i18n.translateWithParams('MASJID_PAGE.DELETED', {});
        this.masjids = this.masjids.filter(item => this.getMasjidId(item) !== id);
        if (fromDetail || this.detailMode) {
          this.router.navigate(['/masjid']);
        }
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

  loadMasjidUsers(masjidId?: string | number | null): void {
    if (!masjidId) {
      this.masjidUsers = [];
      return;
    }

    this.usersLoading = true;
    this.ramadanService.masjidUsers(masjidId).subscribe({
      next: (response) => {
        this.usersLoading = false;
        this.masjidUsers = response?.list ?? response ?? [];
        this.masjidUserImagePath = response?.userImagePath ?? response?.imagePath ?? '';
      },
      error: () => {
        this.usersLoading = false;
        this.masjidUsers = [];
      }
    });
  }

  openUser(user: any): void {
    const id = user?.id;
    if (id) {
      this.selectedUserId = id;
    }
  }

  closeUserDialog(): void {
    this.selectedUserId = null;
  }

  onQrCodeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.qrCodeFile = file;

    if (!file) {
      this.qrCodePreviewUrl = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.qrCodePreviewUrl = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  trackByIndex(index: number): number {
    return index;
  }

  isFavoriteMasjid(masjid: any): boolean {
    return this.favoriteMasjidIds.includes(this.getMasjidId(masjid));
  }

  toggleFavoriteMasjid(masjid: any): void {
    if (!this.ensureLoggedIn()) {
      return;
    }

    const masjidId = this.getMasjidId(masjid);
    if (!masjidId) {
      return;
    }

    this.favoriteMasjidIds = this.isFavoriteMasjid(masjid)
      ? this.favoriteMasjidIds.filter((id) => id !== masjidId)
      : [...this.favoriteMasjidIds, masjidId];

    this.localStorageService.setItem(this.getFavoriteMasjidStorageKey(), this.favoriteMasjidIds);

    if (this.activeTab === 'favorites' && !this.isFavoriteMasjid(masjid)) {
      this.message = this.i18n.translateWithParams('MASJID_PAGE.REMOVED_FAVORITE', {});
      return;
    }

    this.message = this.isFavoriteMasjid(masjid)
      ? this.i18n.translateWithParams('MASJID_PAGE.ADDED_FAVORITE', {})
      : this.i18n.translateWithParams('MASJID_PAGE.REMOVED_FAVORITE', {});
  }

  getListTimingRows(masjid: any): Array<{ label: string; azan: string; jamat: string }> {
    const timings = Array.isArray(masjid?.timings) ? masjid.timings : [];

    return this.listSalahOrder.map((item) => {
      const match = timings.find((timing: any) => this.normalizeSalahKey(timing?.salah) === item.key);
      return {
        label: item.label,
        azan: match?.azan ?? match?.azan_time ?? '',
        jamat: match?.jamat ?? match?.jamat_time ?? ''
      };
    });
  }

  getListLocation(masjid: any): string {
    const parts = [masjid?.area, masjid?.city]
      .map((value) => String(value ?? '').trim())
      .filter((value, index, array) => !!value && array.indexOf(value) === index);

    return parts.join(', ');
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
        this.qrCodeFile = null;
        this.qrCodePreviewUrl = '';
        this.loadMasjidUsers(response?.id ?? masjidId);
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

  private loadFavoriteMasjids(): void {
    if (!this.isLoggedIn) {
      this.favoriteMasjidIds = [];
      this.activeTab = 'all';
      return;
    }

    this.favoriteMasjidIds = this.localStorageService.getItem<string[]>(this.getFavoriteMasjidStorageKey()) ?? [];
  }

  canEditMasjid(masjid: any): boolean {
    if (!masjid || !this.isLoggedIn) {
      return false;
    }

    if (masjid.canEdit === true) {
      return true;
    }

    const ownerId = String(
      masjid?.created_by ??
      masjid?.createdBy ??
      masjid?.id_customer ??
      masjid?.customer_id ??
      masjid?.user_id ??
      masjid?.id_user ??
      masjid?.owner_id ??
      ''
    );

    return !!ownerId && ownerId === this.getCurrentUserId();
  }

  canDeleteMasjid(masjid: any): boolean {
    return this.canEditMasjid(masjid) || masjid?.canDelete === true || masjid?.can_delete === true;
  }

  private ensureLoggedIn(): boolean {
    if (this.isLoggedIn) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }

  private getCurrentUserId(): string {
    const userInfo = this.localStorageService.getItem<any>('userInfo');
    return String(
      userInfo?.id ??
      userInfo?.id_customer ??
      userInfo?.customer_id ??
      userInfo?.user_id ??
      userInfo?.id_user ??
      ''
    );
  }

  private getFavoriteMasjidStorageKey(): string {
    return `favorite-masjids-${this.getCurrentUserId()}`;
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

  private normalizeSalahKey(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  private mergeTimings(timings: any[]): MasjidTimingRow[] {
    const defaults = this.createDefaultDetails().timings;

    return defaults.map((defaultTiming) => {
      const match = timings.find((timing: any) => this.normalizeSalahKey(timing?.salah) === this.normalizeSalahKey(defaultTiming.salah));
      return {
        salah: defaultTiming.salah,
        azan: match?.azan ?? match?.azan_time ?? '',
        jamat: match?.jamat ?? match?.jamat_time ?? ''
      };
    });
  }
}
