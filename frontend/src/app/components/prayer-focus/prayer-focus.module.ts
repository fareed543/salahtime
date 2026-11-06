import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { PRAYER_PAGES } from 'src/app/seo/seo-content';
import { PrayerFocusComponent } from './prayer-focus.component';

// CR-006: /fajr-time … /tahajjud-time and their city versions. The component sets the final
// title, description and canonical once it knows the city; data.seo covers the first paint.
const routes: Routes = PRAYER_PAGES.flatMap(page => {
  const seo = { title: page.genericTitle, description: page.summary };
  return [
    { path: page.slug, component: PrayerFocusComponent, data: { prayerSlug: page.slug, seo: { ...seo, canonicalPath: `/${page.slug}` } } },
    { path: `${page.slug}/:country/:city`, component: PrayerFocusComponent, data: { prayerSlug: page.slug, seo } }
  ];
});

@NgModule({
  declarations: [PrayerFocusComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule
  ]
})
export class PrayerFocusModule { }
