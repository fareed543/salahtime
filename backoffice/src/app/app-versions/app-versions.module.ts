import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AppVersionsComponent } from './app-versions.component';

const routes: Routes = [
  {
    path: '',
    component: AppVersionsComponent
  }
];

@NgModule({
  declarations: [AppVersionsComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class AppVersionsModule {}
