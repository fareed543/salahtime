import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { EmailTemplatesDetailsComponent } from './details.component';
import { EmailTemplatesListComponent } from './list.component';

const routes: Routes = [
  {
    path: 'create',
    component: EmailTemplatesDetailsComponent,
    data: { mode: 'create' }
  },
  {
    path: ':id/edit',
    component: EmailTemplatesDetailsComponent,
    data: { mode: 'edit' }
  },
  {
    path: ':id',
    component: EmailTemplatesDetailsComponent,
    data: { mode: 'view' }
  },
  {
    path: '',
    component: EmailTemplatesListComponent
  }
];

@NgModule({
  declarations: [EmailTemplatesListComponent, EmailTemplatesDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class EmailTemplatesModule {}
