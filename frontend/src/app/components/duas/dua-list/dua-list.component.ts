import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DuaCategory } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';

@Component({
  selector: 'app-dua-list',
  templateUrl: './dua-list.component.html',
  styleUrls: ['./dua-list.component.scss']
})
export class DuaListComponent implements OnInit {
  category?: DuaCategory;
  collectionTitle = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private duaDataService: DuaDataService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const categorySlug = params.get('categorySlug');
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
      });
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/duas']);
  }
}
