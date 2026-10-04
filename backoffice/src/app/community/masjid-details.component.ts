import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CommunityService, MasjidCommitteeItem, MasjidDetail, MasjidTimingItem, OptionItem } from './community.service';

// Timings are stored as display text (e.g. '05:30 AM'), so keep that format rather than <input type=time>.
const TIME_PATTERN = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

const DEFAULT_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', "Jumu'ah"];

export const MASJID_FACILITIES: Array<{ key: string; label: string }> = [
  { key: 'wazuKhana', label: 'Wazu khana' },
  { key: 'toilet', label: 'Toilet' },
  { key: 'guslKhana', label: 'Gusl khana' },
  { key: 'airConditioners', label: 'Air conditioning' },
  { key: 'chairs', label: 'Chairs' },
  { key: 'ladiesJamat', label: 'Ladies jamat' },
  { key: 'stayNearby', label: 'Stay nearby' }
];

@Component({
  selector: 'app-masjid-details',
  templateUrl: './masjid-details.component.html',
  styleUrls: ['./community.scss']
})
export class MasjidDetailsComponent implements OnInit {
  readonly facilities = MASJID_FACILITIES;
  recordId = 0;
  isReadOnly = true;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';
  record: MasjidDetail | null = null;
  halqas: OptionItem[] = [];

  readonly form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    address: [''],
    area: [''],
    city: [''],
    state: [''],
    pincode: [''],
    country: [''],
    idHalqa: [null as number | null],
    status: ['active'],
    email: ['', Validators.email],
    contact: [''],
    location: [''],
    facilities: this.fb.group(Object.fromEntries(MASJID_FACILITIES.map((facility) => [facility.key, [false]]))),
    timings: this.fb.array([]),
    committee: this.fb.array([])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly community: CommunityService
  ) {}

  get timings(): FormArray {
    return this.form.get('timings') as FormArray;
  }

  get committee(): FormArray {
    return this.form.get('committee') as FormArray;
  }

  get title(): string {
    return this.isReadOnly ? (this.record?.name || 'Masjid') : `Edit ${this.record?.name || 'masjid'}`;
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'Masjids', route: '/community/masjids' },
      { label: this.isReadOnly ? 'Details' : 'Edit' }
    ];
  }

  ngOnInit(): void {
    this.community.halqaOptions().subscribe({ next: (options) => this.halqas = options, error: () => this.halqas = [] });

    this.route.paramMap.subscribe((params) => {
      this.recordId = Number(params.get('id'));
      this.isReadOnly = this.route.snapshot.data['mode'] !== 'edit';
      this.feedbackMessage = '';
      this.load();
    });
  }

  hasError(control: string, error: string): boolean {
    const field = this.form.get(control);
    return !!field && field.touched && field.hasError(error);
  }

  addTiming(timing: Partial<MasjidTimingItem> = {}): void {
    this.timings.push(this.fb.group({
      salah: [timing.salah ?? '', Validators.required],
      azan: [timing.azan ?? '', Validators.pattern(TIME_PATTERN)],
      jamat: [timing.jamat ?? '', Validators.pattern(TIME_PATTERN)]
    }));
  }

  addDefaultTimings(): void {
    DEFAULT_PRAYERS.forEach((salah) => this.addTiming({ salah }));
  }

  addMember(member: Partial<MasjidCommitteeItem> = {}): void {
    this.committee.push(this.fb.group({ name: [member.name ?? '', Validators.required], role: [member.role ?? '', Validators.required], phone: [member.phone ?? ''] }));
  }

  timingInvalid(index: number): boolean {
    const row = this.timings.at(index);
    return !!row && row.touched && (row.get('azan')!.invalid || row.get('jamat')!.invalid);
  }

  removeAt(array: FormArray, index: number): void {
    array.removeAt(index);
    this.form.markAsDirty();
  }

  submit(): void {
    if (this.isReadOnly || this.isSaving) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage = 'Please fix the highlighted fields.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.community.saveMasjid(this.recordId, this.form.getRawValue())
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => {
          this.feedbackMessage = response.message || 'Masjid saved successfully.';
          void this.router.navigate(['/community/masjids', this.recordId]);
        },
        error: (error) => this.errorMessage = error?.error?.error || 'Unable to save the masjid.'
      });
  }

  private load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.community.masjid(this.recordId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (record) => this.patch(record),
        error: (error) => this.errorMessage = error?.error?.error || 'Unable to load the masjid.'
      });
  }

  private patch(record: MasjidDetail): void {
    this.record = record;
    this.timings.clear();
    this.committee.clear();
    (record.timings ?? []).forEach((timing) => this.addTiming(timing));
    (record.committee ?? []).forEach((member) => this.addMember(member));
    this.form.patchValue({
      name: record.name,
      address: record.address,
      area: record.area,
      city: record.city,
      state: record.state,
      pincode: record.pincode,
      country: record.country,
      idHalqa: record.idHalqa,
      status: record.status || (record.isActive ? 'active' : 'inactive'),
      email: record.email,
      contact: record.contact,
      location: record.location,
      facilities: record.facilities ?? {}
    });
    this.form.markAsPristine();
    if (this.isReadOnly) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }
}
