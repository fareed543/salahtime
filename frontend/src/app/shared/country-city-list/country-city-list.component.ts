import { Component, Input } from '@angular/core';
import { SalahLocationCity } from 'src/app/models/salah.model';

function locationSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Component({
  selector: 'app-country-city-list',
  templateUrl: './country-city-list.component.html',
  styleUrls: ['./country-city-list.component.scss']
})
export class CountryCityListComponent {
  @Input() cities: SalahLocationCity[] = [];
  @Input() countrySlug = '';
  @Input() showState = false;

  slug(value: string): string {
    return locationSlug(value);
  }
}
