import { Component, OnInit } from '@angular/core';
import { RamadanApiService } from 'src/app/services/ramadan-api.service';

@Component({
  selector: 'app-masjid',
  templateUrl: './masjid.component.html',
  styleUrls: ['./masjid.component.scss']
})
export class MasjidComponent implements OnInit {
  masjids: any[] = [];
  loading = false;

  constructor(private ramadanService: RamadanApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.ramadanService.masjidList().subscribe({
      next: (response) => {
        this.masjids = Array.isArray(response) ? response : response?.list ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
