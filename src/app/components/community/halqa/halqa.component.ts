import { Component, OnInit } from '@angular/core';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

@Component({
  selector: 'app-halqa',
  templateUrl: './halqa.component.html',
  styleUrls: ['./halqa.component.scss']
})
export class HalqaComponent implements OnInit {
  halqas: any[] = [];
  loading = false;

  constructor(private ramadanService: RamadanApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.ramadanService.halqaList().subscribe({
      next: (response) => {
        this.halqas = Array.isArray(response) ? response : response?.list ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
