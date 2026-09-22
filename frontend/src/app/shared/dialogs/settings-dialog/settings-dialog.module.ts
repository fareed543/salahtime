import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsContentModule } from 'src/app/components/settings/settings-content.module';
import { SettingsDialogComponent } from './settings-dialog.component';

@NgModule({
  declarations: [SettingsDialogComponent],
  imports: [
    MatDialogModule,
    TranslateModule,
    SettingsContentModule
  ]
})
export class SettingsDialogModule {}
