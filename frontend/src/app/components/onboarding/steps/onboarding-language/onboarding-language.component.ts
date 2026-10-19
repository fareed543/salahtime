import { Component, EventEmitter, Output } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';

@Component({
  selector: 'app-onboarding-language',
  templateUrl: './onboarding-language.component.html'
})
export class OnboardingLanguageComponent {
  @Output() next = new EventEmitter<void>();

  constructor(public i18n: AppTranslateService) {}

  /**
   * Languages from the back office, each with its English name shown under the native one so every
   * option is recognisable at a glance. Read live: the list can arrive after the screen opens.
   */
  get languages(): { code: string; name: string; englishName: string }[] {
    return this.i18n.availableWithNames();
  }

  trackByCode(_index: number, lang: { code: string }): string {
    return lang.code;
  }
}
