import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

export interface ScreenHeaderAction {
  id: string;
  icon: string;
  ariaLabel: string;
  active?: boolean;
  route?: string | any[];
  queryParams?: Record<string, any>;
}

@Component({
  selector: 'app-screen-header',
  templateUrl: './screen-header.component.html',
  styleUrls: ['./screen-header.component.scss']
})
export class ScreenHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actions: ScreenHeaderAction[] = [];
  @Input() actionGroupLabel = 'Screen actions';

  @Output() actionSelected = new EventEmitter<ScreenHeaderAction>();

  constructor(private router: Router) {}

  onActionClick(action: ScreenHeaderAction): void {
    if (action.route) {
      void this.router.navigate(Array.isArray(action.route) ? action.route : [action.route], {
        queryParams: action.queryParams
      });
    }

    this.actionSelected.emit(action);
  }
}
