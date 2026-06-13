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
import { AzanReminderDialogComponent } from './azan-reminder-dialog/azan-reminder-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    SalahDetailDialogComponent,
    ScreenHeaderComponent,
    AzanReminderDialogComponent
  ] ,
  
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild(),
    MatDialogModule,
    MatRadioModule
  ],
  exports: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    ScreenHeaderComponent,
    MatDialogModule,
    MatRadioModule
  ]
})
export class SharedModule { }
