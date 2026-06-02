import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteControlComponent } from './autocomplete-control/autocomplete-control.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectionComponent } from './language-selection/language-selection.component';
import { CalenderComponent } from './calender/calender.component';

@NgModule({
  declarations: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent
  ] ,
  
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild()   
  ],
  exports: [
    AutocompleteControlComponent,
    LanguageSelectionComponent,
    CalenderComponent
  ]
})
export class SharedModule { }
