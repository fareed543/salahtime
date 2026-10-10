import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { SupportTicketDetailComponent } from './support-ticket-detail.component';
import { SupportTicketListComponent } from './support-ticket-list.component';

const routes: Routes = [
  { path: '', component: SupportTicketListComponent },
  { path: ':id', component: SupportTicketDetailComponent }
];

/** Support Desk: issues reported by users through "Report an Issue". */
@NgModule({
  declarations: [SupportTicketListComponent, SupportTicketDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class SupportDeskModule {}
