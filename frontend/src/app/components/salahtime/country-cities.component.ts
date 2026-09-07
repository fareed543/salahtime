import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription, switchMap, map } from 'rxjs';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { LocationService } from 'src/app/services/location.service';

export function locationSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Component({
  selector: 'app-country-cities',
  templateUrl: './country-cities.component.html',
  styleUrls: ['./country-cities.component.scss']
})
export class CountryCitiesComponent implements OnInit, OnDestroy {
  country = '';
  countrySlug = '';
  query = '';
  cities: SalahLocationCity[] = [];
  filteredCities: SalahLocationCity[] = [];
  allLocations: SalahLocationCity[] = [];
  loading = true;
  error = false;
  readonly slug = locationSlug;
  private subscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private locations: LocationService,
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.subscription = this.route.paramMap.pipe(
      switchMap(params => this.locations.getOfflineLocationsList().pipe(
        map(locations => ({ slug: params.get('country') ?? '', locations }))
      ))
    ).subscribe({
      next: ({ slug, locations }) => {
        this.countrySlug = slug;
        this.allLocations = locations;
        const seen = new Set<string>();
        this.cities = locations.filter(city => {
          const key = locationSlug(city.city);
          if (locationSlug(city.country ?? '') !== slug || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).sort((a, b) => a.city.localeCompare(b.city));
        this.country = this.cities[0]?.country ?? slug;
        this.filterCities('');
        this.loading = false;
        this.updateSeo();
      },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  filterCities(query: string): void {
    this.query = query;
    const normalized = query.trim().toLowerCase();
    this.filteredCities = this.cities.filter(city =>
      `${city.city} ${city.state ?? ''}`.toLowerCase().includes(normalized)
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private updateSeo(): void {
    const title = `Prayer times in cities of ${this.country}`;
    const url = `https://salah-times.in/prayer-times/${this.countrySlug}`;
    this.title.setTitle(`${title} | SalahTime`);
    this.meta.updateTag({ name: 'description', content: `Browse cities in ${this.country} for today's Fajr, Dhuhr, Asr, Maghrib and Isha prayer times.` });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:url', content: url });
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;
    this.document.getElementById('city-prayer-times-schema')?.remove();
  }
}
