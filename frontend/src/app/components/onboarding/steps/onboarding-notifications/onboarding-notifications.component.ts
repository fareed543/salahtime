import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-onboarding-notifications',
  templateUrl: './onboarding-notifications.component.html'
})
export class OnboardingNotificationsComponent {
  @Output() turnOn = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();
}
