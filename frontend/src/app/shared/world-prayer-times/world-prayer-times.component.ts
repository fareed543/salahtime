import { Component, Input } from '@angular/core';
import { SalahLocationCity } from 'src/app/models/salah.model';

interface WorldPrayerCountry {
  name: string;
  slug: string;
  cityCount: number;
  flag: string;
}

function locationSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Component({
  selector: 'app-world-prayer-times',
  templateUrl: './world-prayer-times.component.html',
  styleUrls: ['./world-prayer-times.component.scss']
})
export class WorldPrayerTimesComponent {
  countries: WorldPrayerCountry[] = [];

  private readonly countryCodeMap: Record<string, string> = {
    Bahrain: 'BH',
    Canada: 'CA',
    Egypt: 'EG',
    France: 'FR',
    India: 'IN',
    Indonesia: 'ID',
    Kuwait: 'KW',
    Oman: 'OM',
    Pakistan: 'PK',
    Qatar: 'QA',
    'Saudi Arabia': 'SA',
    Singapore: 'SG',
    'Türkiye': 'TR',
    'United Arab Emirates': 'AE',
    'United Kingdom': 'GB',
    'United States': 'US'
  };

  @Input() set locations(locations: SalahLocationCity[] | null | undefined) {
    this.countries = this.buildCountries(locations ?? []);
  }

  private buildCountries(locations: SalahLocationCity[]): WorldPrayerCountry[] {
    const countries = new Map<string, WorldPrayerCountry>();
    const seenCities = new Set<string>();

    locations.forEach((location) => {
      const name = location.country;
      if (!name) {
        return;
      }

      const slug = locationSlug(name);
      const cityKey = `${slug}/${locationSlug(location.city)}`;
      if (seenCities.has(cityKey)) {
        return;
      }

      seenCities.add(cityKey);
      const existing = countries.get(slug);
      if (existing) {
        existing.cityCount += 1;
        return;
      }

      countries.set(slug, {
        name,
        slug,
        cityCount: 1,
        flag: this.countryFlag(name)
      });
    });

    return Array.from(countries.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private countryFlag(country: string): string {
    const code = this.countryCodeMap[country];
    if (!code) {
      return '';
    }

    return code
      .toUpperCase()
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }
}
