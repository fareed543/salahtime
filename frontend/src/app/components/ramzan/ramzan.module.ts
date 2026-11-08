import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RamzanComponent } from './ramzan.component';
import { RamadanCityComponent } from './ramadan-city/ramadan-city.component';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { CalenderModule } from 'src/app/shared/calender/calender.module';
import { SettingsContentModule } from '../settings/settings-content.module';


const routes: Routes = [
  {
    path: '',
    component: RamzanComponent
  },
  {
    // NF-009: Ramadan Sehri and Iftar timetable per city; the page sets its own SEO.
    path: ':country/:city',
    component: RamadanCityComponent,
    data: { seoManaged: true }
  }
];

@NgModule({
  declarations: [
    RamzanComponent,
    RamadanCityComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    FormsModule,
    SharedModule,
    CalenderModule,
    SettingsContentModule
  ]
})
export class RamzanModule { }
