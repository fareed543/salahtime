import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../../../testing/common-test-imports';

import { RamzanComponent } from './ramzan.component';

describe('RamzanComponent', () => {
  let component: RamzanComponent;
  let fixture: ComponentFixture<RamzanComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: COMMON_TEST_IMPORTS,
      declarations: [RamzanComponent],
      schemas: SHALLOW_TEST_SCHEMAS
    });
    fixture = TestBed.createComponent(RamzanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
