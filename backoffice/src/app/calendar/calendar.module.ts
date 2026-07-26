import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DateAdjustmentComponent } from './date-adjustment.component';
import { SpecialDatesComponent } from './special-dates.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'date-adjustment'
      },
      {
        path: 'date-adjustment',
        component: DateAdjustmentComponent
      },
      {
        path: 'special-dates',
        component: SpecialDatesComponent
      }
    ]
  }
];

@NgModule({
  declarations: [
    DateAdjustmentComponent,
    SpecialDatesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class CalendarModule {}
