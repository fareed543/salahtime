import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsComponent } from './settings.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    SettingsComponent
  ],
  exports: [
    SettingsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule.forChild(),
    SharedModule
  ]
})
export class SettingsContentModule { }
