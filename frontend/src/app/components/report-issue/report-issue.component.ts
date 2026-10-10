import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { finalize } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthApiService } from 'src/app/services/auth-api.service';
import { LocationService } from 'src/app/services/location.service';
import { SettingsService } from 'src/app/services/settings.service';
import { SupportApiService } from 'src/app/services/support-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';

/** Same values as SupportTicket::CATEGORIES in the API. */
const CATEGORIES = ['prayer_time', 'notification', 'qibla', 'masjid', 'app_problem', 'suggestion', 'other'] as const;

/**
 * Support Desk: "Report an Issue" form. The page the user came from, platform, app version,
 * language, selected city and prayer settings are attached automatically to help reproduce issues.
 */
@Component({
  selector: 'app-report-issue',
  templateUrl: './report-issue.component.html',
  styleUrls: ['./report-issue.component.scss']
})
export class ReportIssueComponent {
  readonly categories = CATEGORIES;
  readonly messageMaxLength = 3000;

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
    }).pipe(finalize(() => { this.submitting = false; })).subscribe({
      next: response => {
        this.reference = response.reference;
        this.submitted = true;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 429) {
          this.errorMessage = 'REPORT_ISSUE.ERROR_TOO_MANY';
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
