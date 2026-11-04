import { of, throwError } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { OcrMeta, OcrValues, SettingsSection, SettingsService } from '../settings.service';
import { OcrSectionComponent } from './ocr-section.component';

describe('OcrSectionComponent (CR-001)', () => {
  let settingsService: jasmine.SpyObj<SettingsService>;
  let toast: jasmine.SpyObj<ToastService>;

  const section = (overrides: Partial<OcrValues> = {}, openaiKeySet = false): SettingsSection<OcrValues, OcrMeta> => ({
    values: {
      provider: 'claude',
      claude: { apiKey: '', model: 'claude-opus-5-5' },
      openai: { apiKey: '', model: 'gpt-5' },
      ...overrides
    },
    meta: {
      providers: { claude: 'Claude (Anthropic)', openai: 'ChatGPT (OpenAI)' },
      keys: { claude: { set: true, hint: 'ABCD' }, openai: { set: openaiKeySet, hint: openaiKeySet ? 'WXYZ' : '' } },
      defaultModels: { claude: 'claude-opus-5-5', openai: 'gpt-5' }
    },
    updatedAt: null,
    updatedBy: null
  });

  const create = (value = section()) => {
    const component = new OcrSectionComponent(settingsService, toast);
    component.section = value;
    component.ngOnChanges();
    return component;
  };

  beforeEach(() => {
    settingsService = jasmine.createSpyObj('SettingsService', ['saveSection', 'testOcr']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
  });

  it('starts clean with the saved provider and models, keys blank', () => {
    const component = create();
    expect(component.form.provider).toBe('claude');
    expect(component.form.claude).toEqual({ apiKey: '', model: 'claude-opus-5-5' });
    expect(component.isDirty).toBeFalse();
    expect(component.needsApiKey).toBeFalse();
  });

  it('switching to ChatGPT without a saved key needs one and blocks save', () => {
    const component = create();
    component.form.provider = 'openai';
    expect(component.isDirty).toBeTrue();
    expect(component.needsApiKey).toBeTrue();
    component.save();
    expect(toast.error).toHaveBeenCalledWith('Enter the ChatGPT (OpenAI) API key.');
    expect(settingsService.saveSection).not.toHaveBeenCalled();
  });

  it('saves ChatGPT with the typed key, and blank keys for the rest (kept by the API)', () => {
    const saved = section({ provider: 'openai' }, true);
    settingsService.saveSection.and.returnValue(of({ section: saved }) as any);
    const component = create();
    component.form.provider = 'openai';
    component.form.openai.apiKey = '  sk-proj-new-key  ';
    component.form.openai.model = '';
    component.save();

    expect(settingsService.saveSection).toHaveBeenCalledWith('ocr', {
      provider: 'openai',
      claude: { apiKey: '', model: 'claude-opus-5-5' },
      openai: { apiKey: 'sk-proj-new-key', model: 'gpt-5' }
    });
    expect(component.section).toBe(saved);
    expect(component.form.openai.apiKey).toBe('');
    expect(component.isDirty).toBeFalse();
  });

  it('a saved key lets you switch provider without retyping it', () => {
    const component = create(section({}, true));
    component.form.provider = 'openai';
    expect(component.needsApiKey).toBeFalse();
    expect(component.keyHint).toBe('WXYZ');
  });

  it('shows the API error when saving fails', () => {
    settingsService.saveSection.and.returnValue(throwError(() => ({ error: { error: 'bad key' } })));
    const component = create();
    component.form.claude.model = 'claude-sonnet-5-5';
    component.save();
    expect(toast.error).toHaveBeenCalled();
    expect(component.isSaving).toBeFalse();
  });

  it('test connection sends what is on screen and shows the result', () => {
    settingsService.testOcr.and.returnValue(of({ ok: true, message: 'ok' }));
    const component = create();
    component.form.claude.apiKey = 'sk-ant-typed';
    component.test();
    expect(settingsService.testOcr).toHaveBeenCalledWith(jasmine.objectContaining({
      provider: 'claude',
      claude: { apiKey: 'sk-ant-typed', model: 'claude-opus-5-5' }
    }));
    expect(component.testResult).toEqual({ ok: true, message: 'ok' });
  });

  it('test connection failure shows the API message', () => {
    settingsService.testOcr.and.returnValue(throwError(() => ({ error: { ok: false, error: 'The API key was rejected.' } })));
    const component = create();
    component.test();
    expect(component.testResult).toEqual({ ok: false, error: 'The API key was rejected.' });
    expect(component.isTesting).toBeFalse();
  });
});
