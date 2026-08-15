import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteControlComponent } from './autocomplete-control/autocomplete-control.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectionComponent } from './language-selection/language-selection.component';
import { CalenderComponent } from './calender/calender.component';
import { DialogHostComponent } from './dialog-host/dialog-host.component';
import { SalahDetailDialogComponent } from '../components/salahtime/salah-detail-dialog/salah-detail-dialog.component';
import { ScreenHeaderComponent } from './screen-header/screen-header.component';
import { LocationLoaderComponent } from './location-loader/location-loader.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { AzanReminderDialogModule } from './azan-reminder-dialog/azan-reminder-dialog.module';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    SalahDetailDialogComponent,
    ScreenHeaderComponent,
    LocationLoaderComponent
  ] ,
  
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild(),
    MatDialogModule,
    MatRadioModule,
    AzanReminderDialogModule
  ],
  exports: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    ScreenHeaderComponent,
    LocationLoaderComponent,
    MatDialogModule,
    MatRadioModule,
    AzanReminderDialogModule
  ]
})
export class SharedModule { }
