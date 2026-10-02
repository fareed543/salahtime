import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { TasbihComponent } from './tasbih.component';
import { ZikarNotificationDialogComponent } from 'src/app/shared/zikar-notification-dialog/zikar-notification-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: TasbihComponent
  }
];

@NgModule({
  declarations: [TasbihComponent, ZikarNotificationDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    MatDialogModule
  ]
})
export class TasbihModule { }
