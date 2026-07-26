import { Component, Renderer2 } from '@angular/core';
import { BackofficeI18nService } from '../i18n/backoffice-i18n.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
isMenuExpanded = false;

  constructor(
    private renderer: Renderer2,
    public i18n: BackofficeI18nService
  ) {}

  toggleMenu() {
  const htmlEl = document.documentElement;
  const isExpanded = htmlEl.classList.contains('layout-menu-expanded');

  if (isExpanded) {
    this.renderer.removeClass(htmlEl, 'layout-menu-expanded');
  } else {
    this.renderer.addClass(htmlEl, 'layout-menu-expanded');
  }
  this.isMenuExpanded = !isExpanded; 
}

changeLanguage(language: string): void {
  this.i18n.use(language);
}
}
