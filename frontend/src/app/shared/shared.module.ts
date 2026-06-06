import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteControlComponent } from './autocomplete-control/autocomplete-control.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectionComponent } from './language-selection/language-selection.component';
import { CalenderComponent } from './calender/calender.component';
import { DialogHostComponent } from './dialog-host/dialog-host.component';
import { SalahDetailDialogComponent } from '../components/salahtime/salah-detail-dialog/salah-detail-dialog.component';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent,
    SalahDetailDialogComponent
  ] ,
  
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild()   
  ],
  exports: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    DialogHostComponent
  ]
})
export class SharedModule { }
