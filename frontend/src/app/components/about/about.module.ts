import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutComponent } from './about.component';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';


const routes: Routes = [
  {
    path: '',
    component: AboutComponent 
  }
];

@NgModule({
  declarations: [
    AboutComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    ScreenHeaderComponent
  ]
})
export class AboutModule { }
