import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LocationService } from 'src/app/services/location.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { SettingsService } from 'src/app/services/settings.service';

export interface PickedMasjid {
  id: number;
  name: string;
}

interface MasjidOption extends PickedMasjid {
  place: string;
  distanceKm: number | null;
}

/**
 * NF-012: choose "my masjid" from the list (stored as the masjid id, so members link to it).
 * Nearest first when a location is known; type to search by name, area or city.
 */
@Component({
  selector: 'app-masjid-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="masjid-picker">
      <label class="form-label" [for]="inputId">{{ 'MASJID_PICKER.LABEL' | translate }}</label>
      <div class="masjid-picker-selected" *ngIf="selected && !searching; else searchTemplate">
        <span class="masjid-picker-icon" aria-hidden="true"><i class="bi bi-building"></i></span>
        <span class="masjid-picker-name">{{ selected.name }}</span>
        <button type="button" class="btn btn-sm btn-outline-secondary" (click)="startSearch()">{{ 'MASJID_PICKER.CHANGE' | translate }}</button>
      </div>
      <ng-template #searchTemplate>
        <input class="form-control" type="search" [id]="inputId" autocomplete="off"
          [placeholder]="'MASJID_PICKER.PLACEHOLDER' | translate"
          [(ngModel)]="query" [ngModelOptions]="{ standalone: true }" (focus)="ensureLoaded()" (ngModelChange)="ensureLoaded()">
        <div class="form-text" *ngIf="legacyText">{{ 'MASJID_PICKER.TYPED_BEFORE' | translate:{ name: legacyText } }}</div>
        <ul class="masjid-picker-list" role="listbox" *ngIf="loaded">
          <li *ngFor="let option of visibleOptions; trackBy: trackById">
            <button type="button" role="option" class="masjid-picker-option" [attr.aria-selected]="selected?.id === option.id" (click)="pick(option)">
              <span class="masjid-picker-option-name">{{ option.name }}</span>
              <span class="masjid-picker-option-meta">
                <ng-container *ngIf="option.place">{{ option.place }}</ng-container>
                <ng-container *ngIf="option.distanceKm !== null"> · {{ option.distanceKm < 10 ? option.distanceKm.toFixed(1) : (option.distanceKm | number:'1.0-0') }} km</ng-container>
              </span>
            </button>
          </li>
          <li *ngIf="!visibleOptions.length" class="masjid-picker-empty">{{ 'MASJID_PICKER.NONE' | translate }}</li>
        </ul>
        <div class="d-flex gap-2 mt-2" *ngIf="selected || allowClear">
          <button *ngIf="selected" type="button" class="btn btn-sm btn-link px-0" (click)="searching = false">{{ 'MASJID_PICKER.KEEP' | translate }}</button>
          <button *ngIf="allowClear && selected" type="button" class="btn btn-sm btn-link px-0 text-danger" (click)="clear()">{{ 'MASJID_PICKER.CLEAR' | translate }}</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .masjid-picker-selected { display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.75rem; border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 0.5rem; }
    .masjid-picker-icon { color: var(--adminuiux-theme-1, #0d6efd); }
    .masjid-picker-name { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
    .masjid-picker-list { list-style: none; margin: 0.5rem 0 0; padding: 0; max-height: 16rem; overflow-y: auto; border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 0.5rem; }
    .masjid-picker-option { display: flex; flex-direction: column; align-items: flex-start; width: 100%; padding: 0.5rem 0.75rem; border: 0; background: none; text-align: start; }
    .masjid-picker-option:hover, .masjid-picker-option:focus-visible { background: var(--bs-tertiary-bg, #f8f9fa); }
    li + li .masjid-picker-option { border-top: 1px solid var(--bs-border-color-translucent, rgba(0,0,0,.08)); }
    .masjid-picker-option-name { font-weight: 600; }
    .masjid-picker-option-meta, .masjid-picker-empty { font-size: 0.8125rem; color: var(--bs-secondary-color, #6c757d); }
    .masjid-picker-empty { padding: 0.75rem; }
  `]
})
export class MasjidPickerComponent implements OnInit {
  @Input() masjidId: number | null = null;
  @Input() masjidName: string | null = null;
  /** A free-text masjid typed before the picker existed, shown as a hint. */
  @Input() legacyText: string | null = null;
  @Input() allowClear = false;
  @Output() picked = new EventEmitter<PickedMasjid | null>();

  readonly inputId = `masjid-picker-${Math.random().toString(36).slice(2, 8)}`;
  selected: PickedMasjid | null = null;
  searching = false;
  loaded = false;
  query = '';
  private loading = false;
  private options: MasjidOption[] = [];

  constructor(
    private ramadanApi: RamadanApiService,
    private locationService: LocationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.selected = this.masjidId ? { id: this.masjidId, name: this.masjidName || '' } : null;
    this.searching = !this.selected;
  }

  trackById = (_: number, option: MasjidOption): number => option.id;

  get visibleOptions(): MasjidOption[] {
    const term = this.query.trim().toLowerCase();
    const list = term
      ? this.options.filter((option) => `${option.name} ${option.place}`.toLowerCase().includes(term))
      : this.options;
    return list.slice(0, 30);
  }

  startSearch(): void {
    this.searching = true;
    this.ensureLoaded();
  }

  ensureLoaded(): void {
    if (this.loaded || this.loading) {
      return;
    }
    this.loading = true;
    const origin = this.origin();
    this.ramadanApi.masjidList({ background: true }).subscribe({
      next: (response) => {
        const list: any[] = Array.isArray(response) ? response : (response?.list ?? []);
        this.options = list
          .filter((masjid) => Number(masjid?.status ?? 1) === 1)
          .map((masjid) => ({
            id: Number(masjid.id),
            name: String(masjid.name ?? ''),
            place: [masjid.area, masjid.city].filter(Boolean).join(', '),
            distanceKm: origin && masjid.latitude != null && masjid.longitude != null
              ? this.distanceKm(origin.lat, origin.lng, Number(masjid.latitude), Number(masjid.longitude))
              : null
          }))
          .sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE) || a.name.localeCompare(b.name));
        this.loaded = true;
        this.loading = false;
      },
      error: () => {
        this.loaded = true;
        this.loading = false;
      }
    });
  }

  pick(option: PickedMasjid): void {
    this.selected = { id: option.id, name: option.name };
    this.searching = false;
    this.query = '';
    this.picked.emit(this.selected);
  }

  clear(): void {
    this.selected = null;
    this.picked.emit(null);
  }

  private origin(): { lat: number; lng: number } | null {
    const recent = this.locationService.getCurrentLocation();
    if (recent) {
      return recent;
    }
    const city = this.settingsService.getCurrentSettings()?.location?.city?.coordinates;
    return city && Number.isFinite(city.latitude) && Number.isFinite(city.longitude)
      ? { lat: city.latitude, lng: city.longitude }
      : null;
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
