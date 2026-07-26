import { Component } from '@angular/core';
import { AuthStateService } from './services/auth-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'oneportal';

  constructor(private authStateService: AuthStateService) {
    this.authStateService.initialize();
  }
}
