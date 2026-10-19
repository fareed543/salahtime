import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../../../testing/common-test-imports';

import { AutocompleteControlComponent } from './autocomplete-control.component';

describe('AutocompleteControlComponent', () => {
  let component: AutocompleteControlComponent;
  let fixture: ComponentFixture<AutocompleteControlComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: COMMON_TEST_IMPORTS,
      declarations: [AutocompleteControlComponent],
      schemas: SHALLOW_TEST_SCHEMAS
    });
    fixture = TestBed.createComponent(AutocompleteControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
