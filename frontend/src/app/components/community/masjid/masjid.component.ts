import { Component, HostListener, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, firstValueFrom, Subscription } from 'rxjs';
import { MASJID_MADHABS, MasjidMadhab, MasjidTimingCapture } from 'src/app/models/masjid.model';
import { BOARD_UPLOAD_MAX_EDGE, compressImage } from 'src/app/shared/image-compress';
import { MasjidGalleryComponent } from './masjid-gallery/masjid-gallery.component';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';
import { BackNavigationService } from 'src/app/services/back-navigation.service';
import { findNextJamat, NextJamat } from './masjid-timing-utils';
import { NotifyService } from 'src/app/services/notify.service';
import { AddressLookupService, AddressSuggestion, PINCODE_PATTERN } from 'src/app/services/address-lookup.service';
import { SettingsService } from 'src/app/services/settings.service';
import { AppLocation, LocationService } from 'src/app/services/location.service';
import { formatDisplayTime } from 'src/app/shared/time-picker-dialog/time-picker-dialog.component';
import { SeoService } from 'src/app/services/seo.service';
import { masjidIntro, masjidPageMeta, masjidPageSchema } from 'src/app/seo/seo-content';

/** Same id as the prerendered page's script (tools/prerender-seo.js), so it gets replaced. */
const MASJID_SCHEMA_ID = 'masjid-schema';

/** Distance filter choices in km. The list is always limited to one of these around the user. */
const RANGE_CHOICES = [2, 5, 10, 25, 50];
const DEFAULT_RANGE_KM = 10;
const RANGE_STORAGE_KEY = 'masjid-range-km';

/** A masjid page is opened by id (old links) or by its public address. */
type MasjidLookup = { id: string } | { city: string; slug: string };

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

/** Same rules as api/models/MasjidDetail.php (ST-00013). */
export const MASJID_CONTACT_PATTERNS = {
  whatsapp: /^https:\/\/(chat\.whatsapp\.com|wa\.me|(www\.)?whatsapp\.com)\/\S+$/i,
  map: /^https:\/\/((www\.)?google\.[a-z.]{2,6}\/maps|maps\.google\.[a-z.]{2,6}|maps\.app\.goo\.gl|goo\.gl\/maps)(\/|\?)\S*$/i,
  phone: /^\+?[0-9][0-9 ()-]{5,24}$/
};

interface MasjidLocalDetails {
  email: string;
  contact: string;
  whatsappGroupUrl: string;
  mapUrl: string;
  imamName: string;
  imamPhone: string;
  muazzinName: string;
  muazzinPhone: string;
  /** The API withholds the phones from signed-out viewers and says so here. */
  hasHiddenPhones: boolean;
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
    <app-screen-header
      [title]="headerTitle"
      [subtitle]="headerSubtitle"
      [actions]="headerActions"
      [actionGroupLabel]="detailMode ? ('MASJID_PAGE.ACTIONS' | translate) : ('MASJID_PAGE.LIST_ACTIONS' | translate)"
      [moreLabel]="'MASJID_PAGE.MORE_ACTIONS' | translate"
      (actionSelected)="onHeaderAction($event)"></app-screen-header>
  </div>

  <!-- Opened from the header camera icon: the board photo can come from the camera or the gallery. -->
  <div class="col-12 board-menu-anchor" *ngIf="boardMenuOpen">
    <div class="list-menu" role="menu" [attr.aria-label]="'MASJID_PAGE.CAPTURE.MENU_LABEL' | translate" (click)="$event.stopPropagation()">
      <button type="button" role="menuitem" (click)="pickBoardPhoto(boardCameraInput)">
        <i class="bi bi-camera" aria-hidden="true"></i>{{ 'MASJID_PAGE.CAPTURE.TAKE_PHOTO' | translate }}
      </button>
      <button type="button" role="menuitem" (click)="pickBoardPhoto(boardFileInput)">
        <i class="bi bi-image" aria-hidden="true"></i>{{ 'MASJID_PAGE.CAPTURE.UPLOAD_PHOTO' | translate }}
      </button>
    </div>
  </div>
  <input #boardCameraInput type="file" accept="image/*" capture="environment" class="visually-hidden" tabindex="-1" aria-hidden="true" (change)="onBoardPhotoSelected($event)">
  <input #boardFileInput type="file" accept="image/*" class="visually-hidden" tabindex="-1" aria-hidden="true" (change)="onBoardPhotoSelected($event)">


  <div class="col-12" *ngIf="detailMode && !createMode && isPendingMasjid(selectedMasjid)">
    <div class="alert alert-warning d-flex align-items-start gap-2">
      <i class="bi bi-hourglass-split" aria-hidden="true"></i>
      <span>{{ 'MASJID_PAGE.PENDING_NOTE' | translate }}</span>
    </div>
  </div>

  <div class="col-12" *ngIf="loading && detailMode">
    <app-loading-spinner [label]="'MASJID_PAGE.LOADING' | translate"></app-loading-spinner>
  </div>

  <ng-container *ngIf="!detailMode">
    <div class="col-12 mb-3" *ngIf="isLoggedIn">
      <div class="masjid-tabs" role="tablist" [attr.aria-label]="'MASJID_PAGE.LISTS' | translate">
        <button type="button" role="tab" class="masjid-tab" [class.active]="activeTab === 'all'" [attr.aria-selected]="activeTab === 'all'" aria-controls="masjid-list-panel" (click)="setActiveTab('all')">{{ 'MASJID_PAGE.TITLE' | translate }}</button>
        <button type="button" role="tab" class="masjid-tab" [class.active]="activeTab === 'favorites'" [attr.aria-selected]="activeTab === 'favorites'" aria-controls="masjid-list-panel" (click)="setActiveTab('favorites')">{{ 'MASJID_PAGE.FAVORITES' | translate }}</button>
      </div>
    </div>

    <!-- Distance from the user; favorites are always listed in full. -->
    <div class="col-12 mb-3" *ngIf="activeTab === 'all'">
      <div class="masjid-range">
        <span class="masjid-range-label" id="masjidRangeLabel">
          <i class="bi bi-geo-alt" aria-hidden="true"></i>{{ 'MASJID_PAGE.NEARBY.LABEL' | translate }}
        </span>
        <div class="choice-chips masjid-range-chips" role="radiogroup" aria-labelledby="masjidRangeLabel">
          <label class="choice-chip" *ngFor="let km of rangeChoices">
            <input type="radio" name="masjidRange" [checked]="rangeKm === km" (change)="setRange(km)">
            <span>{{ 'MASJID_PAGE.NEARBY.KM' | translate:{ km: km } }}</span>
          </label>
        </div>
        <div class="form-text masjid-range-status" [class.is-warning]="locationFailed" aria-live="polite" *ngIf="locating || locationFailed">
          <ng-container *ngIf="locating">
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>{{ 'MASJID_PAGE.NEARBY.LOCATING' | translate }}
          </ng-container>
          <ng-container *ngIf="!locating && locationFailed">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ 'MASJID_PAGE.NEARBY.LOCATION_FAILED' | translate }}
            <button type="button" class="btn btn-link btn-sm p-0" (click)="retryNearby()">{{ 'MASJID_PAGE.NEARBY.RETRY' | translate }}</button>
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Loading sits in the list area, below the tabs. -->
    <div class="col-12" *ngIf="listLoading">
      <app-loading-spinner [label]="'MASJID_PAGE.LOADING' | translate"></app-loading-spinner>
    </div>

    <div class="col-12" *ngIf="!listLoading && filteredMasjids.length === 0">
      <div class="card adminuiux-card shadow-sm border-0 community-empty-card mb-3">
        <div class="card-body text-center py-5">
          <span class="community-empty-icon">
            <i class="bi" [ngClass]="activeTab === 'favorites' ? 'bi-heartbreak' : 'bi-building-x'"></i>
          </span>
          <ng-container *ngIf="activeTab === 'favorites'">
            <h2 class="h5 mt-3 mb-2">{{ 'MASJID_PAGE.EMPTY_FAVORITES' | translate }}</h2>
            <p class="text-secondary mb-0">{{ 'MASJID_PAGE.EMPTY_FAVORITES_TEXT' | translate }}</p>
          </ng-container>
          <ng-container *ngIf="activeTab !== 'favorites' && isRangeApplied">
            <h2 class="h5 mt-3 mb-2">{{ 'MASJID_PAGE.NEARBY.EMPTY_TITLE' | translate:{ km: rangeKm } }}</h2>
            <p class="text-secondary mb-3">{{ 'MASJID_PAGE.NEARBY.EMPTY_TEXT' | translate }}</p>
            <button type="button" class="btn btn-outline-theme btn-sm" *ngIf="nextWiderRange" (click)="widenRange()">
              {{ 'MASJID_PAGE.NEARBY.WIDEN' | translate:{ km: nextWiderRange } }}
            </button>
          </ng-container>
          <!-- Without a position nothing is listed; the range status above offers a retry. -->
          <ng-container *ngIf="activeTab !== 'favorites' && !isRangeApplied">
            <h2 class="h5 mt-3 mb-2">{{ 'MASJID_PAGE.EMPTY_TITLE' | translate }}</h2>
            <p class="text-secondary mb-0">{{ 'MASJID_PAGE.NEARBY.LOCATION_FAILED' | translate }}</p>
          </ng-container>
        </div>
      </div>
    </div>

    <div class="col-12" *ngIf="!listLoading && filteredMasjids.length">
      <ul id="masjid-list-panel" role="tabpanel" class="list-rows list-rows-media">
        <li *ngFor="let masjid of filteredMasjids; trackBy: trackByMasjid" class="list-row">
          <a class="list-row-main" [routerLink]="masjidLink(masjid)">
            <span class="list-row-icon" [class.has-photo]="masjid?.coverThumbUrl" aria-hidden="true">
              <img *ngIf="masjid?.coverThumbUrl; else masjidIcon" [src]="masjid.coverThumbUrl" alt="" width="60" height="60" loading="lazy" decoding="async">
              <ng-template #masjidIcon><i class="bi bi-buildings" aria-hidden="true"></i></ng-template>
            </span>
            <span class="list-row-copy">
              <span class="list-row-title">{{ masjid?.name || masjid?.masjid_name || ('MASJID_PAGE.TITLE' | translate) }}</span>
              <span class="list-row-meta" *ngIf="getListLocation(masjid) || masjid?.address">{{ getListLocation(masjid) || masjid?.address }}</span>
              <span class="list-row-chips">
                <span *ngIf="masjid?.distanceKm != null" class="list-chip" [attr.aria-label]="'MASJID_PAGE.NEARBY.DISTANCE_AWAY' | translate:{ distance: formatDistance(masjid.distanceKm) }">
                  <i class="bi bi-geo-alt" aria-hidden="true"></i>{{ formatDistance(masjid.distanceKm) }}
                </span>
                <span *ngIf="canEditMasjid(masjid) && !hasPin(masjid)" class="list-chip list-chip-warning">
                  <i class="bi bi-pin-map" aria-hidden="true"></i>{{ 'MASJID_PAGE.PIN.NOT_SET_SHORT' | translate }}
                </span>
                <span *ngIf="madhabKey(masjid?.madhab) as madhab" class="list-chip madhab-chip" [ngClass]="'madhab-' + masjid.madhab" [title]="'MASJID_PAGE.MADHAB.LABEL' | translate">
                  <i class="bi bi-journal-bookmark-fill" aria-hidden="true"></i>{{ madhab | translate }}
                </span>
                <span *ngIf="isPendingMasjid(masjid)" class="list-chip list-chip-warning">
                  <i class="bi bi-hourglass-split" aria-hidden="true"></i>{{ 'MASJID_PAGE.WAITING_APPROVAL' | translate }}
                </span>
                <span *ngIf="nextJamatFor(masjid) as next; else noTimings" class="list-chip list-chip-accent" [attr.aria-label]="('MASJID_PAGE.NEXT_JAMAT' | translate) + ': ' + next.salah + ' ' + displayTime(next.time)">
                  <i class="bi bi-clock" aria-hidden="true"></i><ng-container *ngIf="next.tomorrow">{{ 'MASJID_PAGE.TOMORROW' | translate }} · </ng-container>{{ next.salah }} {{ displayTime(next.time) }}
                </span>
                <ng-template #noTimings>
                  <span class="list-chip list-chip-muted">
                    <i class="bi bi-clock" aria-hidden="true"></i>{{ 'MASJID_PAGE.NO_TIMINGS' | translate }}
                  </span>
                </ng-template>
              </span>
            </span>
            <i class="bi bi-chevron-right list-row-chevron" *ngIf="!isLoggedIn" aria-hidden="true"></i>
          </a>

          <button
            *ngIf="isLoggedIn"
            type="button"
            class="list-menu-btn masjid-favorite-btn"
            [class.is-favorite]="isFavoriteMasjid(masjid)"
            [attr.aria-pressed]="isFavoriteMasjid(masjid)"
            [attr.aria-label]="isFavoriteMasjid(masjid) ? ('MASJID_PAGE.REMOVE_FAVORITE' | translate) : ('MASJID_PAGE.ADD_FAVORITE' | translate)"
            (click)="toggleFavoriteMasjid(masjid)">
            <i class="bi" [ngClass]="isFavoriteMasjid(masjid) ? 'bi-heart-fill' : 'bi-heart'" aria-hidden="true"></i>
          </button>

          <div class="list-row-menu" *ngIf="canEditMasjid(masjid) || canDeleteMasjid(masjid)">
            <button
              type="button"
              class="list-menu-btn"
              aria-haspopup="menu"
              [attr.aria-expanded]="openMenuId === getMasjidId(masjid)"
              [attr.aria-label]="'MASJID_PAGE.MORE_ACTIONS' | translate"
              (click)="toggleMenu(masjid, $event)">
              <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
            </button>
            <div class="list-menu" role="menu" *ngIf="openMenuId === getMasjidId(masjid)">
              <button *ngIf="canEditMasjid(masjid)" type="button" role="menuitem" (click)="runMenuAction('edit', masjid)">
                <i class="bi bi-pencil" aria-hidden="true"></i>{{ 'MASJID_PAGE.EDIT_MASJID' | translate }}
              </button>
              <button *ngIf="canDeleteMasjid(masjid)" type="button" role="menuitem" class="list-menu-danger" (click)="runMenuAction('delete', masjid)">
                <i class="bi bi-trash" aria-hidden="true"></i>{{ 'MASJID_PAGE.DELETE_MASJID' | translate }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </ng-container>

  <ng-container *ngIf="detailMode && selectedMasjid">
    <ng-template #galleryTpl>
      <app-masjid-gallery
        [images]="selectedMasjid.images || []"
        [masjidId]="selectedMasjid.id"
        [canAdd]="isOwner"
        [canRemove]="editMode && isOwner"
        [maxImages]="selectedMasjid.maxImages || 10"
        [masjidName]="selectedMasjid.name"
        (imagesChange)="selectedMasjid.images = $event"></app-masjid-gallery>
    </ng-template>

    <!-- View mode: photos first. -->
    <div class="col-12" *ngIf="!createMode && !editMode">
      <ng-container *ngTemplateOutlet="galleryTpl"></ng-container>
    </div>

    <!-- The name is already the page heading, so this card starts with the address and actions. -->
    <div class="col-12" *ngIf="!editMode">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="masjid-identity">
            <span class="masjid-identity-icon" aria-hidden="true">
              <i class="bi bi-buildings"></i>
            </span>
            <div class="masjid-identity-copy">
              <span *ngIf="madhabKey(selectedMasjid?.madhab) as madhab" class="madhab-badge" [ngClass]="'madhab-' + selectedMasjid.madhab">
                <i class="bi bi-journal-bookmark-fill" aria-hidden="true"></i>
                <span class="visually-hidden">{{ 'MASJID_PAGE.MADHAB.LABEL' | translate }}: </span>{{ madhab | translate }}
              </span>
              <p class="masjid-identity-address mb-0" *ngIf="displayAddress">
                <i class="bi bi-geo-alt" aria-hidden="true"></i>
                <span class="visually-hidden">{{ 'MASJID_PAGE.ADDRESS' | translate }}: </span>{{ displayAddress }}
              </p>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2 mt-3" *ngIf="hasPin(selectedMasjid) || localDetails.mapUrl || localDetails.whatsappGroupUrl || localDetails.contact">
            <!-- Full width on phones: the main thing a visitor needs. -->
            <a *ngIf="hasPin(selectedMasjid)" class="btn btn-theme col-12 col-sm-auto py-2" [href]="directionsUrl(selectedMasjid)" target="_blank" rel="noopener">
              <i class="bi bi-sign-turn-right me-1" aria-hidden="true"></i>{{ 'MASJID_PAGE.PIN.DIRECTIONS' | translate }}
            </a>
            <a *ngIf="localDetails.mapUrl" class="btn btn-outline-theme btn-sm flex-grow-1 flex-sm-grow-0" [href]="localDetails.mapUrl" target="_blank" rel="noopener">
              <i class="bi bi-geo-alt-fill me-1" aria-hidden="true"></i>{{ 'MASJID_PAGE.CONTACTS.OPEN_MAP' | translate }}
            </a>
            <a *ngIf="localDetails.whatsappGroupUrl" class="btn btn-success btn-sm flex-grow-1 flex-sm-grow-0" [href]="localDetails.whatsappGroupUrl" target="_blank" rel="noopener">
              <i class="bi bi-whatsapp me-1" aria-hidden="true"></i>{{ 'MASJID_PAGE.CONTACTS.JOIN_WHATSAPP' | translate }}
            </a>
            <a *ngIf="localDetails.contact" class="btn btn-outline-theme btn-sm flex-grow-1 flex-sm-grow-0" [href]="telLink(localDetails.contact)">
              <i class="bi bi-telephone me-1" aria-hidden="true"></i>{{ localDetails.contact }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit mode: the form comes first. -->
    <div class="col-12" *ngIf="editMode">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
            <h2 class="h6 mb-3">{{ 'MASJID_PAGE.EDIT_MASJID' | translate }}</h2>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Masjid Name</label>
                <input class="form-control" aria-label="Masjid Name" [(ngModel)]="selectedMasjid.name">
              </div>
              <div class="col-md-6">
                <span class="form-label d-block" id="masjidMadhabLabel">{{ 'MASJID_PAGE.MADHAB.LABEL' | translate }}</span>
                <!-- Chips, not a <select>: Android's native picker can't be styled. -->
                <div class="choice-chips" role="radiogroup" aria-labelledby="masjidMadhabLabel">
                  <label class="choice-chip" *ngFor="let option of madhabChoices">
                    <input type="radio" name="masjidMadhab" [checked]="(selectedMasjid.madhab ?? null) === option"
                      (change)="selectedMasjid.madhab = option">
                    <span>{{ (option ? madhabKey(option) : 'MASJID_PAGE.MADHAB.NONE') | translate }}</span>
                  </label>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label" for="masjidPincode">{{ 'MASJID_PAGE.ADDRESS_FORM.PINCODE' | translate }}</label>
                <div class="address-lookup-row">
                  <input
                    id="masjidPincode"
                    class="form-control"
                    inputmode="numeric"
                    autocomplete="postal-code"
                    maxlength="6"
                    aria-describedby="masjidAddressStatus"
                    [(ngModel)]="selectedMasjid.pincode"
                    (ngModelChange)="onPincodeChange($event)">
                  <button type="button" class="btn btn-outline-theme address-locate-btn" [disabled]="addressLookupBusy" (click)="fillAddressFromLocation()">
                    <i class="bi bi-crosshair" aria-hidden="true"></i>
                    <span>{{ 'MASJID_PAGE.ADDRESS_FORM.USE_LOCATION' | translate }}</span>
                  </button>
                </div>
                <div id="masjidAddressStatus" class="form-text address-lookup-status" [class.is-warning]="addressStatus?.tone === 'warning'" aria-live="polite">
                  <ng-container *ngIf="addressStatus; else addressHint">
                    <i class="bi" [ngClass]="addressStatus.tone === 'warning' ? 'bi-exclamation-circle' : (addressLookupBusy ? 'bi-hourglass-split' : 'bi-check-circle')" aria-hidden="true"></i>
                    {{ addressStatus.key | translate }}
                  </ng-container>
                  <ng-template #addressHint>{{ 'MASJID_PAGE.ADDRESS_FORM.HINT' | translate }}</ng-template>
                </div>
              </div>
              <!-- Map position: lets people nearby find this masjid in the distance filter. -->
              <div class="col-12">
                <span class="form-label d-block" id="masjidPinLabel">{{ 'MASJID_PAGE.PIN.LABEL' | translate }}</span>
                <div class="masjid-pin" [class.is-set]="hasPin(selectedMasjid)" role="group" aria-labelledby="masjidPinLabel">
                  <i class="bi masjid-pin-icon" [ngClass]="hasPin(selectedMasjid) ? 'bi-geo-alt-fill' : 'bi-geo-alt'" aria-hidden="true"></i>
                  <div class="masjid-pin-copy">
                    <ng-container *ngIf="hasPin(selectedMasjid); else pinNotSet">
                      <span class="fw-semibold">{{ 'MASJID_PAGE.PIN.SET' | translate }}</span>
                      <a class="small" [href]="mapUrl(selectedMasjid)" target="_blank" rel="noopener">{{ pinLabel(selectedMasjid) }}</a>
                    </ng-container>
                    <ng-template #pinNotSet>
                      <span class="fw-semibold">{{ 'MASJID_PAGE.PIN.NOT_SET' | translate }}</span>
                      <span class="small text-secondary">{{ 'MASJID_PAGE.PIN.NOT_SET_TEXT' | translate }}</span>
                    </ng-template>
                  </div>
                  <div class="masjid-pin-actions">
                    <button type="button" class="btn btn-outline-theme btn-sm address-locate-btn" [disabled]="pinBusy" (click)="pinCurrentLocation()">
                      <i class="bi bi-crosshair" aria-hidden="true"></i>
                      <span>{{ 'MASJID_PAGE.PIN.USE_CURRENT' | translate }}</span>
                    </button>
                    <button *ngIf="!manualPinOpen" type="button" class="btn btn-link btn-sm p-0" (click)="openManualPin()">{{ 'MASJID_PAGE.PIN.ENTER_MANUALLY' | translate }}</button>
                    <button *ngIf="hasPin(selectedMasjid)" type="button" class="btn btn-link btn-sm text-danger p-0" (click)="clearPin()">{{ 'MASJID_PAGE.PIN.CLEAR' | translate }}</button>
                  </div>
                </div>
                <!-- Typed or pasted coordinates, for owners who are not standing at the masjid. -->
                <div class="row g-2 mt-1" *ngIf="manualPinOpen">
                  <div class="col-6">
                    <label class="form-label small mb-1" for="masjidLatitude">{{ 'MASJID_PAGE.PIN.LATITUDE' | translate }}</label>
                    <input id="masjidLatitude" class="form-control" inputmode="decimal" autocomplete="off"
                      placeholder="11.7753" [(ngModel)]="manualLat" (paste)="onCoordinatePaste($event)">
                  </div>
                  <div class="col-6">
                    <label class="form-label small mb-1" for="masjidLongitude">{{ 'MASJID_PAGE.PIN.LONGITUDE' | translate }}</label>
                    <input id="masjidLongitude" class="form-control" inputmode="decimal" autocomplete="off"
                      placeholder="78.2093" [(ngModel)]="manualLng" (paste)="onCoordinatePaste($event)">
                  </div>
                  <div class="col-12 d-flex align-items-center gap-3">
                    <button type="button" class="btn btn-outline-theme btn-sm" (click)="applyManualPin()">{{ 'MASJID_PAGE.PIN.APPLY' | translate }}</button>
                    <button type="button" class="btn btn-link btn-sm p-0" (click)="manualPinOpen = false">{{ 'COMMON.CANCEL' | translate }}</button>
                  </div>
                  <div class="col-12 form-text mt-0">{{ 'MASJID_PAGE.PIN.MANUAL_HINT' | translate }}</div>
                </div>
                <div class="form-text address-lookup-status" [class.is-warning]="pinStatus?.tone === 'warning'" aria-live="polite">
                  <ng-container *ngIf="pinStatus; else pinHint">
                    <i class="bi" [ngClass]="pinStatus.tone === 'warning' ? 'bi-exclamation-circle' : (pinBusy ? 'bi-hourglass-split' : 'bi-check-circle')" aria-hidden="true"></i>
                    {{ pinStatus.key | translate }}
                  </ng-container>
                  <ng-template #pinHint>{{ 'MASJID_PAGE.PIN.HINT' | translate }}</ng-template>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="masjidArea">{{ 'MASJID_PAGE.ADDRESS_FORM.AREA' | translate }}</label>
                <input id="masjidArea" class="form-control" list="masjidAreaOptions" autocomplete="off" [(ngModel)]="selectedMasjid.area">
                <datalist id="masjidAreaOptions">
                  <option *ngFor="let area of pincodeAreas" [value]="area"></option>
                </datalist>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="masjidStreet">{{ 'MASJID_PAGE.ADDRESS_FORM.STREET' | translate }}</label>
                <input id="masjidStreet" class="form-control" autocomplete="street-address" [(ngModel)]="localDetails.location">
              </div>
              <div class="col-md-6">
                <label class="form-label" for="masjidCity">{{ 'MASJID_PAGE.ADDRESS_FORM.CITY' | translate }}</label>
                <input id="masjidCity" class="form-control" autocomplete="address-level2" [(ngModel)]="selectedMasjid.city">
              </div>
              <div class="col-md-6">
                <label class="form-label" for="masjidState">{{ 'MASJID_PAGE.ADDRESS_FORM.STATE' | translate }}</label>
                <input id="masjidState" class="form-control" autocomplete="address-level1" [(ngModel)]="selectedMasjid.state">
              </div>
              <div class="col-md-6">
                <label class="form-label" for="masjidCountry">{{ 'MASJID_PAGE.ADDRESS_FORM.COUNTRY' | translate }}</label>
                <input id="masjidCountry" class="form-control" autocomplete="country-name" [(ngModel)]="selectedMasjid.country">
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
                <label class="form-label" for="masjidWhatsapp">{{ 'MASJID_PAGE.CONTACTS.WHATSAPP' | translate }}</label>
                <input id="masjidWhatsapp" class="form-control" type="url" inputmode="url" placeholder="https://chat.whatsapp.com/…" [(ngModel)]="localDetails.whatsappGroupUrl">
              </div>
              <div class="col-md-6">
                <label class="form-label" for="masjidMapLink">{{ 'MASJID_PAGE.CONTACTS.MAP_LINK' | translate }}</label>
                <input id="masjidMapLink" class="form-control" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" [(ngModel)]="localDetails.mapUrl">
              </div>
            </div>

        </div>
      </div>

    </div>

    <!-- Edit mode: photos after the form. -->
    <div class="col-12" *ngIf="!createMode && editMode">
      <ng-container *ngTemplateOutlet="galleryTpl"></ng-container>
    </div>

    <div class="col-12">
      <div class="card adminuiux-card shadow-sm border-0 mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h2 class="h6 mb-0">{{ 'MASJID_PAGE.SALAH_TIMING' | translate }}</h2>
            <div class="d-flex align-items-center gap-2">
              <button
                *ngIf="isOwner && !createMode"
                class="btn btn-link btn-sm p-0 masjid-icon-action"
                type="button"
                [attr.aria-label]="'MASJID_PAGE.HISTORY.OPEN' | translate"
                [title]="'MASJID_PAGE.HISTORY.OPEN' | translate"
                (click)="showTimingHistory = true">
                <i class="bi bi-clock-history" aria-hidden="true"></i>
              </button>
              <button *ngIf="editMode" class="btn btn-outline-theme btn-sm" type="button" (click)="addTimingRow()">{{ 'MASJID_PAGE.ADD_TIMING' | translate }}</button>
            </div>
          </div>

          <!-- Board photos are started from the header camera icon; only progress/errors show here. -->
          <div class="timing-capture-status" aria-live="polite" *ngIf="capturing || captureErrorKey">
            <ng-container *ngIf="capturing">
              <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>{{ 'MASJID_PAGE.CAPTURE.READING' | translate }}
            </ng-container>
            <span class="text-danger" *ngIf="!capturing && captureErrorKey" role="alert">{{ captureErrorKey | translate }}</span>
          </div>

          <div class="timing-review" *ngIf="capture" role="status">
            <a class="timing-review-photo" [href]="capture.imageUrl" target="_blank" rel="noopener" [attr.aria-label]="'MASJID_PAGE.CAPTURE.VIEW_PHOTO' | translate">
              <img [src]="capture.imageUrl" alt="" width="88" height="88" decoding="async">
            </a>
            <div class="timing-review-copy">
              <div class="fw-semibold">{{ 'MASJID_PAGE.CAPTURE.REVIEW_TITLE' | translate }}</div>
              <div class="small text-secondary">
                {{ (capture.changed.size ? 'MASJID_PAGE.CAPTURE.REVIEW_TEXT' : 'MASJID_PAGE.CAPTURE.NOTHING_READ') | translate }}
              </div>
              <div class="small text-warning-emphasis" *ngIf="capture.readError">{{ capture.readError }}</div>
              <div class="small text-secondary fst-italic" *ngIf="capture.notes">{{ capture.notes }}</div>
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-theme btn-sm" type="button" [disabled]="savingTimings" (click)="saveCapture()">{{ 'COMMON.SAVE' | translate }}</button>
                <button class="btn btn-outline-secondary btn-sm" type="button" (click)="discardCapture()">{{ 'MASJID_PAGE.CAPTURE.DISCARD' | translate }}</button>
              </div>
            </div>
          </div>

          <div class="masjid-stat-card compact d-flex flex-row align-items-center justify-content-between gap-3 mb-3" *ngIf="!editingTimings && nextJamat">
            <div class="text-start">
              <span class="masjid-stat-label">{{ 'MASJID_PAGE.NEXT_JAMAT' | translate }}</span>
              <div class="masjid-stat-value">{{ nextJamat.salah }} · {{ displayTime(nextJamat.time) }}</div>
              <div class="small text-secondary" *ngIf="nextJamat.tomorrow">{{ 'MASJID_PAGE.TOMORROW' | translate }}</div>
            </div>
            <div class="text-end">
              <span class="masjid-stat-label">{{ 'COUNTDOWN' | translate }}</span>
              <div class="masjid-stat-value">{{ nextCountdown }}</div>
            </div>
          </div>

          <p class="text-secondary mb-0" *ngIf="!editingTimings && !hasAnyTiming">
            <i class="bi bi-clock me-1" aria-hidden="true"></i>{{ 'MASJID_PAGE.NO_TIMINGS' | translate }}
          </p>

          <div class="table-responsive" *ngIf="editingTimings || hasAnyTiming">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ 'NAV.SALAH' | translate }}</th>
                  <th>{{ 'MASJID_PAGE.AZAN' | translate }}</th>
                  <th>{{ 'MASJID_PAGE.JAMAT' | translate }}</th>
                  <th *ngIf="editingTimings" class="masjid-timing-action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let timing of (editingTimings ? localDetails.timings : detailTimings); let i = index; trackBy: trackByIndex"
                  [class.table-active]="!editingTimings && timing.salah === nextJamat?.salah" [class.fw-semibold]="!editingTimings && timing.salah === nextJamat?.salah">
                  <td>
                    <span *ngIf="!editingTimings">{{ timing.salah }}</span>
                    <input *ngIf="editingTimings" class="form-control" [attr.aria-label]="'Salah name for row ' + (i + 1)" [(ngModel)]="localDetails.timings[i].salah">
                  </td>
                  <td *ngFor="let field of timingFields">
                    <span *ngIf="!editingTimings">{{ displayTime(timing[field]) || '-' }}</span>
                    <button
                      *ngIf="editingTimings"
                      type="button"
                      class="masjid-time-btn"
                      [class.is-empty]="!timing[field]"
                      [class.is-captured]="isCapturedCell(timing.salah, field)"
                      [attr.aria-label]="(timing.salah || ('row ' + (i + 1))) + ' ' + ((field === 'azan' ? 'MASJID_PAGE.AZAN' : 'MASJID_PAGE.JAMAT') | translate) + ': ' + (displayTime(timing[field]) || ('TIME_PICKER.SET' | translate))"
                      (click)="openTimePicker(i, field)">
                      <i class="bi bi-clock" aria-hidden="true"></i>
                      <span>{{ displayTime(timing[field]) || ('TIME_PICKER.SET' | translate) }}</span>
                    </button>
                  </td>
                  <td *ngIf="editingTimings" class="text-end">
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

    <div class="col-12">
      <!-- ST-00013: Imam and Muazzin -->
      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="!editMode && hasPeopleCard">
        <div class="card-body">
          <h2 class="h6 mb-2">{{ 'MASJID_PAGE.CONTACTS.IMAM' | translate }} &amp; {{ 'MASJID_PAGE.CONTACTS.MUAZZIN' | translate }}</h2>
          <ng-container *ngFor="let person of [
            { role: 'MASJID_PAGE.CONTACTS.IMAM', name: localDetails.imamName, phone: localDetails.imamPhone },
            { role: 'MASJID_PAGE.CONTACTS.MUAZZIN', name: localDetails.muazzinName, phone: localDetails.muazzinPhone }
          ]">
            <div class="d-flex align-items-center justify-content-between gap-3 py-2" *ngIf="person.name || person.phone">
              <div>
                <div class="small text-secondary">{{ person.role | translate }}</div>
                <div class="fw-semibold">{{ person.name || '—' }}</div>
              </div>
              <a *ngIf="person.phone" class="btn btn-outline-theme btn-sm" [href]="telLink(person.phone)">
                <i class="bi bi-telephone me-1" aria-hidden="true"></i>{{ person.phone }}
              </a>
            </div>
          </ng-container>
          <p *ngIf="localDetails.hasHiddenPhones" class="small text-secondary mb-0 mt-2">
            <i class="bi bi-lock me-1" aria-hidden="true"></i>{{ 'MASJID_PAGE.CONTACTS.SIGN_IN_FOR_PHONE' | translate }}
          </p>
        </div>
      </div>
      <!-- View mode lists only what the masjid has; switched-off items are noise. Side by side on wide screens. -->
      <div class="row g-0 gap-lg-3" *ngIf="!editMode && (availableFacilities.length || accessOptions.length)">
        <div class="col-12 col-lg mb-3" *ngIf="availableFacilities.length">
          <div class="card adminuiux-card shadow-sm border-0 h-100">
            <div class="card-body">
              <h2 class="h6 mb-3">Facilities</h2>
              <div class="d-flex flex-wrap gap-2">
                <span class="badge rounded-pill text-bg-light border fw-normal px-3 py-2" *ngFor="let item of availableFacilities">
                  <i class="bi bi-check2 me-1 text-success" aria-hidden="true"></i>{{ item }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg mb-3" *ngIf="accessOptions.length">
          <div class="card adminuiux-card shadow-sm border-0 h-100">
            <div class="card-body">
              <h2 class="h6 mb-3">Access & Stay</h2>
              <div class="d-flex flex-wrap gap-2">
                <span class="badge rounded-pill text-bg-light border fw-normal px-3 py-2" *ngFor="let item of accessOptions">
                  <i class="bi bi-check2 me-1 text-success" aria-hidden="true"></i>{{ item }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="editMode">
        <div class="card-body">
          <h2 class="h6 mb-3">Facilities</h2>
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
      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="editMode">
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
              <label class="form-check-label" for="ladiesRamzanAccess">Ramzan Isha & Taraweeh for ladies</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="!editMode && qrDisplayUrl">
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
      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="editMode">
        <div class="card-body">
          <h2 class="h6 mb-3">Donation QR</h2>
          <div class="row g-3">
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
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="card adminuiux-card shadow-sm border-0 mb-3" *ngIf="editMode || localDetails.committeeMembers.length">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h2 class="h6 mb-0">{{ 'MASJID_PAGE.COMMITTEE_MEMBERS' | translate }}</h2>
            <button *ngIf="editMode" class="btn btn-outline-theme btn-sm" type="button" (click)="addCommitteeMember()">{{ 'MASJID_PAGE.ADD_MEMBER' | translate }}</button>
          </div>
          <!-- Imam and Muazzin: fixed rows above the committee list. -->
          <div class="row g-3 mb-4 pb-3 border-bottom" *ngIf="editMode">
            <div class="col-md-6">
              <label class="form-label" for="masjidImamName">{{ 'MASJID_PAGE.CONTACTS.IMAM' | translate }} · {{ 'MASJID_PAGE.CONTACTS.NAME' | translate }}</label>
              <input id="masjidImamName" class="form-control" maxlength="150" [(ngModel)]="localDetails.imamName">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="masjidImamPhone">{{ 'MASJID_PAGE.CONTACTS.IMAM' | translate }} · {{ 'MASJID_PAGE.CONTACTS.PHONE' | translate }}</label>
              <input id="masjidImamPhone" class="form-control" type="tel" inputmode="tel" maxlength="30" [(ngModel)]="localDetails.imamPhone" [disabled]="localDetails.hasHiddenPhones">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="masjidMuazzinName">{{ 'MASJID_PAGE.CONTACTS.MUAZZIN' | translate }} · {{ 'MASJID_PAGE.CONTACTS.NAME' | translate }}</label>
              <input id="masjidMuazzinName" class="form-control" maxlength="150" [(ngModel)]="localDetails.muazzinName">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="masjidMuazzinPhone">{{ 'MASJID_PAGE.CONTACTS.MUAZZIN' | translate }} · {{ 'MASJID_PAGE.CONTACTS.PHONE' | translate }}</label>
              <input id="masjidMuazzinPhone" class="form-control" type="tel" inputmode="tel" maxlength="30" [(ngModel)]="localDetails.muazzinPhone" [disabled]="localDetails.hasHiddenPhones">
            </div>
            <div class="col-12">
              <small class="text-secondary">{{ 'MASJID_PAGE.CONTACTS.PHONES_NOTE' | translate }}</small>
            </div>
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
    </div>

    <!-- One Save for the whole page: everything on this page. -->
    <div class="col-12" *ngIf="editMode">
      <div class="d-flex gap-2 mb-3">
        <button class="btn btn-theme flex-grow-1" type="button" (click)="saveMasjid()">{{ 'COMMON.SAVE' | translate }}</button>
        <button class="btn btn-outline-secondary" type="button" (click)="cancelEdit()">{{ 'COMMON.CANCEL' | translate }}</button>
      </div>
    </div>

    <div class="col-12" *ngIf="!editMode && masjidIntroText">
      <p class="small text-secondary px-1 mb-3">{{ masjidIntroText }}</p>
    </div>
  </ng-container>
</div>
<app-time-picker-dialog
  *ngIf="timePickerTarget"
  [value]="localDetails.timings[timePickerTarget.index][timePickerTarget.field] || ''"
  [title]="timePickerTitle"
  [use24h]="use24h"
  (confirmed)="onTimePicked($event)"
  (cancelled)="timePickerTarget = null"></app-time-picker-dialog>
<app-masjid-timing-history
  *ngIf="showTimingHistory && selectedMasjid?.id"
  [masjidId]="selectedMasjid.id"
  [use24h]="use24h"
  (restored)="onTimingsRestored($event)"
  (closed)="showTimingHistory = false"></app-masjid-timing-history>
  `,
  styleUrls: ['./masjid.component.scss']
})
export class MasjidComponent implements OnInit, OnDestroy {
  masjids: any[] = [];
  loading = false;
  detailMode = false;
  createMode = false;
  activeTab: 'all' | 'favorites' = 'all';
  selectedMasjid: any = null;
  localDetails: MasjidLocalDetails = this.createDefaultDetails();
  editMode = false;
  // Shown as branded SweetAlert toasts; setting either one pops the toast.
  private messageText = '';
  private errorText = '';
  get message(): string { return this.messageText; }
  set message(value: string) {
    this.messageText = value;
    if (value) { this.notify.success(value); }
  }
  get errorMessage(): string { return this.errorText; }
  set errorMessage(value: string) {
    this.errorText = value;
    if (value) { this.notify.error(value); }
  }
  currentTime = new Date();
  favoriteMasjidIds: string[] = [];
  qrCodeFile: File | null = null;
  qrCodePreviewUrl = '';
  openMenuId: string | null = null;
  readonly timingFields = ['azan', 'jamat'] as const;
  timePickerTarget: { index: number; field: 'azan' | 'jamat' } | null = null;
  // Address auto-fill (pincode / device location); manual entry always stays possible.
  pincodeAreas: string[] = [];
  addressLookupBusy = false;
  addressStatus: { key: string; tone: 'info' | 'warning' } | null = null;
  private lastLookedUpPincode = '';
  private addressLookupToken = 0;
  // Map pin for the masjid being edited.
  pinBusy = false;
  pinStatus: { key: string; tone: 'info' | 'warning' } | null = null;
  manualPinOpen = false;
  manualLat = '';
  manualLng = '';
  // "Near me" distance filter for the list.
  readonly rangeChoices = RANGE_CHOICES;
  rangeKm = DEFAULT_RANGE_KM;
  locating = false;
  locationFailed = false;
  private nearbyOrigin: AppLocation | null = null;
  /** The favorites tab's masjids, fetched by id (a favorite may be outside the range). */
  private favoriteMasjids: any[] = [];
  favoritesLoading = false;
  private listRequest?: Subscription;
  private favoritesRequest?: Subscription;
  // Next jamat per masjid, recomputed once a minute rather than on every clock tick.
  private nextJamatCache = new Map<string, NextJamat | null>();
  private nextJamatMinute = -1;

  private clockTimer?: ReturnType<typeof setInterval>;

  readonly madhabs = MASJID_MADHABS;
  readonly madhabChoices: Array<MasjidMadhab | null> = [null, ...MASJID_MADHABS];
  showTimingHistory = false;
  boardMenuOpen = false;
  @ViewChild(MasjidGalleryComponent) gallery?: MasjidGalleryComponent;
  // Timing-board capture: the photo is read on the server into a draft the uploader reviews.
  // Any signed-in user may do this; a non-owner can then change only the timings.
  capturing = false;
  savingTimings = false;
  captureErrorKey = '';
  capture: {
    imageUrl: string;
    notes: string;
    readError: string | null;
    /** "<salah>:<field>" for every time the photo changed. */
    changed: Set<string>;
    previousTimings: MasjidTimingRow[];
    wasEditing: boolean;
  } | null = null;

  constructor(
    private ramadanService: RamadanApiService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorageService: LocalStorageService,
    private backNavigation: BackNavigationService,
    private addressLookup: AddressLookupService,
    private locationService: LocationService,
    private settingsService: SettingsService,
    public i18n: AppTranslateService,
    private seoService: SeoService,
    private notify: NotifyService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    const savedRange = Number(this.localStorageService.getItem<number>(RANGE_STORAGE_KEY));
    this.rangeKm = RANGE_CHOICES.includes(savedRange) ? savedRange : DEFAULT_RANGE_KM;
    this.clockTimer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      const masjidId = params.get('id');
      const citySlug = params.get('city');
      const slug = params.get('slug');
      this.createMode = this.router.url.split('?')[0] === '/masjid/new';
      const lookup: MasjidLookup | null = citySlug && slug
        ? { city: citySlug, slug }
        : masjidId && !this.createMode ? { id: masjidId } : null;
      this.detailMode = !!lookup || this.createMode;
      // Old "?fullscreen=1" links (possibly bookmarked on masjid screens) now open the display.
      if (masjidId && !this.createMode && queryParams.get('fullscreen') === '1') {
        void this.router.navigate(['/masjid-display', masjidId], { replaceUrl: true });
        return;
      }
      this.loadMasjids(lookup);
    });
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
    this.listRequest?.unsubscribe();
    this.favoritesRequest?.unsubscribe();
    this.document.getElementById(MASJID_SCHEMA_ID)?.remove();
  }

  get isOwner(): boolean {
    if (this.createMode) {
      return true;
    }

    return this.canEditMasjid(this.selectedMasjid);
  }

  /** Board-photo timings: the owner, or any signed-in user once the masjid is approved. */
  get canUploadTimings(): boolean {
    return !this.createMode && this.isLoggedIn && (this.isOwner || this.selectedMasjid?.canUploadTimings === true);
  }

  /** The timing table is editable while the owner edits, or while a board photo is reviewed. */
  get editingTimings(): boolean {
    return this.editMode || !!this.capture;
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
    // The address card below the header already shows it in detail mode.
    return '';
  }

  get filteredMasjids(): any[] {
    if (!this.isLoggedIn || this.activeTab === 'all') {
      return this.masjids;
    }

    return this.favoriteMasjids.filter((masjid) => this.isFavoriteMasjid(masjid));
  }

  get listLoading(): boolean {
    return this.activeTab === 'favorites' ? this.favoritesLoading : this.loading;
  }

  /** True when the list on screen is limited to masjids within rangeKm of the user. */
  get isRangeApplied(): boolean {
    return !!this.rangeKm && !!this.nearbyOrigin;
  }

  /** 0 when already at the widest range. */
  get nextWiderRange(): number {
    return RANGE_CHOICES.find((km) => km > this.rangeKm) ?? 0;
  }

  get hasAnyTiming(): boolean {
    return this.detailTimings.some((timing) => !!(timing.azan || timing.jamat));
  }

  get availableFacilities(): string[] {
    const d = this.localDetails;
    const items: [boolean, string][] = [
      [d.facilities.wazuKhana, 'Wazu Khana'],
      [d.facilities.toilet, 'Toilet'],
      [d.facilities.guslKhana, 'Gusl Khana'],
      [d.facilities.airConditioners, 'Air Conditioners'],
      [d.facilities.chairs, 'Chairs'],
    ];
    return items.filter(([on]) => !!on).map(([, label]) => label);
  }

  get accessOptions(): string[] {
    const d = this.localDetails;
    const items: [boolean, string][] = [
      [d.stayNearby, 'Stay options nearby'],
      [d.ladiesJamat, 'Ladies jamat'],
      [d.ladiesRamzanAccess, 'Ramzan Isha & Taraweeh for ladies'],
    ];
    return items.filter(([on]) => !!on).map(([, label]) => label);
  }

  get qrDisplayUrl(): string {
    return this.qrCodePreviewUrl || this.localDetails.qrCodeUrl || '';
  }

  get headerActions(): ScreenHeaderAction[] {
    if (this.detailMode) {
      const actions: ScreenHeaderAction[] = [
        { id: 'back', icon: 'bi-arrow-left', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.BACK', {}) },
        { id: 'fullscreen', icon: 'bi-arrows-fullscreen', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.OPEN_FULLSCREEN', {}) }
      ];

      if (this.canUploadTimings) {
        actions.push({
          id: 'board',
          icon: 'bi-clock',
          ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.CAPTURE.MENU_LABEL', {}),
          active: this.boardMenuOpen,
          disabled: this.capturing
        });
      }

      if (this.isOwner && !this.createMode) {
        actions.push({
          id: 'photos',
          icon: 'bi-images',
          ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.GALLERY.ADD', {}),
          disabled: (this.selectedMasjid?.images?.length ?? 0) >= (this.selectedMasjid?.maxImages || 10)
        });
      }

      if (this.isOwner) {
        actions.push({ id: 'edit', icon: 'bi-pencil', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.EDIT_MASJID', {}) });
        if (!this.createMode) {
          actions.push({ id: 'delete', icon: 'bi-trash', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.DELETE_MASJID', {}), danger: true });
        }
      }

      return actions;
    }

    return [
      { id: 'back', icon: 'bi-arrow-left', ariaLabel: 'Go back' },
      { id: 'create', icon: 'bi-plus-lg', ariaLabel: this.i18n.translateWithParams('MASJID_PAGE.ADD_MASJID', {}) }
    ];
  }

  onHeaderAction(action: ScreenHeaderAction): void {
    switch (action.id) {
      case 'back':
        // Back closes an open edit form first; otherwise it goes back, never forward.
        if (this.editMode && !this.createMode) {
          this.cancelEdit();
        } else {
          this.backNavigation.back(this.detailMode ? ['/masjid'] : ['/']);
        }
        break;
      case 'create':
        this.startCreate();
        break;
      case 'fullscreen':
        this.openFullScreen();
        break;
      case 'board':
        // Deferred so this same click, bubbling to the document listener, doesn't close it again.
        setTimeout(() => this.boardMenuOpen = !this.boardMenuOpen);
        break;
      case 'photos':
        this.gallery?.openFilePicker();
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

  /** Next jamat today, or tomorrow's first once today's are over. */
  get nextJamat(): NextJamat | null {
    return findNextJamat(this.localDetails.timings, this.currentTime);
  }

  get nextCountdown(): string {
    const next = this.nextJamat;
    if (!next) {
      return '--:--:--';
    }

    const remaining = Math.max(next.at.getTime() - this.currentTime.getTime(), 0);
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

  loadMasjids(lookup: MasjidLookup | null = null): void {
    this.message = '';
    this.addressStatus = null;
    this.pinStatus = null;
    this.manualPinOpen = false;
    this.pincodeAreas = [];
    this.lastLookedUpPincode = '';
    this.loadFavoriteMasjids();

    // A masjid page (often opened straight from search) only needs that masjid.
    if (this.createMode) {
      this.selectedMasjid = this.createNewMasjid();
      this.localDetails = this.createDefaultDetails();
      this.editMode = true;
      return;
    }
    if (lookup) {
      this.loadMasjidDetails(lookup);
      return;
    }

    void this.loadMasjidList();
  }

  setRange(km: number): void {
    this.rangeKm = km;
    this.localStorageService.setItem(RANGE_STORAGE_KEY, km);
    void this.loadMasjidList();
  }

  widenRange(): void {
    this.setRange(this.nextWiderRange);
  }

  /** Asks for the device position again (e.g. after the user allowed location access). */
  retryNearby(): void {
    this.nearbyOrigin = null;
    void this.loadMasjidList();
  }

  /**
   * Masjids within the chosen range of the user, nearest first. Masjids elsewhere are never
   * loaded, so without a position the list stays empty until location is allowed or a city is set.
   */
  private async loadMasjidList(): Promise<void> {
    this.listRequest?.unsubscribe();
    this.loading = true;
    if (!this.nearbyOrigin) {
      this.nearbyOrigin = await this.findNearbyOrigin();
      this.locationFailed = !this.nearbyOrigin;
    }
    // A newer request may have started while waiting for the position.
    this.listRequest?.unsubscribe();

    if (!this.nearbyOrigin) {
      this.masjids = [];
      this.loading = false;
      return;
    }

    const near = { ...this.nearbyOrigin, radiusKm: this.rangeKm };
    this.listRequest = this.ramadanService.masjidList({ near }).subscribe({
      next: (response) => {
        this.masjids = Array.isArray(response) ? response : response?.list ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Where "near me" is measured from: a recent GPS fix, else a fresh one, else the city picked in
   * settings. Null when none is available (the list then stays empty).
   */
  private async findNearbyOrigin(): Promise<AppLocation | null> {
    const recent = this.locationService.getCurrentLocation();
    if (recent) {
      return recent;
    }

    this.locating = true;
    try {
      return await this.locationService.getDevicePosition();
    } catch {
      const city = this.settingsService.getCurrentSettings()?.location?.city?.coordinates;
      return city && Number.isFinite(city.latitude) && Number.isFinite(city.longitude)
        ? { lat: city.latitude, lng: city.longitude }
        : null;
    } finally {
      this.locating = false;
    }
  }

  /** "850 m", "3.2 km", "24 km". */
  formatDistance(km: number): string {
    const value = Number(km);
    if (value < 1) {
      return `${Math.max(Math.round(value * 1000 / 10) * 10, 10)} m`;
    }
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} km`;
  }

  hasPin(masjid: any): boolean {
    return masjid?.latitude != null && masjid?.longitude != null && masjid.latitude !== '' && masjid.longitude !== '';
  }

  pinLabel(masjid: any): string {
    // Show what was saved (up to 7 decimals), not a rounded copy the owner can't match to their input.
    return `${Number(masjid.latitude)}, ${Number(masjid.longitude)}`;
  }

  mapUrl(masjid: any): string {
    return `https://www.google.com/maps/search/?api=1&query=${Number(masjid.latitude)},${Number(masjid.longitude)}`;
  }

  directionsUrl(masjid: any): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(masjid.latitude)},${Number(masjid.longitude)}`;
  }

  /** Pins the masjid at the device's position; meant to be tapped while standing at the masjid. */
  async pinCurrentLocation(): Promise<void> {
    this.pinBusy = true;
    this.pinStatus = { key: 'MASJID_PAGE.PIN.LOCATING', tone: 'info' };
    try {
      const { lat, lng } = await this.locationService.getDevicePosition();
      this.setPin(lat, lng);
      this.pinStatus = { key: 'MASJID_PAGE.PIN.PINNED', tone: 'info' };
    } catch {
      this.pinStatus = { key: 'MASJID_PAGE.PIN.FAILED', tone: 'warning' };
    } finally {
      this.pinBusy = false;
    }
  }

  clearPin(): void {
    this.selectedMasjid.latitude = null;
    this.selectedMasjid.longitude = null;
    this.pinStatus = null;
  }

  openManualPin(): void {
    const pinned = this.hasPin(this.selectedMasjid);
    this.manualLat = pinned ? String(this.selectedMasjid.latitude) : '';
    this.manualLng = pinned ? String(this.selectedMasjid.longitude) : '';
    this.manualPinOpen = true;
  }

  /** A pasted "lat, lng" pair or Google Maps link fills both boxes at once. */
  onCoordinatePaste(event: ClipboardEvent): void {
    const pair = this.parseCoordinates(event.clipboardData?.getData('text') ?? '');
    if (pair) {
      event.preventDefault();
      this.manualLat = String(pair.lat);
      this.manualLng = String(pair.lng);
    }
  }

  applyManualPin(): boolean {
    const latText = String(this.manualLat ?? '');
    const lngText = String(this.manualLng ?? '');
    // A whole "lat, lng" pair may have been typed into either box.
    const pair = this.parseCoordinates(latText) || this.parseCoordinates(lngText);
    const lat = pair ? pair.lat : this.parseCoordinate(latText, 'lat');
    const lng = pair ? pair.lng : this.parseCoordinate(lngText, 'lng');
    if (lat === null || lng === null || (lat === 0 && lng === 0)) {
      this.pinStatus = { key: 'MASJID_PAGE.PIN.INVALID', tone: 'warning' };
      this.notify.warning(this.i18n.translateWithParams('MASJID_PAGE.PIN.INVALID', {}));
      return false;
    }
    this.setPin(lat, lng);
    this.manualPinOpen = false;
    this.pinStatus = { key: 'MASJID_PAGE.PIN.PINNED_MANUAL', tone: 'info' };
    return true;
  }

  /**
   * Reads a coordinate pair: "11.77, 78.20", "11.77° N, 78.20° E", "11°46'31.1"N 78°12'33.6"E"
   * or a Google Maps link (…@11.77,78.20… / ?q=11.77,78.20).
   */
  private parseCoordinates(text: string): { lat: number; lng: number } | null {
    const link = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
      || text.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i);
    if (link) {
      return this.validPair(Number(link[1]), Number(link[2]));
    }
    const clean = this.normalizeCoordinateText(text);
    // Split after a N/S letter, or at a comma, or between two plain numbers.
    const parts = clean.match(/^(.+?[NS])\s*,?\s*(.+)$/i)
      || clean.match(/^([^,]+),\s*(.+)$/)
      || clean.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/);
    if (!parts) {
      return null;
    }
    const lat = this.parseCoordinate(parts[1], 'lat');
    const lng = this.parseCoordinate(parts[2], 'lng');
    return lat !== null && lng !== null ? { lat, lng } : null;
  }

  /** One coordinate as decimal ("12.97", "12.97° N", "-77.5") or degrees/minutes/seconds ("12°58'17.8"N"). */
  private parseCoordinate(text: string, axis: 'lat' | 'lng'): number | null {
    const clean = this.normalizeCoordinateText(text);
    const match = clean.match(/^([+-]?)(\d+(?:\.\d+)?)(?:°\s*(?:(\d+(?:\.\d+)?)'\s*(?:(\d+(?:\.\d+)?)"?)?)?)?\s*([NSEW])?$/i);
    if (!match) {
      return null;
    }
    const [, sign, deg, min, sec, hemi] = match;
    let value = Number(deg) + Number(min || 0) / 60 + Number(sec || 0) / 3600;
    if (sign === '-' || (hemi && /[SW]/i.test(hemi))) {
      value = -value;
    }
    if (hemi && (axis === 'lat') !== /[NS]/i.test(hemi)) {
      return null;
    }
    const limit = axis === 'lat' ? 90 : 180;
    return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
  }

  private normalizeCoordinateText(text: string): string {
    return String(text ?? '')
      .replace(/[−–—]/g, '-')
      .replace(/[º˚]/g, '°')
      .replace(/[′’‘`]/g, "'")
      .replace(/[″”“]|''/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private validPair(lat: number, lng: number): { lat: number; lng: number } | null {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  }

  private setPin(lat: number, lng: number): void {
    this.selectedMasjid.latitude = Number(lat.toFixed(7));
    this.selectedMasjid.longitude = Number(lng.toFixed(7));
    this.manualLat = String(this.selectedMasjid.latitude);
    this.manualLng = String(this.selectedMasjid.longitude);
  }

  openDetails(masjid: any): void {
    const id = this.getMasjidId(masjid);
    if (id) {
      void this.router.navigateByUrl(this.masjidLink(masjid));
    }
  }

  setActiveTab(tab: 'all' | 'favorites'): void {
    this.activeTab = tab;
    if (tab === 'favorites') {
      this.loadFavoriteMasjidList();
    }
  }

  /** Favorites are listed wherever they are, so they are fetched by id rather than by distance. */
  private loadFavoriteMasjidList(): void {
    this.favoritesRequest?.unsubscribe();
    if (!this.favoriteMasjidIds.length) {
      this.favoriteMasjids = [];
      this.favoritesLoading = false;
      return;
    }

    this.favoritesLoading = true;
    this.favoritesRequest = this.ramadanService.masjidList({ ids: this.favoriteMasjidIds }).subscribe({
      next: (response) => {
        const masjids: any[] = Array.isArray(response) ? response : response?.list ?? [];
        // Keep the order the user favorited them in.
        this.favoriteMasjids = this.favoriteMasjidIds
          .map((id) => masjids.find((masjid) => this.getMasjidId(masjid) === id))
          .filter((masjid) => !!masjid);
        this.favoritesLoading = false;
      },
      error: () => {
        this.favoritesLoading = false;
      }
    });
  }

  openFullScreen(): void {
    if (!this.selectedMasjid?.id) {
      return;
    }

    void this.router.navigate(['/masjid-display', this.selectedMasjid.id]);
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

    this.router.navigateByUrl(this.masjidLink(masjid)).then(() => {
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

    this.errorMessage = '';
    // Coordinates typed into the manual boxes count even if the owner went straight to Save without Apply.
    if (this.manualPinOpen && (String(this.manualLat ?? '').trim() || String(this.manualLng ?? '').trim())
      && !this.applyManualPin()) {
      return;
    }
    const contactError = this.contactFieldsError();
    if (contactError) {
      this.errorMessage = this.i18n.translateWithParams(contactError, {});
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
    payload.append('madhab', this.selectedMasjid.madhab ?? '');
    payload.append('latitude', this.hasPin(this.selectedMasjid) ? String(this.selectedMasjid.latitude) : '');
    payload.append('longitude', this.hasPin(this.selectedMasjid) ? String(this.selectedMasjid.longitude) : '');
    if (this.capture) {
      // Marks this save as confirmed from the board photo, so the version keeps the photo.
      payload.append('timingCaptureUrl', this.capture.imageUrl);
    }
    payload.append('status', String(this.selectedMasjid.status ?? 1));
    payload.append('email', this.localDetails.email ?? '');
    payload.append('contact', this.localDetails.contact ?? '');
    payload.append('whatsappGroupUrl', this.localDetails.whatsappGroupUrl.trim());
    payload.append('mapUrl', this.localDetails.mapUrl.trim());
    payload.append('imamName', this.localDetails.imamName.trim());
    payload.append('muazzinName', this.localDetails.muazzinName.trim());
    // Signed-out viewers never receive the phones, so only send them when they were loaded.
    if (!this.localDetails.hasHiddenPhones) {
      payload.append('imamPhone', this.localDetails.imamPhone.trim());
      payload.append('muazzinPhone', this.localDetails.muazzinPhone.trim());
    }
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
        this.capture = null;
        this.editMode = false;
        this.createMode = false;
        this.message = this.i18n.translateWithParams('MASJID_PAGE.UPDATED', {});
        void this.router.navigateByUrl(this.masjidLink(response));
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.error || this.i18n.translateWithParams('MASJID_PAGE.CONTACTS.SAVE_FAILED', {});
      }
    });
  }

  /** Leaves edit mode and drops unsaved changes (including a captured draft). */
  cancelEdit(): void {
    this.capture = null;
    this.editMode = false;
    if (this.selectedMasjid?.id) {
      this.loadMasjidDetails({ id: String(this.selectedMasjid.id) });
    }
  }

  pickBoardPhoto(input: HTMLInputElement): void {
    this.boardMenuOpen = false;
    input.click();
  }

  async onBoardPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const masjidId = this.selectedMasjid?.id;
    if (!file || !masjidId) {
      return;
    }

    this.capturing = true;
    this.captureErrorKey = '';
    try {
      const image = await compressImage(file, { maxEdge: BOARD_UPLOAD_MAX_EDGE });
      this.applyCapture(await firstValueFrom(this.ramadanService.captureMasjidTimings(masjidId, image)));
    } catch {
      this.captureErrorKey = 'MASJID_PAGE.CAPTURE.FAILED';
    } finally {
      this.capturing = false;
    }
  }

  /**
   * Fills the timing editor from the photo. Only times the photo actually shows overwrite
   * the current ones; anything it could not read keeps its current value.
   */
  private applyCapture(result: MasjidTimingCapture): void {
    const previousTimings = this.localDetails.timings.map((row) => ({ ...row }));
    const timings = this.mergeTimings(this.localDetails.timings);
    const changed = new Set<string>();

    (result.timings ?? []).forEach((read) => {
      const row = timings.find((timing) => this.normalizeSalahKey(timing.salah) === this.normalizeSalahKey(read.salah));
      if (!row) {
        return;
      }
      this.timingFields.forEach((field) => {
        const value = String(read[field] ?? '').trim();
        if (value && value !== row[field]) {
          row[field] = value;
          changed.add(`${row.salah}:${field}`);
        }
      });
    });

    this.capture = {
      imageUrl: result.imageUrl,
      notes: result.notes,
      readError: result.readError,
      changed,
      previousTimings,
      wasEditing: this.editMode
    };
    this.localDetails.timings = timings;
    this.editMode = this.isOwner;
  }

  /** Save from the photo review card. */
  saveCapture(): void {
    if (this.isOwner) {
      this.saveMasjid();
      return;
    }

    const masjidId = this.selectedMasjid?.id;
    if (!this.capture || !masjidId) {
      return;
    }

    this.savingTimings = true;
    this.ramadanService.saveMasjidTimings(masjidId, this.normalizedTimings, this.capture.imageUrl).subscribe({
      next: (response) => {
        this.savingTimings = false;
        this.selectedMasjid = response;
        this.localDetails = this.mapApiToLocalDetails(response);
        this.capture = null;
        this.message = this.i18n.translateWithParams('MASJID_PAGE.UPDATED', {});
      },
      error: () => {
        this.savingTimings = false;
        this.captureErrorKey = 'MASJID_PAGE.CAPTURE.SAVE_FAILED';
      }
    });
  }

  discardCapture(): void {
    if (!this.capture) {
      return;
    }
    this.localDetails.timings = this.capture.previousTimings;
    this.editMode = this.capture.wasEditing;
    this.capture = null;
  }

  isCapturedCell(salah: string, field: 'azan' | 'jamat'): boolean {
    return !!this.capture?.changed.has(`${salah}:${field}`);
  }

  onTimingsRestored(event: { details: any; versionNo: number }): void {
    this.showTimingHistory = false;
    this.capture = null;
    this.editMode = false;
    this.selectedMasjid = event.details;
    this.localDetails = this.mapApiToLocalDetails(event.details);
    this.message = this.i18n.translateWithParams('MASJID_PAGE.HISTORY.RESTORED', { no: event.versionNo });
  }

  /** Public address of a masjid page, e.g. "/masjid/hyderabad/masjid-e-noor" (id link as fallback). */
  masjidLink(masjid: any): string {
    return masjid?.publicPath || `/masjid/${this.getMasjidId(masjid)}`;
  }

  /** Intro shown under the masjid name; the prerendered page uses the same text. */
  get masjidIntroText(): string {
    return this.selectedMasjid?.publicPath ? masjidIntro(this.selectedMasjid) : '';
  }

  /**
   * Page title, description, canonical and Mosque schema for the public masjid page. Masjids
   * waiting for approval (visible only to their owner) are kept out of search results.
   */
  private applyMasjidSeo(masjid: any): void {
    this.document.getElementById(MASJID_SCHEMA_ID)?.remove();
    if (!masjid?.publicPath || Number(masjid.status) !== 1) {
      this.seoService.setRobots('noindex, follow');
      return;
    }

    const meta = masjidPageMeta(masjid);
    this.seoService.apply({
      title: meta.title,
      description: meta.description,
      canonicalPath: masjid.publicPath,
      image: masjid.images?.[0]?.url
    });

    const schema = this.document.createElement('script');
    schema.id = MASJID_SCHEMA_ID;
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify(masjidPageSchema(masjid));
    this.document.head.appendChild(schema);
  }

  /** Translation key for a madhab value, or '' when unset/unknown. */
  madhabKey(value: unknown): string {
    return value === 'hanafi' ? 'MASJID_PAGE.MADHAB.HANAFI' : value === 'shafi' ? 'MASJID_PAGE.MADHAB.SHAFI' : '';
  }

  deleteMasjid(): void {
    if (!this.selectedMasjid?.id) {
      return;
    }

    this.deleteMasjidRecord(this.selectedMasjid, true);
  }

  async deleteMasjidRecord(masjid: any, fromDetail = false): Promise<void> {
    const id = this.getMasjidId(masjid);
    if (!id || !this.canDeleteMasjid(masjid)) {
      return;
    }

    const name = masjid?.name || masjid?.masjid_name || this.i18n.translateWithParams('MASJID_PAGE.THIS_MASJID', {});
    const confirmed = await this.notify.confirm({
      title: this.i18n.translateWithParams('MASJID_PAGE.DELETE_MASJID', {}),
      text: this.i18n.translateWithParams('MASJID_PAGE.DELETE_CONFIRM', { name }),
      confirmText: this.i18n.translateWithParams('COMMON.DELETE', {}),
      cancelText: this.i18n.translateWithParams('COMMON.CANCEL', {}),
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.ramadanService.deleteMasjid(id).subscribe({
      next: () => {
        this.loading = false;
        this.message = this.i18n.translateWithParams('MASJID_PAGE.DELETED', {});
        this.masjids = this.masjids.filter(item => this.getMasjidId(item) !== id);
        this.favoriteMasjids = this.favoriteMasjids.filter(item => this.getMasjidId(item) !== id);
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

  /** Follows the app's 12h/24h setting; times are still stored as "05:30 AM". */
  get use24h(): boolean {
    return this.settingsService.getCurrentSettings()?.timeFormat === '24h';
  }

  displayTime(value: string | null | undefined): string {
    return value ? formatDisplayTime(value, this.use24h) : '';
  }

  get timePickerTitle(): string {
    if (!this.timePickerTarget) {
      return '';
    }
    const salah = this.localDetails.timings[this.timePickerTarget.index]?.salah?.trim();
    const label = this.i18n.translateWithParams(this.timePickerTarget.field === 'azan' ? 'MASJID_PAGE.AZAN' : 'MASJID_PAGE.JAMAT', {});
    return salah ? `${salah} · ${label}` : label;
  }

  openTimePicker(index: number, field: 'azan' | 'jamat'): void {
    this.timePickerTarget = { index, field };
  }

  onTimePicked(value: string): void {
    const target = this.timePickerTarget;
    this.timePickerTarget = null;
    if (!target) {
      return;
    }
    const row = this.localDetails.timings[target.index];
    if (row) {
      row[target.field] = value;
    }
  }

  removeTimingRow(index: number): void {
    this.localDetails.timings.splice(index, 1);
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

  onPincodeChange(value: string): void {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 6);
    if (digits !== value) {
      // Keep only digits; set after this change cycle so the input reflects it.
      setTimeout(() => this.selectedMasjid.pincode = digits);
    }

    if (!PINCODE_PATTERN.test(digits)) {
      this.lastLookedUpPincode = '';
      return;
    }
    if (digits !== this.lastLookedUpPincode) {
      void this.fillAddressFromPincode(digits);
    }
  }

  async fillAddressFromPincode(pincode: string): Promise<void> {
    this.lastLookedUpPincode = pincode;
    const token = this.beginAddressLookup('MASJID_PAGE.ADDRESS_FORM.LOOKING_UP');
    const suggestion = await this.addressLookup.lookupPincode(pincode);
    if (token !== this.addressLookupToken) {
      return;
    }

    this.addressLookupBusy = false;
    if (!suggestion) {
      this.pincodeAreas = [];
      this.addressStatus = { key: 'MASJID_PAGE.ADDRESS_FORM.PINCODE_NOT_FOUND', tone: 'warning' };
      return;
    }

    // The pincode decides city/state/country; the area is only filled when unambiguous.
    this.applyAddress({ city: suggestion.city, state: suggestion.state, country: suggestion.country });
    this.pincodeAreas = suggestion.areas;
    if (!this.selectedMasjid.area && suggestion.areas.length === 1) {
      this.selectedMasjid.area = suggestion.areas[0];
    }
    this.addressStatus = suggestion.source === 'online'
      ? { key: 'MASJID_PAGE.ADDRESS_FORM.FILLED_PINCODE', tone: 'info' }
      : { key: 'MASJID_PAGE.ADDRESS_FORM.OFFLINE_PARTIAL', tone: 'warning' };
  }

  async fillAddressFromLocation(): Promise<void> {
    const token = this.beginAddressLookup('MASJID_PAGE.ADDRESS_FORM.LOCATING');
    let suggestion: AddressSuggestion | null = null;
    try {
      suggestion = await this.addressLookup.lookupCurrentPosition();
    } catch {
      suggestion = null;
    }
    if (token !== this.addressLookupToken) {
      return;
    }

    this.addressLookupBusy = false;
    if (!suggestion) {
      this.addressStatus = { key: 'MASJID_PAGE.ADDRESS_FORM.LOCATION_FAILED', tone: 'warning' };
      return;
    }

    this.applyAddress(suggestion);
    // The same position pins the masjid on the map, so "near me" searches find it.
    if (suggestion.latitude != null && suggestion.longitude != null) {
      this.setPin(suggestion.latitude, suggestion.longitude);
      this.pinStatus = { key: 'MASJID_PAGE.PIN.PINNED', tone: 'info' };
    }
    if (suggestion.street) {
      this.localDetails.location = suggestion.street;
    }
    if (suggestion.pincode && PINCODE_PATTERN.test(suggestion.pincode)) {
      this.selectedMasjid.pincode = suggestion.pincode;
      this.lastLookedUpPincode = suggestion.pincode;
      // Quietly load the post office names as area choices.
      void this.addressLookup.lookupPincode(suggestion.pincode).then((result) => {
        if (token === this.addressLookupToken) {
          this.pincodeAreas = result?.areas ?? [];
        }
      });
    }
    this.addressStatus = suggestion.source === 'online'
      ? { key: 'MASJID_PAGE.ADDRESS_FORM.FILLED_LOCATION', tone: 'info' }
      : { key: 'MASJID_PAGE.ADDRESS_FORM.OFFLINE_PARTIAL', tone: 'warning' };
  }

  private beginAddressLookup(statusKey: string): number {
    this.addressLookupBusy = true;
    this.addressStatus = { key: statusKey, tone: 'info' };
    return ++this.addressLookupToken;
  }

  /** Copies the fields a lookup found; never blanks a field it did not find. */
  private applyAddress(found: Partial<AddressSuggestion>): void {
    (['area', 'city', 'state', 'country'] as const).forEach((field) => {
      const value = String(found[field] ?? '').trim();
      if (value) {
        this.selectedMasjid[field] = value;
      }
    });
  }

  nextJamatFor(masjid: any): NextJamat | null {
    const minute = Math.floor(this.currentTime.getTime() / 60000);
    if (minute !== this.nextJamatMinute) {
      this.nextJamatMinute = minute;
      this.nextJamatCache.clear();
    }

    const id = this.getMasjidId(masjid);
    if (!this.nextJamatCache.has(id)) {
      this.nextJamatCache.set(id, findNextJamat(masjid?.timings, this.currentTime));
    }
    return this.nextJamatCache.get(id) ?? null;
  }

  isPendingMasjid(masjid: any): boolean {
    return Number(masjid?.status) === 2;
  }

  trackByMasjid = (_index: number, masjid: any): string => this.getMasjidId(masjid);

  toggleMenu(masjid: any, event: Event): void {
    event.stopPropagation();
    const id = this.getMasjidId(masjid);
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  runMenuAction(action: 'edit' | 'delete', masjid: any): void {
    this.openMenuId = null;
    if (action === 'edit') {
      this.openMasjidEditor(masjid);
    } else {
      this.deleteMasjidRecord(masjid);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
    this.boardMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenuId = null;
    this.boardMenuOpen = false;
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
      whatsappGroupUrl: masjid?.whatsappGroupUrl ?? '',
      mapUrl: masjid?.mapUrl ?? '',
      imamName: masjid?.imamName ?? '',
      imamPhone: masjid?.imamPhone ?? '',
      muazzinName: masjid?.muazzinName ?? '',
      muazzinPhone: masjid?.muazzinPhone ?? '',
      hasHiddenPhones: !!masjid?.hasHiddenPhones,
      location: masjid?.location ?? masjid?.address ?? '',
      // Hidden in the UI; carried through so saving keeps any stored value.
      temperature: masjid?.temperature ?? '',
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

  /** Translation key of the first invalid contact or link, or '' when they are fine. */
  contactFieldsError(): string {
    const d = this.localDetails;
    if (d.whatsappGroupUrl.trim() && !MASJID_CONTACT_PATTERNS.whatsapp.test(d.whatsappGroupUrl.trim())) {
      return 'MASJID_PAGE.CONTACTS.INVALID_WHATSAPP';
    }
    if (d.mapUrl.trim() && !MASJID_CONTACT_PATTERNS.map.test(d.mapUrl.trim())) {
      return 'MASJID_PAGE.CONTACTS.INVALID_MAP';
    }
    for (const phone of [d.imamPhone, d.muazzinPhone]) {
      if (phone.trim() && !MASJID_CONTACT_PATTERNS.phone.test(phone.trim())) {
        return 'MASJID_PAGE.CONTACTS.INVALID_PHONE';
      }
    }
    return '';
  }

  get hasPeopleCard(): boolean {
    const d = this.localDetails;
    return !!(d.imamName || d.imamPhone || d.muazzinName || d.muazzinPhone || d.hasHiddenPhones);
  }

  telLink(phone: string): string {
    return 'tel:' + phone.replace(/[^0-9+]/g, '');
  }

  private createDefaultDetails(): MasjidLocalDetails {
    return {
      email: '',
      contact: '',
      whatsappGroupUrl: '',
      mapUrl: '',
      imamName: '',
      imamPhone: '',
      muazzinName: '',
      muazzinPhone: '',
      hasHiddenPhones: false,
      location: '',
      temperature: '',
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

  private loadMasjidDetails(lookup: MasjidLookup): void {
    this.loading = true;
    const request = 'id' in lookup
      ? this.ramadanService.masjidDetails(lookup.id)
      : this.ramadanService.masjidDetailsBySlug(lookup.city, lookup.slug);
    request.subscribe({
      next: (response) => {
        // Old /masjid/<id> links move to the public /masjid/<city>/<name> address.
        if ('id' in lookup && response?.publicPath && this.router.url.split('?')[0] !== response.publicPath) {
          void this.router.navigateByUrl(response.publicPath, { replaceUrl: true });
          return;
        }
        this.loading = false;
        this.selectedMasjid = response;
        this.localDetails = this.mapApiToLocalDetails(response);
        this.qrCodeFile = null;
        this.qrCodePreviewUrl = '';
        this.applyMasjidSeo(response);
      },
      error: () => {
        this.loading = false;
        this.selectedMasjid = null;
      }
    });
  }

  getMasjidId(masjid: any): string {
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
