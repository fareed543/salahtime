import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { QiblaDirectionComponent } from './qibla-direction.component';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';

const routes: Routes = [
  {
    path: '',
    component: QiblaDirectionComponent
  }
];

@NgModule({
  declarations: [
    QiblaDirectionComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    ScreenHeaderComponent
  ]
})
export class QiblaDirectionModule {}
