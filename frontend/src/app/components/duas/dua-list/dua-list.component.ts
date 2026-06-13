import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DuaCategory, DuaEntry } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';

@Component({
  selector: 'app-dua-list',
  templateUrl: './dua-list.component.html',
  styleUrls: ['./dua-list.component.scss']
})
export class DuaListComponent implements OnInit {
  category?: DuaCategory;
  selectedDua?: DuaEntry;
  collectionTitle = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private duaDataService: DuaDataService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const categorySlug = params.get('categorySlug');
      const duaIdParam = params.get('duaId');
      const duaId = duaIdParam ? Number(duaIdParam) : null;

      if (!categorySlug) {
        return;
      }

      this.duaDataService.getCollection().subscribe((collection) => {
        this.collectionTitle = collection.collectionTitle;
      });

      this.duaDataService.getCategory(categorySlug).subscribe((category) => {
        if (!category) {
          void this.router.navigate(['/duas']);
          return;
        }

        this.category = category;
        if (duaIdParam === null) {
          this.selectedDua = undefined;
          return;
        }

        if (duaId === null || Number.isNaN(duaId)) {
          this.selectedDua = undefined;
          void this.router.navigate(['/duas', categorySlug]);
          return;
        }

        const matchedDua = category.duas.find((entry) => entry.id === duaId);
        if (!matchedDua) {
          this.selectedDua = undefined;
          void this.router.navigate(['/duas', categorySlug]);
          return;
        }

        this.selectedDua = matchedDua;
      });
    });
  }

  goBack(): void {
    void this.router.navigate(['/duas']);
  }

  closeDuaDialog(): void {
    if (!this.category) {
      void this.router.navigate(['/duas']);
      return;
    }

    this.selectedDua = undefined;
    void this.router.navigate(['/duas', this.category.slug]);
  }
}
