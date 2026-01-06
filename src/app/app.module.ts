import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SettingsModule } from './components/settings/settings.module';
import { LanguageSelectionComponent } from './components/language-selection/language-selection.component';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    LanguageSelectionComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SettingsModule,
    HttpClientModule, // Required for HttpClient

    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient] // only HttpClient needed in v7
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
