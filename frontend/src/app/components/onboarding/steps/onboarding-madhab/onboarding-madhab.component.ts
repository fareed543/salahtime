import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-onboarding-madhab',
  templateUrl: './onboarding-madhab.component.html'
})
export class OnboardingMadhabComponent {
  @Input() selectedMadhab = 'Hanafi';
  @Output() selectedMadhabChange = new EventEmitter<string>();
  @Output() finish = new EventEmitter<void>();
}
