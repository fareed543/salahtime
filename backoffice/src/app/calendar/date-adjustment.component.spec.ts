import { of, throwError } from 'rxjs';
import { AdminCalendarAdjustment } from './calendar.service';
import { DateAdjustmentComponent } from './date-adjustment.component';

describe('DateAdjustmentComponent per-country adjustments (ST-00019)', () => {
  const INDIA = 1;
  const PAKISTAN = 2;
  const SAUDI = 3;

  let calendarService: jasmine.SpyObj<any>;
  let locationsService: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<any>;
  let component: DateAdjustmentComponent;

  const adjustment = (overrides: Partial<AdminCalendarAdjustment>): AdminCalendarAdjustment => ({
    id: 1,
    title: 'Muharram 1448',
    hijriYear: 1448,
    hijriMonth: 1,
    originalStartDate: '',
    originalEndDate: '',
    updatedStartDate: '',
    updatedEndDate: '',
    startDate: '',
    endDate: '',
    adjustmentDays: 0,
    notes: '',
    isActive: true,
    countryId: INDIA,
    ...overrides
  });

  const create = (items: AdminCalendarAdjustment[]) => {
    calendarService.getAdjustments.and.returnValue(of({ items }));
    component = new DateAdjustmentComponent(calendarService, locationsService, toast);
    component.ngOnInit();
  };

  beforeEach(() => {
    calendarService = jasmine.createSpyObj('CalendarService', ['getAdjustments', 'saveAdjustments']);
    locationsService = jasmine.createSpyObj('LocationsService', ['countryOptions']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    locationsService.countryOptions.and.returnValue(of([
      { id: SAUDI, name: 'Saudi Arabia' },
      { id: INDIA, name: 'India' },
      { id: PAKISTAN, name: 'Pakistan' }
    ]));
    calendarService.saveAdjustments.and.callFake((items: AdminCalendarAdjustment[]) => of({ items }));
  });

  describe('positive', () => {
    it('loads countries sorted by name', () => {
      create([]);
      expect(component.countries.map((country) => country.name)).toEqual(['India', 'Pakistan', 'Saudi Arabia']);
    });

    it('shows each adjustment\'s country name', () => {
      create([adjustment({ countryId: PAKISTAN })]);
      expect(component.getCountryName(component.adjustmentItems[0].countryId)).toBe('Pakistan');
    });

    it('filters the list to one country and keeps the selection inside it', () => {
      create([adjustment({ id: 1, countryId: INDIA }), adjustment({ id: 2, countryId: PAKISTAN, hijriMonth: 2 })]);
      component.countryFilter = PAKISTAN;
      component.onCountryFilterChange();
      expect(component.visibleItems.map((item) => item.id)).toEqual([2]);
      expect(component.selectedAdjustmentId).toBe(2);
    });

    it('shows every adjustment when the filter is "All countries"', () => {
      create([adjustment({ id: 1, countryId: INDIA }), adjustment({ id: 2, countryId: PAKISTAN, hijriMonth: 2 })]);
      component.countryFilter = null;
      expect(component.visibleItems.length).toBe(2);
    });

    it('defaults a new adjustment to the filtered country', () => {
      create([]);
      component.countryFilter = SAUDI;
      component.addAdjustment();
      expect(component.selectedAdjustment?.countryId).toBe(SAUDI);
    });

    it('allows the same Hijri month for different countries and sends countryId', () => {
      create([
        adjustment({ id: 1, countryId: INDIA }),
        adjustment({ id: 2, countryId: PAKISTAN })
      ]);
      component.saveAdjustments();
      expect(calendarService.saveAdjustments).toHaveBeenCalledTimes(1);
      const payload = calendarService.saveAdjustments.calls.mostRecent().args[0] as AdminCalendarAdjustment[];
      expect(payload.map((item) => item.countryId).sort()).toEqual([INDIA, PAKISTAN]);
      expect(component.errorMessage).toBe('');
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Calendar month overrides saved successfully.');
    });

    it('turns a countryId sent as text into a number', () => {
      create([adjustment({ countryId: '2' as any })]);
      expect(component.adjustmentItems[0].countryId).toBe(PAKISTAN);
    });
  });

  describe('negative', () => {
    it('refuses to save an adjustment without a country', () => {
      create([adjustment({ id: 1, countryId: INDIA }), adjustment({ id: 2, countryId: null, hijriMonth: 3 })]);
      component.countryFilter = INDIA;
      component.saveAdjustments();
      expect(calendarService.saveAdjustments).not.toHaveBeenCalled();
      expect(toast.error.calls.mostRecent().args[0]).toContain('Select the country');
      expect(component.selectedAdjustmentId).toBe(2);
      expect(component.countryFilter).toBeNull();
    });

    it('refuses a new adjustment added under "All countries" until a country is picked', () => {
      create([]);
      component.addAdjustment();
      expect(component.selectedAdjustment?.countryId).toBeNull();
      component.saveAdjustments();
      expect(calendarService.saveAdjustments).not.toHaveBeenCalled();
    });

    it('refuses the same Hijri month twice for one country', () => {
      create([adjustment({ id: 1, countryId: INDIA }), adjustment({ id: 2, countryId: INDIA })]);
      component.saveAdjustments();
      expect(calendarService.saveAdjustments).not.toHaveBeenCalled();
      expect(toast.error.calls.mostRecent().args[0]).toContain('more than once for India');
    });

    it('refuses an updated end date before the start date', () => {
      create([adjustment({})]);
      component.adjustmentItems[0].updatedEndDate = '2000-01-01';
      component.saveAdjustments();
      expect(calendarService.saveAdjustments).not.toHaveBeenCalled();
      expect(toast.error.calls.mostRecent().args[0]).toContain('end date');
    });

    it('shows the server error when saving fails', () => {
      create([adjustment({})]);
      const serverError = { error: { error: 'Select the country for Muharram 1448.' } };
      calendarService.saveAdjustments.and.returnValue(throwError(() => serverError));
      component.saveAdjustments();
      expect(component.isSaving).toBeFalse();
      expect(toast.error).toHaveBeenCalledWith(serverError, 'Unable to save calendar adjustments.');
    });

    it('shows a message when countries cannot be loaded', () => {
      locationsService.countryOptions.and.returnValue(throwError(() => new Error('down')));
      create([]);
      expect(component.countries).toEqual([]);
      expect(component.errorMessage).toContain('countries');
    });

    it('shows an empty list for a country with no adjustments', () => {
      create([adjustment({ countryId: INDIA })]);
      component.countryFilter = SAUDI;
      component.onCountryFilterChange();
      expect(component.visibleItems).toEqual([]);
      expect(component.selectedAdjustment).toBeNull();
    });

    it('returns no name for an unknown country', () => {
      create([]);
      expect(component.getCountryName(999)).toBe('');
      expect(component.getCountryName(null)).toBe('');
    });
  });
});
