import { Component } from '@angular/core';
import { PageItem } from './page-item.model';
import { PageService } from './page.service';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent {
  pageItems: PageItem[] = [];
  selectedPage: PageItem | null = null;
  isNewPage = false;

  constructor(private pageService: PageService) {}

  ngOnInit(): void {
    this.pageService.getPages().subscribe((data) => {
      this.pageItems = data;
    });
  }

  toggle(item: PageItem): void {
    item.open = !item.open;
  }

  addNewPage(parent?: PageItem): void {
    const newPage: PageItem = {
      id: Date.now(),
      title: '',
      heading: '',
      subHeading: '',
      image: '',
      shortDescription: '',
      description: '',
      tags: [],
      parentId: parent ? parent.id ?? null : null,
      children: []
    };

    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(newPage);
      parent.open = true;
    } else {
      this.pageItems.push(newPage);
    }

    this.selectPage(newPage, true);
  }

  selectPage(item: PageItem, isNew = false): void {
    this.selectedPage = { ...item };
    this.isNewPage = isNew;
  }

  savePage(): void {
    if (!this.selectedPage) return;

    this.pageService.savePage(this.selectedPage);
    this.selectedPage = null;
    this.isNewPage = false;

    this.pageService.savePage(this.selectedPage!).subscribe({
      next: (res) => {
        console.log('Page saved successfully', res);
        this.selectedPage = null;
        this.isNewPage = false;
      },
      error: (err) => {
        console.error('Save failed', err);
      }
    });

  }

  cancelEdit(): void {
    this.selectedPage = null;
    this.isNewPage = false;
  }
}
