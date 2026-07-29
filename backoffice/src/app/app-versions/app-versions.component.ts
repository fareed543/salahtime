import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminAppVersionItem,
  AppVersionsService,
  AdminAppVersionsResponse,
  SaveAdminAppVersionPayload
} from './app-versions.service';

interface AppVersionFormValue {
  version: string;
  versionCode: string;
  mandatory: boolean;
  title: string;
  message: string;
  featuresText: string;
  bugFixesText: string;
  apkUrl: string;
  updateUrl: string;
  playStoreUrl: string;
  releaseDate: string;
}

@Component({
  selector: 'app-app-versions',
  templateUrl: './app-versions.component.html',
  styleUrls: ['./app-versions.component.scss']
})
export class AppVersionsComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';
  form: AppVersionFormValue = this.createEmptyForm();
  mode: 'create' | 'view' | 'edit' = 'create';
  versionId: number | null = null;
  auditDetails: { createdAt: string; updatedAt: string; isActive: boolean } | null = null;

  constructor(
    private readonly appVersionsService: AppVersionsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] as 'create' | 'view' | 'edit' ?? 'create';
    const idParam = this.route.snapshot.paramMap.get('id');
    this.versionId = idParam ? Number(idParam) : null;
    if (this.versionId) {
      this.loadVersion(this.versionId);
      return;
    }

    this.isLoading = false;
  }

  get title(): string {
    if (this.mode === 'edit') {
      return 'Edit App Version';
    }
    if (this.mode === 'view') {
      return 'App Version Details';
    }
    return 'Create App Version';
  }

  get subtitle(): string {
    if (this.mode === 'edit') {
      return 'Update the selected mobile app version configuration.';
    }
    if (this.mode === 'view') {
      return 'Review the selected app version and release configuration.';
    }
    return 'Create a new mobile app version configuration.';
  }

  get isReadOnly(): boolean {
    return this.mode === 'view';
  }

  get breadcrumbs(): Array<{ label: string; route?: string }> {
    return [
      { label: 'Home', route: '/dashboard' },
      { label: 'App Versions', route: '/app-versions' },
      { label: this.title }
    ];
  }

  save(): void {
    if (this.isReadOnly) {
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.appVersionsService.saveAppVersion(payload).subscribe({
      next: async (response) => {
        const nextId = response.selected?.id ?? response.current?.id ?? this.versionId ?? null;
        this.isSaving = false;
        this.feedbackMessage = 'App update configuration saved successfully.';
        if (nextId) {
          await this.router.navigate(['/app-versions', nextId]);
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save app version settings.';
      }
    });
  }

  cancelEdit(): void {
    if (this.versionId) {
      if (this.mode === 'edit') {
        void this.router.navigate(['/app-versions', this.versionId]);
        return;
      }

      this.loadVersion(this.versionId);
      return;
    }

    this.form = this.createEmptyForm();
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  private buildPayload(): SaveAdminAppVersionPayload | null {
    const version = this.form.version.trim();
    if (!version) {
      this.errorMessage = 'Version is required.';
      return null;
    }

    const versionCodeRaw = String(this.form.versionCode ?? '').trim();
    const versionCode = versionCodeRaw === '' ? null : Number(versionCodeRaw);
    if (versionCodeRaw !== '' && Number.isNaN(versionCode)) {
      this.errorMessage = 'Version code must be a valid number.';
      return null;
    }

    return {
      id: this.versionId,
      version,
      versionCode,
      mandatory: this.form.mandatory,
      title: this.form.title.trim(),
      message: this.form.message.trim(),
      features: this.splitLines(this.form.featuresText),
      bugFixes: this.splitLines(this.form.bugFixesText),
      apkUrl: this.form.apkUrl.trim(),
      updateUrl: this.form.updateUrl.trim(),
      playStoreUrl: this.form.playStoreUrl.trim(),
      releaseDate: this.normalizeDateTime(this.form.releaseDate)
    };
  }

  private splitLines(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private mapItemToForm(item: AdminAppVersionItem | null): AppVersionFormValue {
    if (!item) {
      return this.createEmptyForm();
    }

    return {
      version: item.version ?? '',
      versionCode: item.versionCode === null || item.versionCode === undefined ? '' : String(item.versionCode),
      mandatory: !!item.mandatory,
      title: item.title ?? '',
      message: item.message ?? '',
      featuresText: (item.features ?? []).join('\n'),
      bugFixesText: (item.bugFixes ?? []).join('\n'),
      apkUrl: item.apkUrl ?? '',
      updateUrl: item.updateUrl ?? '',
      playStoreUrl: item.playStoreUrl ?? '',
      releaseDate: this.toDateTimeLocalValue(item.releaseDate)
    };
  }

  private createEmptyForm(): AppVersionFormValue {
    return {
      version: '',
      versionCode: '',
      mandatory: false,
      title: 'Update available',
      message: 'A newer Salah Time build is ready to install.',
      featuresText: '',
      bugFixesText: '',
      apkUrl: '',
      updateUrl: '',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.salahtime',
      releaseDate: this.toDateTimeLocalValue(new Date().toISOString())
    };
  }

  private toDateTimeLocalValue(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.replace(' ', 'T').slice(0, 16);
  }

  private normalizeDateTime(value: string): string {
    const normalized = value.trim();
    return normalized ? `${normalized.replace('T', ' ')}:00` : '';
  }

  formatAuditDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  private loadVersion(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.appVersionsService.getAppVersionById(id).subscribe({
      next: (item) => {
        if (!item) {
          this.errorMessage = 'App version not found.';
          this.isLoading = false;
          return;
        }

        this.form = this.mapItemToForm(item);
        this.auditDetails = {
          createdAt: item.createdAt ?? '',
          updatedAt: item.updatedAt ?? '',
          isActive: item.isActive
        };
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load app version settings right now.';
        this.isLoading = false;
      }
    });
  }
}
