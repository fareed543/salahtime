import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule, Routes } from '@angular/router';
import { CurrentTimeComponent } from './current-time/current-time.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent 
  }
];

@NgModule({
  declarations: [
    DashboardComponent,
    CurrentTimeComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule { }
