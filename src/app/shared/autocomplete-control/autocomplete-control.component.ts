import {
  Component,
  Input,
  OnInit
} from '@angular/core';
import { LocationService, AppLocation } from 'src/app/services/location.service';
import { SettingsService } from 'src/app/services/settings.service';

export type LocationSelection =
  | { source: 'manual'; city: any }
  | { source: 'auto'; lat: number; lng: number };

@Component({
  selector: 'app-autocomplete-control',
  templateUrl: './autocomplete-control.component.html',
  styleUrls: ['./autocomplete-control.component.scss']
})
export class AutocompleteControlComponent implements OnInit {

  locations: any[] = [];

  @Input() placeholder = 'City';
  @Input() selectedCity: any = null;

  cityInput = '';
  filteredLocations: any[] = [];
  isFetchingLocation = false;

  /** Latest selected location (manual / auto) */
  citySelectedData: LocationSelection | null = null;

  constructor(
    private locationService: LocationService,
    private settingsService: SettingsService
  ) {}

  /* ---------------- INIT ---------------- */

  ngOnInit(): void {
    this.locationService.getLocationsList().subscribe(data => {
      this.locations = data;
      this.restoreFromSettings();
    });
  }

  /* ---------------- RESTORE ---------------- */

  private restoreFromSettings(): void {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings?.location) return;

    const location = settings.location as LocationSelection;
    this.citySelectedData = location;

    if (location.source === 'manual') {
      this.selectedCity = location.city;
      this.cityInput = `${location.city.city}, ${location.city.state}`;
    }

    if (location.source === 'auto') {
      this.selectedCity = null;
      this.cityInput = `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`;
    }
  }

  /* ---------------- MANUAL SELECTION ---------------- */

  onInputChange(value: string): void {
    this.selectedCity = null;
    this.citySelectedData = null;

    if (!value || value.length < 2) {
      this.filteredLocations = [];
      return;
    }

    const lowerVal = value.toLowerCase();
    this.filteredLocations = this.locations.filter(loc =>
      loc.city.toLowerCase().includes(lowerVal)
    );
  }

  selectCity(loc: any): void {
    this.selectedCity = loc;
    this.cityInput = `${loc.city}, ${loc.state}`;
    this.filteredLocations = [];

    const selection: LocationSelection = {
      source: 'manual',
      city: loc
    };

    this.citySelectedData = selection;

    const current = this.settingsService.getCurrentSettings();
    if (current) {
      this.settingsService.updateSettings({
        ...current,
        location: selection
      });
    }
  }

  hideDropdown(): void {
    setTimeout(() => (this.filteredLocations = []), 200);
  }

  clearCity(): void {
    this.cityInput = '';
    this.selectedCity = null;
    this.filteredLocations = [];
    this.citySelectedData = null;

    const current = this.settingsService.getCurrentSettings();
    if (current) {
      this.settingsService.updateSettings({
        ...current,
        location: null
      });
    }
  }

  /* ---------------- CURRENT LOCATION ---------------- */

  async useCurrentLocation(): Promise<void> {
    this.isFetchingLocation = true;
    this.clearCity();

    try {
      const loc: AppLocation = await this.locationService.getLocation();

      const selection: LocationSelection = {
        source: 'auto',
        lat: loc.lat,
        lng: loc.lng
      };

      this.cityInput = `Current Location (${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)})`;
      this.citySelectedData = selection;

      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          location: selection
        });
      }

    } catch (err) {
      console.warn('Location access failed', err);
    } finally {
      this.isFetchingLocation = false;
    }
  }
}
