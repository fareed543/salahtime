import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { DuaCategory, DuaCollection, DuaEntry } from '../models/dua.model';
import { DuaDataService } from '../services/dua-data.service';

interface DuaDetailState {
  completed: boolean;
  favorite: boolean;
  note: string;
}

interface SavedDuaItem {
  category: DuaCategory;
  dua: DuaEntry;
  state: DuaDetailState;
}

interface MyDuaSection {
  key: 'checked' | 'favorites' | 'notes' | 'highlights';
  title: string;
  items: SavedDuaItem[];
}

@Component({
  selector: 'app-dua-categories',
  templateUrl: './dua-categories.component.html',
  styleUrls: ['./dua-categories.component.scss']
})
export class DuaCategoriesComponent implements OnInit {
  categories: DuaCategory[] = [];
  filteredCategories: DuaCategory[] = [];
  activeTab: 'categories' | 'my-duas' = 'categories';
  openMyDuaSection: MyDuaSection['key'] | null = null;
  myDuaSections: MyDuaSection[] = [
    { key: 'checked', title: 'Checked', items: [] },
    { key: 'favorites', title: 'Favorites', items: [] },
    { key: 'notes', title: 'Notes', items: [] },
    { key: 'highlights', title: 'Highlights', items: [] }
  ];

  constructor(
    private duaDataService: DuaDataService,
    private location: Location,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.duaDataService.getCollection().subscribe((collection: DuaCollection) => {
      this.categories = collection.categories.map((category) => ({
        ...category,
        duas: category.slug === 'all'
          ? this.buildAllDuas(collection.categories)
          : category.duas
      }));
      this.filteredCategories = [...this.categories];
      this.refreshMyDuas();
    });
  }

  getChapterCount(category: DuaCategory): number {
    return category.duas.length;
  }

  trackBySlug(_: number, category: DuaCategory): string {
    return category.slug;
  }

  setActiveTab(tab: 'categories' | 'my-duas'): void {
    this.activeTab = tab;

    if (tab === 'my-duas') {
      this.refreshMyDuas();
    } else {
      this.openMyDuaSection = null;
    }
  }

  toggleMyDuaSection(sectionKey: MyDuaSection['key']): void {
    this.openMyDuaSection = this.openMyDuaSection === sectionKey ? null : sectionKey;
  }

  getSectionCount(sectionKey: MyDuaSection['key']): number {
    return this.myDuaSections.find((section) => section.key === sectionKey)?.items.length ?? 0;
  }

  openSavedDua(item: SavedDuaItem): void {
    void this.router.navigate(['/duas', item.category.slug, item.dua.id]);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  private buildAllDuas(categories: DuaCategory[]) {
    return categories
      .filter((category) => category.slug !== 'all')
      .flatMap((category) => category.duas)
      .sort((left, right) => left.id - right.id);
  }

  private refreshMyDuas(): void {
    const savedItems = this.categories
      .filter((category) => category.slug !== 'all')
      .flatMap((category) =>
        category.duas.map((dua) => ({
          category,
          dua,
          state: this.getDuaState(category.slug, dua.id)
        }))
      );

    this.myDuaSections = [
      {
        key: 'checked',
        title: 'Checked',
        items: savedItems.filter((item) => item.state.completed)
      },
      {
        key: 'favorites',
        title: 'Favorites',
        items: savedItems.filter((item) => item.state.favorite)
      },
      {
        key: 'notes',
        title: 'Notes',
        items: savedItems.filter((item) => !!item.state.note)
      },
      {
        key: 'highlights',
        title: 'Highlights',
        items: []
      }
    ];
  }

  private getDuaState(categorySlug: string, duaId: number): DuaDetailState {
    return this.localStorageService.getItem<DuaDetailState>(`dua-detail-${categorySlug}-${duaId}`) ?? {
      completed: false,
      favorite: false,
      note: ''
    };
  }
}
