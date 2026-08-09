import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { LocationDetailsComponent } from './location-details.component';
import { LocationListComponent } from './location-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'countries', pathMatch: 'full' },
  { path: ':kind/create', component: LocationDetailsComponent, data: { mode: 'create' } },
  { path: ':kind/:id/edit', component: LocationDetailsComponent, data: { mode: 'edit' } },
  { path: ':kind/:id', component: LocationDetailsComponent, data: { mode: 'view' } },
  { path: ':kind', component: LocationListComponent }
];

@NgModule({
  declarations: [LocationListComponent, LocationDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class LocationsModule {}
