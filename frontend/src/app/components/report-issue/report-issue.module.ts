import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';
import { ReportIssueComponent } from './report-issue.component';

const routes: Routes = [
  {
    path: '',
    component: ReportIssueComponent
  }
];

/** Support Desk: the "Report an Issue" page (/report-issue). */
@NgModule({
  declarations: [
    ReportIssueComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    ScreenHeaderComponent
  ]
})
export class ReportIssueModule { }
