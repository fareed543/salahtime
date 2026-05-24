import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SalahtimeComponent } from './salahtime.component';
import { SalahtimeCurrentTimeComponent } from './current-time/current-time.component';

const routes: Routes = [
  {
    path: '',
    component: SalahtimeComponent
  }
];

@NgModule({
  declarations: [
    SalahtimeComponent,
    SalahtimeCurrentTimeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule
  ]
})
export class SalahtimeModule { }
