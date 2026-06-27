import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-onboarding-location',
  templateUrl: './onboarding-location.component.html'
})
export class OnboardingLocationComponent {
  @Input() isLoadingLocation = false;
  @Output() useCurrentLocation = new EventEmitter<void>();
  @Output() manualSearch = new EventEmitter<void>();
}
