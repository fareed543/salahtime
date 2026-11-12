import { CommonModule, DOCUMENT } from '@angular/common';
import { Inject, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { SunnahCardComponent } from './sunnah-card/sunnah-card.component';
import { SunnahGridComponent } from './sunnah-grid/sunnah-grid.component';
import { SunnahPlayerComponent } from './sunnah-player/sunnah-player.component';
import { SunnahShortsService } from './sunnah-shorts.service';

export const SUNNAH_STYLES_ID = 'sunnah-styles';

// NF-015 Sunnah Shorts. /shorts keeps the route's SEO; each card page sets its own once loaded.
const routes: Routes = [
  { path: '', component: SunnahGridComponent },
  { path: ':slug', component: SunnahPlayerComponent, data: { seoManaged: true } }
];

@NgModule({
  declarations: [SunnahGridComponent, SunnahPlayerComponent, SunnahCardComponent],
  imports: [CommonModule, TranslateModule.forChild(), RouterModule.forChild(routes), SharedModule],
  providers: [SunnahShortsService]
})
export class ShortsModule {
  constructor(@Inject(DOCUMENT) document: Document) {
    // sunnah.css is a separate bundle (angular.json, inject: false); prerendered /shorts pages already link it.
    if (!document.getElementById(SUNNAH_STYLES_ID)) {
      const link = document.createElement('link');
      link.id = SUNNAH_STYLES_ID;
      link.rel = 'stylesheet';
      link.href = 'sunnah.css';
      document.head.appendChild(link);
    }
  }
}
