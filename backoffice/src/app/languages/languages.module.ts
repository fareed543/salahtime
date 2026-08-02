import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { LanguageDetailsComponent } from './details.component';
import { LanguagesListComponent } from './list.component';

const routes: Routes = [
  {
    path: 'create',
    component: LanguageDetailsComponent,
    data: { mode: 'create' }
  },
  {
    path: ':id/edit',
    component: LanguageDetailsComponent,
    data: { mode: 'edit' }
  },
  {
    path: ':id',
    component: LanguageDetailsComponent,
    data: { mode: 'view' }
  },
  {
    path: '',
    component: LanguagesListComponent
  }
];

@NgModule({
  declarations: [LanguagesListComponent, LanguageDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class LanguagesModule {}
