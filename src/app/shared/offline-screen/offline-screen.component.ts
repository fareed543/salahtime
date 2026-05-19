import { Component } from '@angular/core';
import { ConnectivityService } from 'src/app/services/connectivity.service';

@Component({
  selector: 'app-offline-screen',
  templateUrl: './offline-screen.component.html',
  styleUrls: ['./offline-screen.component.scss']
})
export class OfflineScreenComponent {
  readonly offline$ = this.connectivityService.offline$;

  constructor(private connectivityService: ConnectivityService) {}

  reload(): void {
    if (navigator.onLine) {
      this.connectivityService.clearOffline();
    }

    window.location.reload();
  }
}
