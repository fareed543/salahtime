import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { NotificationsComponent } from './notifications.component';
import { NotificationsListComponent } from './list.component';

const routes: Routes = [
  {
    path: 'create',
    component: NotificationsComponent
  },
  {
    path: ':id/edit',
    component: NotificationsComponent,
    data: { mode: 'edit' }
  },
  {
    path: ':id',
    component: NotificationsComponent,
    data: { mode: 'view' }
  },
  {
    path: '',
    component: NotificationsListComponent
  }
];

@NgModule({
  declarations: [NotificationsComponent, NotificationsListComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class NotificationsModule {}
