import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { MasjidDisplayComponent } from './masjid-display.component';

const routes: Routes = [{ path: '', component: MasjidDisplayComponent }];

@NgModule({
  declarations: [MasjidDisplayComponent],
  imports: [CommonModule, RouterModule.forChild(routes), TranslateModule.forChild(), LoadingSpinnerComponent]
})
export class MasjidDisplayModule {}
