import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DetailsComponent } from './details.component';
import { ListComponent } from './list.component';

const routes: Routes = [
  {
    path: 'create',
    component: DetailsComponent,
    data: { mode: 'create' }
  },
  {
    path: ':id/edit',
    component: DetailsComponent,
    data: { mode: 'edit' }
  },
  {
    path: ':id',
    component: DetailsComponent,
    data: { mode: 'view' }
  },
  {
    path: '',
    component: ListComponent
  }
];

@NgModule({
  declarations: [ListComponent, DetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class UsersModule {}
