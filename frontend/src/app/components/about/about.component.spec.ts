import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_IMPORTS, SHALLOW_TEST_SCHEMAS } from '../../../testing/common-test-imports';

import { AboutComponent } from './about.component';
import { SettingsData } from 'src/app/models/salah.model';
import { SettingsService } from 'src/app/services/settings.service';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: COMMON_TEST_IMPORTS,
      declarations: [AboutComponent],
      schemas: SHALLOW_TEST_SCHEMAS
    });
    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('calculation methods table', () => {
    it('lists every enabled method the calculator uses, with the same angles', () => {
      const enabled = SettingsData.filter((method) => method.enabled && method.angles);
      expect(component.methods.map((row) => row.id)).toEqual(enabled.map((method) => method.id));
      const mwl = component.methods.find((row) => row.id === 'mwl')!;
      expect(mwl.fajrAngle).toBe(18);
      expect(mwl.ishaAngle).toBe(17);
      expect(mwl.ishaMinutes).toBeNull();
    });

    it('shows a fixed Isha interval instead of an angle where the method uses one', () => {
      const makkah = component.methods.find((row) => row.id === 'makkah')!;
      expect(makkah.ishaMinutes).toBe(90);
      expect(makkah.ishaAngle).toBeNull();
    });

    it('marks the user\'s selected method and madhab', () => {
      const settings = TestBed.inject(SettingsService);
      spyOn(settings, 'getCurrentSettings').and.returnValue({ calculationMethod: 'isna', madhab: 'Shafii' } as any);
      fixture.detectChanges();
      expect(component.selectedMethodId).toBe('isna');
      expect(component.isHanafi).toBeFalse();
      const selected = fixture.nativeElement.querySelectorAll('.about-method-selected');
      expect(selected.length).toBe(1);
    });

    it('falls back to Karachi and Hanafi before settings load', () => {
      const settings = TestBed.inject(SettingsService);
      spyOn(settings, 'getCurrentSettings').and.returnValue(null as any);
      expect(component.selectedMethodId).toBe('karachi');
      expect(component.isHanafi).toBeTrue();
    });
  });
});
