import { prayerScreenGuard } from 'src/app/services/device-info.service';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SettingsDialogModule } from 'src/app/shared/dialogs/settings-dialog/settings-dialog.module';
import { AllPrayerTimesComponent } from './all-prayer-times.component';
import { AllPrayerTimesCurrentTimeComponent } from './current-time/current-time.component';

const routes: Routes = [
  {
    path: ':country/:city', canActivate: [prayerScreenGuard], data: { prayerScreen: true }, component: AllPrayerTimesComponent
  },
  { path: ':city', canActivate: [prayerScreenGuard], data: { prayerScreen: true }, component: AllPrayerTimesComponent
  },
  {
    path: '',
    canActivate: [prayerScreenGuard],
    data: { prayerScreen: true },
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
    SettingsDialogModule
  ]
})
export class AllPrayerTimesModule { }
