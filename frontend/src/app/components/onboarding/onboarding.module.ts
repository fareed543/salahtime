import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { OnboardingConfirmLocationComponent } from './steps/onboarding-confirm-location/onboarding-confirm-location.component';
import { OnboardingLanguageComponent } from './steps/onboarding-language/onboarding-language.component';
import { OnboardingLocationComponent } from './steps/onboarding-location/onboarding-location.component';
import { OnboardingMadhabComponent } from './steps/onboarding-madhab/onboarding-madhab.component';
import { OnboardingNotificationsComponent } from './steps/onboarding-notifications/onboarding-notifications.component';
import { OnboardingSearchComponent } from './steps/onboarding-search/onboarding-search.component';
import { OnboardingComponent } from './onboarding.component';

@NgModule({
  declarations: [
    OnboardingComponent,
    OnboardingLanguageComponent,
    OnboardingLocationComponent,
    OnboardingSearchComponent,
    OnboardingConfirmLocationComponent,
    OnboardingNotificationsComponent,
    OnboardingMadhabComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild(),
    SharedModule
  ],
  exports: [OnboardingComponent]
})
export class OnboardingModule {}
