import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { finalize } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { LocationService } from 'src/app/services/location.service';
import { SettingsService } from 'src/app/services/settings.service';
import { SupportApiService } from 'src/app/services/support-api.service';
import { compressImage } from 'src/app/shared/image-compress';
import { AppTranslateService } from 'src/app/services/translate.service';

/** Same values as SupportTicket::CATEGORIES in the API. */
const CATEGORIES = ['prayer_time', 'notification', 'qibla', 'masjid', 'app_problem', 'suggestion', 'other'] as const;

/** Same limits as app\components\SupportAttachments in the API. */
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** The server keeps 2000px on the long edge; screenshots stay readable at that size. */
const ATTACHMENT_MAX_EDGE = 2000;

interface IssueAttachment {
  id: number;
  name: string;
  blob: Blob;
  /** Object URL for an image preview; null for PDFs. */
  previewUrl: string | null;
}

/**
 * Support Desk: "Report an Issue" form. The page the user came from, platform, app version,
 * language, selected city and prayer settings are attached automatically to help reproduce issues.
 */
@Component({
  selector: 'app-report-issue',
  templateUrl: './report-issue.component.html',
  styleUrls: ['./report-issue.component.scss']
})
export class ReportIssueComponent implements OnDestroy {
  readonly categories = CATEGORIES;
  readonly messageMaxLength = 3000;
  readonly maxAttachments = MAX_ATTACHMENTS;
  readonly maxAttachmentMb = MAX_ATTACHMENT_BYTES / 1024 / 1024;

  attachments: IssueAttachment[] = [];
  preparingFiles = false;
  attachmentError: { key: string; params?: Record<string, unknown> } | null = null;
  private nextAttachmentId = 1;

  readonly form = this.fb.nonNullable.group({
    category: ['', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(this.messageMaxLength)]],
    name: ['', Validators.maxLength(120)],
    email: ['', [Validators.email, Validators.maxLength(190)]],
    website: ['']
  });

  submitting = false;
  submitted = false;
  reference: string | null = null;
  errorMessage = '';

  // Captured while navigating here, before the route changes.
  private readonly fromUrl: string | null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private supportApi: SupportApiService,
    private authApi: AuthApiService,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private i18n: AppTranslateService,
  ) {
    this.fromUrl = this.route.snapshot.queryParamMap.get('from')
      ?? this.router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString()
      ?? null;

    const category = this.route.snapshot.queryParamMap.get('category');
    if (category && (CATEGORIES as readonly string[]).includes(category)) {
      this.form.controls.category.setValue(category);
    }

    const user = this.authApi.userInfo;
    if (user) {
      const name = [user['firstname'], user['lastname']].filter(Boolean).join(' ').trim();
      this.form.patchValue({ name, email: String(user['email'] ?? '') });
    }
  }

  ngOnDestroy(): void {
    this.attachments.forEach(attachment => this.releasePreview(attachment));
  }

  /** Adds picked files: images are shrunk on the device first, PDFs are sent as they are. */
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) {
      return;
    }

    this.attachmentError = null;
    this.preparingFiles = true;
    try {
      for (const file of files) {
        if (this.attachments.length >= MAX_ATTACHMENTS) {
          this.attachmentError = { key: 'REPORT_ISSUE.ATTACH_TOO_MANY', params: { count: MAX_ATTACHMENTS } };
          break;
        }

        const isImage = file.type.startsWith('image/');
        if (!isImage && file.type !== 'application/pdf') {
          this.attachmentError = { key: 'REPORT_ISSUE.ATTACH_UNSUPPORTED', params: { name: file.name } };
          continue;
        }

        const blob = isImage ? await compressImage(file, { maxEdge: ATTACHMENT_MAX_EDGE }) : file;
        if (blob.size > MAX_ATTACHMENT_BYTES) {
          this.attachmentError = { key: 'REPORT_ISSUE.ATTACH_TOO_LARGE', params: { name: file.name, mb: this.maxAttachmentMb } };
          continue;
        }

        this.attachments.push({
          id: this.nextAttachmentId++,
          // A shrunk image is re-encoded as JPEG, so its name says so.
          name: blob !== file && blob.type === 'image/jpeg' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name,
          blob,
          previewUrl: isImage ? URL.createObjectURL(blob) : null
        });
      }
    } finally {
      this.preparingFiles = false;
    }
  }

  removeAttachment(attachment: IssueAttachment): void {
    this.releasePreview(attachment);
    this.attachments = this.attachments.filter(item => item.id !== attachment.id);
    this.attachmentError = null;
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  trackByAttachment(_index: number, attachment: IssueAttachment): number {
    return attachment.id;
  }

  private releasePreview(attachment: IssueAttachment): void {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }

  get messageLength(): number {
    return this.form.controls.message.value.length;
  }

  showError(control: 'category' | 'message' | 'email'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting = true;
    this.supportApi.submitIssue({
      category: value.category,
      message: value.message.trim(),
      name: value.name.trim() || undefined,
      email: value.email.trim() || undefined,
      website: value.website,
      pageUrl: this.fromUrl ?? undefined,
      platform: Capacitor.getPlatform(),
      appVersion: environment.appVersion,
      language: this.i18n.current(),
      location: this.locationLabel() || undefined,
      context: this.settingsContext()
    }, this.attachments.map(attachment => ({ blob: attachment.blob, name: attachment.name }))).pipe(finalize(() => { this.submitting = false; })).subscribe({
      next: response => {
        this.reference = response.reference;
        this.submitted = true;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 429) {
          this.errorMessage = 'REPORT_ISSUE.ERROR_TOO_MANY';
        } else if (error.status === 422 && error.error?.errors?.attachments) {
          this.errorMessage = 'REPORT_ISSUE.ATTACH_REJECTED';
        } else if (error.status === 422) {
          this.errorMessage = 'REPORT_ISSUE.ERROR_INVALID';
        } else if (error.status === 0) {
          this.errorMessage = 'REPORT_ISSUE.ERROR_OFFLINE';
        } else {
          this.errorMessage = 'REPORT_ISSUE.ERROR_GENERIC';
        }
      }
    });
  }

  reportAnother(): void {
    const { name, email } = this.form.getRawValue();
    this.form.reset({ category: '', message: '', name, email, website: '' });
    this.attachments.forEach(attachment => this.releasePreview(attachment));
    this.attachments = [];
    this.attachmentError = null;
    this.submitted = false;
    this.reference = null;
  }

  private locationLabel(): string {
    const settings = this.settingsService.getCurrentSettings();
    return this.locationService.formatLocationLabel(settings?.location?.city ?? settings?.city ?? null);
  }

  /** Prayer settings that explain most "wrong time" reports. */
  private settingsContext(): Record<string, unknown> {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings) {
      return {};
    }

    const offsets: Record<string, number> = {};
    (['sahri', 'fajr', 'dhuhr', 'asr', 'iftar', 'maghrib', 'isha'] as const).forEach(key => {
      const value = Number((settings as unknown as Record<string, unknown>)[`${key}Offset`] ?? 0);
      if (value) {
        offsets[key] = value;
      }
    });

    return {
      calculation_method: settings.calculationMethod,
      madhab: settings.madhab,
      location_mode: settings.locationMode,
      time_format: settings.timeFormat,
      hijri_offset: settings.hijriOffset || 0,
      offsets_minutes: Object.keys(offsets).length ? offsets : 'none',
      screen: `${window.innerWidth}x${window.innerHeight}`
    };
  }
}
