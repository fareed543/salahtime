import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-foundation-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class FoundationListComponent {
  @Input() cardClass = '';
  @Input() datatableClass = 'card-datatable';
}
