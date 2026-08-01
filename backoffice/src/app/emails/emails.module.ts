import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { EmailsDetailsComponent } from './details.component';
import { EmailsListComponent } from './list.component';

const routes: Routes = [
  {
    path: 'create',
    component: EmailsDetailsComponent,
    data: { mode: 'create' }
  },
  {
    path: ':id/edit',
    component: EmailsDetailsComponent,
    data: { mode: 'edit' }
  },
  {
    path: ':id',
    component: EmailsDetailsComponent,
    data: { mode: 'view' }
  },
  {
    path: '',
    component: EmailsListComponent
  }
];

@NgModule({
  declarations: [EmailsListComponent, EmailsDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class EmailsModule {}
