import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';
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

const MAX_ITEMS = 3;

/**
 * Home card listing the logged-in user's active programs (subscribed to or organising).
 * Hidden for guests and when there is nothing active, so it never adds empty noise.
 */
@Component({
  selector: 'app-active-programs-card',
  templateUrl: './active-programs-card.component.html',
  styleUrls: ['./active-programs-card.component.scss']
})
export class ActiveProgramsCardComponent implements OnInit {
  items: ActiveProgramItem[] = [];

  constructor(
    private ramadanApi: RamadanApiService,
    private localStorageService: LocalStorageService,
    private i18n: AppTranslateService
  ) {}

  ngOnInit(): void {
    if (!this.localStorageService.hasNonEmptyItem('accessToken')) {
      return;
    }

    this.ramadanApi.programList({ background: true }).subscribe({
      next: (response) => {
        const programs: any[] = Array.isArray(response) ? response : [];
        this.items = programs
          .filter((program) => isProgramActive(program) && this.isMine(program))
          .sort((a, b) => this.sortKey(a) - this.sortKey(b))
          .slice(0, MAX_ITEMS)
          .map((program) => ({
            id: getProgramId(program),
            name: program?.name ?? '',
            icon: PROGRAM_TYPE_ICONS[getProgramType(program)],
            type: getProgramType(program),
            note: this.buildNote(program)
          }));
      },
      // Passive card: on failure it simply stays hidden.
      error: () => {
        this.items = [];
      }
    });
  }

  trackById = (_: number, item: ActiveProgramItem): string => item.id;

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
