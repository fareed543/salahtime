import { CommonModule, DOCUMENT } from '@angular/common';
import { Inject, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { SunnahCropperComponent } from './sunnah-cropper.component';
import { SunnahEditComponent } from './sunnah-edit.component';
import { SunnahListComponent } from './sunnah-list.component';
import { SunnahPreviewComponent } from './sunnah-preview.component';

const STYLES_ID = 'sunnah-preview-styles';

const routes: Routes = [
  { path: '', component: SunnahListComponent },
  { path: 'new', component: SunnahEditComponent },
  { path: ':id', component: SunnahEditComponent }
];

/**
 * NF-015 Sunnah Shorts: cards, categories and reference books for the app's Shorts.
 * Self-contained: to remove it, delete this folder and its route, menu entry (assets/data/menu.json)
 * and style bundle (angular.json "sunnah-preview").
 */
@NgModule({
  declarations: [SunnahListComponent, SunnahEditComponent, SunnahPreviewComponent, SunnahCropperComponent],
  imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild(routes)]
})
export class SunnahShortsModule {
  constructor(@Inject(DOCUMENT) document: Document) {
    // Card template styles are a separate bundle (angular.json, inject: false): over the component style budget.
    if (!document.getElementById(STYLES_ID)) {
      const link = document.createElement('link');
      link.id = STYLES_ID;
      link.rel = 'stylesheet';
      link.href = 'sunnah-preview.css';
      document.head.appendChild(link);
    }
  }
}
