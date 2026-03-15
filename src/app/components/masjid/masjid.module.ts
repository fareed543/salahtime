import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasjidComponent } from './masjid/masjid.component';
import { MasjidListComponent } from './masjid-list/masjid-list.component';
import { MasjidDetailsComponent } from './masjid-details/masjid-details.component';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: MasjidListComponent 
  },
  {
    path: 'masjid-details',
    component: MasjidDetailsComponent 
  }
];

@NgModule({
  declarations: [
    MasjidComponent,
    MasjidListComponent,
    MasjidDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule
  ]
})
export class MasjidModule { }

