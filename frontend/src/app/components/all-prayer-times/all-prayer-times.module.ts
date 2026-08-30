import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SettingsContentModule } from '../settings/settings-content.module';
import { AllPrayerTimesComponent } from './all-prayer-times.component';
import { AllPrayerTimesCurrentTimeComponent } from './current-time/current-time.component';

const routes: Routes = [
  {
    path: '',
    component: AllPrayerTimesComponent
  }
];

@NgModule({
  declarations: [
    AllPrayerTimesComponent,
    AllPrayerTimesCurrentTimeComponent
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
export class AllPrayerTimesModule { }
