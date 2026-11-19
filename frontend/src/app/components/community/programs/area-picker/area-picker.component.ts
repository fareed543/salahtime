import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LocationService } from 'src/app/services/location.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { SettingsService } from 'src/app/services/settings.service';

/** What the program form sends: an existing area id, or a new name + city (created on save). */
export interface AreaChoice {
  id_halqa: number | null;
  area_name: string;
  id_city: number | null;
  area_lat: number | null;
  area_lng: number | null;
  valid: boolean;
}

interface AreaOption {
  id: number;
  name: string;
  id_city: number | null;
  city_name: string | null;
  distance_km: number | null;
  masjid_count: number;
}

/**
 * NF-012 rev: area type-ahead on the program form. Areas are shared and unique per city.
 * Suggests areas near the user's location (nearest first) and, while typing, areas in the chosen
 * city. Text that matches no area becomes a new area in that city when the program is saved.
 */
@Component({
  selector: 'app-area-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  // CR-023: one short line per suggestion, city as a small chip, no help sentences.
  template: `
    <div class="area-picker">
      <div class="area-head">
        <label class="form-label mb-0" for="programAreaInput">{{ 'PROGRAM_PAGE.FORM.AREA' | translate }}</label>
        <span class="area-new-badge" *ngIf="!selectedId && isNew && city">{{ 'AREA_PICKER.NEW_BADGE' | translate }}</span>
        <button type="button" class="area-city-chip" *ngIf="!editingCity" (click)="editingCity = true"
          [attr.aria-label]="('AREA_PICKER.CITY' | translate) + ': ' + (city?.name || ('AREA_PICKER.NO_CITY' | translate)) + ', ' + ('AREA_PICKER.CHANGE_CITY' | translate)">
          <i class="bi bi-geo-alt" aria-hidden="true"></i>{{ city?.name || ('AREA_PICKER.NO_CITY' | translate) }}<i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </div>
      <div class="area-city-edit" *ngIf="editingCity">
        <input class="form-control form-control-sm" autocomplete="off" [attr.aria-label]="'AREA_PICKER.CITY' | translate"
          [placeholder]="'AREA_PICKER.CITY_PLACEHOLDER' | translate" [(ngModel)]="cityQuery" (ngModelChange)="onCityType()">
        <ul class="area-list" *ngIf="cities.length">
          <li *ngFor="let c of cities">
            <button type="button" class="area-option" (click)="pickCity(c)">
              <span class="area-option-name">{{ c.name }}</span><span class="area-option-meta">{{ c.country }}</span>
            </button>
          </li>
        </ul>
      </div>
      <input id="programAreaInput" class="form-control" autocomplete="off" role="combobox"
        aria-controls="programAreaList" [attr.aria-expanded]="open"
        [placeholder]="'AREA_PICKER.PLACEHOLDER_SHORT' | translate"
        [(ngModel)]="query" (ngModelChange)="onType()" (focus)="open = true" (blur)="closeSoon()">
      <ul id="programAreaList" class="area-list" role="listbox" *ngIf="open && (options.length || showAddNew)">
        <li *ngFor="let option of options; trackBy: trackById">
          <button type="button" role="option" class="area-option" [attr.aria-selected]="selectedId === option.id"
            (mousedown)="$event.preventDefault()" (click)="pick(option)">
            <span class="area-option-name">{{ option.name }}</span>
            <span class="area-option-meta">{{ option.city_name }}<ng-container *ngIf="option.distance_km !== null"> · {{ option.distance_km }} km</ng-container></span>
          </button>
        </li>
        <li *ngIf="showAddNew">
          <button type="button" role="option" class="area-option area-option-new" (mousedown)="$event.preventDefault()" (click)="addNew()">
            <span class="area-option-name"><i class="bi bi-plus-circle" aria-hidden="true"></i>{{ 'AREA_PICKER.ADD_SHORT' | translate:{ name: cleanQuery } }}</span>
            <span class="area-option-meta">{{ city?.name }}</span>
          </button>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .area-picker { position: relative; }
    .area-head { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.375rem; }
    .area-city-chip { display: inline-flex; align-items: center; gap: 0.3rem; margin-inline-start: auto; max-width: 60%; padding: 0.1rem 0.6rem; border: 1px solid #cfdcd7; border-radius: 999px; background: #f4f8f6; color: #17352f; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .area-city-chip i { color: #117463; font-size: 0.75rem; }
    .area-city-edit { margin-bottom: 0.5rem; }
    .area-new-badge { padding: 0.05rem 0.5rem; border-radius: 999px; background: rgba(17, 116, 99, 0.12); color: #117463; font-size: 0.75rem; font-weight: 600; }
    .area-list { list-style: none; margin: 0.375rem 0 0; padding: 0; max-height: 15rem; overflow-y: auto; border: 1px solid #cfdcd7; border-radius: 0.6rem; background: #fff; }
    .area-list li + li { border-top: 1px solid #e9efec; }
    .area-option { display: flex; align-items: baseline; gap: 0.5rem; width: 100%; padding: 0.55rem 0.75rem; border: 0; background: none; text-align: start; }
    .area-option:hover, .area-option:focus-visible { background: #f4f8f6; }
    .area-option-name { display: inline-flex; align-items: center; gap: 0.4rem; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .area-option-meta { margin-inline-start: auto; flex: 0 0 auto; font-size: 0.8125rem; color: #5f7470; white-space: nowrap; }
    .area-option-new .area-option-name { color: #117463; }
  `]
})
export class AreaPickerComponent implements OnInit, OnDestroy {
  @Input() areaId: number | null = null;
  @Input() areaName: string | null = null;
  @Input() cityId: number | null = null;
  @Input() cityName: string | null = null;
  @Output() changed = new EventEmitter<AreaChoice>();

  query = '';
  options: AreaOption[] = [];
  selectedId: number | null = null;
  open = false;
  city: { id: number; name: string } | null = null;
  cityFromLocation = false;
  editingCity = false;
  cityQuery = '';
  cities: Array<{ id: number; name: string; country: string }> = [];
  private origin: { lat: number; lng: number } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cityTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private ramadanApi: RamadanApiService,
    private locationService: LocationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.origin = this.findOrigin();
    this.selectedId = this.areaId;
    this.query = this.areaName ?? '';
    this.city = this.cityId ? { id: this.cityId, name: this.cityName ?? '' } : null;
    this.load(true);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (this.cityTimer) {
      clearTimeout(this.cityTimer);
    }
  }

  trackById = (_: number, option: AreaOption): number => option.id;

  get cleanQuery(): string {
    return this.query.trim().replace(/\s+/g, ' ');
  }

  /** Typed text that is not exactly an area in the list. */
  get isNew(): boolean {
    const name = this.cleanQuery.toLowerCase();
    return name.length >= 2 && !this.options.some((o) => o.name.toLowerCase() === name && o.id_city === this.city?.id);
  }

  get showAddNew(): boolean {
    return !this.selectedId && this.isNew && !!this.city;
  }

  onType(): void {
    this.selectedId = null;
    this.open = true;
    this.emit();
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.load(false), 250);
  }

  pick(option: AreaOption): void {
    this.selectedId = option.id;
    this.query = option.name;
    if (option.id_city) {
      this.city = { id: option.id_city, name: option.city_name ?? '' };
      this.cityFromLocation = false;
    }
    this.open = false;
    this.emit();
  }

  addNew(): void {
    this.query = this.cleanQuery;
    this.open = false;
    this.emit();
  }

  closeSoon(): void {
    setTimeout(() => this.open = false, 150);
  }

  onCityType(): void {
    if (this.cityTimer) {
      clearTimeout(this.cityTimer);
    }
    const term = this.cityQuery.trim();
    if (term.length < 2) {
      this.cities = [];
      return;
    }
    this.cityTimer = setTimeout(() => {
      this.ramadanApi.citySearch(term).subscribe({ next: (r) => this.cities = r?.list ?? [], error: () => this.cities = [] });
    }, 250);
  }

  pickCity(c: { id: number; name: string }): void {
    this.city = { id: c.id, name: c.name };
    this.cityFromLocation = false;
    this.editingCity = false;
    this.cities = [];
    this.cityQuery = '';
    this.selectedId = null;
    this.emit();
    this.load(false);
  }

  private load(first: boolean): void {
    const term = this.cleanQuery;
    this.ramadanApi.areaSuggest({
      lat: this.origin?.lat, lng: this.origin?.lng,
      q: first && this.selectedId ? '' : term,
      idCity: term && !first ? this.city?.id : undefined
    }).subscribe({
      next: (response) => {
        this.options = response?.list ?? [];
        if (!this.city && response?.city) {
          this.city = { id: response.city.id, name: response.city.name };
          this.cityFromLocation = true;
          this.emit();
        }
      },
      error: () => this.options = []
    });
  }

  private emit(): void {
    const name = this.cleanQuery;
    this.changed.emit({
      id_halqa: this.selectedId,
      area_name: this.selectedId ? '' : name,
      id_city: this.city?.id ?? null,
      area_lat: this.origin?.lat ?? null,
      area_lng: this.origin?.lng ?? null,
      valid: !!this.selectedId || (name.length >= 2 && !!this.city)
    });
  }

  /** Last known position, else the city chosen in settings; never prompts for GPS here. */
  private findOrigin(): { lat: number; lng: number } | null {
    const recent = this.locationService.getCurrentLocation();
    if (recent) {
      return recent;
    }
    const c = this.settingsService.getCurrentSettings()?.location?.city?.coordinates;
    return c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) ? { lat: c.latitude, lng: c.longitude } : null;
  }
}
