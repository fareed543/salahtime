import { AfterViewInit, Component, signal } from '@angular/core';
import { DEFAULT_SALAH_SETTINGS } from './settings/settings.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  menuOpen: boolean = false;
  protected readonly title = signal('salah-time-board');

  constructor() {
    this.setDefaultSettingsOnce();
  }

  setDefaultSettingsOnce() {
    const stored = localStorage.getItem('salahSettings');

    if (!stored) {
      console.log('Saving Hanafi default salah settings...');
      localStorage.setItem('salahSettings', JSON.stringify(DEFAULT_SALAH_SETTINGS));
    }
  }

}
