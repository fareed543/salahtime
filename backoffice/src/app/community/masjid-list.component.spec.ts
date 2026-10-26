import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { MasjidListComponent } from './masjid-list.component';

describe('MasjidListComponent approvals (ST-00013)', () => {
  let community: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<ToastService>;

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 1, status: 'pending', name: 'Masjid-e-Noor', area: 'Fairlands', city: 'Salem', state: 'Tamil Nadu',
    pincode: '636016', isActive: false, ownerName: 'Ahmed', timingsCount: 6, madhab: 'hanafi',
    imagesCount: 2, coverImageUrl: 'https://salah-times.in/uploads/1.jpg', updatedAt: '2026-10-19 10:00:00', ...overrides
  });

  const create = (query: Record<string, string> = {}) => {
    const route = { snapshot: { queryParamMap: { get: (key: string) => query[key] ?? null } } };
    const component = TestBed.runInInjectionContext(() => new MasjidListComponent(community, route as any));
    component.ngOnInit();
    return component;
  };

  beforeEach(() => {
    community = jasmine.createSpyObj('CommunityService', ['listMasjids', 'toggleMasjidStatus', 'deleteMasjid']);
    community.listMasjids.and.returnValue(of({
      items: [row()],
      summary: { total: 1, active: 0, inactive: 0, pending: 1 },
      pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 }
    }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: toast }] });
  });

  describe('positive', () => {
    it('opens already filtered from the dashboard link (?status=pending)', () => {
      const component = create({ status: 'pending' });
      expect(component.status).toBe('pending');
      expect(community.listMasjids).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'pending' }));
    });

    it('approves and confirms with a toast', () => {
      community.toggleMasjidStatus.and.returnValue(of({ message: 'Masjid approved.', status: 'active', isActive: true }));
      const component = create();
      component.toggleStatus(component.items[0]);
      expect(community.toggleMasjidStatus).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith('Masjid approved.');
      expect(community.listMasjids).toHaveBeenCalledTimes(2);
    });

    it('confirms a delete with a toast', async () => {
      community.deleteMasjid.and.returnValue(of({ message: 'Masjid deleted.' }));
      const component = create();
      spyOn<any>(component, 'confirmDanger').and.resolveTo(true);
      await component.confirmDelete(component.items[0]);
      expect(toast.success).toHaveBeenCalledWith('Masjid deleted.');
    });
  });

  describe('negative', () => {
    it('ignores an unknown status in the link', () => {
      const component = create({ status: 'everything' });
      expect(component.status).toBe('');
    });

    it('shows an error toast and keeps the list when approval fails', () => {
      community.toggleMasjidStatus.and.returnValue(throwError(() => ({ error: { error: 'Masjid not found.' } })));
      const component = create();
      component.toggleStatus(component.items[0]);
      expect(toast.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(component.isBusy(1)).toBeFalse();
      expect(component.items.length).toBe(1);
    });

    it('does not delete when the admin cancels', async () => {
      const component = create();
      spyOn<any>(component, 'confirmDanger').and.resolveTo(false);
      await component.confirmDelete(component.items[0]);
      expect(community.deleteMasjid).not.toHaveBeenCalled();
    });

    it('keeps a load failure inline instead of a toast', () => {
      community.listMasjids.and.returnValue(throwError(() => ({ error: { error: 'Unable to load masjids.' } })));
      const component = create();
      expect(component.errorMessage).toBe('Unable to load masjids.');
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
