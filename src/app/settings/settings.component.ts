import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SettingsData } from './calculation-methods';

const DEFAULT_SALAH_SETTINGS = {
  calculationMethod: 'karachi',
  showNafilSalah: false,
  madhab: 'Hanafi',
  locationMode: 'auto',
  enableNotifications: true,
  showHijri: true,
  hijriOffset: 0
};

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  calculationMethods = SettingsData;
  salahSettingsForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    const saved = localStorage.getItem('salahSettings');

    let settings = DEFAULT_SALAH_SETTINGS;

    try {
      if (saved) {
        settings = { ...DEFAULT_SALAH_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      settings = DEFAULT_SALAH_SETTINGS;
    }

    this.salahSettingsForm = this.fb.group({
      calculationMethod: [settings.calculationMethod],
      showNafilSalah: [settings.showNafilSalah],
      madhab: [settings.madhab],
      locationMode: [settings.locationMode],
      enableNotifications: [settings.enableNotifications],
      showHijri: [settings.showHijri],
      hijriOffset: [settings.hijriOffset]
    });
  }

  onSubmit() {
    const formValues = this.salahSettingsForm.value;
    localStorage.setItem('salahSettings', JSON.stringify(formValues));
    console.log("Saved Settings:", formValues);
  }

  onReset() {
    this.salahSettingsForm.reset(DEFAULT_SALAH_SETTINGS);
    localStorage.setItem('salahSettings', JSON.stringify(DEFAULT_SALAH_SETTINGS));
  }
}
