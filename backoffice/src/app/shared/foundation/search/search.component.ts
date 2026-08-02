import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-foundation-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class FoundationSearchComponent {
  @Input() placeholder = 'Search';
  @Input() value = '';
  @Input() inputClass = 'form-control';
  @Input() wrapperClass = 'dt-search mb-md-6 mb-2';
  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.valueChange.emit(target?.value ?? '');
  }
}
