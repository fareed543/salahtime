import { Component, OnInit, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { MenuService } from 'src/app/developer/menu/menu.service';
import { environment } from 'src/environment/environment';


interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  externalLink?: string;
  header?: boolean;
  children?: MenuItem[];
  target?: string;
  open?: boolean
}

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss']
})
export class SideMenuComponent implements OnInit {

  appName = environment.appName;

  menuItems: MenuItem[] = [];
  constructor(private menuService: MenuService,
    private renderer: Renderer2,
    private router: Router) { }

  ngOnInit(): void {
    this.menuService.getMenu().subscribe((data) => {
      // Add open property to handle toggle state
      this.menuItems = data.map((item: any) => ({ ...item, open: false }));
    });
  }

  toggleSubmenu(item: any): void {
    item.open = !item.open;
  }

  onMenuItemClick() {
    const htmlEl = document.documentElement;
    this.renderer.removeClass(htmlEl, 'layout-menu-expanded');
  }
}
