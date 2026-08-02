import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SideMenuComponent } from './side-menu/side-menu.component';
import { LayoutComponent } from './layout/layout.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BackofficeTranslatePipe } from './i18n/backoffice-translate.pipe';
import { FoundationModule } from './foundation/foundation.module';



@NgModule({
  declarations: [
    AuthLayoutComponent,
    HeaderComponent,
    FooterComponent,
    SideMenuComponent,
    LayoutComponent,
    BackofficeTranslatePipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    FoundationModule
  ],
  exports: [BackofficeTranslatePipe, FoundationModule]
})
export class SharedModule { }
