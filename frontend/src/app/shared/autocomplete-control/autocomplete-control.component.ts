import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { LocationService } from 'src/app/services/location.service';
import { PrayerNotificationSyncService } from 'src/app/services/prayer-notification-sync.service';
import { SettingsService } from 'src/app/services/settings.service';
import { SalahLocationCity } from 'src/app/models/salah.model';
import { AppTranslateService } from 'src/app/services/translate.service';

export type LocationSelection =
  | { source: 'manual'; city: SalahLocationCity }
  | { source: 'auto'; city: SalahLocationCity };

type LocationDialogStep = 'options' | 'search';

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
  showLocationDialog = false;
  locationDialogStep: LocationDialogStep = 'options';
  dialogSearchQuery = '';
  dialogFilteredLocations: SalahLocationCity[] = [];

  /** Latest selected location (manual / auto) */
  citySelectedData: LocationSelection | null = null;

  get isUsingCurrentLocation(): boolean {
    return this.citySelectedData?.source === 'auto';
  }

  get selectedLocationLabel(): string {
    const city = this.citySelectedData?.city ?? this.selectedCity;
    return city ? this.locationService.formatLocationLabel(city) : '';
  }

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

  /* ---------------- RESTORE ---------------- */

  private restoreFromSettings(): void {
    const settings = this.settingsService.getCurrentSettings();
    if (!settings?.location) return;

    const location = settings.location as LocationSelection;
    this.citySelectedData = location;

    if (location.source === 'manual') {
      this.selectedCity = location.city;
      this.cityInput = this.locationService.formatLocationLabel(location.city);
    }

    if (location.source === 'auto') {
      this.selectedCity = null;
      this.cityInput = this.locationService.formatLocationLabel(location.city)
        || this.i18n.translateWithParams('LOCATION.CURRENT_LOCATION', {});
    }
  }

  /* ---------------- MANUAL SELECTION ---------------- */

  onInputChange(value: string): void {
    this.selectedCity = null;
    this.citySelectedData = null;

    if (!value || value.length < 2) {
      this.filteredLocations = value
        ? this.locations.filter(loc => loc.city.toLowerCase().includes(value.toLowerCase())).slice(0, 20)
        : [];
      return;
    }

    const lowerVal = value.toLowerCase();
    this.filteredLocations = this.locations.filter(loc =>
      loc.city.toLowerCase().includes(lowerVal)
    );
  }

  async selectCity(loc: SalahLocationCity): Promise<void> {
    this.selectedCity = loc;
    this.cityInput = this.locationService.formatLocationLabel(loc);
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
        location: selection,
        city: selection.city
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
        location: null,
        city: null
      });
    }
  }

  /* ---------------- CURRENT LOCATION ---------------- */

  async useCurrentLocation(): Promise<void> {
    this.isFetchingLocation = true;
    const previousSelectedCity = this.selectedCity;
    const previousCityInput = this.cityInput;
    const previousSelection = this.citySelectedData;

    try {
      if (!this.locationService.hasInternetConnection()) {
        this.filteredLocations = this.locations.slice(0, 20);
        return;
      }

      const resolved = await this.locationService.resolveEffectiveLocation(true);
      const selection: LocationSelection = resolved.selection;

      this.cityInput = this.locationService.formatLocationLabel(selection.city)
        || this.i18n.translateWithParams('LOCATION.CURRENT_LOCATION', {});
      this.citySelectedData = selection;

      const current = this.settingsService.getCurrentSettings();
      if (current) {
        this.settingsService.updateSettings({
          ...current,
          locationMode: 'auto',
          location: selection,
          city: selection.city
        });
      }

      await this.prayerNotificationSyncService.syncForLocationSelectionChange();

    } catch (err) {
      this.selectedCity = previousSelectedCity;
      this.cityInput = previousCityInput;
      this.citySelectedData = previousSelection;
      console.warn('Location access failed', err);
    } finally {
      this.isFetchingLocation = false;
    }
  }

  async openLocationDialog(): Promise<void> {
    this.dialogSearchQuery = '';
    this.dialogFilteredLocations = [];
    this.locationDialogStep = 'options';
    this.showLocationDialog = true;
  }

  closeLocationDialog(): void {
    this.showLocationDialog = false;
    this.locationDialogStep = 'options';
    this.dialogSearchQuery = '';
    this.dialogFilteredLocations = [];
  }

  openManualLocationSearch(): void {
    this.locationDialogStep = 'search';
    this.dialogSearchQuery = '';
    this.dialogFilteredLocations = this.locations.slice(0, 20);
  }

  onDialogSearchChange(query: string): void {
    this.dialogSearchQuery = query;
    const normalized = query.trim().toLowerCase();

    if (!normalized.length) {
      this.dialogFilteredLocations = this.locations.slice(0, 20);
      return;
    }

    this.dialogFilteredLocations = this.locations
      .filter((location) =>
        `${location.city} ${location.state} ${location.country}`.toLowerCase().includes(normalized)
      )
      .slice(0, 20);
  }

  async selectCityFromDialog(loc: SalahLocationCity): Promise<void> {
    await this.selectCity(loc);
    this.closeLocationDialog();
  }

  async useCurrentLocationFromDialog(): Promise<void> {
    await this.useCurrentLocation();

    if (this.citySelectedData?.source === 'auto') {
      this.closeLocationDialog();
    }
  }

  openSettings(): void {
    this.settingsClick.emit();
  }
}
