import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

export interface SeoRouteData {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly siteUrl = 'https://salah-times.in';
  private readonly defaultImage = `${this.siteUrl}/assets/images/logo.png`;
  private initialized = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  init(): void {
    if (this.initialized) {
      return;
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.getDeepestRoute(this.route)),
        map(route => this.findSeoData(route.snapshot)),
        filter((seo): seo is SeoRouteData => !!seo)
      )
      .subscribe(seo => this.apply(seo));

    this.initialized = true;
  }

  apply(seo: SeoRouteData): void {
    const canonicalUrl = `${this.siteUrl}${seo.canonicalPath ?? this.router.url.split('?')[0]}`;
    const image = seo.image ?? this.defaultImage;
    const type = seo.type ?? 'website';

    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: 'SalahTime' });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: image });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(canonicalUrl);
  }

  private getDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let active = route;
    while (active.firstChild) {
      active = active.firstChild;
    }
    return active;
  }

  private findSeoData(route: ActivatedRouteSnapshot): SeoRouteData | undefined {
    let active: ActivatedRouteSnapshot | null = route;
    while (active) {
      const seo = active.data['seo'] as SeoRouteData | undefined;
      if (seo) {
        return seo;
      }
      active = active.parent;
    }
    return undefined;
  }

  private setCanonical(url: string): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;
  }
}
