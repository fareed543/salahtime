import { Component, OnInit } from '@angular/core';
import {
  AdminAppVersionItem,
  AppVersionsService,
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
  historyItems: AdminAppVersionItem[] = [];
  isLoading = true;
  isSaving = false;
  activatingVersionId: number | null = null;
  deletingVersionId: number | null = null;
  errorMessage = '';
  feedbackMessage = '';
  form: AppVersionFormValue = this.createEmptyForm();
  selectedVersionId: number | null = null;
  isCreatingNew = false;

  constructor(private readonly appVersionsService: AppVersionsService) {}

  ngOnInit(): void {
    this.loadVersions();
  }

  loadVersions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.appVersionsService.getAppVersions().subscribe({
      next: (response) => {
        this.applyResponse(response, response.current?.id ?? null);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || error?.message || 'Unable to load app version settings right now.';
        this.isLoading = false;
      }
    });
  }

  save(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.appVersionsService.saveAppVersion(payload).subscribe({
      next: (response) => {
        this.applyResponse(response, response.current?.id ?? null);
        this.isSaving = false;
        this.isCreatingNew = false;
        this.feedbackMessage = 'App update configuration saved successfully.';
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.error || error?.message || 'Unable to save app version settings.';
      }
    });
  }

  selectHistoryItem(item: AdminAppVersionItem): void {
    this.selectedVersionId = item.id;
    this.isCreatingNew = false;
    this.form = this.mapItemToForm(item);
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  startFresh(): void {
    this.selectedVersionId = null;
    this.isCreatingNew = true;
    this.form = this.createEmptyForm();
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    if (this.selectedVersionId !== null) {
      const selectedItem = this.historyItems.find((item) => item.id === this.selectedVersionId) ?? null;
      if (selectedItem) {
        this.form = this.mapItemToForm(selectedItem);
        this.isCreatingNew = false;
      }
    } else {
      const activeItem = this.historyItems.find((item) => item.isActive) ?? null;
      this.form = this.mapItemToForm(activeItem);
      this.selectedVersionId = activeItem?.id ?? null;
      this.isCreatingNew = false;
    }

    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  activateVersion(item: AdminAppVersionItem, event?: Event): void {
    event?.stopPropagation();
    if (item.isActive || this.activatingVersionId !== null || this.deletingVersionId !== null) {
      return;
    }

    this.activatingVersionId = item.id;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.appVersionsService.activateAppVersion(item.id).subscribe({
      next: (response) => {
        this.applyResponse(response, item.id);
        this.activatingVersionId = null;
        this.isCreatingNew = false;
        this.feedbackMessage = `Version ${item.version} is now active.`;
      },
      error: (error) => {
        this.activatingVersionId = null;
        this.errorMessage = error?.error?.error || error?.message || 'Unable to activate the selected app version.';
      }
    });
  }

  deleteVersion(item: AdminAppVersionItem, event?: Event): void {
    event?.stopPropagation();
    if (item.isActive || this.deletingVersionId !== null || this.activatingVersionId !== null) {
      return;
    }

    const confirmed = window.confirm(`Delete version ${item.version}?`);
    if (!confirmed) {
      return;
    }

    this.deletingVersionId = item.id;
    this.errorMessage = '';
    this.feedbackMessage = '';

    this.appVersionsService.deleteAppVersion(item.id).subscribe({
      next: (response) => {
        this.applyResponse(response, response.current?.id ?? null);
        this.deletingVersionId = null;
        this.isCreatingNew = false;
        this.feedbackMessage = `Version ${item.version} deleted successfully.`;
      },
      error: (error) => {
        this.deletingVersionId = null;
        this.errorMessage = error?.error?.error || error?.message || 'Unable to delete the selected app version.';
      }
    });
  }

  isSelected(item: AdminAppVersionItem): boolean {
    return this.selectedVersionId === item.id;
  }

  trackByVersionId(_: number, item: AdminAppVersionItem): number {
    return item.id;
  }

  private applyResponse(
    response: { current: AdminAppVersionItem | null; items: AdminAppVersionItem[] },
    preferredSelectionId: number | null
  ): void {
    this.historyItems = response.items ?? [];

    const selectedItem = preferredSelectionId === null
      ? null
      : this.historyItems.find((item) => item.id === preferredSelectionId) ?? null;
    const fallbackItem = selectedItem ?? response.current ?? this.historyItems[0] ?? null;

    this.selectedVersionId = fallbackItem?.id ?? null;
    this.form = this.mapItemToForm(fallbackItem);
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
}
