import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { SettingsSection, SettingsService, SmsProviderMeta, SmsProviderValues, SmsTestResult } from '../settings.service';

/** How 2Factor delivers the OTP: a template name means SMS, no template means a voice call. */
type DeliveryChannel = 'voice' | 'sms';

@Component({
  selector: 'app-sms-provider-section',
  templateUrl: './sms-provider-section.component.html'
})
export class SmsProviderSectionComponent implements OnChanges {
  @Input({ required: true }) section!: SettingsSection<SmsProviderValues, SmsProviderMeta>;
  @Output() saved = new EventEmitter<void>();

  form: SmsProviderValues = { provider: 'none', apiKey: '', otpTemplate: '' };
  delivery: DeliveryChannel = 'voice';
  showKey = false;
  isSaving = false;

  testMobile = '';
  isTesting = false;
  testResult: SmsTestResult | null = null;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly toast: ToastService
  ) {}

  ngOnChanges(): void {
    this.form = { ...this.section.values, apiKey: '' };
    this.delivery = this.section.values.otpTemplate ? 'sms' : 'voice';
  }

  get providerOptions(): Array<{ value: string; label: string }> {
    return Object.entries(this.section.meta.providers).map(([value, label]) => ({ value, label }));
  }

  get needsApiKey(): boolean {
    return this.form.provider === '2factor' && !this.section.meta.apiKeySet && !this.form.apiKey.trim();
  }

  get needsTemplate(): boolean {
    return this.form.provider === '2factor' && this.delivery === 'sms' && !this.form.otpTemplate.trim();
  }

  /** The template sent to 2Factor: none for voice calls. */
  private get effectiveTemplate(): string {
    return this.delivery === 'sms' ? this.form.otpTemplate.trim() : '';
  }

  get isDirty(): boolean {
    return this.form.provider !== this.section.values.provider
      || this.effectiveTemplate !== this.section.values.otpTemplate
      || this.form.apiKey.trim() !== '';
  }

  get canTest(): boolean {
    return this.form.provider === '2factor' && !this.needsApiKey && !this.needsTemplate
      && /^[0-9]{10}$/.test(this.testMobile.replace(/\D/g, ''));
  }

  save(): void {
    if (this.needsApiKey) {
      this.toast.error('Enter the 2Factor API key.');
      return;
    }
    if (this.needsTemplate) {
      this.toast.error('Enter the template name, or choose "Voice call".');
      return;
    }

    this.isSaving = true;
    this.settingsService.saveSection<SmsProviderValues, SmsProviderMeta>('smsProvider', this.payload()).subscribe({
      next: ({ section }) => {
        this.section = section;
        this.form = { ...section.values, apiKey: '' };
        this.delivery = section.values.otpTemplate ? 'sms' : 'voice';
        this.showKey = false;
        this.toast.success('SMS provider saved. It is used for the next OTP; no build or deploy needed.');
        this.isSaving = false;
        this.saved.emit();
      },
      error: (error) => {
        this.toast.error(error, 'Unable to save settings.');
        this.isSaving = false;
      }
    });
  }

  sendTest(): void {
    if (!this.canTest || this.isTesting) {
      return;
    }

    this.isTesting = true;
    this.testResult = null;
    this.settingsService.testSms(this.testMobile.replace(/\D/g, ''), this.payload()).subscribe({
      next: (result) => {
        this.testResult = result;
        this.isTesting = false;
      },
      error: (error) => {
        this.testResult = {
          ok: false,
          channel: this.delivery,
          error: error?.error?.error || 'The test could not be sent.'
        };
        this.isTesting = false;
      }
    });
  }

  private payload(): SmsProviderValues {
    return {
      provider: this.form.provider,
      apiKey: this.form.apiKey.trim(),
      otpTemplate: this.effectiveTemplate
    };
  }
}
