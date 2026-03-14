import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamazTimingsComponent } from './namaz-timings.component';

describe('NamazTimingsComponent', () => {
  let component: NamazTimingsComponent;
  let fixture: ComponentFixture<NamazTimingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NamazTimingsComponent]
    });
    fixture = TestBed.createComponent(NamazTimingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
