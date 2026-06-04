import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { CurrentTimeComponent } from './current-time/current-time.component';
import { SettingsContentModule } from '../settings/settings-content.module';

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
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule,
    SettingsContentModule
  ]
})
export class DashboardModule { }
