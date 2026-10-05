import { Component, Input, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { CityPrayerSeoService, citySlug } from 'src/app/services/city-prayer-seo.service';
import { LocationService } from 'src/app/services/location.service';

const PRIORITY_CITIES = ['hyderabad', 'bengaluru', 'pune', 'kanpur', 'mumbai', 'delhi', 'chennai', 'kolkata', 'lucknow', 'bhopal'];

/**
 * The prayer-times page's H1 header ('header') or its SEO text and city directory ('content').
 * Used by both the web and mobile layouts so crawlers see the same content at the same URL.
 */
@Component({
  selector: 'app-city-prayer-seo',
  templateUrl: './city-prayer-seo.component.html'
})
export class CityPrayerSeoComponent implements OnInit {
  @Input() part: 'header' | 'content' = 'content';

  indianCities: SalahLocationCity[] = [];

  constructor(
    readonly seo: CityPrayerSeoService,
    private locationService: LocationService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.part !== 'content') {
      return;
    }

    const locations = await firstValueFrom(this.locationService.getOfflineLocationsList());
    const seen = new Set<string>();
    const cities = locations.filter(location => {
      const key = citySlug(location.city);
      if (location.country !== 'India' || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    const prioritized = PRIORITY_CITIES
      .map(slug => cities.find(city => citySlug(city.city) === slug))
      .filter((city): city is SalahLocationCity => !!city);

    this.indianCities = [...prioritized, ...cities.filter(city => !prioritized.includes(city))];
  }
}
