import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Providers most components need just to be created in a unit test: HTTP (answered by the
 * testing backend, never the real API), routing, translations and dialogs.
 */
export const COMMON_TEST_IMPORTS = [
  HttpClientTestingModule,
  RouterTestingModule,
  TranslateModule.forRoot(),
  MatDialogModule,
  NoopAnimationsModule
];

/** Lets a "should create" test skip declaring every child component (e.g. app-screen-header). */
export const SHALLOW_TEST_SCHEMAS = [NO_ERRORS_SCHEMA];
