import { Component } from '@angular/core';
import { MenuService } from './menu.service';
import { MenuItem } from './menu-item.model';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {

  menuItems: MenuItem[] = [];
  selectedItem: MenuItem | null = null;
  newItemParent: MenuItem | null = null;
  isAddingNew = false;

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.menuService.getMenu().subscribe((data) => {
      // Add open property to handle toggle state
      this.menuItems = data.map((item: any) => ({ ...item, open: false }));
    });
  }

  toggle(item: MenuItem): void {
    item.open = !item.open;
  }

selectItem(item: MenuItem) {
    this.selectedItem = { ...item };
    this.isAddingNew = false;
  }

  addChild(parent: MenuItem, event: MouseEvent) {
    event.stopPropagation();
    this.newItemParent = parent;
    this.selectedItem = { label: '', icon: '', route: '' };
    this.isAddingNew = true;
  }


  saveItem() {
    if (!this.selectedItem?.label) return;

    if (this.isAddingNew && this.newItemParent) {
      if (!this.newItemParent.children) this.newItemParent.children = [];
      this.newItemParent.children.push({ ...this.selectedItem });
      this.newItemParent.open = true;
    } else if (this.selectedItem) {
      this.updateMenuItem(this.menuItems, this.selectedItem);
    }

    this.selectedItem = null;
    this.newItemParent = null;
    this.isAddingNew = false;
  }
  cancelEdit() {
    this.selectedItem = null;
    this.isAddingNew = false;
  }

  private updateMenuItem(list: MenuItem[], updated: MenuItem) {
    for (const item of list) {
      if (item.label === updated.label) {
        Object.assign(item, updated);
        return;
      }
      if (item.children) this.updateMenuItem(item.children, updated);
    }
  }
  
}
