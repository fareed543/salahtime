import { Component, Input } from '@angular/core';
import { LaunchScreenService } from 'src/app/services/launch-screen.service';

@Component({
  selector: 'app-location-loader',
  templateUrl: './location-loader.component.html',
  styleUrls: ['./location-loader.component.scss']
})
export class LocationLoaderComponent {
  @Input() active = false;

  constructor(public launchScreenService: LaunchScreenService) {}
}
