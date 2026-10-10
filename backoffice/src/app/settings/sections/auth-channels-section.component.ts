import { Component, Input, OnChanges } from '@angular/core';
import { AuthChannelMeta, AuthChannelValues, SettingsSection, SettingsService } from '../settings.service';

@Component({
  selector: 'app-auth-channels-section',
  templateUrl: './auth-channels-section.component.html'
})
export class AuthChannelsSectionComponent implements OnChanges {
  @Input({ required: true }) section!: SettingsSection<AuthChannelValues, AuthChannelMeta>;

  form: AuthChannelValues = { email: true, mobile: false };
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';

  constructor(private readonly settingsService: SettingsService) {}

  ngOnChanges(): void {
    this.form = { ...this.section.values };
  }

  get noChannelSelected(): boolean {
    return !this.form.email && !this.form.mobile;
  }

  get isDirty(): boolean {
    return this.form.email !== this.section.values.email || this.form.mobile !== this.section.values.mobile;
  }

  save(): void {
    this.errorMessage = '';
    this.feedbackMessage = '';
    if (this.noChannelSelected) {
      this.errorMessage = 'Keep at least one of Email or Mobile active.';
      return;
    }

    this.isSaving = true;
    this.settingsService.saveSection<AuthChannelValues, AuthChannelMeta>('authChannels', this.form).subscribe({
      next: ({ section }) => {
        this.section = section;
        this.form = { ...section.values };
        this.feedbackMessage = 'Login & OTP channels saved.';
        this.isSaving = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to save settings.';
        this.isSaving = false;
      }
    });
  }
}
