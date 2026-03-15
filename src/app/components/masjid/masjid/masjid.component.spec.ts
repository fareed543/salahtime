import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasjidComponent } from './masjid.component';

describe('MasjidComponent', () => {
  let component: MasjidComponent;
  let fixture: ComponentFixture<MasjidComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MasjidComponent]
    });
    fixture = TestBed.createComponent(MasjidComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
