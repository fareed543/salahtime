import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../shared.module';
import { CalenderComponent } from './calender.component';

/**
 * The salah calendar, used by /salah-calendar and the Ramadan page. Kept out of SharedModule
 * (which AppModule loads up front) so it is only downloaded where it is shown (PERF-01).
 */
@NgModule({
  declarations: [CalenderComponent],
  imports: [CommonModule, FormsModule, TranslateModule.forChild(), SharedModule],
  exports: [CalenderComponent]
})
export class CalenderModule {}
