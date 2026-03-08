import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteControlComponent } from './autocomplete-control/autocomplete-control.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectionComponent } from './language-selection/language-selection.component';
import { CalenderComponent } from './calender/calender.component';
import { SalahWidgetComponent } from './salah-widget/salah-widget.component';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent,
    SalahWidgetComponent
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
    SalahWidgetComponent
  ]
})
export class SharedModule { }
