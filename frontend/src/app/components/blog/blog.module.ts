import { Inject, NgModule } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthGuard } from 'src/app/services/auth.guard';
import { SharedModule } from 'src/app/shared/shared.module';
import { ScreenHeaderComponent } from 'src/app/shared/screen-header/screen-header.component';
import { BlogListComponent } from './blog-list/blog-list.component';
import { BlogArticleComponent } from './blog-article/blog-article.component';
import { BlogAuthorComponent } from './blog-author/blog-author.component';
import { BlogEditorComponent } from './blog-editor/blog-editor.component';
import { BlogMineComponent } from './blog-mine/blog-mine.component';
import { BlogMyArticleComponent } from './blog-my-article/blog-my-article.component';
import { BlogCardComponent } from './blog-card/blog-card.component';
import { BlogSeoPanelComponent } from './blog-seo-panel/blog-seo-panel.component';
import { BlogDatePipe } from './blog-date.pipe';

export const BLOG_STYLES_ID = 'blog-styles';

// Writing and status pages are user-specific: keep them out of search results.
const privateSeo = (title: string) => ({
  seo: { title, description: 'Write and manage your SalahTime articles.', robots: 'noindex, follow' }
});

const routes: Routes = [
  { path: '', component: BlogListComponent },
  { path: 'write', component: BlogEditorComponent, canActivate: [AuthGuard], data: privateSeo('Write an article | SalahTime') },
  { path: 'write/:id', component: BlogEditorComponent, canActivate: [AuthGuard], data: privateSeo('Edit article | SalahTime') },
  { path: 'my-articles', component: BlogMineComponent, canActivate: [AuthGuard], data: privateSeo('My articles | SalahTime') },
  { path: 'my-articles/:id', component: BlogMyArticleComponent, canActivate: [AuthGuard], data: privateSeo('Article status | SalahTime') },
  // Author and article pages set their own title, description and canonical once loaded.
  { path: 'author/:id', component: BlogAuthorComponent },
  { path: ':slug', component: BlogArticleComponent }
];

/** NF-003 Blog: community articles (/blog), the writer's editor and their review status. */
@NgModule({
  declarations: [
    BlogListComponent,
    BlogArticleComponent,
    BlogAuthorComponent,
    BlogEditorComponent,
    BlogMineComponent,
    BlogMyArticleComponent,
    BlogCardComponent,
    BlogSeoPanelComponent,
    BlogDatePipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    SharedModule,
    ScreenHeaderComponent
  ]
})
export class BlogModule {
  constructor(@Inject(DOCUMENT) document: Document) {
    // blog.css is a separate bundle (angular.json, inject: false); prerendered blog pages already link it.
    if (!document.getElementById(BLOG_STYLES_ID)) {
      const link = document.createElement('link');
      link.id = BLOG_STYLES_ID;
      link.rel = 'stylesheet';
      link.href = 'blog.css';
      document.head.appendChild(link);
    }
  }
}
