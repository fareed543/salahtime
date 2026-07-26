import { Component, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
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
    private router: Router,
    private authStateService: AuthStateService,
    private authorizationService: AuthorizationService,
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

get displayName(): string {
  return this.authorizationService.getDisplayName();
}

get displayRole(): string {
  return this.authorizationService.getDisplayRole();
}

logout(): void {
  this.authStateService.logout();
  void this.router.navigate(['/login']);
}
}
