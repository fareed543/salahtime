import { Component } from '@angular/core';
import { MasjidService } from '../masjid.service';
import { Masjid } from '../masjid.model';

@Component({
  selector: 'app-masjid-list',
  templateUrl: './masjid-list.component.html',
  styleUrls: ['./masjid-list.component.scss']
})
export class MasjidListComponent {

  masjidList: Masjid[] = [];
  loading = true;
  error: string | null = null;

  constructor(private masjidService: MasjidService) {}

  ngOnInit(): void {
    this.loadMasjidList();
  }

  loadMasjidList() {
    this.masjidService.getMasjidList().subscribe({
      next: (data) => {
        this.masjidList = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load masjid list';
        this.loading = false;
      }
    });
  }

}