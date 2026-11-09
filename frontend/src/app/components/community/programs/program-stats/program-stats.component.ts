import { Component, Input, OnChanges } from '@angular/core';
import { NotifyService } from 'src/app/services/notify.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { AppTranslateService } from 'src/app/services/translate.service';

/** NF-012: the program console's Stats tab (admin and volunteers; the API checks the role). */
@Component({
  selector: 'app-program-stats',
  templateUrl: './program-stats.component.html',
  styleUrls: ['./program-stats.component.scss']
})
export class ProgramStatsComponent implements OnChanges {
  @Input() programId = '';

  stats: any = null;
  statsLoading = false;

  constructor(
    private ramadanApi: RamadanApiService,
    private notify: NotifyService,
    private i18n: AppTranslateService
  ) {}

  ngOnChanges(): void {
    if (this.programId) {
      this.loadStats();
    }
  }

  trackById = (_: number, item: { id: number }): number => item.id;

  loadStats(): void {
    this.statsLoading = true;
    this.ramadanApi.programStats(this.programId).subscribe({
      next: (response) => {
        this.statsLoading = false;
        this.stats = response;
      },
      error: (error) => {
        this.statsLoading = false;
        this.stats = null;
        this.notify.error(error?.error?.error || this.i18n.translateWithParams('PROGRAM_CONSOLE.LOAD_ERROR', {}));
      }
    });
  }

  /** Subscribers who have a packet entry today. */
  get servedToday(): number {
    const total = Number(this.stats?.counts?.subscribers ?? 0);
    return Math.max(0, total - (this.stats?.no_packets_today?.length ?? 0));
  }

  get maxPerDay(): number {
    return Math.max(1, ...((this.stats?.per_day ?? []).map((day: any) => Number(day.packets) || 0)));
  }
}
