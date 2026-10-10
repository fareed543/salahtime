import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AuthChannelsSectionComponent } from './sections/auth-channels-section.component';
import { SmsProviderSectionComponent } from './sections/sms-provider-section.component';
import { SettingsComponent } from './settings.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent
  },
  {
    // Earlier link to the stand-alone page.
    path: 'auth-channels',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  declarations: [SettingsComponent, AuthChannelsSectionComponent, SmsProviderSectionComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class SettingsModule {}
