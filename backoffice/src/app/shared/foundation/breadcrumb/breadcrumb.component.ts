import { Component, Input } from '@angular/core';

export interface FoundationBreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-foundation-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class FoundationBreadcrumbComponent {
  @Input() items: FoundationBreadcrumbItem[] = [];
  @Input() listClass = 'breadcrumb mb-0';
}
