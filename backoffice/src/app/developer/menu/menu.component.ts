import { Component } from '@angular/core';
import { MenuItem } from './menu-item.model';
import { FrontendMenuConfig, MenuService } from './menu.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
  sidebarMenuItems: MenuItem[] = [];
  shortcutMenuItems: MenuItem[] = [];
  selectedCollection: 'sidebar' | 'shortcut' = 'sidebar';
  selectedItem: MenuItem | null = null;
  isAddingNew = false;
  isSaving = false;
  feedbackMessage = '';
  errorMessage = '';
  lastUpdatedText = '';

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.menuService.getFrontendMenuConfig().subscribe({
      next: (data) => this.applyConfig(data),
      error: () => {
        this.errorMessage = 'Unable to load frontend menu configuration.';
      }
    });
  }

  get activeMenuItems(): MenuItem[] {
    return this.selectedCollection === 'sidebar' ? this.sidebarMenuItems : this.shortcutMenuItems;
  }

  selectCollection(collection: 'sidebar' | 'shortcut'): void {
    this.selectedCollection = collection;
    this.selectedItem = null;
    this.isAddingNew = false;
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  selectItem(item: MenuItem): void {
    this.selectedItem = { ...item };
    this.feedbackMessage = '';
    this.errorMessage = '';
    this.isAddingNew = false;
  }

  addItem(): void {
    this.selectedItem = {
      id: Date.now(),
      code: '',
      labelKey: '',
      icon: '',
      route: '',
      enabled: true,
      sortOrder: this.activeMenuItems.length + 1,
      exact: false,
      requiresAuth: false
    };
    this.isAddingNew = true;
    this.feedbackMessage = '';
    this.errorMessage = '';
  }

  saveItem(): void {
    if (!this.selectedItem?.labelKey || !this.selectedItem?.route) {
      this.errorMessage = 'Label key and route are required.';
      return;
    }

    const targetItems = this.activeMenuItems;
    if (this.isAddingNew) {
      targetItems.push({ ...this.selectedItem });
    } else {
      this.updateMenuItem(targetItems, this.selectedItem);
    }

    this.sortByOrder(targetItems);
    this.selectedItem = null;
    this.isAddingNew = false;
    this.feedbackMessage = 'Menu item updated locally. Save changes to publish it.';
    this.errorMessage = '';
  }

  deleteItem(item: MenuItem): void {
    const filtered = this.activeMenuItems.filter((candidate) => candidate.id !== item.id);
    if (this.selectedCollection === 'sidebar') {
      this.sidebarMenuItems = filtered;
    } else {
      this.shortcutMenuItems = filtered;
    }

    this.selectedItem = null;
    this.feedbackMessage = 'Menu item removed locally. Save changes to publish it.';
    this.errorMessage = '';
  }

  saveAll(): void {
    this.isSaving = true;
    this.feedbackMessage = '';
    this.errorMessage = '';

    const payload: FrontendMenuConfig = {
      sidebarMenu: this.sidebarMenuItems,
      shortcutMenu: this.shortcutMenuItems,
    };

    this.menuService.saveFrontendMenuConfig(payload).subscribe({
      next: (response) => {
        this.applyConfig(response);
        this.isSaving = false;
        this.feedbackMessage = 'Frontend menu configuration saved successfully.';
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error?.error?.error || 'Unable to save menu configuration.';
      }
    });
  }

  cancelEdit(): void {
    this.selectedItem = null;
    this.isAddingNew = false;
  }

  private updateMenuItem(list: MenuItem[], updated: MenuItem): void {
    const index = list.findIndex((item) => item.id === updated.id);
    if (index >= 0) {
      list[index] = { ...updated };
    }
  }

  private applyConfig(data: FrontendMenuConfig): void {
    this.sidebarMenuItems = [...(data.sidebarMenu ?? [])];
    this.shortcutMenuItems = [...(data.shortcutMenu ?? [])];
    this.sortByOrder(this.sidebarMenuItems);
    this.sortByOrder(this.shortcutMenuItems);
    this.lastUpdatedText = data.updatedAt ? `Last updated: ${new Date(data.updatedAt).toLocaleString()}` : '';
  }

  private sortByOrder(items: MenuItem[]): void {
    items.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  }
}
