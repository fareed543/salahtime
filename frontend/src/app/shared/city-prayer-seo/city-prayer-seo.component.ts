import { Component, Input, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { SalahLocationCity } from 'src/app/models/salah.model';
import {
  RAMADAN,
  cityMonthPath,
  cityPageMonths,
  isStateNameEntry,
  monthName,
  nearbyCities,
  nearbyCitiesHeading,
  ramadanCityPath
} from 'src/app/seo/seo-content';
import { CityPrayerSeoService, citySlug, cityRoute } from 'src/app/services/city-prayer-seo.service';
import { LocationService } from 'src/app/services/location.service';

const PRIORITY_CITIES = ['hyderabad', 'bengaluru', 'pune', 'kanpur', 'mumbai', 'delhi', 'chennai', 'kolkata', 'lucknow', 'bhopal'];

/**
 * The prayer-times page's H1 header ('header') or its SEO text and city directory ('content').
 * Used by both the web and mobile layouts so crawlers see the same content at the same URL.
 * Inside the Android/iOS app (never crawled) the heading is kept for screen readers only and
 * the SEO text is not shown.
 */
@Component({
  selector: 'app-city-prayer-seo',
  templateUrl: './city-prayer-seo.component.html'
})
export class CityPrayerSeoComponent implements OnInit {
  @Input() part: 'header' | 'content' = 'content';
  /** CR-021: the website prayer-times page shows its own A–Z city directory, so it hides this one. */
  @Input() directory = true;

  readonly isNativeApp = Capacitor.isNativePlatform();
  indianCities: SalahLocationCity[] = [];
  private locations: SalahLocationCity[] = [];
  private nearbyFor?: string;
  private nearbyList: Array<{ name: string; link: string[] }> = [];
  private timetablesFor?: string;
  private timetableList: Array<{ name: string; link: string }> = [];

  constructor(
    readonly seo: CityPrayerSeoService,
    private locationService: LocationService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.part !== 'content' || this.isNativeApp) {
      return;
    }

    const all = await firstValueFrom(this.locationService.getOfflineLocationsList());
    // States listed as cities ("Manipur") have no page of their own.
    const locations = all.filter(location => !isStateNameEntry(location, all));
    this.locations = locations;
    this.nearbyFor = undefined; // the nearby list may have been worked out before the cities arrived
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

  /** NF-009 / NF-010: the city's monthly timetables and Ramadan timetable (Indian cities have them). */
  get timetableLinks(): Array<{ name: string; link: string }> {
    const city = this.seo.city;
    if (!city || city.country !== 'India') {
      return [];
    }
    const key = cityRoute(city).join('/');
    if (key !== this.timetablesFor) {
      this.timetablesFor = key;
      this.timetableList = [
        ...cityPageMonths(new Date()).map(month => ({ name: `${monthName(month)} prayer timetable`, link: cityMonthPath(city, month) })),
        { name: `Ramadan ${RAMADAN.gregorianYear} Sehri and Iftar timetable`, link: ramadanCityPath(city) }
      ];
    }
    return this.timetableList;
  }

  get nearbyHeading(): string {
    return this.seo.city ? nearbyCitiesHeading(this.seo.city) : '';
  }

  /** Closest cities to the page's city, the same list the prerendered page links. */
  get nearby(): Array<{ name: string; link: string[] }> {
    const city = this.seo.city;
    const key = city ? cityRoute(city).join('/') : '';
    if (key !== this.nearbyFor) {
      this.nearbyFor = key;
      this.nearbyList = city?.coordinates && this.locations.length
        ? nearbyCities(city, this.locations, 12).map(other => ({ name: other.city, link: cityRoute(other) }))
        : [];
    }
    return this.nearbyList;
  }
}
