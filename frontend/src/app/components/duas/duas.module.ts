import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { DuaDetailDialogComponent } from 'src/app/shared/dialogs/dua-detail-dialog/dua-detail-dialog.component';
import { DuaCategoriesComponent } from './dua-categories/dua-categories.component';
import { DuaListComponent } from './dua-list/dua-list.component';
import { DuaDetailComponent } from './dua-detail/dua-detail.component';
import { DuaDataService } from './services/dua-data.service';

const routes: Routes = [
  {
    path: '',
    component: DuaCategoriesComponent
  },
  {
    path: ':categorySlug',
    component: DuaListComponent
  },
  {
    path: ':categorySlug/:duaId',
    component: DuaListComponent
  }
];

@NgModule({
  declarations: [
    DuaCategoriesComponent,
    DuaListComponent,
    DuaDetailComponent,
    DuaDetailDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule
  ],
  providers: [DuaDataService]
})
export class DuasModule {}
