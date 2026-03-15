import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasjidDetailsComponent } from './masjid-details.component';

describe('MasjidDetailsComponent', () => {
  let component: MasjidDetailsComponent;
  let fixture: ComponentFixture<MasjidDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MasjidDetailsComponent]
    });
    fixture = TestBed.createComponent(MasjidDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
