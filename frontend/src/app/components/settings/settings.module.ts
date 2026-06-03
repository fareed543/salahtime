import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { SettingsContentModule } from './settings-content.module';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent 
  }
];

@NgModule({
  imports: [
    SettingsContentModule,
    RouterModule.forChild(routes),
  ]
})
export class SettingsModule { }
