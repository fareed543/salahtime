import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QiblaDirectionComponent } from './qibla-direction.component';

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
    RouterModule.forChild(routes)
  ]
})
export class QiblaDirectionModule {}
