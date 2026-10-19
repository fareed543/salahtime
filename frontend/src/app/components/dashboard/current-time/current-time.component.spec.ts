import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../../../../testing/common-test-imports';

import { CurrentTimeComponent } from './current-time.component';

describe('CurrentTimeComponent', () => {
  let component: CurrentTimeComponent;
  let fixture: ComponentFixture<CurrentTimeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: COMMON_TEST_IMPORTS,
      declarations: [CurrentTimeComponent],
      schemas: SHALLOW_TEST_SCHEMAS
    });
    fixture = TestBed.createComponent(CurrentTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
