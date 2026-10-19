import { TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../testing/common-test-imports';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: COMMON_TEST_IMPORTS,
    declarations: [AppComponent],
    schemas: SHALLOW_TEST_SCHEMAS
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
