import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { CurrentTimeComponent } from './current-time/current-time.component';
import { SettingsDialogModule } from 'src/app/shared/dialogs/settings-dialog/settings-dialog.module';
import { ActiveProgramsCardComponent } from './active-programs-card/active-programs-card.component';
import { FavoriteMasjidCardComponent } from './favorite-masjid-card/favorite-masjid-card.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent 
  }
];

@NgModule({
  declarations: [
    DashboardComponent,
    CurrentTimeComponent,
    ActiveProgramsCardComponent,
    FavoriteMasjidCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule,
    SettingsDialogModule
  ]
})
export class DashboardModule { }
