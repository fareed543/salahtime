import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LearnComponent } from './learn.component';
import { LEARN_DATA_URL, LearnDataService } from './learn-data.service';

const routes: Routes = [
  { path: '', component: LearnComponent, data: { view: 'library' } },
  { path: ':topicId/quiz', component: LearnComponent, data: { view: 'quiz' } },
  { path: ':topicId/:entryId', component: LearnComponent, data: { view: 'detail' } },
  { path: ':topicId', component: LearnComponent, data: { view: 'topic' } }
];

@NgModule({
  declarations: [LearnComponent],
  imports: [CommonModule, TranslateModule.forChild(), RouterModule.forChild(routes)],
  providers: [LearnDataService, { provide: LEARN_DATA_URL, useValue: 'assets/data/learn.json' }]
})
export class LearnModule {}
