import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalahWidgetComponent } from './salah-widget.component';

describe('SalahWidgetComponent', () => {
  let component: SalahWidgetComponent;
  let fixture: ComponentFixture<SalahWidgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SalahWidgetComponent]
    });
    fixture = TestBed.createComponent(SalahWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
