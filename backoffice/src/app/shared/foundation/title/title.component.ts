import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-foundation-title',
  templateUrl: './title.component.html',
  styleUrls: ['./title.component.scss']
})
export class FoundationTitleComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() titleClass = 'mb-1';
  @Input() subtitleClass = 'text-muted mb-0';
}
