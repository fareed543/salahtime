import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { LocationService, AppLocation } from 'src/app/services/location.service';
import { PrayerNotificationSyncService } from 'src/app/services/prayer-notification-sync.service';
import { SettingsService } from 'src/app/services/settings.service';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { AppTranslateService } from 'src/app/services/translate.service';

export type LocationSelection =
  | { source: 'manual'; city: SalahLocationCity }
  | { source: 'auto'; city: SalahLocationCity };

@Component({
  selector: 'app-autocomplete-control',
  templateUrl: './autocomplete-control.component.html',
  styleUrls: ['./autocomplete-control.component.scss']
})
export class AutocompleteControlComponent implements OnInit {

  locations: SalahLocationCity[] = [];

  @Input() placeholder = 'City';
  @Input() selectedCity: any = null;
  @Output() settingsClick = new EventEmitter<void>();

  cityInput = '';
  filteredLocations: any[] = [];
  isFetchingLocation = false;

  /** Latest selected location (manual / auto) */
  citySelectedData: LocationSelection | null = null;

  constructor(
    private locationService: LocationService,
    private settingsService: SettingsService,
    private prayerNotificationSyncService: PrayerNotificationSyncService,
    private i18n: AppTranslateService
  ) {}

  /* ---------------- INIT ---------------- */

  ngOnInit(): void {
    this.locationService.getLocationsList().subscribe(data => {
      this.locations = data;
      this.restoreFromSettings();
    });
  }

  private formatCoordinate(value: number): string {
    return Number(value).toFixed(4);
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
      const selection: LocationSelection = {
        source: 'auto',
        city : {
          city : this.i18n.translateWithParams('LOCATION.CURRENT_LOCATION', {}),
          coordinates : {
            latitude: location.city.coordinates.latitude,
            longitude: location.city.coordinates.longitude
          }
        }
      };

      this.cityInput = this.i18n.translateWithParams('LOCATION.CURRENT_LOCATION_WITH_COORDS', {
        lat: this.formatCoordinate(location.city.coordinates.latitude),
        lng: this.formatCoordinate(location.city.coordinates.longitude)
      });
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

  async selectCity(loc: SalahLocationCity): Promise<void> {
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
        locationMode: 'manual',
        location: selection
      });
    }

    await this.prayerNotificationSyncService.syncForLocationSelectionChange();
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
        locationMode: 'auto',
        location: null
      });
    }
  }

  /* ---------------- CURRENT LOCATION ---------------- */

  async useCurrentLocation(): Promise<void> {
    this.isFetchingLocation = true;
    this.clearCity();

    try {
      const resolved = await this.locationService.resolveEffectiveLocation(true);
      const loc: AppLocation = { lat: resolved.snapshot.currentLat, lng: resolved.snapshot.currentLon };
      const selection: LocationSelection = resolved.selection;

      this.cityInput = this.i18n.translateWithParams('LOCATION.CURRENT_LOCATION_WITH_COORDS', {
        lat: this.formatCoordinate(loc.lat),
        lng: this.formatCoordinate(loc.lng)
      });
      this.citySelectedData = selection;

      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          locationMode: 'auto',
          location: selection
        });
      }

      await this.prayerNotificationSyncService.syncForLocationSelectionChange();

    } catch (err) {
      console.warn('Location access failed', err);
    } finally {
      this.isFetchingLocation = false;
    }
  }

  openSettings(): void {
    this.settingsClick.emit();
  }
}
