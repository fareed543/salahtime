import { Component, OnDestroy, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';
import { SettingsService } from 'src/app/services/settings.service';
import { formatDisplayTime } from 'src/app/shared/time-picker-dialog/time-picker-dialog.component';
import { findNextJamat, parseMasjidTime } from '../../community/masjid/masjid-timing-utils';

interface JamatSlot {
  salah: string;
  time: string;
  /** `time` in the user's 12h/24h format, for screen readers. */
  label: string;
  clock: string;
  meridiem: string;
  isNext: boolean;
}

interface FavoriteMasjidItem {
  id: string;
  name: string;
  place: string;
  timings: any[];
  slots: JamatSlot[];
}

const MAX_ITEMS = 2;

/**
 * Home card with the user's favourite masjids (picked with the heart on the Masjid screens)
 * and today's jamat times, the next one highlighted. Hidden for guests and when no favourites.
 */
@Component({
  selector: 'app-favorite-masjid-card',
  templateUrl: './favorite-masjid-card.component.html',
  styleUrls: ['./favorite-masjid-card.component.scss']
})
export class FavoriteMasjidCardComponent implements OnInit, OnDestroy {
  items: FavoriteMasjidItem[] = [];
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(
    private ramadanApi: RamadanApiService,
    private localStorageService: LocalStorageService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    if (!this.localStorageService.hasNonEmptyItem('accessToken')) {
      return;
    }

    const favoriteIds = this.localStorageService.getItem<string[]>(`favorite-masjids-${this.getUserId()}`) ?? [];
    if (!favoriteIds.length) {
      return;
    }

    this.ramadanApi.masjidList({ background: true }).subscribe({
      next: (response) => {
        const masjids: any[] = Array.isArray(response) ? response : response?.list ?? [];
        this.items = favoriteIds
          .map((id) => masjids.find((masjid) => String(masjid?.id) === String(id)))
          .filter((masjid) => !!masjid)
          .slice(0, MAX_ITEMS)
          .map((masjid) => ({
            id: String(masjid.id),
            name: masjid?.name ?? '',
            place: [masjid?.area, masjid?.city].filter((value, index, all) => !!value && all.indexOf(value) === index).join(', '),
            timings: Array.isArray(masjid?.timings) ? masjid.timings : [],
            slots: []
          }));
        this.refreshSlots();
        if (this.items.length) {
          // Move the "next" highlight along as jamat times pass.
          this.refreshTimer = setInterval(() => this.refreshSlots(), 60000);
        }
      },
      // Passive card: on failure it simply stays hidden.
      error: () => {
        this.items = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  trackById = (_: number, item: FavoriteMasjidItem): string => item.id;

  private refreshSlots(): void {
    const now = new Date();
    const use24h = this.settingsService.getCurrentSettings()?.timeFormat === '24h';
    this.items.forEach((item) => {
      const next = findNextJamat(item.timings, now);
      item.slots = item.timings
        .map((timing) => ({
          salah: String(timing?.salah ?? '').trim(),
          time: timing?.jamat || timing?.jamat_time || timing?.azan || timing?.azan_time || ''
        }))
        .filter((slot) => !!slot.salah && !!parseMasjidTime(slot.time, now))
        .filter((slot) => now.getDay() === 5 || !/^jum/i.test(slot.salah))
        .sort((a, b) => parseMasjidTime(a.time, now)!.getTime() - parseMasjidTime(b.time, now)!.getTime())
        .map((slot) => {
          // 12h: "05:30 PM" -> "5:30" + "PM", so a full day of slots fits one row on a phone. 24h: "17:30".
          const label = formatDisplayTime(slot.time, use24h);
          const [, clock = label, meridiem = ''] = label.match(/^0?(\d{1,2}:\d{2})\s*(AM|PM)?$/i) ?? [];
          return {
            ...slot,
            label,
            clock: use24h ? label : clock,
            meridiem: use24h ? '' : meridiem.toUpperCase(),
            isNext: !!next && next.salah === slot.salah && next.time === slot.time
          };
        });
    });
  }

  private getUserId(): string {
    const userInfo = this.localStorageService.getItem<any>('userInfo');
    return String(userInfo?.id ?? userInfo?.id_customer ?? userInfo?.customer_id ?? userInfo?.user_id ?? userInfo?.id_user ?? '');
  }
}
