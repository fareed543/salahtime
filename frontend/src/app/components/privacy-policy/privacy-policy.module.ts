import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { RouterModule, Routes } from '@angular/router';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';

const routes: Routes = [
  {
    path: '',
    component: PrivacyPolicyComponent 
  }
];

@NgModule({
  declarations: [
    PrivacyPolicyComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ScreenHeaderComponent
  ]
})
export class PrivacyPolicyModule { }
