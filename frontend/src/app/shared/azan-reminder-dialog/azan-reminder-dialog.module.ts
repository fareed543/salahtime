import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';

import { AzanReminderDialogComponent } from './azan-reminder-dialog.component';

@NgModule({
  declarations: [AzanReminderDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule.forChild(),
    MatDialogModule,
    MatRadioModule
  ],
  exports: [
    AzanReminderDialogComponent,
    MatDialogModule,
    MatRadioModule
  ]
})
export class AzanReminderDialogModule {}
