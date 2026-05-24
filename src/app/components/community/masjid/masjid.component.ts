import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

interface MasjidTimingRow {
  salah: string;
  azan: string;
  jamat: string;
}

interface MasjidCommitteeMember {
  name: string;
  role: string;
  phone?: string;
}

interface MasjidLocalDetails {
  email: string;
  contact: string;
  location: string;
  qrCodeUrl: string;
  qrApproved: boolean;
  qrApprovedBy: string;
  stayNearby: boolean;
  ladiesJamat: boolean;
  ladiesRamzanAccess: boolean;
  facilities: {
    wazuKhana: boolean;
    toilet: boolean;
    guslKhana: boolean;
    airConditioners: boolean;
    chairs: boolean;
  };
  committeeMembers: MasjidCommitteeMember[];
  timings: MasjidTimingRow[];
}

@Component({
  selector: 'app-masjid',
  templateUrl: './masjid.component.html',
  styleUrls: ['./masjid.component.scss']
})
export class MasjidComponent implements OnInit {
  masjids: any[] = [];
  loading = false;
  detailMode = false;
  selectedMasjid: any = null;
  localDetails: MasjidLocalDetails = this.createDefaultDetails();
  editMode = false;
  message = '';

  private readonly localEditsKey = 'masjidLocalEdits';
  private readonly localDeletesKey = 'masjidLocalDeletes';
  private readonly localDetailsPrefix = 'masjidExtraDetails:';

  constructor(
    private ramadanService: RamadanApiService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const masjidId = params.get('id');
      this.detailMode = !!masjidId;
      this.loadMasjids(masjidId);
    });
  }

  get isOwner(): boolean {
    if (!this.selectedMasjid) {
      return false;
    }

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const currentUserId = String(userInfo?.id ?? userInfo?.user_id ?? userInfo?.id_user ?? '');
    const ownerId = String(
      this.selectedMasjid?.created_by ??
      this.selectedMasjid?.user_id ??
      this.selectedMasjid?.id_user ??
      this.selectedMasjid?.owner_id ??
      ''
    );

    return !!currentUserId && !!ownerId && currentUserId === ownerId;
  }

  loadMasjids(masjidId?: string | null): void {
    this.loading = true;
    this.message = '';

    this.ramadanService.masjidList().subscribe({
      next: (response) => {
        const remoteMasjids = Array.isArray(response) ? response : response?.list ?? [];
        this.masjids = this.applyLocalOverrides(remoteMasjids);
        this.loading = false;

        if (masjidId) {
          this.selectedMasjid = this.masjids.find(masjid => this.getMasjidId(masjid) === masjidId) ?? null;
          this.localDetails = this.loadLocalDetails(masjidId, this.selectedMasjid);
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDetails(masjid: any): void {
    const id = this.getMasjidId(masjid);
    if (!id) {
      return;
    }

    this.router.navigate(['/masjid', id]);
  }

  backToList(): void {
    this.router.navigate(['/masjid']);
  }

  enableEdit(): void {
    this.editMode = true;
  }

  saveMasjid(): void {
    if (!this.selectedMasjid) {
      return;
    }

    const id = this.getMasjidId(this.selectedMasjid);

    const edits = this.localStorageService.getItem<Record<string, any>>(this.localEditsKey) ?? {};
    edits[id] = {
      ...this.selectedMasjid,
      email: this.localDetails.email,
      contact: this.localDetails.contact,
      address: this.localDetails.location
    };
    this.localStorageService.setItem(this.localEditsKey, edits);

    this.localStorageService.setItem(this.getLocalDetailsKey(id), this.localDetails);
    this.selectedMasjid = edits[id];
    this.masjids = this.masjids.map(masjid => this.getMasjidId(masjid) === id ? this.selectedMasjid : masjid);
    this.editMode = false;
    this.message = 'Masjid details updated.';
  }

  deleteMasjid(): void {
    if (!this.selectedMasjid) {
      return;
    }

    const id = this.getMasjidId(this.selectedMasjid);
    const deletes = this.localStorageService.getItem<string[]>(this.localDeletesKey) ?? [];
    if (!deletes.includes(id)) {
      deletes.push(id);
    }
    this.localStorageService.setItem(this.localDeletesKey, deletes);
    this.message = 'Masjid deleted from your view.';
    this.router.navigate(['/masjid']);
  }

  addCommitteeMember(): void {
    this.localDetails.committeeMembers.push({
      name: '',
      role: '',
      phone: ''
    });
  }

  removeCommitteeMember(index: number): void {
    this.localDetails.committeeMembers.splice(index, 1);
  }

  addTimingRow(): void {
    this.localDetails.timings.push({
      salah: '',
      azan: '',
      jamat: ''
    });
  }

  removeTimingRow(index: number): void {
    this.localDetails.timings.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private applyLocalOverrides(masjids: any[]): any[] {
    const edits = this.localStorageService.getItem<Record<string, any>>(this.localEditsKey) ?? {};
    const deletes = this.localStorageService.getItem<string[]>(this.localDeletesKey) ?? [];

    return masjids
      .filter(masjid => !deletes.includes(this.getMasjidId(masjid)))
      .map(masjid => edits[this.getMasjidId(masjid)] ?? masjid);
  }

  private loadLocalDetails(masjidId: string, masjid: any): MasjidLocalDetails {
    const stored = this.localStorageService.getItem<MasjidLocalDetails>(this.getLocalDetailsKey(masjidId));
    if (stored) {
      return stored;
    }

    return {
      email: masjid?.email ?? '',
      contact: masjid?.contact ?? masjid?.phone ?? '',
      location: masjid?.address ?? '',
      qrCodeUrl: '',
      qrApproved: false,
      qrApprovedBy: '',
      stayNearby: false,
      ladiesJamat: false,
      ladiesRamzanAccess: false,
      facilities: {
        wazuKhana: false,
        toilet: false,
        guslKhana: false,
        airConditioners: false,
        chairs: false
      },
      committeeMembers: [
        { name: 'Committee Member 1', role: 'President' },
        { name: 'Committee Member 2', role: 'Secretary' }
      ],
      timings: [
        { salah: 'Fajr', azan: '05:00 AM', jamat: '05:30 AM' },
        { salah: 'Dhuhr', azan: '01:15 PM', jamat: '01:30 PM' },
        { salah: 'Asr', azan: '04:45 PM', jamat: '05:00 PM' },
        { salah: 'Maghrib', azan: '06:35 PM', jamat: '06:40 PM' },
        { salah: 'Isha', azan: '08:00 PM', jamat: '08:20 PM' },
        { salah: 'Juma', azan: '01:15 PM', jamat: '01:30 PM' }
      ]
    };
  }

  private createDefaultDetails(): MasjidLocalDetails {
    return {
      email: '',
      contact: '',
      location: '',
      qrCodeUrl: '',
      qrApproved: false,
      qrApprovedBy: '',
      stayNearby: false,
      ladiesJamat: false,
      ladiesRamzanAccess: false,
      facilities: {
        wazuKhana: false,
        toilet: false,
        guslKhana: false,
        airConditioners: false,
        chairs: false
      },
      committeeMembers: [],
      timings: []
    };
  }

  private getMasjidId(masjid: any): string {
    return String(masjid?.id_masjid ?? masjid?.id ?? '');
  }

  private getLocalDetailsKey(masjidId: string): string {
    return `${this.localDetailsPrefix}${masjidId}`;
  }
}
