import { Component, EventEmitter, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { AppTranslateService } from 'src/app/services/translate.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LocationService } from 'src/app/services/location.service';
import { NotificationService } from 'src/app/services/notification.service';
import { SettingsService } from 'src/app/services/settings.service';
import { OnboardingLocationSelection, OnboardingStep } from './onboarding.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class OnboardingComponent implements OnInit {
  @Output() completed = new EventEmitter<void>();

  readonly onboardingFlagKey = 'mobile_onboarding_completed';

  step: OnboardingStep = 'language';
  searchQuery = '';
  filteredLocations: any[] = [];
  allLocations: any[] = [];
  selectedLocation: OnboardingLocationSelection | null = null;
  selectedMadhab = 'Hanafi';
  isLoadingLocation = false;
  private locationSearchSub?: Subscription;

  constructor(
    private i18n: AppTranslateService,
    private settingsService: SettingsService,
    private locationService: LocationService,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    if (!this.locationService.hasInternetConnection()) {
      this.locationService.getOfflineLocationsList().subscribe((locations) => {
        this.allLocations = locations ?? [];
      });
    }

    const current = this.settingsService.getCurrentSettings();
    this.selectedMadhab = current?.madhab ?? 'Hanafi';

    // Ignore the shipped default location during first-run onboarding.
    this.settingsService.updateSettings({
      ...current,
      location: null,
      city: null,
      enableNotifications: false
    });
  }

  nextFromLanguage(): void {
    this.step = 'location';
  }

  async useCurrentLocation(): Promise<void> {
    if (!this.locationService.hasInternetConnection()) {
      this.openManualSearch();
      return;
    }

    this.isLoadingLocation = true;

    try {
      const resolved = await this.locationService.resolveEffectiveLocation(true);
      this.selectedLocation = resolved.selection;
      this.persistLocationSelection();
      this.step = 'confirm-location';
    } catch (error) {
      console.warn('Unable to access location during onboarding', error);
    } finally {
      this.isLoadingLocation = false;
    }
  }

  openManualSearch(): void {
    this.searchQuery = '';
    if (!this.locationService.hasInternetConnection()) {
      this.filteredLocations = this.allLocations.slice(0, 20);
    } else {
      this.filteredLocations = [];
    }
    this.step = 'search';
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    const normalized = query.trim().toLowerCase();

    if (!this.locationService.hasInternetConnection()) {
      if (!normalized.length) {
        this.filteredLocations = this.allLocations.slice(0, 20);
        return;
      }

      this.filteredLocations = this.allLocations
        .filter((location) =>
          `${location.city} ${location.state} ${location.country}`.toLowerCase().includes(normalized)
        )
        .slice(0, 20);
      return;
    }

    if (normalized.length < 2) {
      this.filteredLocations = [];
      return;
    }

    this.locationSearchSub?.unsubscribe();
    this.locationSearchSub = this.locationService.searchPublicCities(normalized, 20).subscribe({
      next: (locations) => {
        this.filteredLocations = locations ?? [];
      },
      error: () => {
        this.filteredLocations = [];
      }
    });
  }

  selectManualLocation(location: any): void {
    this.selectedLocation = {
      source: 'manual',
      city: location
    };
    this.persistLocationSelection();
    this.step = 'confirm-location';
  }

  changeLocation(): void {
    this.step = 'location';
  }

  continueAfterLocation(): void {
    this.step = 'notifications';
  }

  async turnOnNotifications(): Promise<void> {
    const granted = await this.notificationService.ensurePermission();
    const current = this.settingsService.getCurrentSettings();

    this.settingsService.updateSettings({
      ...current,
      enableNotifications: granted
    });

    this.step = 'madhab';
  }

  skipNotifications(): void {
    const current = this.settingsService.getCurrentSettings();
    this.settingsService.updateSettings({
      ...current,
      enableNotifications: false
    });
    this.step = 'madhab';
  }

  finish(): void {
    const current = this.settingsService.getCurrentSettings();

    this.settingsService.updateSettings({
      ...current,
      madhab: this.selectedMadhab
    });

    this.localStorageService.setItem(this.onboardingFlagKey, true);
    this.completed.emit();
  }

  private persistLocationSelection(): void {
    const current = this.settingsService.getCurrentSettings();
    this.settingsService.updateSettings({
      ...current,
      location: this.selectedLocation,
      city: this.selectedLocation?.city ?? null,
      locationMode: this.selectedLocation?.source === 'manual' ? 'manual' : 'auto'
    });
  }
}
