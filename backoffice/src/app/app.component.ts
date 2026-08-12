import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AuthStateService } from './services/auth-state.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = environment.appName;

  constructor(
    private authStateService: AuthStateService,
    private titleService: Title
  ) {
    this.titleService.setTitle(environment.appName);
    this.authStateService.initialize();
  }
}
