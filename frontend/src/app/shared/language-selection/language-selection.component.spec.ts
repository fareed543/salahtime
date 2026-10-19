import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../../../testing/common-test-imports';

import { LanguageSelectionComponent } from './language-selection.component';

describe('LanguageSelectionComponent', () => {
  let component: LanguageSelectionComponent;
  let fixture: ComponentFixture<LanguageSelectionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: COMMON_TEST_IMPORTS,
      declarations: [LanguageSelectionComponent],
      schemas: SHALLOW_TEST_SCHEMAS
    });
    fixture = TestBed.createComponent(LanguageSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
