import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LocationService } from 'src/app/services/location.service';
import { NotifyService } from 'src/app/services/notify.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { SettingsService } from 'src/app/services/settings.service';
import { AppTranslateService } from 'src/app/services/translate.service';
import { needsGenderConfirmation } from 'src/app/shared/gender-confirm/gender-confirm.component';
import {
  PROGRAM_TYPE_ICONS,
  daysUntil,
  getProgramId,
  getProgramType,
  isProgramActive,
  parseProgramDate
} from '../../community/programs/program-utils';

interface ActiveProgramItem {
  id: string;
  name: string;
  icon: string;
  type: string;
  note: string;
}

interface NearbyProgramItem extends ActiveProgramItem {
  place: string;
  enrolled: boolean;
  waitlisted: boolean;
  busy: boolean;
}

const MAX_ITEMS = 3;

/**
 * Home card: programs near the user with an Enrol button (NF-012, also shown to guests) and the
 * signed-in user's own active programs. Hidden when both are empty, so it never adds noise.
 */
@Component({
  selector: 'app-active-programs-card',
  templateUrl: './active-programs-card.component.html',
  styleUrls: ['./active-programs-card.component.scss']
})
export class ActiveProgramsCardComponent implements OnInit {
  items: ActiveProgramItem[] = [];
  nearby: NearbyProgramItem[] = [];
  askGender = false;
  private mineIds = new Set<string>();

  constructor(
    private ramadanApi: RamadanApiService,
    private localStorageService: LocalStorageService,
    private locationService: LocationService,
    private settingsService: SettingsService,
    private router: Router,
    private notify: NotifyService,
    private i18n: AppTranslateService
  ) {}

  get isLoggedIn(): boolean {
    return this.localStorageService.hasNonEmptyItem('accessToken');
  }

  ngOnInit(): void {
    if (this.isLoggedIn) {
      this.askGender = needsGenderConfirmation(this.localStorageService);
      this.loadMine();
    } else {
      this.loadNearby();
    }
  }

  trackById = (_: number, item: ActiveProgramItem): string => item.id;

  onGenderConfirmed(): void {
    this.askGender = false;
    this.loadNearby();
  }

  enrol(item: NearbyProgramItem): void {
    if (!this.isLoggedIn) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/programs/${item.id}?subscribe=${item.id}` } });
      return;
    }
    if (item.busy) {
      return;
    }
    item.busy = true;
    this.ramadanApi.programEnrollment(Number(item.id)).subscribe({
      next: (response) => {
        item.busy = false;
        item.enrolled = Number(response?.entrolled) === 1;
        item.waitlisted = response?.enrolment_status === 'waitlisted';
        const key = !item.enrolled ? 'PROGRAM_PAGE.HOME.LEFT' : (item.waitlisted ? 'PROGRAM_PAGE.HOME.WAITLISTED' : 'PROGRAM_PAGE.HOME.ENROLLED');
        this.notify.success(this.i18n.translateWithParams(key, { name: item.name }));
      },
      error: (error) => {
        item.busy = false;
        if (error?.error?.code === 'gender_required') {
          this.askGender = true;
          return;
        }
        this.notify.error(error?.error?.error || this.i18n.translateWithParams('PROGRAM_PAGE.SUBSCRIPTION_ERROR', {}));
      }
    });
  }

  private loadMine(): void {
    this.ramadanApi.programList({ background: true }).subscribe({
      next: (response) => {
        const programs: any[] = Array.isArray(response) ? response : [];
        const mine = programs.filter((program) => isProgramActive(program) && this.isMine(program));
        this.mineIds = new Set(mine.map((program) => getProgramId(program)));
        this.items = mine
          .sort((a, b) => this.sortKey(a) - this.sortKey(b))
          .slice(0, MAX_ITEMS)
          .map((program) => this.toItem(program));
        this.loadNearby();
      },
      // Passive card: on failure it simply stays hidden.
      error: () => {
        this.items = [];
        this.loadNearby();
      }
    });
  }

  private loadNearby(): void {
    const origin = this.origin();
    if (!origin) {
      return;
    }
    this.ramadanApi.programsNear(origin.lat, origin.lng).subscribe({
      next: (response) => {
        this.nearby = (response?.list ?? [])
          .filter((program) => !this.mineIds.has(getProgramId(program)))
          .slice(0, MAX_ITEMS)
          .map((program) => ({
            ...this.toItem(program),
            place: [program?.masjid_name, program?.distance_km != null ? `${program.distance_km} km` : ''].filter(Boolean).join(' · '),
            enrolled: Number(program?.entrolled) === 1,
            waitlisted: program?.enrolment_status === 'waitlisted',
            busy: false
          }));
      },
      error: () => {
        this.nearby = [];
      }
    });
  }

  /** Last known position, else the city chosen in settings; never prompts for GPS on Home. */
  private origin(): { lat: number; lng: number } | null {
    const recent = this.locationService.getCurrentLocation();
    if (recent) {
      return recent;
    }
    const city = this.settingsService.getCurrentSettings()?.location?.city?.coordinates;
    return city && Number.isFinite(city.latitude) && Number.isFinite(city.longitude)
      ? { lat: city.latitude, lng: city.longitude }
      : null;
  }

  private toItem(program: any): ActiveProgramItem {
    return {
      id: getProgramId(program),
      name: program?.name ?? '',
      icon: PROGRAM_TYPE_ICONS[getProgramType(program)],
      type: getProgramType(program),
      note: this.buildNote(program)
    };
  }

  private isMine(program: any): boolean {
    if (program?.is_mine === true || Number(program?.entrolled) === 1 || program?.canEdit === true || program?.can_edit === true) {
      return true;
    }

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const userId = String(userInfo?.id ?? userInfo?.id_customer ?? userInfo?.customer_id ?? '');
    const ownerId = String(program?.created_by ?? program?.id_customer ?? '');
    return !!userId && userId === ownerId;
  }

  // Soonest-ending first; programs without an end date go last.
  private sortKey(program: any): number {
    return parseProgramDate(program?.end_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  }

  private buildNote(program: any): string {
    const start = parseProgramDate(program?.start_date);
    if (start && daysUntil(start) > 0) {
      return this.i18n.translateWithParams('PROGRAM_PAGE.HOME.STARTS_IN', { days: daysUntil(start) });
    }

    const end = parseProgramDate(program?.end_date);
    if (!end) {
      return '';
    }

    const days = daysUntil(end);
    return days <= 0
      ? this.i18n.translateWithParams('PROGRAM_PAGE.HOME.ENDS_TODAY', {})
      : this.i18n.translateWithParams('PROGRAM_PAGE.HOME.ENDS_IN', { days });
  }
}
