import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasjidListComponent } from './masjid-list.component';

describe('MasjidListComponent', () => {
  let component: MasjidListComponent;
  let fixture: ComponentFixture<MasjidListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MasjidListComponent]
    });
    fixture = TestBed.createComponent(MasjidListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
