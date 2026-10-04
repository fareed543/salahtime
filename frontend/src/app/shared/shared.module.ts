import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AutocompleteControlComponent } from './autocomplete-control/autocomplete-control.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectionComponent } from './language-selection/language-selection.component';
import { CalenderComponent } from './calender/calender.component';
import { DialogHostComponent } from './dialog-host/dialog-host.component';
import { SalahDetailDialogComponent } from '../components/salahtime/salah-detail-dialog/salah-detail-dialog.component';
import { ScreenHeaderComponent } from './screen-header/screen-header.component';
import { TimePickerDialogComponent } from './time-picker-dialog/time-picker-dialog.component';
import { LocationLoaderComponent } from './location-loader/location-loader.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { AzanReminderDialogModule } from './azan-reminder-dialog/azan-reminder-dialog.module';
import { WorldPrayerTimesComponent } from './world-prayer-times/world-prayer-times.component';
import { CountryCityListComponent } from './country-city-list/country-city-list.component';
import { ReminderHealthBannerComponent } from './reminder-health-banner/reminder-health-banner.component';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    SalahDetailDialogComponent,
    LocationLoaderComponent,
    WorldPrayerTimesComponent,
    CountryCityListComponent,
    ReminderHealthBannerComponent
  ] ,
  
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TranslateModule.forChild(),
    MatDialogModule,
    MatRadioModule,
    AzanReminderDialogModule,
    ScreenHeaderComponent,
    TimePickerDialogComponent,
    LoadingSpinnerComponent
  ],
  exports: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    ScreenHeaderComponent,
    TimePickerDialogComponent,
    LocationLoaderComponent,
    WorldPrayerTimesComponent,
    CountryCityListComponent,
    ReminderHealthBannerComponent,
    MatDialogModule,
    MatRadioModule,
    AzanReminderDialogModule,
    LoadingSpinnerComponent
  ]
})
export class SharedModule { }
