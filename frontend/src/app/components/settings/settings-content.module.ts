import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsComponent } from './settings.component';
import { AzanReminderDialogModule } from 'src/app/shared/azan-reminder-dialog/azan-reminder-dialog.module';

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
    AzanReminderDialogModule
  ]
})
export class SettingsContentModule { }
