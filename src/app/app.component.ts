import { AfterViewInit, Component, signal } from '@angular/core';
import { LayoutService } from './layout.service';
import { DEFAULT_SALAH_SETTINGS } from './settings/default-settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  menuOpen: boolean = false;
  protected readonly title = signal('salah-time-board');

  constructor(private layoutService: LayoutService) {
    this.setDefaultSettingsOnce();
  }

  setDefaultSettingsOnce() {
    const stored = localStorage.getItem('salahSettings');

    if (!stored) {
      console.log('Saving Hanafi default salah settings...');
      localStorage.setItem('salahSettings', JSON.stringify(DEFAULT_SALAH_SETTINGS));
    }
  }


  ngAfterViewInit() {
    this.layoutService.setPreload(true);
    this.layoutService.setResizingHandlers();
    this.layoutService.setupMenuToggles();
  }

  toggleSidebar(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.layoutService.toggleSidebar();
  }

  closeMenuOnMobile(event: Event) {
    if (window.innerWidth <= 768) {
      this.layoutService.toggleSidebar();
    }
  }
}
