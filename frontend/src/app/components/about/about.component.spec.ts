import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../../../testing/common-test-imports';

import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: COMMON_TEST_IMPORTS,
      declarations: [AboutComponent],
      schemas: SHALLOW_TEST_SCHEMAS
    });
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
