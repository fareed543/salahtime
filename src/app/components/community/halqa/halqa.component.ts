import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

interface PendingDeleteRecord {
  id: string;
  deleteAfter: string;
}

@Component({
  selector: 'app-halqa',
  templateUrl: './halqa.component.html',
  styleUrls: ['./halqa.component.scss']
})
export class HalqaComponent implements OnInit {
  halqas: any[] = [];
  loading = false;
  detailMode = false;
  selectedHalqa: any = null;
  editMode = false;
  message = '';
  editForm = {
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  };

  private readonly localEditsKey = 'halqaLocalEdits';
  private readonly localDeletesKey = 'halqaLocalDeletes';

  constructor(
    private ramadanService: RamadanApiService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorageService: LocalStorageService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const halqaId = params.get('id');
      this.detailMode = !!halqaId;
      this.loadHalqas(halqaId);
    });
  }

  get isOwner(): boolean {
    if (!this.selectedHalqa) {
      return false;
    }

    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const currentUserId = String(userInfo?.id ?? userInfo?.user_id ?? userInfo?.id_user ?? '');
    const ownerId = String(
      this.selectedHalqa?.created_by ??
      this.selectedHalqa?.user_id ??
      this.selectedHalqa?.id_user ??
      this.selectedHalqa?.owner_id ??
      ''
    );

    return !!currentUserId && !!ownerId && currentUserId === ownerId;
  }

  loadHalqas(halqaId?: string | null): void {
    this.loading = true;
    this.message = '';
    this.ramadanService.halqaList().subscribe({
      next: (response) => {
        const remoteHalqas = Array.isArray(response) ? response : response?.list ?? [];
        this.halqas = this.applyLocalOverrides(remoteHalqas);
        this.loading = false;

        if (halqaId) {
          this.selectedHalqa = this.halqas.find(halqa => this.getHalqaId(halqa) === halqaId) ?? null;
          if (this.selectedHalqa) {
            this.patchEditForm(this.selectedHalqa);
          }
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDetails(halqa: any): void {
    const id = this.getHalqaId(halqa);
    if (!id) {
      return;
    }

    this.router.navigate(['/halqa', id]);
  }

  backToList(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/halqa']);
  }

  enableEdit(): void {
    if (!this.selectedHalqa) {
      return;
    }

    this.patchEditForm(this.selectedHalqa);
    this.editMode = true;
  }

  saveEdit(): void {
    if (!this.selectedHalqa) {
      return;
    }

    const id = this.getHalqaId(this.selectedHalqa);
    const edits = this.localStorageService.getItem<Record<string, any>>(this.localEditsKey) ?? {};
    edits[id] = {
      ...this.selectedHalqa,
      ...this.editForm
    };
    this.localStorageService.setItem(this.localEditsKey, edits);
    this.selectedHalqa = edits[id];
    this.halqas = this.halqas.map(halqa => this.getHalqaId(halqa) === id ? this.selectedHalqa : halqa);
    this.editMode = false;
    this.message = 'Halqa details updated.';
  }

  deleteHalqa(): void {
    if (!this.selectedHalqa) {
      return;
    }

    const id = this.getHalqaId(this.selectedHalqa);
    const deletes = this.localStorageService.getItem<PendingDeleteRecord[]>(this.localDeletesKey) ?? [];
    const existing = deletes.find(record => record.id === id);

    if (!existing) {
      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 5);
      deletes.push({
        id,
        deleteAfter: deleteAfter.toISOString()
      });
    }

    this.localStorageService.setItem(this.localDeletesKey, deletes);
    this.message = 'Halqa delete scheduled. It will be removed after 5 days.';
    this.router.navigate(['/halqa']);
  }

  private applyLocalOverrides(halqas: any[]): any[] {
    const edits = this.localStorageService.getItem<Record<string, any>>(this.localEditsKey) ?? {};
    const deletes = this.localStorageService.getItem<PendingDeleteRecord[]>(this.localDeletesKey) ?? [];
    const now = Date.now();

    return halqas
      .filter(halqa => {
        const scheduledDelete = deletes.find(record => record.id === this.getHalqaId(halqa));
        return !scheduledDelete || new Date(scheduledDelete.deleteAfter).getTime() > now;
      })
      .map(halqa => {
        const id = this.getHalqaId(halqa);
        const scheduledDelete = deletes.find(record => record.id === id);
        return {
          ...(edits[id] ?? halqa),
          pendingDeleteAfter: scheduledDelete?.deleteAfter ?? null
        };
      });
  }

  private getHalqaId(halqa: any): string {
    return String(halqa?.id_halqa ?? halqa?.id ?? '');
  }

  private patchEditForm(halqa: any): void {
    this.editForm = {
      name: halqa?.name ?? '',
      description: halqa?.description ?? '',
      start_date: halqa?.start_date ?? '',
      end_date: halqa?.end_date ?? ''
    };
  }
}
