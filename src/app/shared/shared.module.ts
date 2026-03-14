import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteControlComponent } from './autocomplete-control/autocomplete-control.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectionComponent } from './language-selection/language-selection.component';
import { CalenderComponent } from './calender/calender.component';
import { SalahWidgetComponent } from './salah-widget/salah-widget.component';
import { CurrentTimeComponent } from './current-time/current-time.component';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    SalahWidgetComponent,
    CurrentTimeComponent
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
    SalahWidgetComponent,
    CurrentTimeComponent
  ]
})
export class SharedModule { }
