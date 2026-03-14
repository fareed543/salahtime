import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NamazTimingsComponent } from './namaz-timings.component';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';


const routes: Routes = [
  {
    path: '',
    component: NamazTimingsComponent 
  }
];

@NgModule({
  declarations: [
    NamazTimingsComponent 
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule
  ]
})
export class NamazTimingsModule { }
