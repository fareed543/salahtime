import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard masjid approval highlight (ST-00013)', () => {
  let dashboardService: jasmine.SpyObj<any>;
  let community: jasmine.SpyObj<any>;
  let toast: jasmine.SpyObj<any>;

  const summary = (pending: number, pendingMasjids?: Array<Record<string, unknown>>) => ({
    generatedAt: '2026-10-19T10:00:00Z',
    counts: { masjids: 12, users: 100, programs: 3, locations: 2103 },
    statusBreakdown: {
      users: { active: 90, inactive: 10 },
      masjids: { active: 9, inactive: 1, pending },
      programs: [],
      programTypes: []
    },
    recent: { users: [], masjids: [], programs: [], pendingMasjids },
    visitorStats: {
      total: 0,
      ...Object.fromEntries(['daily', 'weekly', 'monthly', 'yearly'].map((period) => [period, { total: 0, average: 0, peak: { label: '', value: 0 }, points: [] }]))
    },
    insights: null
  });
  const masjid = (id: number, name: string) => ({ id, name, location: 'Fairlands, Salem', submittedAt: '2026-10-18 09:00:00' });

  const create = () => new DashboardComponent(dashboardService, {} as any, community, toast, {} as any, {} as any);
  const load = (component: DashboardComponent) => (component as any).loadSummary();

  beforeEach(() => {
    dashboardService = jasmine.createSpyObj('AdminDashboardService', ['getSummary']);
    community = jasmine.createSpyObj('CommunityService', ['toggleMasjidStatus']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
  });

  describe('positive', () => {
    it('lists masjids waiting for approval and flags the Masjids card', () => {
      dashboardService.getSummary.and.returnValue(of(summary(2, [masjid(5, 'Masjid-e-Noor'), masjid(6, 'Jama Masjid')])));
      const component = create();
      load(component);
      expect(component.pendingMasjidCount).toBe(2);
      expect(component.pendingMasjids.map((item) => item.id)).toEqual([5, 6]);
      const masjidCard = component.statCards.find((card) => card.label === 'Masjids')!;
      expect(masjidCard.trend).toBe('2 waiting for approval');
      expect(masjidCard.trendTone).toBe('danger');
    });

    it('approves from the dashboard, removes the row and confirms with a toast', () => {
      dashboardService.getSummary.and.returnValues(
        of(summary(2, [masjid(5, 'Masjid-e-Noor'), masjid(6, 'Jama Masjid')])),
        of(summary(1, [masjid(6, 'Jama Masjid')]))
      );
      community.toggleMasjidStatus.and.returnValue(of({ message: 'Masjid approved.', status: 'active', isActive: true }));
      const component = create();
      load(component);
      component.approveMasjid(component.pendingMasjids[0]);
      expect(community.toggleMasjidStatus).toHaveBeenCalledWith(5);
      expect(toast.success).toHaveBeenCalledWith('Masjid approved.');
      expect(component.pendingMasjids.map((item) => item.id)).toEqual([6]);
      expect(component.pendingMasjidCount).toBe(1);
      // The refresh after approving does not show the full-page loader.
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('negative', () => {
    it('shows nothing to approve when the queue is empty', () => {
      dashboardService.getSummary.and.returnValue(of(summary(0, [])));
      const component = create();
      load(component);
      expect(component.pendingMasjidCount).toBe(0);
      const masjidCard = component.statCards.find((card) => card.label === 'Masjids')!;
      expect(masjidCard.trend).toBe('9 active');
    });

    it('copes with an older API that sends no pending data', () => {
      const old = summary(0, undefined) as any;
      delete old.statusBreakdown.masjids.pending;
      dashboardService.getSummary.and.returnValue(of(old));
      const component = create();
      load(component);
      expect(component.pendingMasjids).toEqual([]);
      expect(component.pendingMasjidCount).toBe(0);
    });

    it('keeps the masjid listed and shows an error toast when approval fails', () => {
      dashboardService.getSummary.and.returnValue(of(summary(1, [masjid(5, 'Masjid-e-Noor')])));
      community.toggleMasjidStatus.and.returnValue(throwError(() => ({ error: { error: 'Masjid not found' } })));
      const component = create();
      load(component);
      component.approveMasjid(component.pendingMasjids[0]);
      expect(toast.error).toHaveBeenCalled();
      expect(component.pendingMasjids.length).toBe(1);
      expect(component.approvingIds.has(5)).toBeFalse();
    });
  });
});
