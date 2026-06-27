import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-onboarding-search',
  templateUrl: './onboarding-search.component.html'
})
export class OnboardingSearchComponent {
  @Input() searchQuery = '';
  @Input() filteredLocations: any[] = [];
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() back = new EventEmitter<void>();
  @Output() selectLocation = new EventEmitter<any>();
}
