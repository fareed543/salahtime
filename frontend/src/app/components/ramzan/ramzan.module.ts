import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RamzanComponent } from './ramzan.component';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';


const routes: Routes = [
  {
    path: '',
    component: RamzanComponent 
  }
];

@NgModule({
  declarations: [
    RamzanComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    FormsModule,
    SharedModule
  ]
})
export class RamzanModule { }
