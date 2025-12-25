import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BashboardComponent } from './dashboard.component';

describe('BashboardComponent', () => {
  let component: BashboardComponent;
  let fixture: ComponentFixture<BashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BashboardComponent]
    });
    fixture = TestBed.createComponent(BashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
