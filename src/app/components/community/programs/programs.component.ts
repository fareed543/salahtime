import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

@Component({
  selector: 'app-programs',
  templateUrl: './programs.component.html',
  styleUrls: ['./programs.component.scss']
})
export class ProgramsComponent implements OnInit {
  programs: any[] = [];
  loading = false;
  error = '';

  constructor(
    private ramadanService: RamadanApiService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.loading = true;
    this.error = '';
    const userInfo = this.localStorageService.getItem<any>('userInfo');
    const request$ = userInfo?.pincode
      ? this.ramadanService.getAllProgramsList(userInfo.pincode)
      : this.ramadanService.programList();

    request$.subscribe({
      next: (response) => {
        this.programs = Array.isArray(response) ? response : [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load programs right now.';
        this.loading = false;
      }
    });
  }

  toggleSubscription(program: any): void {
    const id = program?.id ?? program?.id_program;
    if (!id) {
      return;
    }

    this.ramadanService.programEnrollment(id).subscribe({
      next: () => {
        program.entrolled = !program.entrolled;
      }
    });
  }
}
