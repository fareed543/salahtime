import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsDialogModule } from 'src/app/shared/dialogs/settings-dialog/settings-dialog.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { WebHomeComponent } from './web-home.component';

const routes: Routes = [{ path: '', component: WebHomeComponent }];

/** NF-020: website home page (the Android app keeps the Dashboard at '/'). */
@NgModule({
  declarations: [WebHomeComponent],
  imports: [CommonModule, RouterModule.forChild(routes), TranslateModule.forChild(), SharedModule, SettingsDialogModule]
})
export class WebHomeModule {}
