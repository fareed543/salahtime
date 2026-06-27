import { Component, EventEmitter, Output } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';

@Component({
  selector: 'app-onboarding-language',
  templateUrl: './onboarding-language.component.html'
})
export class OnboardingLanguageComponent {
  @Output() next = new EventEmitter<void>();

  constructor(public i18n: AppTranslateService) {}
}
