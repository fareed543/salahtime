import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CalenderModule } from './calender.module';
import { CalenderComponent } from './calender.component';

/** Lazy route for /salah-calendar (its SEO data stays on the parent route in app-routing.module.ts). */
@NgModule({
  imports: [CalenderModule, RouterModule.forChild([{ path: '', component: CalenderComponent }])]
})
export class SalahCalendarModule {}
