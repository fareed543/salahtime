import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { BackNavigationService } from 'src/app/services/back-navigation.service';

export interface ScreenHeaderAction {
  id: string;
  icon: string;
  ariaLabel: string;
  active?: boolean;
  route?: string | any[];
  queryParams?: Record<string, any>;
  // On/off button: exposes aria-pressed and uses `active` as its state.
  toggle?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-screen-header',
  // Standalone so light feature modules can use it without pulling in all of SharedModule.
  standalone: true,
  imports: [NgIf, NgFor, NgClass],
  templateUrl: './screen-header.component.html',
  styleUrls: ['./screen-header.component.scss']
})
export class ScreenHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actions: ScreenHeaderAction[] = [];
  @Input() actionGroupLabel = 'Screen actions';
  // Built-in back button: goes back in history, or to backFallback when the screen was opened directly.
  @Input() showBack = false;
  @Input() backFallback: string | any[] = '/';
  @Input() backAriaLabel = 'Go back';

  @Output() actionSelected = new EventEmitter<ScreenHeaderAction>();
  // When bound, the parent handles back navigation itself.
  @Output() back = new EventEmitter<void>();

  constructor(private router: Router, private backNavigation: BackNavigationService) {}

  get leadingAction(): ScreenHeaderAction | null {
    return this.actions.find((action) => action.id === 'back') ?? null;
  }

  get trailingActions(): ScreenHeaderAction[] {
    return this.actions.filter((action) => action.id !== 'back');
  }

  onActionClick(action: ScreenHeaderAction): void {
    if (action.route) {
      void this.router.navigate(Array.isArray(action.route) ? action.route : [action.route], {
        queryParams: action.queryParams
      });
    }

    this.actionSelected.emit(action);
  }

  onBackClick(): void {
    if (this.back.observed) {
      this.back.emit();
      return;
    }

    this.backNavigation.back(this.backFallback);
  }

}
