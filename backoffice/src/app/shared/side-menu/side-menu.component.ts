import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
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

/** Desktop breakpoint of the Sneat layout (xl): below it the menu is an off-canvas drawer. */
const DESKTOP_MIN_WIDTH = 1200;
/** Same duration as the Sneat PRO menu transitions. */
const MENU_ANIMATION_MS = 300;

/**
 * Sneat PRO side-menu behaviour on top of the free theme files:
 * - desktop: the round toggle on the menu edge collapses it to icons and back (remembered);
 *   hovering a collapsed menu expands it over the page until the pointer leaves;
 * - submenus slide open and closed instead of appearing instantly;
 * - below 1200px the toggle closes the off-canvas menu as before.
 */
@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss']
})
export class SideMenuComponent implements OnInit, OnDestroy {
  static readonly COLLAPSED_STORAGE_KEY = 'backoffice.menuCollapsed';

  appName = environment.appName;

  menuItems: MenuItem[] = [];
  private hoverTimer?: ReturnType<typeof setTimeout>;
  private transitionTimer?: ReturnType<typeof setTimeout>;

  constructor(private menuService: MenuService,
    private renderer: Renderer2,
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef) { }

  get isCollapsed(): boolean {
    return document.documentElement.classList.contains('layout-menu-collapsed');
  }

  ngOnInit(): void {
    if (SideMenuComponent.readCollapsed()) {
      this.renderer.addClass(document.documentElement, 'layout-menu-collapsed');
    }
    this.menuService.getMenu().subscribe((data) => {
      // Add open property to handle toggle state
      this.menuItems = data.map((item: any) => ({ ...item, open: false }));
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.hoverTimer);
    clearTimeout(this.transitionTimer);
    this.renderer.removeClass(document.documentElement, 'layout-menu-hover');
  }

  /** The round toggle on the menu edge: collapse/expand on desktop, close the drawer on small screens. */
  toggleCollapsed(): void {
    if (!this.isDesktop()) {
      this.onMenuItemClick();
      return;
    }

    const html = document.documentElement;
    const collapse = !this.isCollapsed;
    this.markTransitioning();
    clearTimeout(this.hoverTimer);
    this.renderer.removeClass(html, 'layout-menu-hover');
    if (collapse) {
      this.renderer.addClass(html, 'layout-menu-collapsed');
      // Open submenus are hidden while collapsed; close them so they do not pop back on hover.
      this.menuItems = this.menuItems.map((item) => (item.children ? { ...item, open: false } : item));
    } else {
      this.renderer.removeClass(html, 'layout-menu-collapsed');
    }
    SideMenuComponent.writeCollapsed(collapse);
  }

  /** Collapsed desktop menu: expand over the page while the pointer is on it (PRO "hover" mode). */
  onMenuMouseEnter(): void {
    if (!this.isDesktop() || !this.isCollapsed) {
      return;
    }
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      this.markTransitioning();
      this.renderer.addClass(document.documentElement, 'layout-menu-hover');
    }, 100);
  }

  onMenuMouseLeave(): void {
    clearTimeout(this.hoverTimer);
    if (document.documentElement.classList.contains('layout-menu-hover')) {
      this.markTransitioning();
      this.renderer.removeClass(document.documentElement, 'layout-menu-hover');
    }
  }

  toggleSubmenu(item: MenuItem): void {
    const shouldOpen = !item.open;

    // Accordion: slide any other open submenu closed.
    this.menuItems.forEach((menuItem) => {
      if (menuItem !== item && menuItem.open) {
        const other = this.submenuOf(menuItem);
        this.slide(other, false, () => menuItem.open = false);
      }
    });

    if (shouldOpen) {
      item.open = true;
      // Render it (display: flex) before measuring its height.
      this.cdr.detectChanges();
      this.slide(this.submenuOf(item), true);
    } else {
      this.slide(this.submenuOf(item), false, () => item.open = false);
    }
  }

  onMenuItemClick() {
    const htmlEl = document.documentElement;
    this.renderer.removeClass(htmlEl, 'layout-menu-expanded');
  }

  /** Height slide like the Sneat PRO menu (0.3s ease-in-out); instant when motion is reduced. */
  private slide(element: HTMLElement | null, open: boolean, done?: () => void): void {
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!element || reduceMotion || typeof element.animate !== 'function') {
      done?.();
      return;
    }

    // A quick second click reverses from where the running slide is, instead of stacking two.
    const running = element.getAnimations();
    const from = running.length
      ? `${element.getBoundingClientRect().height}px`
      : (open ? '0px' : `${element.scrollHeight}px`);
    running.forEach((animation) => animation.cancel());
    const to = open ? `${element.scrollHeight}px` : '0px';
    element.style.overflow = 'hidden';
    const animation = element.animate(
      [{ height: from, opacity: open ? 0 : 1 }, { height: to, opacity: open ? 1 : 0 }],
      { duration: MENU_ANIMATION_MS, easing: 'ease-in-out' }
    );

    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(fallback);
      element.style.overflow = '';
      done?.();
      // Animation callbacks may run outside Angular's change detection; update the view now.
      this.cdr.detectChanges();
    };
    animation.onfinish = finish;
    animation.oncancel = () => {
      finished = true;
      clearTimeout(fallback);
    };
    // A hidden or background tab never finishes the animation; settle the state anyway.
    const fallback = setTimeout(finish, MENU_ANIMATION_MS + 100);
  }

  private submenuOf(item: MenuItem): HTMLElement | null {
    const index = this.menuItems.indexOf(item);
    return this.host.nativeElement.querySelector(`[data-menu-index="${index}"] > .menu-sub`);
  }

  /** Lets the width/padding transitions run only while the layout is changing (as Sneat does). */
  private markTransitioning(): void {
    const html = document.documentElement;
    this.renderer.addClass(html, 'layout-transitioning');
    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(() => this.renderer.removeClass(html, 'layout-transitioning'), MENU_ANIMATION_MS + 50);
  }

  private isDesktop(): boolean {
    return window.innerWidth >= DESKTOP_MIN_WIDTH;
  }

  private static readCollapsed(): boolean {
    try {
      return localStorage.getItem(SideMenuComponent.COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private static writeCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(SideMenuComponent.COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Private mode or blocked storage: the choice just is not remembered.
    }
  }
}
