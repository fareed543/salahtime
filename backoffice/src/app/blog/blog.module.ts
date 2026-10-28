import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { BlogDetailComponent } from './blog-detail.component';
import { BlogListComponent } from './blog-list.component';

const routes: Routes = [
  { path: '', component: BlogListComponent },
  { path: ':id', component: BlogDetailComponent }
];

/** Blog review (NF-003): publish, reject or improve articles users submit. */
@NgModule({
  declarations: [BlogListComponent, BlogDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class BlogModule {}
