import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
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
  // Destructive (e.g. delete): shown in red in the phone ⋮ menu.
  danger?: boolean;
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
  @Input() moreLabel = 'More actions';

  moreOpen = false;

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

  // Parents often rebuild the actions array on every change detection (e.g. a ticking clock);
  // keying by id keeps the same buttons, so focus and taps aren't lost mid-render.
  trackByActionId(_index: number, action: ScreenHeaderAction): string {
    return action.id;
  }

  onActionClick(action: ScreenHeaderAction): void {
    if (action.route) {
      void this.router.navigate(Array.isArray(action.route) ? action.route : [action.route], {
        queryParams: action.queryParams
      });
    }

    this.actionSelected.emit(action);
  }

  toggleMore(event: Event): void {
    // Kept from the document listener below, which would close the menu straight away.
    event.stopPropagation();
    this.moreOpen = !this.moreOpen;
  }

  onMenuActionClick(action: ScreenHeaderAction, moreButton: HTMLElement): void {
    this.moreOpen = false;
    moreButton.focus();
    this.onActionClick(action);
  }

  @HostListener('document:click')
  closeMore(): void {
    this.moreOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.moreOpen = false;
  }

  onBackClick(): void {
    if (this.back.observed) {
      this.back.emit();
      return;
    }

    this.backNavigation.back(this.backFallback);
  }

}
