import { Component, EventEmitter, Output } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';

// English names shown under each native name so every option is recognisable at a glance.
const ENGLISH_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  'hi-latn': 'Hindi (Roman)',
  te: 'Telugu',
  'te-latn': 'Telugu (Roman)',
  ta: 'Tamil',
  ar: 'Arabic',
  ur: 'Urdu',
  fr: 'French',
  tr: 'Turkish',
  id: 'Indonesian',
  ms: 'Malay',
  es: 'Spanish'
};

@Component({
  selector: 'app-onboarding-language',
  templateUrl: './onboarding-language.component.html'
})
export class OnboardingLanguageComponent {
  @Output() next = new EventEmitter<void>();

  readonly languages: { code: string; name: string; englishName: string }[];

  constructor(public i18n: AppTranslateService) {
    this.languages = this.i18n.availableWithNames().map((lang) => ({
      ...lang,
      englishName: ENGLISH_LANGUAGE_NAMES[lang.code] ?? ''
    }));
  }
}
