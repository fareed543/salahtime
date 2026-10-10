import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { SettingsSection, SettingsService, SmsProviderMeta, SmsProviderValues } from '../settings.service';

@Component({
  selector: 'app-sms-provider-section',
  templateUrl: './sms-provider-section.component.html'
})
export class SmsProviderSectionComponent implements OnChanges {
  @Input({ required: true }) section!: SettingsSection<SmsProviderValues, SmsProviderMeta>;
  @Output() saved = new EventEmitter<void>();

  form: SmsProviderValues = { provider: 'none', apiKey: '', otpTemplate: '' };
  showKey = false;
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';

  constructor(private readonly settingsService: SettingsService) {}

  ngOnChanges(): void {
    this.form = { ...this.section.values, apiKey: '' };
  }

  get providerOptions(): Array<{ value: string; label: string }> {
    return Object.entries(this.section.meta.providers).map(([value, label]) => ({ value, label }));
  }

  get needsApiKey(): boolean {
    return this.form.provider === '2factor' && !this.section.meta.apiKeySet && !this.form.apiKey.trim();
  }

  get isDirty(): boolean {
    return this.form.provider !== this.section.values.provider
      || this.form.otpTemplate.trim() !== this.section.values.otpTemplate
      || this.form.apiKey.trim() !== '';
  }

  save(): void {
    this.errorMessage = '';
    this.feedbackMessage = '';
    if (this.needsApiKey) {
      this.errorMessage = 'Enter the 2Factor API key.';
      return;
    }

    this.isSaving = true;
    const payload: SmsProviderValues = {
      provider: this.form.provider,
      apiKey: this.form.apiKey.trim(),
      otpTemplate: this.form.otpTemplate.trim()
    };
    this.settingsService.saveSection<SmsProviderValues, SmsProviderMeta>('smsProvider', payload).subscribe({
      next: ({ section }) => {
        this.section = section;
        this.form = { ...section.values, apiKey: '' };
        this.showKey = false;
        this.feedbackMessage = 'SMS provider saved. It is used for the next OTP; no build or deploy needed.';
        this.isSaving = false;
        this.saved.emit();
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to save settings.';
        this.isSaving = false;
      }
    });
  }
}
