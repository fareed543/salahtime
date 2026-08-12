import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LocationKind, LocationsService, OptionItem, TimezoneOption } from './locations.service';

@Component({
  selector: 'app-location-details',
  templateUrl: './location-details.component.html',
  styleUrls: ['./location-details.component.scss']
})
export class LocationDetailsComponent implements OnInit {
  kind: LocationKind = 'countries';
  mode: 'create' | 'view' | 'edit' = 'create';
  recordId: number | null = null;
  isLoading = false;
  isSaving = false;
  submitted = false;
  feedbackMessage = '';
  errorMessage = '';
  countries: OptionItem[] = [];
  states: OptionItem[] = [];
  timezones: TimezoneOption[] = [];

  readonly form = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    slug: ['', Validators.required],
    timezone: ['Asia/Kolkata'],
    countryId: [null as number | null],
    stateId: [null as number | null],
    geonameId: [null as number | null],
    asciiName: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    population: [0],
    isActive: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly locationsService: LocationsService
  ) {}

  ngOnInit(): void {
    this.kind = this.normalizeKind(this.route.snapshot.paramMap.get('kind'));
    this.mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' ?? 'create';
    this.recordId = Number(this.route.snapshot.paramMap.get('id') || 0) || null;
    this.applyValidators();
    this.loadOptions();

    this.form.get('name')?.valueChanges.subscribe((value) => {
      const slugControl = this.form.get('slug');
      if (this.mode === 'create' && slugControl && !slugControl.dirty) {
        slugControl.setValue(this.slugify(value ?? ''), { emitEvent: false });
      }
    });

    this.form.get('countryId')?.valueChanges.subscribe((countryId) => {
      const normalizedCountryId = Number(countryId || 0);
      if (this.kind === 'states' || this.kind === 'cities') {
        this.applyDefaultTimezoneFromCountry(normalizedCountryId);
      }
      if (this.kind === 'cities') {
        this.form.patchValue({ stateId: null }, { emitEvent: false });
        this.loadStates(normalizedCountryId);
      }
    });

    if (this.recordId) {
      this.loadRecord(this.recordId);
    }

    if (this.mode === 'view') {
      this.form.disable();
    }
  }

  get title(): string {
    const noun = this.kind === 'countries' ? 'Country' : this.kind === 'states' ? 'State' : 'City';
    return `${this.mode === 'create' ? 'Create' : this.mode === 'edit' ? 'Edit' : 'View'} ${noun}`;
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Locations', route: `/locations/${this.kind}` },
      { label: this.title }
    ];
  }

  selectedTimezone(): TimezoneOption | null {
    const value = this.form.get('timezone')?.value;
    return this.timezones.find((timezone) => timezone.value === value) ?? null;
  }

  submit(): void {
    if (this.isReadOnly || this.isSaving) {
      return;
    }

    this.submitted = true;
    this.feedbackMessage = '';
    this.errorMessage = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.isSaving = true;
    this.locationsService.save(this.kind, this.buildPayload(), this.recordId)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: async (item) => {
          this.feedbackMessage = 'Location saved successfully.';
          this.patchForm(item);
          if (this.mode === 'create' && item.id) {
            await this.router.navigate(['/locations', this.kind], {
              queryParams: { created: item.id }
            });
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.error || error?.message || 'Unable to save this location.';
        }
      });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.hasError(errorName);
  }

  private loadRecord(id: number): void {
    this.isLoading = true;
    this.locationsService.detail(this.kind, id).subscribe({
      next: (item) => {
        this.patchForm(item);
        if (this.kind === 'cities') {
          this.loadStates(item.countryId);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load location details.';
        this.isLoading = false;
      }
    });
  }

  private loadOptions(): void {
    this.locationsService.timezoneOptions().subscribe((items) => this.timezones = items);

    if (this.kind !== 'countries') {
      this.locationsService.countryOptions().subscribe((items) => this.countries = items);
    }
    if (this.kind === 'cities') {
      this.loadStates(Number(this.form.get('countryId')?.value || 0));
    }
  }

  private loadStates(countryId: number): void {
    this.locationsService.stateOptions(countryId || null).subscribe((items) => this.states = items);
  }

  private patchForm(item: any): void {
    this.form.patchValue({
      name: item.name ?? '',
      code: item.code ?? '',
      slug: item.slug ?? '',
      timezone: item.timezone ?? 'Asia/Kolkata',
      countryId: item.countryId ?? null,
      stateId: item.stateId ?? null,
      geonameId: item.geonameId ?? null,
      asciiName: item.asciiName ?? '',
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      population: item.population ?? 0,
      isActive: item.isActive ?? true
    });
  }

  private buildPayload(): any {
    const raw = this.form.getRawValue();
    if (this.kind === 'countries') {
      return {
        name: raw.name,
        code: raw.code,
        slug: raw.slug,
        timezone: raw.timezone,
        isActive: raw.isActive
      };
    }

    if (this.kind === 'states') {
      return {
        countryId: raw.countryId,
        name: raw.name,
        code: raw.code,
        slug: raw.slug,
        isActive: raw.isActive
      };
    }

    return {
      geonameId: raw.geonameId,
      countryId: raw.countryId,
      stateId: raw.stateId,
      name: raw.name,
      asciiName: raw.asciiName,
      slug: raw.slug,
      latitude: raw.latitude,
      longitude: raw.longitude,
      timezone: raw.timezone,
      population: raw.population,
      isActive: raw.isActive
    };
  }

  private applyValidators(): void {
    const requiredByKind: Record<LocationKind, string[]> = {
      countries: ['name', 'code', 'slug'],
      states: ['name', 'countryId', 'slug'],
      cities: ['name', 'countryId', 'slug', 'latitude', 'longitude', 'timezone']
    };
    Object.keys(this.form.controls).forEach((key) => this.form.get(key)?.clearValidators());
    requiredByKind[this.kind].forEach((key) => this.form.get(key)?.addValidators(Validators.required));
    this.form.get('latitude')?.addValidators([Validators.min(-90), Validators.max(90)]);
    this.form.get('longitude')?.addValidators([Validators.min(-180), Validators.max(180)]);
    this.form.get('population')?.addValidators([Validators.min(0)]);
    Object.keys(this.form.controls).forEach((key) => this.form.get(key)?.updateValueAndValidity({ emitEvent: false }));
  }

  private applyDefaultTimezoneFromCountry(countryId: number): void {
    if (!countryId || this.mode !== 'create' || this.kind === 'states') {
      return;
    }

    const timezoneControl = this.form.get('timezone');
    const selectedCountry = this.countries.find((item) => item.id === countryId);
    if (!timezoneControl || !selectedCountry?.timezone) {
      return;
    }

    if (!timezoneControl.dirty || !timezoneControl.value) {
      timezoneControl.setValue(selectedCountry.timezone);
    }
  }

  private normalizeKind(value: string | null): LocationKind {
    return value === 'states' || value === 'cities' ? value : 'countries';
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
