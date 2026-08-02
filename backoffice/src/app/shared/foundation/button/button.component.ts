import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-foundation-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']
})
export class FoundationButtonComponent {
  @Input() label = '';
  @Input() variant = 'primary';
  @Input() icon = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() loadingLabel = '';
  @Input() routerLink: string | any[] | null = null;
  @Input() buttonClass = '';
  @Input() ariaLabel = '';
  @Input() dataBsToggle = '';
  @Input() dataBsTarget = '';
  @Output() buttonClick = new EventEmitter<Event>();

  get classes(): string[] {
    return ['btn', `btn-${this.variant}`, this.buttonClass].filter(Boolean);
  }

  get displayLabel(): string {
    if (this.loading && this.loadingLabel) {
      return this.loadingLabel;
    }

    return this.label;
  }

  onClick(event: Event): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      return;
    }

    this.buttonClick.emit(event);
  }
}
