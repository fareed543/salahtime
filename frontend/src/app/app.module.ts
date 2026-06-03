import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SharedModule } from './shared/shared.module';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthModule } from './components/auth/auth.module';
import { CommunityModule } from './components/community/community.module';
import { QiblaDirectionComponent } from './components/qibla-direction/qibla-direction.component';
import { AuthInterceptor } from './services/auth.interceptor';
import { SpinnerInterceptor } from './services/spinner.interceptor';
import { SpinnerOverlayComponent } from './shared/spinner-overlay/spinner-overlay.component';
import { OfflineScreenComponent } from './shared/offline-screen/offline-screen.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    MainLayoutComponent,
    SpinnerOverlayComponent,
    OfflineScreenComponent,
    QiblaDirectionComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AuthModule,
    CommunityModule,
    HttpClientModule, // Required for HttpClient
    SharedModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient] // only HttpClient needed in v7
      }
    })
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SpinnerInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
