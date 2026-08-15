import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-location-loader',
  templateUrl: './location-loader.component.html',
  styleUrls: ['./location-loader.component.scss']
})
export class LocationLoaderComponent {
  @Input() active = false;
}
