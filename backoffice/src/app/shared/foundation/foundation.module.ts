import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FoundationBreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { FoundationButtonComponent } from './button/button.component';
import { FoundationListComponent } from './list/list.component';
import { FoundationPaginationComponent } from './pagination/pagination.component';
import { FoundationSearchComponent } from './search/search.component';
import { FoundationTitleComponent } from './title/title.component';

@NgModule({
  declarations: [
    FoundationTitleComponent,
    FoundationButtonComponent,
    FoundationBreadcrumbComponent,
    FoundationListComponent,
    FoundationPaginationComponent,
    FoundationSearchComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    FoundationTitleComponent,
    FoundationButtonComponent,
    FoundationBreadcrumbComponent,
    FoundationListComponent,
    FoundationPaginationComponent,
    FoundationSearchComponent
  ]
})
export class FoundationModule {}
