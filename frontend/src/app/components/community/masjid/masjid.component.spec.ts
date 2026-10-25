import { of, throwError } from 'rxjs';

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
      {} as any, {} as any, i18n, {} as any, jasmine.createSpyObj('NotifyService', ['success', 'error', 'warning', 'info']), document
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
  // ST-00013: WhatsApp group, Google Maps link, Imam and Muazzin contacts.
  describe('masjid contacts and links', () => {
    const build = () => {
      const ramadanService = jasmine.createSpyObj('RamadanApiService', ['saveMasjid']);
      const localStorageService = jasmine.createSpyObj('LocalStorageService', ['getItem', 'setItem']);
      localStorageService.getItem.and.callFake((key: string) => (key === 'userInfo' ? { id: 7 } : null));
      const i18n = jasmine.createSpyObj('AppTranslateService', ['translateWithParams']);
      i18n.translateWithParams.and.callFake((key: string) => key);
      const router = jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate']);
      const component = new MasjidComponent(
        ramadanService, {} as any, router, localStorageService, {} as any, {} as any,
        {} as any, {} as any, i18n, {} as any, jasmine.createSpyObj('NotifyService', ['success', 'error', 'warning', 'info']), document
      );
      component.selectedMasjid = { id: 42, id_customer: 7, status: 1, name: 'Masjid-e-Noor', timings: [] };
      component.localDetails = (component as any).mapApiToLocalDetails({
        whatsappGroupUrl: 'https://chat.whatsapp.com/AbC123',
        mapUrl: 'https://maps.app.goo.gl/xyz',
        imamName: 'Imam Yusuf',
        imamPhone: '+91 98765 43210',
        muazzinName: 'Bilal',
        muazzinPhone: '044 2345 6789'
      });
      return { component, ramadanService, router };
    };
    const sentFields = (ramadanService: jasmine.SpyObj<any>) => {
      const form = ramadanService.saveMasjid.calls.mostRecent().args[0] as FormData;
      return (name: string) => form.get(name);
    };

    describe('positive', () => {
      it('reads the contacts and links from the API', () => {
        const { component } = build();
        expect(component.localDetails.whatsappGroupUrl).toBe('https://chat.whatsapp.com/AbC123');
        expect(component.localDetails.imamName).toBe('Imam Yusuf');
        expect(component.localDetails.muazzinPhone).toBe('044 2345 6789');
      });

      it('sends every contact field when saving', () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(of({ id: 42, timings: [] }));
        component.saveMasjid();
        const field = sentFields(ramadanService);
        expect(field('whatsappGroupUrl')).toBe('https://chat.whatsapp.com/AbC123');
        expect(field('mapUrl')).toBe('https://maps.app.goo.gl/xyz');
        expect(field('imamName')).toBe('Imam Yusuf');
        expect(field('imamPhone')).toBe('+91 98765 43210');
        expect(field('muazzinName')).toBe('Bilal');
        expect(field('muazzinPhone')).toBe('044 2345 6789');
        expect(component.errorMessage).toBe('');
      });

      it('allows the fields to be left empty', () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(of({ id: 42, timings: [] }));
        component.localDetails = (component as any).createDefaultDetails();
        expect(component.contactFieldsError()).toBe('');
        component.saveMasjid();
        expect(ramadanService.saveMasjid).toHaveBeenCalled();
      });

      it('builds a dialable tel: link', () => {
        const { component } = build();
        expect(component.telLink('+91 98765-43210')).toBe('tel:+919876543210');
      });
    });

    describe('negative', () => {
      it('blocks a link that is not a WhatsApp group', () => {
        const { component, ramadanService } = build();
        component.localDetails.whatsappGroupUrl = 'https://example.com/join';
        component.saveMasjid();
        expect(ramadanService.saveMasjid).not.toHaveBeenCalled();
        expect(component.errorMessage).toBe('MASJID_PAGE.CONTACTS.INVALID_WHATSAPP');
      });

      it('blocks a map link that is not Google Maps, including lookalike domains', () => {
        const { component, ramadanService } = build();
        for (const url of ['https://example.com/maps', 'https://maps.app.goo.gl.evil.com/x', 'javascript:alert(1)']) {
          component.localDetails.mapUrl = url;
          component.saveMasjid();
          expect(component.errorMessage).withContext(url).toBe('MASJID_PAGE.CONTACTS.INVALID_MAP');
        }
        expect(ramadanService.saveMasjid).not.toHaveBeenCalled();
      });

      it('blocks a phone number that is not a number', () => {
        const { component, ramadanService } = build();
        component.localDetails.muazzinPhone = 'call me';
        component.saveMasjid();
        expect(ramadanService.saveMasjid).not.toHaveBeenCalled();
        expect(component.errorMessage).toBe('MASJID_PAGE.CONTACTS.INVALID_PHONE');
      });

      it('does not send phones it never received, so a save cannot erase them', () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(of({ id: 42, timings: [] }));
        component.localDetails = (component as any).mapApiToLocalDetails({ imamName: 'Imam Yusuf', hasHiddenPhones: true });
        component.saveMasjid();
        const field = sentFields(ramadanService);
        expect(field('imamName')).toBe('Imam Yusuf');
        expect(field('imamPhone')).toBeNull();
        expect(field('muazzinPhone')).toBeNull();
      });

      it("shows the server's error when the save is rejected", () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(throwError(() => ({ status: 422, error: { error: 'Enter a Google Maps link, e.g. https://maps.app.goo.gl/…' } })));
        component.saveMasjid();
        expect(component.errorMessage).toContain('Google Maps');
        expect(component.loading).toBeFalse();
      });

      it('shows a general message when the server gives no reason', () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(throwError(() => ({ status: 0 })));
        component.saveMasjid();
        expect(component.errorMessage).toBe('MASJID_PAGE.CONTACTS.SAVE_FAILED');
      });
    });
  });

  // FEEDBACK 2026-10-25: the pin must keep every decimal the owner enters, up to 7.
  describe('masjid map pin', () => {
    const lat = '11.7745256';
    const lng = '78.2071182';
    const build = () => {
      const ramadanService = jasmine.createSpyObj('RamadanApiService', ['saveMasjid']);
      const localStorageService = jasmine.createSpyObj('LocalStorageService', ['getItem', 'setItem']);
      localStorageService.getItem.and.callFake((key: string) => (key === 'userInfo' ? { id: 7 } : null));
      const i18n = jasmine.createSpyObj('AppTranslateService', ['translateWithParams']);
      i18n.translateWithParams.and.callFake((key: string) => key);
      const notify = jasmine.createSpyObj('NotifyService', ['success', 'error', 'warning', 'info']);
      const router = jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate']);
      const component = new MasjidComponent(
        ramadanService, {} as any, router, localStorageService, {} as any, {} as any,
        {} as any, {} as any, i18n, {} as any, notify, document
      );
      component.selectedMasjid = { id: 42, id_customer: 7, status: 1, name: 'Madrasa-o-Masjid-e-Noorul Uloom', timings: [] };
      component.localDetails = (component as any).createDefaultDetails();
      return { component, ramadanService, notify };
    };
    const sentFields = (ramadanService: jasmine.SpyObj<any>) => {
      const form = ramadanService.saveMasjid.calls.mostRecent().args[0] as FormData;
      return (name: string) => form.get(name);
    };

    describe('positive', () => {
      it('saves a typed 7-decimal position without losing digits', () => {
        const { component, ramadanService } = build();
        // The API answers with what it stored; DECIMAL columns come back as strings.
        ramadanService.saveMasjid.and.returnValue(of({ id: 42, latitude: lat, longitude: lng, timings: [] }));
        component.openManualPin();
        component.manualLat = lat;
        component.manualLng = lng;
        component.applyManualPin();

        expect(component.selectedMasjid.latitude).toBe(11.7745256);
        expect(component.selectedMasjid.longitude).toBe(78.2071182);
        expect(component.pinLabel(component.selectedMasjid)).toBe(`${lat}, ${lng}`);

        component.saveMasjid();
        const field = sentFields(ramadanService);
        expect(field('latitude')).toBe(lat);
        expect(field('longitude')).toBe(lng);
        expect(component.errorMessage).toBe('');
        // After the save the map points at exactly the entered spot.
        expect(component.mapUrl(component.selectedMasjid)).toBe(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        expect(component.directionsUrl(component.selectedMasjid)).toBe(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      });

      it('reads a pasted "lat, lng" pair and a Google Maps link at full precision', () => {
        const { component } = build();
        for (const text of [`${lat}, ${lng}`, `${lat}\n${lng}`, `https://www.google.com/maps/@${lat},${lng},17z`]) {
          component.manualLat = text;
          component.manualLng = '';
          component.applyManualPin();
          expect(component.pinLabel(component.selectedMasjid)).withContext(text).toBe(`${lat}, ${lng}`);
        }
      });

      it('rounds anything finer than 7 decimals (about 1 cm) to 7', () => {
        const { component } = build();
        component.manualLat = '11.77452561234';
        component.manualLng = '78.20711819999';
        component.applyManualPin();
        expect(component.selectedMasjid.latitude).toBe(11.7745256);
        expect(component.selectedMasjid.longitude).toBe(78.2071182);
      });

      it('saves typed coordinates even when Apply was not pressed', () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(of({ id: 42, latitude: lat, longitude: lng, timings: [] }));
        component.openManualPin();
        component.manualLat = lat;
        component.manualLng = lng;
        component.saveMasjid();
        const field = sentFields(ramadanService);
        expect(field('latitude')).toBe(lat);
        expect(field('longitude')).toBe(lng);
        expect(component.manualPinOpen).toBeFalse();
      });

      it('opens the manual boxes with the saved position in full', () => {
        const { component } = build();
        component.selectedMasjid.latitude = lat;
        component.selectedMasjid.longitude = lng;
        component.openManualPin();
        expect(component.manualLat).toBe(lat);
        expect(component.manualLng).toBe(lng);
      });
    });

    describe('negative', () => {
      it('rejects an out-of-range latitude and sets no pin', () => {
        const { component, notify } = build();
        component.manualLat = '91.1234567';
        component.manualLng = lng;
        component.applyManualPin();
        expect(component.hasPin(component.selectedMasjid)).toBeFalse();
        expect(notify.warning).toHaveBeenCalledWith('MASJID_PAGE.PIN.INVALID');
      });

      it('does not save when the unapplied coordinates are invalid', () => {
        const { component, ramadanService, notify } = build();
        component.openManualPin();
        component.manualLat = 'abc';
        component.manualLng = lng;
        component.saveMasjid();
        expect(ramadanService.saveMasjid).not.toHaveBeenCalled();
        expect(notify.warning).toHaveBeenCalledWith('MASJID_PAGE.PIN.INVALID');
      });

      it('sends an empty position when the pin is cleared', () => {
        const { component, ramadanService } = build();
        ramadanService.saveMasjid.and.returnValue(of({ id: 42, timings: [] }));
        component.manualLat = lat;
        component.manualLng = lng;
        component.applyManualPin();
        component.clearPin();
        component.saveMasjid();
        const field = sentFields(ramadanService);
        expect(field('latitude')).toBe('');
        expect(field('longitude')).toBe('');
      });
    });
  });
});
