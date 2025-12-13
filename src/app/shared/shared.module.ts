import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentTimeComponent } from './current-time/current-time.component';



@NgModule({
  declarations: [CurrentTimeComponent],
  imports: [
    CommonModule
  ],
  exports: [CurrentTimeComponent]
})
export class SharedModule { }
