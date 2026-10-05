import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SettingsDialogModule } from 'src/app/shared/dialogs/settings-dialog/settings-dialog.module';
import { AllPrayerTimesComponent } from './all-prayer-times.component';
import { AllPrayerTimesCurrentTimeComponent } from './current-time/current-time.component';

// The mobile prayer layout. It has no routes of its own: PrayerTimesPageComponent shows it
// at the /prayer-times URLs on narrow screens.
@NgModule({
  declarations: [
    AllPrayerTimesComponent,
    AllPrayerTimesCurrentTimeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule.forChild(),
    SharedModule,
    SettingsDialogModule
  ],
  exports: [
    AllPrayerTimesComponent
  ]
})
export class AllPrayerTimesModule { }
