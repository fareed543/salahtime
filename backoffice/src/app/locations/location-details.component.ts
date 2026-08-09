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
  auditDetails: { createdAt: string; updatedAt: string } | null = null;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    officialName: [''],
    iso2Code: [''],
    iso3Code: [''],
    numericCode: [''],
    slug: ['', Validators.required],
    defaultTimezone: ['Asia/Kolkata'],
    defaultLanguage: ['en'],
    countryId: [null as number | null],
    code: [''],
    type: ['state'],
    timezone: ['Asia/Kolkata'],
    publicId: [''],
    stateId: [null as number | null],
    latitude: [null as number | null],
    longitude: [null as number | null],
    cityType: ['city'],
    searchAliases: [''],
    isFeatured: [false],
    sortOrder: [0],
    status: [true]
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
      if (this.kind === 'cities') {
        this.form.patchValue({ stateId: null }, { emitEvent: false });
        this.loadStates(Number(countryId || 0));
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
    const noun = this.kind === 'countries' ? 'Country' : this.kind === 'states' ? 'State/Province' : 'City';
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
          this.auditDetails = { createdAt: item.createdAt, updatedAt: item.updatedAt };
          if (this.mode === 'create' && item.id) {
            await this.router.navigate(['/locations', this.kind, item.id, 'edit']);
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

  formatAuditDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not available';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  selectedTimezone(controlName: 'defaultTimezone' | 'timezone'): TimezoneOption | null {
    const value = this.form.get(controlName)?.value;
    return this.timezones.find((timezone) => timezone.value === value) ?? null;
  }

  private loadRecord(id: number): void {
    this.isLoading = true;
    this.locationsService.detail(this.kind, id).subscribe({
      next: (item) => {
        this.patchForm(item);
        this.auditDetails = { createdAt: item.createdAt, updatedAt: item.updatedAt };
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
      officialName: item.officialName ?? '',
      iso2Code: item.iso2Code ?? '',
      iso3Code: item.iso3Code ?? '',
      numericCode: item.numericCode ?? '',
      slug: item.slug ?? '',
      defaultTimezone: item.defaultTimezone ?? 'Asia/Kolkata',
      defaultLanguage: item.defaultLanguage ?? 'en',
      countryId: item.countryId ?? null,
      code: item.code ?? '',
      type: item.type ?? 'state',
      timezone: item.timezone || item.defaultTimezone || 'Asia/Kolkata',
      publicId: item.publicId ?? '',
      stateId: item.stateId ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      cityType: item.cityType ?? 'city',
      searchAliases: item.searchAliases ?? '',
      isFeatured: !!item.isFeatured,
      sortOrder: item.sortOrder ?? 0,
      status: !!item.status
    });
  }

  private buildPayload(): any {
    const raw = this.form.getRawValue();
    if (this.kind === 'countries') {
      return {
        name: raw.name,
        officialName: raw.officialName,
        iso2Code: raw.iso2Code,
        iso3Code: raw.iso3Code,
        numericCode: raw.numericCode,
        slug: raw.slug,
        defaultTimezone: raw.defaultTimezone,
        defaultLanguage: raw.defaultLanguage,
        sortOrder: raw.sortOrder,
        status: raw.status
      };
    }

    if (this.kind === 'states') {
      return {
        countryId: raw.countryId,
        name: raw.name,
        officialName: raw.officialName,
        code: raw.code,
        slug: raw.slug,
        type: raw.type,
        timezone: raw.timezone,
        sortOrder: raw.sortOrder,
        status: raw.status
      };
    }

    return {
      publicId: raw.publicId,
      countryId: raw.countryId,
      stateId: raw.stateId,
      name: raw.name,
      officialName: raw.officialName,
      slug: raw.slug,
      latitude: raw.latitude,
      longitude: raw.longitude,
      timezone: raw.timezone,
      cityType: raw.cityType,
      searchAliases: raw.searchAliases,
      isFeatured: raw.isFeatured,
      sortOrder: raw.sortOrder,
      status: raw.status
    };
  }

  private applyValidators(): void {
    const requiredByKind: Record<LocationKind, string[]> = {
      countries: ['name', 'slug', 'iso2Code', 'iso3Code', 'defaultTimezone'],
      states: ['name', 'slug', 'countryId', 'code', 'type'],
      cities: ['name', 'slug', 'countryId', 'stateId', 'publicId', 'latitude', 'longitude', 'timezone', 'cityType']
    };
    Object.keys(this.form.controls).forEach((key) => this.form.get(key)?.clearValidators());
    requiredByKind[this.kind].forEach((key) => this.form.get(key)?.addValidators(Validators.required));
    this.form.get('latitude')?.addValidators([Validators.min(-90), Validators.max(90)]);
    this.form.get('longitude')?.addValidators([Validators.min(-180), Validators.max(180)]);
    Object.keys(this.form.controls).forEach((key) => this.form.get(key)?.updateValueAndValidity({ emitEvent: false }));
  }

  private normalizeKind(value: string | null): LocationKind {
    return value === 'states' || value === 'cities' ? value : 'countries';
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
