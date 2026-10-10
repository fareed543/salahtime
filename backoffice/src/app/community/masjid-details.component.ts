import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { BOARD_UPLOAD_MAX_EDGE, GALLERY_UPLOAD_MAX_EDGE, compressImage } from '../shared/image-compress';
import {
  CommunityService,
  MASJID_MADHABS,
  MasjidCommitteeItem,
  MasjidDetail,
  MasjidImage,
  MasjidMadhab,
  MasjidSavePayload,
  MasjidTimingCapture,
  MasjidTimingItem,
  MasjidTimingSource,
  MasjidTimingVersion,
  OptionItem,
  madhabBadgeClass,
  madhabLabel
} from './community.service';

declare const Swal: {
  fire(options: Record<string, unknown>): Promise<{ isConfirmed?: boolean }>;
};

// Timings are stored as display text (e.g. '05:30 AM'), so keep that format rather than <input type=time>.
const TIME_PATTERN = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

const DEFAULT_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', "Jumu'ah"];

// Board readings use Fajr/Dhuhr/Asr/Maghrib/Isha/Juma; rows typed by hand may be spelled differently.
const PRAYER_ALIASES: Record<string, string> = {
  fajr: 'fajr', fajar: 'fajr',
  dhuhr: 'dhuhr', zuhr: 'dhuhr', zohar: 'dhuhr', zuhar: 'dhuhr', duhr: 'dhuhr',
  asr: 'asr',
  maghrib: 'maghrib', magrib: 'maghrib',
  isha: 'isha', esha: 'isha',
  juma: 'juma', jumuah: 'juma', jumma: 'juma', jummah: 'juma', jumah: 'juma'
};

const SOURCE_LABELS: Record<MasjidTimingSource, string> = {
  manual: 'Edited',
  capture: 'From board photo',
  restore: 'Restored',
  admin: 'Edited by admin',
  initial: 'Original'
};

export const MASJID_FACILITIES: Array<{ key: string; label: string }> = [
  { key: 'wazuKhana', label: 'Wazu khana' },
  { key: 'toilet', label: 'Toilet' },
  { key: 'guslKhana', label: 'Gusl khana' },
  { key: 'airConditioners', label: 'Air conditioning' },
  { key: 'chairs', label: 'Chairs' },
  { key: 'ladiesJamat', label: 'Ladies jamat' },
  { key: 'stayNearby', label: 'Stay nearby' }
];

function prayerKey(name: string | null | undefined): string {
  const compact = String(name ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return PRAYER_ALIASES[compact] ?? compact;
}

@Component({
  selector: 'app-masjid-details',
  templateUrl: './masjid-details.component.html',
  styleUrls: ['./community.scss', './masjid-details.component.scss']
})
export class MasjidDetailsComponent implements OnInit, OnDestroy {
  readonly facilities = MASJID_FACILITIES;
  readonly madhabs = MASJID_MADHABS;
  recordId = 0;
  isReadOnly = true;
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';
  record: MasjidDetail | null = null;
  halqas: OptionItem[] = [];

  // Photos save immediately, independent of the form.
  uploadProgress: { done: number; total: number } | null = null;
  deletingImageIds = new Set<number>();

  // Board capture is a draft until the form is saved with timingCaptureUrl.
  isCapturing = false;
  captureReview: (MasjidTimingCapture & { changedCount: number }) | null = null;
  timingCaptureUrl: string | null = null;
  private timingsBeforeCapture: MasjidTimingItem[] | null = null;
  private capturedControls = new Set<AbstractControl>();

  showHistory = false;
  historyLoading = false;
  historyError = '';
  versions: MasjidTimingVersion[] = [];
  restoringVersionId: number | null = null;

  @ViewChild('historyClose') private historyClose?: ElementRef<HTMLButtonElement>;
  private historyOpener: HTMLElement | null = null;

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
    madhab: [''],
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

  get images(): MasjidImage[] {
    return this.record?.images ?? [];
  }

  get maxImages(): number {
    return this.record?.maxImages || 10;
  }

  get canAddImages(): boolean {
    return !this.uploadProgress && this.images.length < this.maxImages;
  }

  get uploadingNumber(): number {
    return this.uploadProgress ? Math.min(this.uploadProgress.done + 1, this.uploadProgress.total) : 0;
  }

  trackByImageId(_: number, image: MasjidImage): number {
    return image.id;
  }

  /** The view route can switch to editing in place (after a board capture), so remember which route we are on. */
  private get routeIsEdit(): boolean {
    return this.route.snapshot.data['mode'] === 'edit';
  }

  ngOnInit(): void {
    this.community.halqaOptions().subscribe({ next: (options) => this.halqas = options, error: () => this.halqas = [] });

    this.route.paramMap.subscribe((params) => {
      this.recordId = Number(params.get('id'));
      this.isReadOnly = !this.routeIsEdit;
      this.feedbackMessage = '';
      this.load();
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  hasError(control: string, error: string): boolean {
    const field = this.form.get(control);
    return !!field && field.touched && field.hasError(error);
  }

  madhabLabel(madhab: MasjidMadhab | null | undefined): string {
    return madhabLabel(madhab);
  }

  madhabBadgeClass(madhab: MasjidMadhab | null | undefined): string {
    return madhabBadgeClass(madhab);
  }

  sourceLabel(source: MasjidTimingSource): string {
    return SOURCE_LABELS[source] ?? source;
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

  /** True when a board capture filled this cell, so it is highlighted for review. */
  isCaptured(row: AbstractControl, field: 'salah' | 'azan' | 'jamat'): boolean {
    const control = row.get(field);
    return !!control && this.capturedControls.has(control);
  }

  removeAt(array: FormArray, index: number): void {
    array.removeAt(index);
    this.form.markAsDirty();
  }

  cancelEdit(): void {
    this.clearCapture();
    if (this.routeIsEdit) {
      void this.router.navigate(['/community/masjids', this.recordId]);
      return;
    }
    // Editing in place on the view route: drop the changes and go back to read-only.
    this.isReadOnly = true;
    this.errorMessage = '';
    if (this.record) {
      this.patch(this.record);
    }
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

    const payload: MasjidSavePayload = this.form.getRawValue();
    if (this.timingCaptureUrl) {
      payload.timingCaptureUrl = this.timingCaptureUrl;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.community.saveMasjid(this.recordId, payload)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => {
          this.clearCapture();
          this.feedbackMessage = response.message || 'Masjid saved successfully.';
          if (this.routeIsEdit) {
            void this.router.navigate(['/community/masjids', this.recordId]);
            return;
          }
          this.isReadOnly = true;
          this.patch(response.item ?? this.record!);
        },
        error: (error) => this.errorMessage = error?.error?.error || 'Unable to save the masjid.'
      });
  }

  // ---- Photos ----

  async onPhotosSelected(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
    input.value = '';
    if (!files.length || !this.record || this.uploadProgress) {
      return;
    }

    const room = this.maxImages - this.images.length;
    const queue = files.slice(0, Math.max(room, 0));
    const failures: string[] = [];
    if (files.length > queue.length) {
      failures.push(`${files.length - queue.length} photo(s) skipped: a masjid can have at most ${this.maxImages} photos.`);
    }

    const progress = { done: 0, total: queue.length };
    this.uploadProgress = progress;
    // One at a time keeps the order predictable and stops cleanly at the server's photo limit.
    for (const file of queue) {
      try {
        const blob = await compressImage(file, { maxEdge: GALLERY_UPLOAD_MAX_EDGE });
        const image = await firstValueFrom(this.community.uploadMasjidImage(this.recordId, blob));
        this.record.images = [...this.images, image];
      } catch (error: any) {
        failures.push(`${file.name}: ${error?.error?.error || error?.message || 'upload failed'}`);
      }
      progress.done += 1;
    }
    this.uploadProgress = null;

    if (failures.length) {
      void Swal.fire({ title: 'Some photos were not added', html: failures.map((line) => this.escape(line)).join('<br>'), icon: 'warning', confirmButtonText: 'OK' });
    }
  }

  async confirmDeleteImage(image: MasjidImage, index: number): Promise<void> {
    const result = await Swal.fire({
      title: `Delete photo ${index + 1}?`,
      text: 'The photo is removed from the masjid page straight away.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      focusCancel: true
    });
    if (!result.isConfirmed) {
      return;
    }

    this.deletingImageIds.add(image.id);
    this.community.deleteMasjidImage(image.id)
      .pipe(finalize(() => this.deletingImageIds.delete(image.id)))
      .subscribe({
        next: () => {
          if (this.record) {
            this.record.images = this.images.filter((item) => item.id !== image.id);
          }
        },
        error: (error) => this.showError('Delete failed', error)
      });
  }

  // ---- Board capture ----

  async onBoardSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isCapturing) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.showError('Not an image', { message: 'Choose a JPEG, PNG or WebP photo of the timing board.' });
      return;
    }

    this.isCapturing = true;
    try {
      const blob = await compressImage(file, { maxEdge: BOARD_UPLOAD_MAX_EDGE });
      const capture = await firstValueFrom(this.community.captureMasjidTimings(this.recordId, blob));
      this.applyCapture(capture);
    } catch (error: any) {
      this.showError('Could not read the photo', error);
    } finally {
      this.isCapturing = false;
    }
  }

  /** Puts the timing rows back the way they were before the board photo was applied. */
  discardCapture(): void {
    if (this.timingsBeforeCapture) {
      this.timings.clear();
      this.timingsBeforeCapture.forEach((timing) => this.addTiming(timing));
    }
    this.clearCapture();
  }

  /** Hides the review panel but keeps the captured values (and photo link) for the next save. */
  acceptCapture(): void {
    this.captureReview = null;
  }

  // ---- Timing history ----

  openHistory(opener?: HTMLElement): void {
    this.historyOpener = opener ?? null;
    this.showHistory = true;
    document.body.classList.add('modal-open');
    setTimeout(() => this.historyClose?.nativeElement.focus());
    this.loadVersions();
  }

  @HostListener('document:keydown.escape')
  closeHistory(): void {
    if (!this.showHistory) {
      return;
    }
    this.showHistory = false;
    document.body.classList.remove('modal-open');
    this.historyOpener?.focus();
  }

  onHistoryBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeHistory();
    }
  }

  async confirmRestore(version: MasjidTimingVersion): Promise<void> {
    const unsaved = !this.isReadOnly && this.form.dirty ? ' Unsaved changes in the form will be discarded.' : '';
    const result = await Swal.fire({
      title: `Restore version ${version.versionNo}?`,
      text: `Make version ${version.versionNo} the current timings? This is saved as a new version, so it can be undone.${unsaved}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Restore',
      cancelButtonText: 'Cancel',
      focusCancel: true
    });
    if (!result.isConfirmed) {
      return;
    }

    this.restoringVersionId = version.id;
    this.community.restoreMasjidTimings(this.recordId, version.id)
      .pipe(finalize(() => this.restoringVersionId = null))
      .subscribe({
        next: (response) => {
          this.clearCapture();
          this.patch(response.item);
          this.closeHistory();
          void Swal.fire({ title: 'Timings restored', text: response.message || `Version ${version.versionNo} is now the current timings.`, icon: 'success', confirmButtonText: 'OK' });
        },
        error: (error) => this.showError('Restore failed', error)
      });
  }

  private loadVersions(): void {
    this.historyLoading = true;
    this.historyError = '';
    this.community.masjidTimingVersions(this.recordId)
      .pipe(finalize(() => this.historyLoading = false))
      .subscribe({
        next: (versions) => this.versions = versions,
        error: (error) => this.historyError = error?.error?.error || 'Unable to load the timing history.'
      });
  }

  /** Fills the standard prayer rows from a board reading, only where the board had a value. */
  private applyCapture(capture: MasjidTimingCapture): void {
    if (this.isReadOnly) {
      this.isReadOnly = false;
      this.form.enable();
    }
    // A second capture still discards back to the timings from before the first one.
    if (!this.timingsBeforeCapture) {
      this.timingsBeforeCapture = this.timings.getRawValue();
    }
    this.capturedControls.clear();
    let changedCount = 0;

    (capture.timings ?? []).forEach((read) => {
      const key = prayerKey(read.salah);
      const standard = DEFAULT_PRAYERS.find((name) => prayerKey(name) === key);
      if (!standard) {
        return;
      }

      let row = this.timings.controls.find((control) => prayerKey(control.get('salah')!.value) === key);
      if (!row) {
        this.addTiming({ salah: standard });
        row = this.timings.at(this.timings.length - 1);
        this.capturedControls.add(row.get('salah')!);
      }

      (['azan', 'jamat'] as const).forEach((field) => {
        const value = String(read[field] ?? '').trim();
        const control = row!.get(field)!;
        if (value && value !== control.value) {
          control.setValue(value);
          this.capturedControls.add(control);
          changedCount += 1;
        }
      });
      row.markAsTouched();
    });

    this.form.markAsDirty();
    this.timingCaptureUrl = capture.imageUrl || null;
    this.captureReview = { ...capture, changedCount };
  }

  private clearCapture(): void {
    this.captureReview = null;
    this.timingCaptureUrl = null;
    this.timingsBeforeCapture = null;
    this.capturedControls.clear();
  }

  private showError(title: string, error: any): void {
    void Swal.fire({
      title,
      text: error?.error?.error || error?.message || 'Unable to complete the request.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
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
    this.record = { ...record, images: record.images ?? [] };
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
      madhab: record.madhab ?? '',
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
