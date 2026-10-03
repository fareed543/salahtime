import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { MasjidDetailsComponent } from './masjid-details.component';
import { MasjidListComponent } from './masjid-list.component';
import { ProgramDetailsComponent } from './program-details.component';
import { ProgramListComponent } from './program-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'masjids', pathMatch: 'full' },
  { path: 'masjids', component: MasjidListComponent },
  { path: 'masjids/:id/edit', component: MasjidDetailsComponent, data: { mode: 'edit' } },
  { path: 'masjids/:id', component: MasjidDetailsComponent, data: { mode: 'view' } },
  { path: 'programs', component: ProgramListComponent },
  { path: 'programs/:id/edit', component: ProgramDetailsComponent, data: { mode: 'edit' } },
  { path: 'programs/:id', component: ProgramDetailsComponent, data: { mode: 'view' } }
];

@NgModule({
  declarations: [MasjidListComponent, MasjidDetailsComponent, ProgramListComponent, ProgramDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class CommunityModule {}
