import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RamzanComponent } from './ramzan.component';

describe('RamzanComponent', () => {
  let component: RamzanComponent;
  let fixture: ComponentFixture<RamzanComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RamzanComponent]
    });
    fixture = TestBed.createComponent(RamzanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
