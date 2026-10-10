import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SettingsResponse, SettingsService } from './settings.service';

interface SettingsNavItem {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  /** Add an entry here (and a card in the template) for every new settings section. */
  readonly sectionNav: SettingsNavItem[] = [
    { key: 'authChannels', label: 'Login & OTP Channels', icon: 'bx bx-shield-quarter' },
    { key: 'smsProvider', label: 'SMS Provider', icon: 'bx bx-message-rounded-dots' }
  ];

  readonly breadcrumbs = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Settings' }
  ];

  isLoading = true;
  errorMessage = '';
  activeSection = this.sectionNav[0].key;
  settings: SettingsResponse['sections'] | null = null;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const requested = this.route.snapshot.fragment;
    if (requested && this.sectionNav.some((item) => item.key === requested)) {
      this.activeSection = requested;
    }

    this.loadSettings(true);
  }

  /** Sections depend on each other (e.g. Mobile needs an SMS provider), so reload all after a save. */
  loadSettings(initial = false): void {
    this.settingsService.getSettings().subscribe({
      next: (response) => {
        this.settings = response.sections;
        this.isLoading = false;
        if (initial) {
          setTimeout(() => this.scrollTo(this.activeSection, 'auto'));
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.error || 'Unable to load settings.';
        this.isLoading = false;
      }
    });
  }

  selectSection(key: string): void {
    this.activeSection = key;
    this.scrollTo(key, 'smooth');
  }

  private scrollTo(key: string, behavior: ScrollBehavior): void {
    document.getElementById(key)?.scrollIntoView({ behavior, block: 'start' });
  }
}
