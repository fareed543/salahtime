import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotifyService } from 'src/app/services/notify.service';
import { ScreenHeaderAction } from 'src/app/shared/screen-header/screen-header.component';
import { AUTH_LIMITS, nameValidators } from '../../auth/auth-validators';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { PickedMasjid } from 'src/app/shared/masjid-picker/masjid-picker.component';

export const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'student', label: 'Student' },
  { value: 'not_working', label: 'Not working' },
  { value: 'retired', label: 'Retired' }
] as const;

export const PROGRAM_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  volunteer: 'Volunteer',
  subscriber: 'Subscriber'
};

/** Optional profile text limits; mirrored in AuthController::profileValidationError(). */
export const PROFILE_LIMITS = {
  address: 250,
  landmark: 100,
  masjid: 100,
  occupation: 100,
  company_name: 100,
  designation: 100,
  notes: 500
} as const;

// Indian PIN codes: 6 digits, first digit 1-9.
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  readonly limits = AUTH_LIMITS;
  readonly profileLimits = PROFILE_LIMITS;
  loading = false;
  saving = false;
  message = '';
  imagePath = '';
  selectedImage: File | null = null;
  imagePreview = '';
  email = '';
  phone = '';

  readonly form = this.fb.nonNullable.group({
    firstname: ['', nameValidators(AUTH_LIMITS.firstNameMin)],
    // Optional: older accounts may only have a single name.
    lastname: ['', [Validators.maxLength(AUTH_LIMITS.nameMax), Validators.pattern(/^\s*([\p{L}\p{M}][\p{L}\p{M} .'-]*)?$/u)]],
    gender: ['', Validators.required],
    pincode: ['', [Validators.pattern(PINCODE_PATTERN)]],
    address: ['', [Validators.maxLength(PROFILE_LIMITS.address)]],
    landmark: ['', [Validators.maxLength(PROFILE_LIMITS.landmark)]],
    employment_status: [''],
    occupation: ['', [Validators.maxLength(PROFILE_LIMITS.occupation)]],
    company_name: ['', [Validators.maxLength(PROFILE_LIMITS.company_name)]],
    designation: ['', [Validators.maxLength(PROFILE_LIMITS.designation)]],
    notes: ['', [Validators.maxLength(PROFILE_LIMITS.notes)]]
  });

  private flags = {
    accountDeactivation: 1,
    enableOfflineAccess: 0,
    emailNotification: 1
  };

  headerActions: ScreenHeaderAction[] = [];
  readonly employmentOptions = EMPLOYMENT_OPTIONS;
  readonly roleLabels = PROGRAM_ROLE_LABELS;

  // NF-012: masjid is picked from the list and stored as its id.
  masjidId: number | null = null;
  masjidName: string | null = null;
  masjidText: string | null = null;
  pickerReady = false;
  private masjidChanged = false;
  updatedByName: string | null = null;
  updatedAt: string | null = null;
  myPrograms: Array<{ id: string; name: string; role: string }> = [];

  constructor(
    private fb: FormBuilder,
    private authApiService: AuthApiService,
    private localStorageService: LocalStorageService,
    private notify: NotifyService,
    private ramadanApi: RamadanApiService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadMyPrograms();
  }

  get displayName(): string {
    const { firstname, lastname } = this.form.getRawValue();
    return `${firstname} ${lastname}`.trim();
  }

  /** Share of the fields that make a profile useful to a program team. */
  get completion(): number {
    return Math.round(((this.profileChecks.length - this.missingFields.length) / this.profileChecks.length) * 100);
  }

  get nextMissing(): string {
    return this.missingFields[0] ?? '';
  }

  private get profileChecks(): Array<[string, boolean]> {
    const v = this.form.getRawValue();
    return [
      ['photo', !!(this.imagePreview || (this.currentImage && this.currentImage !== 'no-image.jpg'))],
      ['gender', !!v.gender],
      ['masjid', !!this.masjidId],
      ['pincode', !!v.pincode],
      ['address', !!v.address.trim()],
      ['employment status', !!v.employment_status],
      ['occupation', !!v.occupation.trim()]
    ];
  }

  private get missingFields(): string[] {
    return this.profileChecks.filter(([, done]) => !done).map(([name]) => name);
  }

  onMasjidPicked(masjid: PickedMasjid | null): void {
    this.masjidId = masjid?.id ?? null;
    this.masjidName = masjid?.name ?? null;
    this.masjidChanged = true;
    this.form.markAsDirty();
  }

  private loadMyPrograms(): void {
    this.ramadanApi.programList({ background: true }).subscribe({
      next: (response) => {
        const programs: any[] = Array.isArray(response) ? response : [];
        this.myPrograms = programs
          .filter((program) => program?.viewer_role)
          .map((program) => ({ id: String(program.id_program ?? program.id), name: program.name ?? '', role: program.viewer_role }));
      },
      error: () => {
        this.myPrograms = [];
      }
    });
  }

  onHeaderAction(_action: ScreenHeaderAction): void {}

  hasError(controlName: string, error?: string): boolean {
    const control = this.form.get(controlName);
    return !!control && (control.touched || control.dirty) && (error ? control.hasError(error) : control.invalid);
  }

  keepDigits(event: Event, controlName: 'pincode'): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    if (digits !== input.value) {
      this.form.controls[controlName].setValue(digits);
    }
  }

  loadProfile(): void {
    this.loading = true;
    this.message = '';

    this.authApiService.getProfile().subscribe({
      next: (response) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.loading = false;
        this.imagePath = parsed?.imagePath ?? '';
        this.patchForm(parsed?.userData ?? this.localStorageService.getItem<any>('userInfo') ?? {});
      },
      error: () => {
        this.loading = false;
        this.message = 'Unable to load profile right now.';
      }
    });
  }

  saveProfile(): void {
    if (this.saving) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notify.warning('Unable to save. Please correct the highlighted fields.');
      return;
    }

    this.saving = true;
    const values = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? '').trim()])),
      ...this.flags
    };
    // Send the masjid only when it was picked, so an old free-text value is not overwritten by accident.
    if (this.masjidChanged) {
      payload['masjid'] = this.masjidId ? String(this.masjidId) : '';
    }
    if (this.selectedImage) {
      payload['image'] = this.selectedImage;
    }

    this.authApiService.saveProfile(payload).subscribe({
      next: (response) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.saving = false;
        this.notify.success('Profile updated successfully.');
        this.imagePath = parsed?.imagePath ?? this.imagePath;
        this.selectedImage = null;
        this.imagePreview = '';
        this.patchForm(parsed);
        this.syncStoredUser(parsed);
      },
      error: (error) => {
        this.saving = false;
        const body = typeof error?.error === 'string' ? this.tryParse(error.error) : error?.error;
        this.notify.error(body?.message ? `Unable to update profile: ${body.message}.` : 'Unable to update profile right now.');
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notify.warning('Please choose an image file.');
      input.value = '';
      return;
    }

    this.selectedImage = file;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = String(reader.result ?? '');
    reader.readAsDataURL(file);
  }

  get profileImageUrl(): string {
    if (this.imagePreview) {
      return this.imagePreview;
    }

    const image = this.currentImage || this.localStorageService.getItem<any>('userInfo')?.image;
    return image ? `${this.imagePath}${image}` : '';
  }

  private patchForm(user: any): void {
    let firstname = String(user?.firstname ?? '').trim();
    let lastname = String(user?.lastname ?? '').trim();
    // Accounts registered before first/last were stored separately hold the full name in firstname.
    if (!lastname && firstname.includes(' ')) {
      const parts = firstname.split(/\s+/);
      lastname = parts.pop() ?? '';
      firstname = parts.join(' ');
    }

    this.form.reset({
      firstname,
      lastname,
      // Accounts from before NF-012 got 'm' without being asked; leave it empty until confirmed.
      gender: Number(user?.gender_confirmed ?? 1) === 1 ? (user?.gender ?? '') : '',
      pincode: user?.pincode ?? '',
      address: user?.address ?? '',
      landmark: user?.landmark ?? '',
      employment_status: user?.employment_status ?? '',
      occupation: user?.occupation ?? '',
      company_name: user?.company_name ?? '',
      designation: user?.designation ?? '',
      notes: user?.notes ?? ''
    });
    this.email = user?.email ?? '';
    this.phone = user?.phone ?? '';
    this.flags = {
      accountDeactivation: Number(user?.status ?? user?.active ?? 1),
      enableOfflineAccess: Number(user?.offline_access ?? 0),
      emailNotification: Number(user?.email_notification ?? 1)
    };
    this.currentImage = user?.image ?? '';

    const rawMasjid = String(user?.masjid ?? '').trim();
    this.masjidId = user?.masjid_id ? Number(user.masjid_id) : (/^\d+$/.test(rawMasjid) ? Number(rawMasjid) : null);
    this.masjidName = user?.masjid_name ?? null;
    this.masjidText = this.masjidId ? null : (rawMasjid || null);
    this.masjidChanged = false;
    this.updatedByName = user?.profile_updated_by_name ?? null;
    this.updatedAt = user?.profile_updated_at ? String(user.profile_updated_at).replace(' ', 'T') : null;
    // Re-create the picker so it shows the loaded masjid.
    this.pickerReady = false;
    setTimeout(() => this.pickerReady = true);
  }

  private syncStoredUser(user: any): void {
    const stored = this.localStorageService.getItem<any>('userInfo');
    if (!stored || !user) {
      return;
    }
    // Keep it in whichever storage the login used ("remember me" vs session-only).
    const remembered = localStorage.getItem('userInfo') !== null;
    this.localStorageService.setAuthItem('userInfo', {
      ...stored,
      firstname: user.firstname,
      lastname: user.lastname,
      image: user.image ?? stored.image,
      gender: user.gender ?? stored.gender,
      gender_confirmed: user.gender_confirmed ?? stored.gender_confirmed,
      masjid: user.masjid ?? stored.masjid
    }, remembered);
  }

  private tryParse(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private currentImage = '';
}
