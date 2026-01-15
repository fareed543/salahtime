import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { LocationService } from 'src/app/services/location.service';

@Component({
  selector: 'app-autocomplete-control',
  templateUrl: './autocomplete-control.component.html',
  styleUrls: ['./autocomplete-control.component.scss']
})
export class AutocompleteControlComponent implements OnInit, OnChanges {
  @Input() locations: any[] = []; // pass array of {city, state}
  @Input() placeholder: string = 'City';
  @Input() selectedCity: any = null; // parent-selected city

  @Output() citySelected = new EventEmitter<any>(); // emit selected city

  cityInput: string = '';
  filteredLocations: any[] = [];

  constructor(private locationService: LocationService){ }
  
  ngOnInit(): void {
    this.locationService.getLocationsList().subscribe(data => {
      this.locations = data;

      // initialize input if selectedCity is already set
      if (this.selectedCity) {
        this.cityInput = `${this.selectedCity.city}, ${this.selectedCity.state}`;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedCity'] && changes['selectedCity'].currentValue) {
      const city = changes['selectedCity'].currentValue;
      this.cityInput = `${city.city}, ${city.state}`;
      this.selectedCity = city;
    }
  }

  onInputChange(value: string) {
    this.selectedCity = null;
    if (value.length >= 2) {
      const lowerVal = value.toLowerCase();
      this.filteredLocations = this.locations.filter(loc =>
        loc.city.toLowerCase().includes(lowerVal)
      );
    } else {
      this.filteredLocations = [];
    }
  }

  selectCity(loc: any) {
    this.selectedCity = loc;
    this.cityInput = `${loc.city}, ${loc.state}`;
    this.filteredLocations = [];
    this.citySelected.emit(loc); // emit selection
  }

  hideDropdown() {
    setTimeout(() => this.filteredLocations = [], 200);
  }

  clearCity() {
    this.cityInput = '';
    this.selectedCity = null;
    this.filteredLocations = [];
    this.citySelected.emit(null); // emit null to notify parent
  }

}
