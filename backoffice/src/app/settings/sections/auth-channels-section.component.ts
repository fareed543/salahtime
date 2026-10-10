import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AuthChannelMeta, AuthChannelValues, SettingsSection, SettingsService } from '../settings.service';

@Component({
  selector: 'app-auth-channels-section',
  templateUrl: './auth-channels-section.component.html'
})
export class AuthChannelsSectionComponent implements OnChanges {
  @Input({ required: true }) section!: SettingsSection<AuthChannelValues, AuthChannelMeta>;
  /** Other sections depend on this one, so the page reloads them after a save. */
  @Output() saved = new EventEmitter<void>();

  form: AuthChannelValues = { channel: 'email' };
  isSaving = false;
  errorMessage = '';
  feedbackMessage = '';

  constructor(private readonly settingsService: SettingsService) {}

  ngOnChanges(): void {
    this.form = { ...this.section.values };
  }

  get isDirty(): boolean {
    return this.form.channel !== this.section.values.channel;
  }

  save(): void {
    this.errorMessage = '';
    this.feedbackMessage = '';
    this.isSaving = true;
    this.settingsService.saveSection<AuthChannelValues, AuthChannelMeta>('authChannels', this.form).subscribe({
      next: ({ section }) => {
        this.section = section;
        this.form = { ...section.values };
        this.feedbackMessage = `Verification codes are now sent by ${section.values.channel === 'mobile' ? 'SMS' : 'email'}.`;
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
