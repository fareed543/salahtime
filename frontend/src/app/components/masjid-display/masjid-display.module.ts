import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MasjidDisplayComponent } from './masjid-display.component';

const routes: Routes = [{ path: '', component: MasjidDisplayComponent }];

@NgModule({
  declarations: [MasjidDisplayComponent],
  imports: [CommonModule, RouterModule.forChild(routes), TranslateModule.forChild()]
})
export class MasjidDisplayModule {}
