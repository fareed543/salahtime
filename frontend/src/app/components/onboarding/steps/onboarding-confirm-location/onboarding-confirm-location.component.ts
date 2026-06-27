import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-onboarding-confirm-location',
  templateUrl: './onboarding-confirm-location.component.html'
})
export class OnboardingConfirmLocationComponent {
  @Input() selectedLocation: any | null = null;
  @Output() next = new EventEmitter<void>();
  @Output() changeLocation = new EventEmitter<void>();
}
