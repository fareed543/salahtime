import { of } from 'rxjs';

import { MasjidComponent } from './masjid.component';

describe('MasjidComponent', () => {
  // ST-00015: any signed-in user can update an approved masjid's timings from a board photo.
  it('lets a signed-in non-owner upload board timings and saves only the timings', () => {
    const savedDetails = { id: 42, id_customer: 3, status: 1, canEdit: false, canUploadTimings: true, timings: [] };
    const ramadanService = jasmine.createSpyObj('RamadanApiService', ['saveMasjid', 'saveMasjidTimings']);
    ramadanService.saveMasjidTimings.and.returnValue(of(savedDetails));
    const localStorageService = jasmine.createSpyObj('LocalStorageService', ['getItem', 'setItem']);
    localStorageService.getItem.and.callFake((key: string) => (key === 'userInfo' ? { id: 7 } : null));
    const i18n = jasmine.createSpyObj('AppTranslateService', ['translateWithParams']);
    i18n.translateWithParams.and.callFake((key: string) => key);

    const component = new MasjidComponent(
      ramadanService, {} as any, {} as any, localStorageService, {} as any, {} as any,
      {} as any, {} as any, i18n, {} as any, document
    );
    // Masjid page for a masjid owned by customer 3, viewed by customer 7.
    component.detailMode = true;
    component.selectedMasjid = { id: 42, id_customer: 3, status: 1, canEdit: false, canUploadTimings: true, timings: [] };

    const actionIds = component.headerActions.map((action) => action.id);
    expect(actionIds).toContain('board');
    expect(actionIds).not.toContain('edit');
    expect(actionIds).not.toContain('photos');

    (component as any).applyCapture({
      imageUrl: 'http://localhost/uploads/masjid-timing-boards/42/board.jpg',
      timings: [{ salah: 'Fajr', azan: '05:10', jamat: '05:30' }],
      notes: '',
      readError: null
    });
    // Only the timing table opens for review; the rest of the masjid stays read-only.
    expect(component.editMode).toBeFalse();
    expect(component.editingTimings).toBeTrue();

    component.saveCapture();

    expect(ramadanService.saveMasjid).not.toHaveBeenCalled();
    expect(ramadanService.saveMasjidTimings).toHaveBeenCalledWith(
      42,
      jasmine.arrayContaining([jasmine.objectContaining({ salah: 'Fajr', azan: '05:10', jamat: '05:30' })]),
      'http://localhost/uploads/masjid-timing-boards/42/board.jpg'
    );
    expect(component.capture).toBeNull();
    expect(component.editingTimings).toBeFalse();
  });
});
