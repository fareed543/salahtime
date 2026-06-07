import { DOCUMENT, Location } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthApiService } from 'src/app/services/auth-api.service';

@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.component.html',
  styleUrls: ['./auth-shell.component.scss']
})
export class AuthShellComponent implements OnInit {
  currentUrl = '';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private location: Location,
    private router: Router,
    private authService: AuthApiService
  ) {}

  ngOnInit(): void {
    if (this.authService.hasValidSession()) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.document.body.classList.add('auth-route');
    this.document.body.classList.remove('sidebar-open');
    this.document.body.style.paddingBottom = '0px';
    this.currentUrl = this.router.url;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  get headerAction(): { label: string; link: string } | null {
    if (this.currentUrl.startsWith('/login')) {
      return { label: 'Sign up', link: '/register' };
    }

    if (
      this.currentUrl.startsWith('/register') ||
      this.currentUrl.startsWith('/forgot-password') ||
      this.currentUrl.startsWith('/reset-password')
    ) {
      return { label: 'Sign in', link: '/login' };
    }

    return null;
  }

  goBack(): void {
    if (this.currentUrl.startsWith('/login')) {
      this.router.navigate(['/dashboard']);
      return;
    }

    if (
      this.currentUrl.startsWith('/register') ||
      this.currentUrl.startsWith('/forgot-password') ||
      this.currentUrl.startsWith('/reset-password')
    ) {
      this.router.navigate(['/login']);
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
