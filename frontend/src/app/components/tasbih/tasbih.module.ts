import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TasbihComponent } from './tasbih.component';

const routes: Routes = [
  {
    path: '',
    component: TasbihComponent
  }
];

@NgModule({
  declarations: [TasbihComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild()
  ]
})
export class TasbihModule { }
