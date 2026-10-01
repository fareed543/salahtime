import { Location } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-route-back-button',
  template: '<button type="button" class="header-action-btn header-back-btn route-back-btn" aria-label="Go back" (click)="goBack()"><i class="bi bi-arrow-left"></i></button>'
})
export class RouteBackButtonComponent {
  constructor(private location: Location) {}

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    window.history.replaceState({}, '', '/');
  }
}
