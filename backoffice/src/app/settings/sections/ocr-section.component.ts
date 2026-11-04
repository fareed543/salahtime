import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { OcrMeta, OcrProvider, OcrTestResult, OcrValues, SettingsSection, SettingsService } from '../settings.service';

/** Which AI provider reads masjid timing-board photos, with each provider's own key and model. */
@Component({
  selector: 'app-ocr-section',
  templateUrl: './ocr-section.component.html'
})
export class OcrSectionComponent implements OnChanges {
  @Input({ required: true }) section!: SettingsSection<OcrValues, OcrMeta>;
  @Output() saved = new EventEmitter<void>();

  form: OcrValues = OcrSectionComponent.emptyForm();
  showKey = false;
  isSaving = false;
  isTesting = false;
  testResult: OcrTestResult | null = null;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly toast: ToastService
  ) {}

  private static emptyForm(): OcrValues {
    return { provider: 'claude', claude: { apiKey: '', model: '' }, openai: { apiKey: '', model: '' } };
  }

  ngOnChanges(): void {
    this.resetForm();
  }

  get providerOptions(): Array<{ value: OcrProvider; label: string }> {
    return (Object.entries(this.section.meta.providers) as Array<[OcrProvider, string]>)
      .map(([value, label]) => ({ value, label }));
  }

  get selected(): OcrProvider {
    return this.form.provider;
  }

  get selectedLabel(): string {
    return this.section.meta.providers[this.selected];
  }

  get keySet(): boolean {
    return this.section.meta.keys[this.selected].set;
  }

  get keyHint(): string {
    return this.section.meta.keys[this.selected].hint;
  }

  get needsApiKey(): boolean {
    return !this.keySet && !this.form[this.selected].apiKey.trim();
  }

  get isDirty(): boolean {
    const saved = this.section.values;
    return this.form.provider !== saved.provider
      || (['claude', 'openai'] as OcrProvider[]).some((provider) =>
        this.form[provider].apiKey.trim() !== ''
        || this.effectiveModel(provider) !== saved[provider].model);
  }

  providerChanged(): void {
    this.showKey = false;
    this.testResult = null;
  }

  save(): void {
    if (this.needsApiKey) {
      this.toast.error(`Enter the ${this.selectedLabel} API key.`);
      return;
    }

    this.isSaving = true;
    this.settingsService.saveSection<OcrValues, OcrMeta>('ocr', this.payload()).subscribe({
      next: ({ section }) => {
        this.section = section;
        this.resetForm();
        this.toast.success(`OCR settings saved. ${section.meta.providers[section.values.provider]} reads the next timing board; no build or deploy needed.`);
        this.isSaving = false;
        this.saved.emit();
      },
      error: (error) => {
        this.toast.error(error, 'Unable to save settings.');
        this.isSaving = false;
      }
    });
  }

  test(): void {
    if (this.needsApiKey || this.isTesting) {
      return;
    }

    this.isTesting = true;
    this.testResult = null;
    this.settingsService.testOcr(this.payload()).subscribe({
      next: (result) => {
        this.testResult = result;
        this.isTesting = false;
      },
      error: (error) => {
        this.testResult = { ok: false, error: error?.error?.error || 'The connection could not be tested.' };
        this.isTesting = false;
      }
    });
  }

  private resetForm(): void {
    const values = this.section.values;
    this.form = {
      provider: values.provider,
      claude: { apiKey: '', model: values.claude.model },
      openai: { apiKey: '', model: values.openai.model }
    };
    this.showKey = false;
    this.testResult = null;
  }

  /** A blank model means the default, as the API treats it. */
  private effectiveModel(provider: OcrProvider): string {
    return this.form[provider].model.trim() || this.section.meta.defaultModels[provider];
  }

  private payload(): OcrValues {
    return {
      provider: this.form.provider,
      claude: { apiKey: this.form.claude.apiKey.trim(), model: this.effectiveModel('claude') },
      openai: { apiKey: this.form.openai.apiKey.trim(), model: this.effectiveModel('openai') }
    };
  }
}
