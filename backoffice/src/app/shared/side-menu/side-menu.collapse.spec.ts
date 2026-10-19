import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { SideMenuComponent } from './side-menu.component';

describe('SideMenuComponent collapse, hover and submenus (Sneat PRO behaviour)', () => {
  const html = document.documentElement;
  const layoutClasses = ['layout-menu-collapsed', 'layout-menu-hover', 'layout-transitioning', 'layout-menu-expanded'];
  let host: HTMLElement;
  let component: SideMenuComponent;
  let desktop: boolean;

  const menu = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Users', children: [{ label: 'List', route: '/users' }] },
    { label: 'Locations', children: [{ label: 'Cities', route: '/locations' }] }
  ];

  const renderer = {
    addClass: (element: Element, name: string) => element.classList.add(name),
    removeClass: (element: Element, name: string) => element.classList.remove(name)
  };

  /** Minimal DOM for the submenus the component slides (it finds them by data-menu-index). */
  const renderSubmenus = () => {
    host.innerHTML = menu.map((item, index) =>
      `<li data-menu-index="${index}">${item.children ? '<ul class="menu-sub"><li style="height:40px"></li></ul>' : ''}</li>`
    ).join('');
  };

  const create = () => {
    const menuService = { getMenu: () => of(menu.map((item) => ({ ...item }))) };
    component = new SideMenuComponent(menuService as any, renderer as any, {} as any, { nativeElement: host } as any,
      { detectChanges: () => undefined, markForCheck: () => undefined } as any);
    spyOn<any>(component, 'isDesktop').and.callFake(() => desktop);
    component.ngOnInit();
    renderSubmenus();
    return component;
  };

  beforeEach(() => {
    desktop = true;
    host = document.createElement('div');
    document.body.appendChild(host);
    layoutClasses.forEach((name) => html.classList.remove(name));
    localStorage.removeItem(SideMenuComponent.COLLAPSED_STORAGE_KEY);
  });

  afterEach(() => {
    component?.ngOnDestroy();
    host.remove();
    layoutClasses.forEach((name) => html.classList.remove(name));
    localStorage.removeItem(SideMenuComponent.COLLAPSED_STORAGE_KEY);
  });

  describe('positive', () => {
    it('collapses to icons on desktop and remembers it', () => {
      create().toggleCollapsed();
      expect(html.classList.contains('layout-menu-collapsed')).toBeTrue();
      expect(component.isCollapsed).toBeTrue();
      expect(localStorage.getItem(SideMenuComponent.COLLAPSED_STORAGE_KEY)).toBe('1');
    });

    it('expands again and remembers that', () => {
      create().toggleCollapsed();
      component.toggleCollapsed();
      expect(html.classList.contains('layout-menu-collapsed')).toBeFalse();
      expect(localStorage.getItem(SideMenuComponent.COLLAPSED_STORAGE_KEY)).toBe('0');
    });

    it('starts collapsed when that was the last choice', () => {
      localStorage.setItem(SideMenuComponent.COLLAPSED_STORAGE_KEY, '1');
      create();
      expect(html.classList.contains('layout-menu-collapsed')).toBeTrue();
    });

    it('animates the change only briefly (layout-transitioning for ~0.3s)', fakeAsync(() => {
      create().toggleCollapsed();
      expect(html.classList.contains('layout-transitioning')).toBeTrue();
      tick(360);
      expect(html.classList.contains('layout-transitioning')).toBeFalse();
    }));

    it('expands a collapsed menu over the page while hovered', fakeAsync(() => {
      create().toggleCollapsed();
      component.onMenuMouseEnter();
      tick(100);
      expect(html.classList.contains('layout-menu-hover')).toBeTrue();
      component.onMenuMouseLeave();
      expect(html.classList.contains('layout-menu-hover')).toBeFalse();
      tick(400);
    }));

    it('opens a submenu with a 0.3s slide and closes the other one (accordion)', fakeAsync(() => {
      create();
      const users = component.menuItems[1];
      const locations = component.menuItems[2];
      component.toggleSubmenu(users);
      expect(users.open).toBeTrue();
      const usersSub = host.querySelector('[data-menu-index="1"] > .menu-sub') as HTMLElement;
      if (typeof usersSub.animate === 'function') {
        expect(usersSub.getAnimations()[0].effect!.getTiming().duration).toBe(300);
      }
      tick(450);

      component.toggleSubmenu(locations);
      expect(locations.open).toBeTrue();
      tick(450);
      expect(users.open).toBeFalse();
    }));

    it('closes an open submenu on a second click', fakeAsync(() => {
      create();
      const users = component.menuItems[1];
      component.toggleSubmenu(users);
      tick(450);
      component.toggleSubmenu(users);
      tick(450);
      expect(users.open).toBeFalse();
    }));
  });

  describe('negative', () => {
    it('does not expand on hover when the menu is not collapsed', fakeAsync(() => {
      create().onMenuMouseEnter();
      tick(200);
      expect(html.classList.contains('layout-menu-hover')).toBeFalse();
    }));

    it('does not expand when the pointer only passes over quickly', fakeAsync(() => {
      create().toggleCollapsed();
      component.onMenuMouseEnter();
      tick(50);
      component.onMenuMouseLeave();
      tick(200);
      expect(html.classList.contains('layout-menu-hover')).toBeFalse();
      tick(400);
    }));

    it('on small screens the toggle closes the drawer and keeps the desktop choice', () => {
      desktop = false;
      html.classList.add('layout-menu-expanded');
      create().toggleCollapsed();
      expect(html.classList.contains('layout-menu-expanded')).toBeFalse();
      expect(html.classList.contains('layout-menu-collapsed')).toBeFalse();
      expect(localStorage.getItem(SideMenuComponent.COLLAPSED_STORAGE_KEY)).toBeNull();
    });

    it('never hover-expands on small screens', fakeAsync(() => {
      localStorage.setItem(SideMenuComponent.COLLAPSED_STORAGE_KEY, '1');
      desktop = false;
      create().onMenuMouseEnter();
      tick(200);
      expect(html.classList.contains('layout-menu-hover')).toBeFalse();
    }));

    it('closes open submenus when collapsing, so they do not pop back on hover', fakeAsync(() => {
      create();
      component.toggleSubmenu(component.menuItems[1]);
      tick(450);
      component.toggleCollapsed();
      expect(component.menuItems[1].open).toBeFalse();
      tick(400);
    }));

    it('still opens and closes when the slide animation cannot run', fakeAsync(() => {
      create();
      spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList); // reduced motion
      const users = component.menuItems[1];
      component.toggleSubmenu(users);
      expect(users.open).toBeTrue();
      component.toggleSubmenu(users);
      expect(users.open).toBeFalse();
    }));

    it('ignores a broken stored value', () => {
      localStorage.setItem(SideMenuComponent.COLLAPSED_STORAGE_KEY, 'yes');
      create();
      expect(html.classList.contains('layout-menu-collapsed')).toBeFalse();
    });
  });
});
